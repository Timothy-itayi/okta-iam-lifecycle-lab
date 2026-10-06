const express = require('express');
const session = require('express-session');
const { listUsers } = require('./db');
const { recordSignIn } = require('./auth-log');

const COLUMNS = [
  'id',
  'userName',
  'givenName',
  'familyName',
  'email',
  'department',
  'title',
  'active',
  'lastLogin',
  'licensed',
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>`;
}

function renderMe(user) {
  if (!user) {
    return page('Rostr', '<p>Not signed in.</p>');
  }
  const rows = Object.entries(user).map(([key, value]) => {
    return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
  }).join('');
  return page('Rostr', `<table>${rows}</table>`);
}

function renderUsers(users) {
  const head = COLUMNS.map((name) => `<th>${name}</th>`).join('');
  const body = users.map((user) => {
    const cells = COLUMNS.map((name) => {
      const value = name === 'active' || name === 'licensed' ? yesNo(user[name]) : user[name];
      return `<td>${escapeHtml(value)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return page('Rostr users', `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
}

function signIn(req, authLogPath, event) {
  recordSignIn(authLogPath, event);
  req.session.user = event.attributes || { user: event.user };
}

function createApp({ db, authLogPath, sessionSecret }) {
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required');
  }
  const app = express();
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }));
  app.get('/health', (req, res) => {
    res.type('text/plain').send('OK');
  });
  app.get('/me', (req, res) => {
    res.type('html').send(renderMe(req.session.user));
  });
  app.get('/admin/users', (req, res) => {
    res.type('html').send(renderUsers(listUsers(db)));
  });
  return app;
}

module.exports = { createApp, signIn, renderMe, renderUsers };
