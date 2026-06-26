require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Replystar API' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Replystar backend corriendo en puerto ${PORT}`));
