const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname)));

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

function getFolderPhotos() {
  const dir = path.join(__dirname, 'photos');
  try {
    return fs.readdirSync(dir)
      .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => ({ id: `folder::${f}`, src: `/photos/${f}`, alt: '' }));
  } catch {
    return [];
  }
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id   SERIAL PRIMARY KEY,
      src  TEXT NOT NULL,
      alt  TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Merge folder photos (first) + DB photos
app.get('/api/photos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, src, alt FROM photos ORDER BY created_at ASC');
    res.json([...getFolderPhotos(), ...rows]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/photos', async (req, res) => {
  try {
    const { src, alt } = req.body;
    if (!src) return res.status(400).json({ error: 'src required' });
    const { rows } = await pool.query(
      'INSERT INTO photos (src, alt) VALUES ($1, $2) RETURNING id, src, alt',
      [src, alt || '']
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Only DB photos can be deleted (folder photos are files)
app.delete('/api/photos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
init()
  .then(() => app.listen(PORT, () => console.log(`Listening on ${PORT}`)))
  .catch(e => { console.error(e); process.exit(1); });
