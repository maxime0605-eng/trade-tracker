'use strict';
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'tr-tracker-secret-change-me';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      poche TEXT NOT NULL CHECK(poche IN ('ct','crypto')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      type TEXT NOT NULL DEFAULT 'simple',
      breakdown_world REAL,
      breakdown_nasdaq REAL,
      breakdown_eur REAL,
      breakdown_em REAL
    );

    CREATE TABLE IF NOT EXISTS portfolio_values (
      id SERIAL PRIMARY KEY,
      poche TEXT NOT NULL,
      actif TEXT NOT NULL,
      value REAL NOT NULL,
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_values_date ON portfolio_values(date);
  `);
  console.log('✅ Base de données initialisée');
}

app.use(express.json());
app.use(cookieParser());

const requireAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.status(401).json({ error: 'Session expirée' });
  }
};

const setTokenCookie = (res) => {
  const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// Auth
app.get('/api/auth/status', async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
  const userExists = parseInt(rows[0].c) > 0;
  const token = req.cookies.token;
  let authenticated = false;
  if (token) { try { jwt.verify(token, JWT_SECRET); authenticated = true; } catch {} }
  res.json({ needsSetup: !userExists, authenticated });
});

app.post('/api/auth/setup', async (req, res) => {
  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (parseInt(rows[0].c) > 0) return res.status(400).json({ error: 'Déjà configuré' });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min. 6 caractères)' });
  const hash = bcrypt.hashSync(password, 12);
  await pool.query('INSERT INTO users (password_hash) VALUES ($1)', [hash]);
  setTokenCookie(res);
  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users LIMIT 1');
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  setTokenCookie(res);
  res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.put('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { rows } = await pool.query('SELECT * FROM users LIMIT 1');
  const user = rows[0];
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court' });
  await pool.query('UPDATE users SET password_hash=$1', [bcrypt.hashSync(newPassword, 12)]);
  res.json({ success: true });
});

// Entries
app.get('/api/entries', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entries ORDER BY date DESC, id DESC');
  res.json(rows);
});

app.post('/api/entries', requireAuth, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [];
    for (const r of items) {
      const { rows } = await client.query(
        'INSERT INTO entries (poche,amount,date,note,type,breakdown_world,breakdown_nasdaq,breakdown_eur,breakdown_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        [r.poche, r.amount, r.date, r.note ?? null, r.type ?? 'simple',
         r.breakdown_world ?? null, r.breakdown_nasdaq ?? null, r.breakdown_eur ?? null, r.breakdown_em ?? null]
      );
      ids.push(rows[0].id);
    }
    await client.query('COMMIT');
    res.json({ ids });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

app.put('/api/entries/:id', requireAuth, async (req, res) => {
  const { amount, date, note, breakdown_world, breakdown_nasdaq, breakdown_eur, breakdown_em } = req.body;
  await pool.query(
    'UPDATE entries SET amount=$1,date=$2,note=$3,breakdown_world=$4,breakdown_nasdaq=$5,breakdown_eur=$6,breakdown_em=$7 WHERE id=$8',
    [amount, date, note ?? null, breakdown_world ?? null, breakdown_nasdaq ?? null, breakdown_eur ?? null, breakdown_em ?? null, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/entries/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM entries WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

app.delete('/api/entries', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM entries');
  res.json({ success: true });
});

// Portfolio values
app.get('/api/values', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM portfolio_values ORDER BY date DESC, id DESC');
  res.json(rows);
});

app.post('/api/values', requireAuth, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of items) {
      await client.query(
        'INSERT INTO portfolio_values (poche,actif,value,date) VALUES ($1,$2,$3,$4)',
        [r.poche, r.actif, r.value, r.date]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

app.delete('/api/values/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM portfolio_values WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

app.delete('/api/values', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM portfolio_values');
  res.json({ success: true });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// Production: serve Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

initDB().then(() => {
  app.listen(PORT, () => console.log(`\n🚀 Trade Republic Tracker — http://localhost:${PORT}\n`));
}).catch(err => {
  console.error('❌ Impossible de connecter à la base de données:', err.message);
  process.exit(1);
});
