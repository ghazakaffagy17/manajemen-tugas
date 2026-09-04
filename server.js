const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const courseRoutes = require('./src/routes/courseRoutes');
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tasks', taskRoutes);

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API Endpoint tidak ditemukan.' });
  }
});

app.use((err, req, res, next) => {
  console.error('Server Internal Error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AcademiaTask Server Berjalan di: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
