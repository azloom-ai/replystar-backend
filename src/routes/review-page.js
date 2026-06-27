const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT business_name, business_type FROM businesses WHERE link_slug = ?',
      [slug]
    );
    if (rows.length === 0) return res.status(404).send('<h1>Negocio no encontrado</h1>');
    const { business_name, business_type } = rows[0];

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dejá tu reseña — ${business_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e1e2e; border-radius: 20px; padding: 36px 28px; max-width: 420px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .logo { text-align: center; font-size: 32px; margin-bottom: 6px; }
    .business { text-align: center; font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .type { text-align: center; color: #888; font-size: 14px; margin-bottom: 28px; }
    .label { color: #aaa; font-size: 13px; margin-bottom: 8px; display: block; }
    .stars { display: flex; justify-content: center; gap: 10px; margin-bottom: 28px; }
    .star { font-size: 44px; cursor: pointer; transition: transform 0.1s; filter: grayscale(1) opacity(0.4); }
    .star.active { filter: none; transform: scale(1.1); }
    input, textarea { width: 100%; background: #0f0f1a; border: 1px solid #2e2e3e; border-radius: 10px; padding: 14px 16px; color: #fff; font-size: 15px; margin-bottom: 16px; outline: none; font-family: inherit; }
    input:focus, textarea:focus { border-color: #7c3aed; }
    textarea { resize: none; height: 110px; }
    button { width: 100%; background: #7c3aed; color: #fff; border: none; border-radius: 12px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 4px; transition: background 0.2s; }
    button:hover { background: #6d28d9; }
    button:disabled { background: #444; cursor: default; }
    .thanks { text-align: center; display: none; }
    .thanks h2 { font-size: 28px; margin-bottom: 10px; }
    .thanks p { color: #aaa; margin-bottom: 24px; line-height: 1.5; }
    .google-btn { display: block; background: #4285f4; color: #fff; text-decoration: none; border-radius: 12px; padding: 15px; text-align: center; font-weight: 700; font-size: 15px; margin-bottom: 12px; }
    .skip { color: #666; font-size: 13px; text-align: center; cursor: pointer; text-decoration: underline; }
    .internal-thanks { text-align: center; display: none; }
    .internal-thanks h2 { font-size: 26px; margin-bottom: 10px; }
    .internal-thanks p { color: #aaa; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div id="form-section">
      <div class="logo">⭐</div>
      <div class="business">${business_name}</div>
      <div class="type">${business_type || ''}</div>
      <span class="label">¿Cómo calificás tu experiencia?</span>
      <div class="stars" id="stars">
        <span class="star" data-val="1">★</span>
        <span class="star" data-val="2">★</span>
        <span class="star" data-val="3">★</span>
        <span class="star" data-val="4">★</span>
        <span class="star" data-val="5">★</span>
      </div>
      <input type="text" id="name" placeholder="Tu nombre (opcional)" />
      <textarea id="comment" placeholder="Contanos tu experiencia..."></textarea>
      <button id="submit-btn" onclick="submitReview()">Enviar reseña</button>
    </div>

    <div class="thanks" id="public-thanks">
      <div style="font-size:56px;margin-bottom:16px">🎉</div>
      <h2>¡Gracias!</h2>
      <p>Nos alegra que hayas tenido una buena experiencia. ¿Te gustaría compartir tu opinión en Google?</p>
      <a class="google-btn" href="#" id="google-link" target="_blank">⭐ Dejar reseña en Google</a>
      <span class="skip" onclick="document.getElementById('public-thanks').style.display='none';document.getElementById('final-thanks').style.display='block'">No, gracias</span>
    </div>

    <div class="internal-thanks" id="final-thanks">
      <div style="font-size:56px;margin-bottom:16px">💜</div>
      <h2>¡Gracias!</h2>
      <p>Tu opinión es muy valiosa para nosotros.</p>
    </div>

    <div class="internal-thanks" id="negative-thanks">
      <div style="font-size:56px;margin-bottom:16px">🙏</div>
      <h2>Gracias por tu honestidad</h2>
      <p>Lamentamos que tu experiencia no haya sido la mejor. Tomaremos en cuenta tu opinión para mejorar.</p>
    </div>
  </div>

  <script>
    let selectedRating = 0;
    const stars = document.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.val);
        stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
      });
    });

    async function submitReview() {
      if (!selectedRating) return alert('Por favor seleccioná una calificación');
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        const res = await fetch('/api/reviews/submit/${slug}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: selectedRating,
            reviewer_name: document.getElementById('name').value,
            comment: document.getElementById('comment').value
          })
        });
        const data = await res.json();
        document.getElementById('form-section').style.display = 'none';
        if (data.redirect_to_google) {
          document.getElementById('public-thanks').style.display = 'block';
        } else {
          document.getElementById('negative-thanks').style.display = 'block';
        }
      } catch(e) {
        btn.disabled = false;
        btn.textContent = 'Enviar reseña';
        alert('Error al enviar. Intentá de nuevo.');
      }
    }
  </script>
</body>
</html>`);
  } catch (err) {
    res.status(500).send('<h1>Error del servidor</h1>');
  }
});

module.exports = router;
