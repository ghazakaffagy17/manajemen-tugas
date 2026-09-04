const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  courses: path.join(DATA_DIR, 'courses.json'),
  tasks: path.join(DATA_DIR, 'tasks.json')
};

let isWriting = false;
const writeQueue = [];

async function ensureDir() {
  try {
    await fs.access(DATA_DIR);
  } catch (err) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function initDB() {
  await ensureDir();

  for (const [key, filePath] of Object.entries(FILES)) {
    try {
      await fs.access(filePath);
    } catch (err) {
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf8');
    }
  }
}

async function readEntity(name) {
  await initDB();
  const filePath = FILES[name];
  if (!filePath) return [];
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${name}.json:`, err);
    return [];
  }
}

async function writeEntity(name, items) {
  await initDB();
  const filePath = FILES[name];
  if (!filePath) return false;

  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
  return true;
}

async function readDB() {
  await initDB();
  const [users, courses, tasks] = await Promise.all([
    readEntity('users'),
    readEntity('courses'),
    readEntity('tasks')
  ]);

  return { users, courses, tasks };
}

async function writeDB(data) {
  return new Promise((resolve, reject) => {
    const executeWrite = async () => {
      isWriting = true;
      try {
        await Promise.all([
          data.users ? writeEntity('users', data.users) : Promise.resolve(),
          data.courses ? writeEntity('courses', data.courses) : Promise.resolve(),
          data.tasks ? writeEntity('tasks', data.tasks) : Promise.resolve()
        ]);
        resolve(true);
      } catch (err) {
        console.error('Error writing JSON DB files:', err);
        reject(err);
      } finally {
        isWriting = false;
        if (writeQueue.length > 0) {
          const next = writeQueue.shift();
          next();
        }
      }
    };

    if (isWriting) {
      writeQueue.push(executeWrite);
    } else {
      executeWrite();
    }
  });
}

async function seedUserData(userId) {
  return;
}

module.exports = {
  readDB,
  writeDB,
  readEntity,
  writeEntity,
  seedUserData
};
