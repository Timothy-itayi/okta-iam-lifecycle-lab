const express = require('express');
const session = require('express-session');
const { listUsers } = require('./db');
const { recordSignIn } = require('./auth-log');
const path = require('path');
const { mountSaml } = require('./saml');
const { mountOidc, isRostrAdmin } = require('./oidc');
const { createScimRouter } = require('./scim');
const { mountHubs } = require('./hubs');
const { rostrRow } = require('./roles');

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

function createApp({ db, authLogPath, sessionSecret, saml, oidc, scim, hr, today }) {
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required');
  }
  const app = express();
  if (scim) {
    app.use('/scim/v2', createScimRouter({ db, ...scim }));
  }
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }));
  app.get('/health', (req, res) => {
    res.type('text/plain').send('OK');
  });
  app.use((req, res, next) => {
    res.locals.flash = req.session.flash || '';
    if (req.session.flash) delete req.session.flash;
    next();
  });
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const row = rostrRow(req.session.user, db);
    if (row && !row.active) return res.status(403).type('text/plain').send('Not allowed.');
    next();
  });
  const kaizenCss = path.dirname(require.resolve('@kaizen/design-tokens/package.json'));
  const staticFiles = {
    etag: true,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-cache');
    },
  };
  app.use('/vendor/kaizen', express.static(path.join(kaizenCss, 'css'), staticFiles));
  app.use(express.static(path.join(__dirname, '..', 'public'), staticFiles));
  mountHubs(app, { db, hr, today, signInPath: saml || !oidc ? '/saml/login' : '/oidc/login' });
  app.get('/admin/users', (req, res) => {
    if (!req.session.user) {
      return res.status(401).type('text/plain').send('Not signed in.');
    }
    if (!isRostrAdmin(req.session.user)) {
      return res.status(403).type('text/plain').send('Not allowed.');
    }
    res.type('html').send(renderUsers(listUsers(db)));
  });
  if (saml) {
    mountSaml(app, { db, authLogPath, saml });
  }
  if (oidc) {
    mountOidc(app, { authLogPath, ...oidc });
  }
  return app;
}

module.exports = { createApp, signIn, renderUsers };
