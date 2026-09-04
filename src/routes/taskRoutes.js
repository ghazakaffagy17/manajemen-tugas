const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../config/database');
const { authenticateToken } = require('../middlewares/auth');

function calculatePriorityFromDeadline(deadlineStr) {
  if (!deadlineStr) return 'Rendah';
  const now = Date.now();
  const due = new Date(deadlineStr).getTime();
  const diffHours = (due - now) / (1000 * 60 * 60);

  if (diffHours <= 24) return 'Tinggi';
  if (diffHours <= 72) return 'Sedang';
  return 'Rendah';
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await readDB();
    const userId = req.user.id;

    const userTasks = db.tasks.filter(t => t.userId === userId);
    const userCourses = db.courses.filter(c => c.userId === userId);

    const tasksWithCourseInfo = userTasks.map(task => {
      const course = userCourses.find(c => c.id === task.courseId);
      const computedPriority = calculatePriorityFromDeadline(task.deadline);
      return {
        ...task,
        priority: computedPriority,
        courseName: course ? course.name : 'Mata Kuliah Umum',
        courseCode: course ? course.code : 'UMUM',
        courseColor: course ? course.color : '#8b5cf6'
      };
    });

    res.json(tasksWithCourseInfo);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data tugas.' });
  }
});

function isValidTitle(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 2) return false;
  const forbiddenRegex = /[<>{}\[\]$%^*~#\\@]/;
  return !forbiddenRegex.test(text.trim());
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, courseId, description, type, status, deadline, link, subtasks } = req.body;

    if (!title || !courseId || !deadline) {
      return res.status(400).json({ error: 'Judul, Mata Kuliah, dan Tanggal Deadline wajib diisi.' });
    }

    if (!isValidTitle(title)) {
      return res.status(400).json({ error: 'Judul tidak boleh mengandung simbol khusus (<, >, {, }, $, %, ^, *, #, @, ~).' });
    }

    const db = await readDB();

    const formattedSubtasks = (subtasks || []).map((s, idx) => ({
      id: 'st_' + Date.now() + '_' + idx,
      title: typeof s === 'string' ? s : s.title,
      completed: typeof s === 'object' && s.completed !== undefined ? s.completed : false
    }));

    const computedPriority = calculatePriorityFromDeadline(deadline);

    const newTask = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: req.user.id,
      courseId,
      title,
      description: description || '',
      type: type || 'Individu',
      priority: computedPriority,
      status: status || 'Belum Dikerjakan',
      deadline,
      link: link || '',
      subtasks: formattedSubtasks,
      createdAt: new Date().toISOString()
    };

    db.tasks.push(newTask);
    await writeDB(db);

    const course = db.courses.find(c => c.id === courseId);
    res.status(201).json({
      ...newTask,
      courseName: course ? course.name : 'Mata Kuliah Umum',
      courseCode: course ? course.code : 'UMUM',
      courseColor: course ? course.color : '#8b5cf6'
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Gagal membuat tugas baru.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, courseId, description, type, priority, status, deadline, link, subtasks } = req.body;

    const db = await readDB();
    const index = db.tasks.findIndex(t => t.id === id && t.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }

    if (title !== undefined && !isValidTitle(title)) {
      return res.status(400).json({ error: 'Judul tidak boleh mengandung simbol khusus (<, >, {, }, $, %, ^, *, #, @, ~).' });
    }

    const currentTask = db.tasks[index];

    let updatedSubtasks = currentTask.subtasks || [];
    if (subtasks && Array.isArray(subtasks)) {
      updatedSubtasks = subtasks.map((s, idx) => ({
        id: s.id || ('st_' + Date.now() + '_' + idx),
        title: s.title || '',
        completed: !!s.completed
      }));
    }

    const targetDeadline = deadline !== undefined ? deadline : currentTask.deadline;
    const computedPriority = calculatePriorityFromDeadline(targetDeadline);

    db.tasks[index] = {
      ...currentTask,
      title: title !== undefined ? title : currentTask.title,
      courseId: courseId !== undefined ? courseId : currentTask.courseId,
      description: description !== undefined ? description : currentTask.description,
      type: type !== undefined ? type : currentTask.type,
      priority: computedPriority,
      status: status !== undefined ? status : currentTask.status,
      deadline: targetDeadline,
      link: link !== undefined ? link : currentTask.link,
      subtasks: updatedSubtasks
    };

    await writeDB(db);

    const course = db.courses.find(c => c.id === db.tasks[index].courseId);
    res.json({
      ...db.tasks[index],
      courseName: course ? course.name : 'Mata Kuliah Umum',
      courseCode: course ? course.code : 'UMUM',
      courseColor: course ? course.color : '#8b5cf6'
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengupdate tugas.' });
  }
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Belum Dikerjakan', 'Sedang Dikerjakan', 'Selesai'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    const db = await readDB();
    const index = db.tasks.findIndex(t => t.id === id && t.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }

    db.tasks[index].status = status;
    await writeDB(db);

    res.json(db.tasks[index]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui status tugas.' });
  }
});

router.patch('/:id/subtask/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { id, subtaskId } = req.params;

    const db = await readDB();
    const taskIndex = db.tasks.findIndex(t => t.id === id && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }

    const task = db.tasks[taskIndex];
    const subtask = (task.subtasks || []).find(st => st.id === subtaskId);

    if (!subtask) {
      return res.status(404).json({ error: 'Sub-tugas tidak ditemukan.' });
    }

    subtask.completed = !subtask.completed;
    await writeDB(db);

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui sub-tugas.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    const taskIndex = db.tasks.findIndex(t => t.id === id && t.userId === req.user.id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
    }

    db.tasks.splice(taskIndex, 1);
    await writeDB(db);

    res.json({ message: 'Tugas berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus tugas.' });
  }
});

module.exports = router;
module.exports.calculatePriorityFromDeadline = calculatePriorityFromDeadline;