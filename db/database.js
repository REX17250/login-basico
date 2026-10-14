const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// DB_PATH permite a las pruebas usar una base temporal en vez de la de desarrollo
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'login.db'));
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const normalize = (email) => String(email).replace(/\s+/g, '').toLowerCase();

const insertStmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
const findStmt = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');

// Devuelve el id nuevo. Lanza error si el correo ya existe (UNIQUE).
function createUser(email, passwordHash) {
  return Number(insertStmt.run(normalize(email), passwordHash).lastInsertRowid);
}

// Devuelve { id, email, password_hash } o undefined.
function findUserByEmail(email) {
  return findStmt.get(normalize(email));
}

module.exports = { createUser, findUserByEmail };
