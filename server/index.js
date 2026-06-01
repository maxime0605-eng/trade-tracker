'use strict';
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'tr-tracker-secret-do-not-use-in-prod-change-me';
const DB_PATH = path.join(__dirname, '..', 'data', 'trade.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poche TEXT NOT NULL,
    actif TEXT NOT NULL,
    value REAL NOT NULL,
    date TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
  CREATE INDEX IF NOT EXISTS idx_values_date ON portfolio_values(date);
`);

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
app.get('/api/auth/status', (req, res) => {
  const userExists = db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0;
  const token = req.cookies.token;
  let authenticated = false;
  if (token) {
    try { jwt.verify(token, JWT_SECRET); authenticated = true; } catch {}
  }
  res.json({ needsSetup: !userExists, authenticated });
});

app.post('/api/auth/setup', (req, res) => {
  const userExists = db.prepare('SELECT COUNT(*) as c FROM users').get().c > 0;
  if (userExists) return res.status(400).json({ error: 'Déjà configuré' });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min. 6 caractères)' });
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (password_hash) VALUES (?)').run(hash);
  setTokenCookie(res);
  res.json({ success: true });
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
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

app.put('/api/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court' });
  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash=?').run(hash);
  res.json({ success: true });
});

// Entries
app.get('/api/entries', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM entries ORDER BY date DESC, id DESC').all());
});

app.post('/api/entries', requireAuth, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const stmt = db.prepare(
    'INSERT INTO entries (poche,amount,date,note,type,breakdown_world,breakdown_nasdaq,breakdown_eur,breakdown_em) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  const insertAll = db.transaction((rows) => rows.map(r =>
    stmt.run(r.poche, r.amount, r.date, r.note ?? null, r.type ?? 'simple',
      r.breakdown_world ?? null, r.breakdown_nasdaq ?? null, r.breakdown_eur ?? null, r.breakdown_em ?? null)
  ));
  const results = insertAll(items);
  res.json({ ids: results.map(r => r.lastInsertRowid) });
});

app.put('/api/entries/:id', requireAuth, (req, res) => {
  const { amount, date, note, breakdown_world, breakdown_nasdaq, breakdown_eur, breakdown_em } = req.body;
  db.prepare(
    'UPDATE entries SET amount=?,date=?,note=?,breakdown_world=?,breakdown_nasdaq=?,breakdown_eur=?,breakdown_em=? WHERE id=?'
  ).run(amount, date, note ?? null, breakdown_world ?? null, breakdown_nasdaq ?? null, breakdown_eur ?? null, breakdown_em ?? null, req.params.id);
  res.json({ success: true });
});

app.delete('/api/entries/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM entries WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/entries', requireAuth, (req, res) => {
  db.prepare('DELETE FROM entries').run();
  res.json({ success: true });
});

// Portfolio values
app.get('/api/values', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM portfolio_values ORDER BY date DESC, id DESC').all());
});

app.post('/api/values', requireAuth, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const stmt = db.prepare('INSERT INTO portfolio_values (poche,actif,value,date) VALUES (?,?,?,?)');
  const insertAll = db.transaction((rows) => rows.forEach(r => stmt.run(r.poche, r.actif, r.value, r.date)));
  insertAll(items);
  res.json({ success: true });
});

app.delete('/api/values/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM portfolio_values WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/values', requireAuth, (req, res) => {
  db.prepare('DELETE FROM portfolio_values').run();
  res.json({ success: true });
});

// Production: serve Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n✅ Trade Republic Tracker — http://localhost:${PORT}\n`);
});
