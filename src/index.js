require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/r/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.query('SELECT business_name, business_type, google_url FROM businesses WHERE link_slug = ?', [slug]);
    if (rows.length === 0) return res.status(404).send('<h1>Negocio no encontrado</h1>');
    const { business_name, business_type, google_url } = rows[0];
    const googleLink = google_url || `https://www.google.com/maps/search/${encodeURIComponent(business_name)}`;
    res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reseña — ${business_name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f1a;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:#1e1e2e;border-radius:20px;padding:36px 28px;max-width:420px;width:100%}.logo{text-align:center;font-size:40px;margin-bottom:8px}.biz{text-align:center;font-size:22px;font-weight:700;margin-bottom:4px}.type{text-align:center;color:#888;font-size:14px;margin-bottom:28px}.label{color:#aaa;font-size:13px;margin-bottom:10px;display:block;text-align:center}.stars{display:flex;justify-content:center;gap:8px;margin-bottom:24px}.star{font-size:48px;cursor:pointer;filter:grayscale(1)opacity(.3);transition:.1s}.star.on{filter:none}input,textarea{width:100%;background:#0f0f1a;border:1px solid #2e2e3e;border-radius:10px;padding:14px 16px;color:#fff;font-size:15px;margin-bottom:14px;outline:none;font-family:inherit}textarea{resize:none;height:100px}input:focus,textarea:focus{border-color:#7c3aed}button{width:100%;background:#7c3aed;color:#fff;border:none;border-radius:12px;padding:16px;font-size:16px;font-weight:700;cursor:pointer}.hidden{display:none}.ty{text-align:center}.ty h2{font-size:28px;margin:16px 0 10px}.ty p{color:#aaa;line-height:1.5;margin-bottom:20px}.gbtn{display:block;background:#4285f4;color:#fff;text-decoration:none;border-radius:12px;padding:14px;text-align:center;font-weight:700;margin-bottom:12px}.skip{color:#666;font-size:13px;text-align:center;cursor:pointer;text-decoration:underline}</style></head><body><div class="card"><div id="F"><div class="logo">⭐</div><div class="biz">${business_name}</div><div class="type">${business_type||''}</div><span class="label">¿Cómo calificás tu experiencia?</span><div class="stars" id="S"><span class="star" data-v="1">★</span><span class="star" data-v="2">★</span><span class="star" data-v="3">★</span><span class="star" data-v="4">★</span><span class="star" data-v="5">★</span></div><input id="N" placeholder="Tu nombre (opcional)"/><textarea id="C" placeholder="Contanos tu experiencia..."></textarea><button onclick="send()">Enviar reseña</button></div><div class="ty hidden" id="PUB"><div style="font-size:56px">🎉</div><h2>¡Gracias!</h2><p>Nos alegra que hayas tenido una buena experiencia. ¿Te gustaría dejar tu reseña en Google?</p><a class="gbtn" href="${googleLink}" target="_blank">⭐ Dejar reseña en Google</a><span class="skip" onclick="show('END')">No, gracias</span></div><div class="ty hidden" id="NEG"><div style="font-size:56px">🙏</div><h2>Gracias por tu honestidad</h2><p>Lamentamos que tu experiencia no haya sido la mejor. Tomaremos nota para mejorar.</p></div><div class="ty hidden" id="END"><div style="font-size:56px">💜</div><h2>¡Gracias!</h2><p>Tu opinión es muy valiosa para nosotros.</p></div></div><script>let r=0;const st=document.querySelectorAll('.star');st.forEach(s=>s.addEventListener('click',()=>{r=+s.dataset.v;st.forEach((x,i)=>x.classList.toggle('on',i<r))}));function show(id){['F','PUB','NEG','END'].forEach(i=>document.getElementById(i).classList.add('hidden'));document.getElementById(id).classList.remove('hidden')}async function send(){if(!r)return alert('Seleccioná una calificación');try{const res=await fetch('/api/reviews/submit/${slug}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:r,reviewer_name:document.getElementById('N').value,comment:document.getElementById('C').value})});const d=await res.json();show(d.redirect_to_google?'PUB':'NEG')}catch(e){alert('Error al enviar')}}</script></body></html>`);
  } catch (err) {
    res.status(500).send('<h1>Error</h1>');
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Replystar API' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Replystar backend corriendo en puerto ${PORT}`));
