const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const userCourses = db.courses.filter(c => c.userId === req.user.id);
    res.json(userCourses);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data mata kuliah.' });
  }
});

function isValidName(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 2) return false;
  const forbiddenRegex = /[<>{}\[\]$%^*~#\\@]/;
  return !forbiddenRegex.test(text.trim());
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, lecturer, room, credits, day, time, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama Mata Kuliah wajib diisi.' });
    }

    if (!isValidName(name)) {
      return res.status(400).json({ error: 'Nama Mata Kuliah tidak boleh mengandung simbol khusus (<, >, {, }, $, %, ^, *, #, @, ~).' });
    }

    const db = await readDB();
    const newCourse = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: req.user.id,
      code: code || 'MK-' + Math.floor(100 + Math.random() * 900),
      name,
      lecturer: lecturer || '-',
      room: room || '-',
      credits: parseInt(credits) || 3,
      day: day || 'Senin',
      time: time || '08:00 - 10:30',
      color: color || '#6366f1'
    };

    db.courses.push(newCourse);
    await writeDB(db);

    res.status(201).json(newCourse);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat mata kuliah baru.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, lecturer, room, credits, day, time, color } = req.body;

    const db = await readDB();
    const index = db.courses.findIndex(c => c.id === id && c.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
    }

    if (name !== undefined && !isValidName(name)) {
      return res.status(400).json({ error: 'Nama Mata Kuliah tidak boleh mengandung simbol khusus (<, >, {, }, $, %, ^, *, #, @, ~).' });
    }

    db.courses[index] = {
      ...db.courses[index],
      name: name !== undefined ? name : db.courses[index].name,
      code: code !== undefined ? code : db.courses[index].code,
      lecturer: lecturer !== undefined ? lecturer : db.courses[index].lecturer,
      room: room !== undefined ? room : db.courses[index].room,
      credits: credits !== undefined ? parseInt(credits) : db.courses[index].credits,
      day: day !== undefined ? day : db.courses[index].day,
      time: time !== undefined ? time : db.courses[index].time,
      color: color !== undefined ? color : db.courses[index].color
    };

    await writeDB(db);
    res.json(db.courses[index]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate mata kuliah.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    const courseIndex = db.courses.findIndex(c => c.id === id && c.userId === req.user.id);
    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Mata kuliah tidak ditemukan.' });
    }

    db.courses.splice(courseIndex, 1);
    db.tasks = db.tasks.filter(t => !(t.courseId === id && t.userId === req.user.id));

    await writeDB(db);
    res.json({ message: 'Mata kuliah dan tugas terkait berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus mata kuliah.' });
  }
});

module.exports = router;
