const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const register = async (req, res) => {
  const { name, email, password, business_name, business_type } = req.body;
  if (!name || !email || !password || !business_name) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM businesses WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'El email ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const slug = business_name.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 6);

    await pool.query(
      'INSERT INTO businesses (name, email, password, business_name, business_type, link_slug) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashed, business_name, business_type, slug]
    );

    res.status(201).json({ message: 'Cuenta creada exitosamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

  try {
    const [rows] = await pool.query('SELECT * FROM businesses WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Credenciales incorrectas' });

    const business = rows[0];
    const valid = await bcrypt.compare(password, business.password);
    if (!valid) return res.status(401).json({ message: 'Credenciales incorrectas' });

    const token = jwt.sign({ id: business.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      business: {
        id: business.id,
        name: business.name,
        business_name: business.business_name,
        business_type: business.business_type,
        link_slug: business.link_slug,
        plan: business.plan,
        ai_tone: business.ai_tone,
        google_url: business.google_url,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, business_name, business_type, link_slug, plan, ai_tone, created_at FROM businesses WHERE id = ?',
      [req.businessId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Negocio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  const { name, business_name, business_type, ai_tone, google_url } = req.body;
  try {
    await pool.query(
      'UPDATE businesses SET name = ?, business_name = ?, business_type = ?, ai_tone = ?, google_url = ? WHERE id = ?',
      [name, business_name, business_type, ai_tone, google_url, req.businessId]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, business_name, business_type, link_slug, plan, ai_tone, google_url FROM businesses WHERE id = ?',
      [req.businessId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.query('SELECT id, name FROM businesses WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Email no encontrado' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query('UPDATE businesses SET reset_code = ?, reset_code_expires = ? WHERE email = ?', [code, expires, email]);
    await mailer.sendMail({
      from: `"Replystar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Tu código para restablecer contraseña',
      html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#f9f9f9;border-radius:12px">
        <h2 style="color:#7c3aed">Replystar</h2>
        <p>Hola ${rows[0].name}, recibimos una solicitud para restablecer tu contraseña.</p>
        <div style="background:#fff;border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <p style="color:#666;margin:0 0 8px">Tu código es:</p>
          <h1 style="color:#7c3aed;font-size:48px;margin:0;letter-spacing:8px">${code}</h1>
          <p style="color:#999;font-size:12px;margin:8px 0 0">Válido por 15 minutos</p>
        </div>
        <p style="color:#999;font-size:12px">Si no solicitaste esto, ignorá este email.</p>
      </div>`,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error enviando email', error: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const [rows] = await pool.query('SELECT reset_code, reset_code_expires FROM businesses WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Email no encontrado' });
    const { reset_code, reset_code_expires } = rows[0];
    if (reset_code !== code) return res.status(400).json({ message: 'Código incorrecto' });
    if (new Date() > new Date(reset_code_expires)) return res.status(400).json({ message: 'Código expirado' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE businesses SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE email = ?', [hashed, email]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const changePassword = async (req, res) => {
  const { current, newPassword } = req.body;
  try {
    const [rows] = await pool.query('SELECT password FROM businesses WHERE id = ?', [req.businessId]);
    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE businesses SET password = ? WHERE id = ?', [hashed, req.businessId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const savePushToken = async (req, res) => {
  const { token } = req.body;
  try {
    await pool.query('UPDATE businesses SET push_token = ? WHERE id = ?', [token, req.businessId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = { register, login, getProfile, updateProfile, savePushToken, changePassword, forgotPassword, resetPassword };
