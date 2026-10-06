const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    userName TEXT NOT NULL UNIQUE,
    givenName TEXT,
    familyName TEXT,
    email TEXT,
    department TEXT,
    title TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    lastLogin TEXT,
    licensed INTEGER NOT NULL DEFAULT 0
  )
`;

function openDatabase(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec(CREATE_USERS);
  return db;
}

function listUsers(db) {
  return db.prepare(`
    SELECT id, userName, givenName, familyName, email, department, title, active, lastLogin, licensed
    FROM users
    ORDER BY userName
  `).all();
}

function insertUser(db, user) {
  db.prepare(`
    INSERT INTO users (
      id, userName, givenName, familyName, email, department, title, active, lastLogin, licensed
    ) VALUES (
      @id, @userName, @givenName, @familyName, @email, @department, @title, @active, @lastLogin, @licensed
    )
  `).run({
    id: user.id,
    userName: user.userName,
    givenName: user.givenName ?? null,
    familyName: user.familyName ?? null,
    email: user.email ?? null,
    department: user.department ?? null,
    title: user.title ?? null,
    active: user.active ?? 1,
    lastLogin: user.lastLogin ?? null,
    licensed: user.licensed ?? 0,
  });
}

module.exports = { openDatabase, listUsers, insertUser };
