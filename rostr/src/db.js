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
  insertGroup,
  replaceGroup,
  deleteGroup,
};
