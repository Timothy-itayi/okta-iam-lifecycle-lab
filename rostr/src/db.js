const crypto = require('crypto');
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
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    displayName TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (groupId, userId)
  );
`;

const CREATE_LEAVE = `
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    day TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_day TEXT NOT NULL,
    end_day TEXT NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leave_reviews (
    request_id INTEGER PRIMARY KEY,
    policy_outcome TEXT NOT NULL,
    policy_rules TEXT NOT NULL,
    jev_outcome TEXT,
    jev_rule TEXT,
    jev_confidence REAL,
    jev_probabilities TEXT,
    jev_reason_fit TEXT,
    jev_urgency REAL,
    agree INTEGER,
    model TEXT,
    reviewed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leave_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS balance_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL,
    email TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    days INTEGER NOT NULL,
    exported INTEGER NOT NULL DEFAULT 0
  );
`;

function openDatabase(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec(CREATE_USERS);
  db.exec(CREATE_LEAVE);
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

function findUserByUserName(db, userName) {
  return db.prepare('SELECT * FROM users WHERE userName = ?').get(userName);
}

// A new row gets a random id. SCIM will own ids and the active flag; sign-in never changes either.
function upsertSignIn(db, user) {
  db.prepare(`
    INSERT INTO users (id, userName, givenName, familyName, email, department, lastLogin)
    VALUES (@id, @userName, @givenName, @familyName, @email, @department, @lastLogin)
    ON CONFLICT(userName) DO UPDATE SET
      givenName = excluded.givenName,
      familyName = excluded.familyName,
      email = excluded.email,
      department = excluded.department,
      lastLogin = excluded.lastLogin
  `).run({ id: crypto.randomUUID(), ...user });
  return findUserByUserName(db, user.userName);
}

function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function findUserByUserNameAnyCase(db, userName) {
  return db.prepare('SELECT * FROM users WHERE userName = ? COLLATE NOCASE').get(userName);
}

function countUsers(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
}

function pageUsers(db, offset, limit) {
  return db.prepare('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?').all(limit, offset);
}

function createProvisionedUser(db, user) {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, userName, givenName, familyName, email, department, title, active)
    VALUES (@id, @userName, @givenName, @familyName, @email, @department, @title, @active)
  `).run({ ...user, id, active: user.active ? 1 : 0 });
  return findUserById(db, id);
}

function updateProvisionedUser(db, id, user) {
  db.prepare(`
    UPDATE users SET
      userName = @userName,
      givenName = @givenName,
      familyName = @familyName,
      email = @email,
      department = @department,
      title = @title,
      active = @active
    WHERE id = @id
  `).run({ ...user, id, active: user.active ? 1 : 0 });
  return findUserById(db, id);
}

function findGroupById(db, id) {
  return db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

function findGroupByDisplayName(db, displayName) {
  return db.prepare('SELECT * FROM groups WHERE displayName = ? COLLATE NOCASE').get(displayName);
}

function countGroups(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM groups').get().total;
}

function pageGroups(db, offset, limit) {
  return db.prepare('SELECT * FROM groups ORDER BY id LIMIT ? OFFSET ?').all(limit, offset);
}

function userGroupNames(db, userId) {
  return db.prepare(`
    SELECT groups.displayName AS name
    FROM group_members
    JOIN groups ON groups.id = group_members.groupId
    WHERE group_members.userId = ?
    ORDER BY groups.displayName
  `).all(userId).map((row) => row.name);
}

function groupMembers(db, groupId) {
  return db.prepare(`
    SELECT users.id AS value, users.userName AS display
    FROM group_members
    JOIN users ON users.id = group_members.userId
    WHERE group_members.groupId = ?
    ORDER BY users.id
  `).all(groupId);
}

function insertGroup(db, { displayName, members }) {
  const id = crypto.randomUUID();
  const insert = db.prepare('INSERT INTO groups (id, displayName) VALUES (?, ?)');
  const add = db.prepare('INSERT INTO group_members (groupId, userId) VALUES (?, ?)');
  db.transaction(() => {
    insert.run(id, displayName);
    for (const userId of members) add.run(id, userId);
  })();
  return findGroupById(db, id);
}

function replaceGroup(db, id, { displayName, members }) {
  const update = db.prepare('UPDATE groups SET displayName = ? WHERE id = ?');
  const clear = db.prepare('DELETE FROM group_members WHERE groupId = ?');
  const add = db.prepare('INSERT INTO group_members (groupId, userId) VALUES (?, ?)');
  db.transaction(() => {
    update.run(displayName, id);
    clear.run(id);
    for (const userId of members) add.run(id, userId);
  })();
  return findGroupById(db, id);
}

function findShift(db, email, day) {
  return db.prepare('SELECT * FROM shifts WHERE email = ? AND day = ?').get(email, day);
}

function insertShift(db, shift) {
  const existing = findShift(db, shift.email, shift.day);
  if (existing) return existing;
  const info = db.prepare(`
    INSERT INTO shifts (email, day, start, end, status)
    VALUES (@email, @day, @start, @end, @status)
  `).run({
    email: shift.email,
    day: shift.day,
    start: shift.start,
    end: shift.end,
    status: shift.status || 'scheduled',
  });
  return findShift(db, shift.email, shift.day) || { id: info.lastInsertRowid };
}

function deleteGroup(db, id) {
  if (!findGroupById(db, id)) return false;
  const clear = db.prepare('DELETE FROM group_members WHERE groupId = ?');
  const remove = db.prepare('DELETE FROM groups WHERE id = ?');
  db.transaction(() => {
    clear.run(id);
    remove.run(id);
  })();
  return true;
}

module.exports = {
  openDatabase,
  listUsers,
  insertUser,
  findUserByUserName,
  upsertSignIn,
  findUserById,
  findUserByUserNameAnyCase,
  countUsers,
  pageUsers,
  createProvisionedUser,
  updateProvisionedUser,
  findGroupById,
  findGroupByDisplayName,
  countGroups,
  pageGroups,
  groupMembers,
  userGroupNames,
  insertGroup,
  replaceGroup,
  deleteGroup,
  findShift,
  insertShift,
};
