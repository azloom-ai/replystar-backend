const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

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
  const { business_name, business_type, ai_tone } = req.body;
  try {
    await pool.query(
      'UPDATE businesses SET business_name = ?, business_type = ?, ai_tone = ? WHERE id = ?',
      [business_name, business_type, ai_tone, req.businessId]
    );
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

module.exports = { register, login, getProfile, updateProfile };
