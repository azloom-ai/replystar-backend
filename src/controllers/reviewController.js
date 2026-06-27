const pool = require('../config/database');
const OpenAI = require('openai');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const submitReview = async (req, res) => {
  const { slug } = req.params;
  const { reviewer_name, rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Calificación inválida' });
  }

  try {
    const [rows] = await pool.query('SELECT id, push_token FROM businesses WHERE link_slug = ?', [slug]);
    if (rows.length === 0) return res.status(404).json({ message: 'Negocio no encontrado' });

    const { id: businessId, push_token } = rows[0];
    const isPublic = rating >= 4 ? 1 : 0;

    await pool.query(
      'INSERT INTO reviews (business_id, reviewer_name, rating, comment, is_public) VALUES (?, ?, ?, ?, ?)',
      [businessId, reviewer_name || 'Anónimo', rating, comment, isPublic]
    );

    if (push_token && Expo.isExpoPushToken(push_token)) {
      const stars = '⭐'.repeat(rating);
      await expo.sendPushNotificationsAsync([{
        to: push_token,
        title: `Nueva reseña ${stars}`,
        body: reviewer_name ? `${reviewer_name}: "${comment || 'Sin comentario'}"` : `"${comment || 'Sin comentario'}"`,
        sound: 'default',
      }]);
    }

    res.json({ message: 'Reseña enviada', redirect_to_google: isPublic });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const getReviews = async (req, res) => {
  const { platform, replied, rating } = req.query;
  let query = 'SELECT * FROM reviews WHERE business_id = ?';
  const params = [req.businessId];

  if (platform) { query += ' AND platform = ?'; params.push(platform); }
  if (replied !== undefined) { query += ' AND replied = ?'; params.push(replied === 'true' ? 1 : 0); }
  if (rating) { query += ' AND rating = ?'; params.push(rating); }

  query += ' ORDER BY created_at DESC';

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const replyReview = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) return res.status(400).json({ message: 'La respuesta no puede estar vacía' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM reviews WHERE id = ? AND business_id = ?',
      [id, req.businessId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Reseña no encontrada' });

    await pool.query(
      'UPDATE reviews SET reply = ?, replied = 1, reply_at = NOW() WHERE id = ?',
      [reply, id]
    );

    res.json({ message: 'Respuesta guardada' });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

const generateAIReply = async (req, res) => {
  const { id } = req.params;

  try {
    const [businessRows] = await pool.query(
      'SELECT business_name, ai_tone FROM businesses WHERE id = ?',
      [req.businessId]
    );
    if (businessRows.length === 0) return res.status(404).json({ message: 'Negocio no encontrado' });

    const [reviewRows] = await pool.query(
      'SELECT * FROM reviews WHERE id = ? AND business_id = ?',
      [id, req.businessId]
    );
    if (reviewRows.length === 0) return res.status(404).json({ message: 'Reseña no encontrada' });

    const { business_name, ai_tone } = businessRows[0];
    const { reviewer_name, rating, comment } = reviewRows[0];
    const stars = '⭐'.repeat(rating);

    const prompt = `Eres el dueño o gerente de "${business_name}". Un cliente llamado ${reviewer_name} dejó una reseña con ${rating} estrellas (${stars}).

Reseña: "${comment || 'Sin comentario'}"

Escribe una respuesta ${ai_tone}. La respuesta debe:
- Sonar humana y natural, no robótica
- Ser personalizada según lo que dice la reseña
- Si es positiva: agradecer calurosamente y mencionar algo específico
- Si es negativa: disculparse sinceramente y ofrecer solución
- Máximo 3-4 oraciones
- No uses frases genéricas como "Estimado cliente"
- Firma como el equipo de ${business_name}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });

    const aiReply = completion.choices[0].message.content.trim();
    res.json({ reply: aiReply });
  } catch (err) {
    res.status(500).json({ message: 'Error generando respuesta', error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const [totals] = await pool.query(
      `SELECT
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN rating <= 3 THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN replied = 1 THEN 1 ELSE 0 END) as replied
      FROM reviews WHERE business_id = ?`,
      [req.businessId]
    );

    const [byRating] = await pool.query(
      `SELECT rating, COUNT(*) as count FROM reviews WHERE business_id = ? GROUP BY rating ORDER BY rating DESC`,
      [req.businessId]
    );

    const [recent] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, AVG(rating) as avg
       FROM reviews WHERE business_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`,
      [req.businessId]
    );

    res.json({ totals: totals[0], byRating, recent });
  } catch (err) {
    res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
};

module.exports = { submitReview, getReviews, replyReview, generateAIReply, getStats };
