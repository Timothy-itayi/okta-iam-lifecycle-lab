const { escapeHtml, initials } = require('./format');
const { icon } = require('./icons');

const ROLE_CHIP = { staff: 'Staff', admin: 'Manager', hr: 'HR' };

function personName(user) {
  if (!user) return '';
  return [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email || user.userName || 'Signed in';
}

function navItem({ href, label, current, count }) {
  const active = current === href;
  const dot = count ? `<span class="nav-count" aria-label="${count} waiting"><span class="dot" aria-hidden="true"></span>${count}</span>` : '';
  return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}${dot}</a></li>`;
}

function navFor(role, current, nav = {}) {
  const sections = [
    { items: [{ href: '/leave', label: 'My leave' }, { href: '/roster', label: 'My roster' }] },
  ];
  if (role === 'admin') {
    sections.push({ title: 'Team', items: [{ href: '/admin/leave', label: 'Requests', count: nav.waiting }] });
  }
  if (role === 'hr') {
    sections.push({ title: 'HR', items: [{ href: '/hr/leave', label: 'All leave', count: nav.waiting }] });
  }
  return sections.map((section) => `
      <div class="nav-section">
        ${section.title ? `<p class="nav-title">${escapeHtml(section.title)}</p>` : ''}
        <ul>${section.items.map((item) => navItem({ ...item, current })).join('')}</ul>
      </div>`).join('');
}

function toastHtml(flash) {
  if (!flash) return '';
  const message = typeof flash === 'string' ? { text: flash } : flash;
  const tone = message.tone || 'ok';
  const view = message.href ? ` <a href="${escapeHtml(message.href)}">View</a>` : '';
  return `<div class="toast toast-${tone}" role="status"><p>${escapeHtml(message.text)}${view}</p></div>
  <script>setTimeout(function () {
    var node = document.querySelector('.toast');
    if (node) node.classList.add('gone');
  }, 4000);</script>`;
}

function page({ title, context, action, aside, user, role, body, flash, current, nav, banner }) {
  const name = personName(user);
  const shell = user && role;
  const header = `
    <header class="page-header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        ${context ? `<p class="context">${escapeHtml(context)}</p>` : ''}
      </div>
      ${action || aside ? `<div class="page-actions">${aside || ''}${action || ''}</div>` : ''}
    </header>
    ${banner ? `<div class="banner banner-bad" role="alert">${icon('alert-triangle')}<p>${escapeHtml(banner)}</p></div>` : ''}`;

  const sidebar = shell ? `
  <aside class="sidebar">
    <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Rostr</a>
    <nav aria-label="Main">${navFor(role, current, nav)}</nav>
    <div class="identity">
      <span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
      <div class="identity-text">
        <span class="identity-name">${escapeHtml(name)}</span>
        <span class="identity-dept">${escapeHtml(user.department || '')}</span>
        <span class="chip chip-role">${ROLE_CHIP[role] || 'Staff'}</span>
      </div>
      <a class="sign-out" href="/logout">${icon('log-out')}<span>Sign out</span></a>
    </div>
  </aside>
  <div class="mobile-top">
    <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Rostr</a>
    <a class="avatar" href="/logout" title="Sign out ${escapeHtml(name)}"><span aria-hidden="true">${escapeHtml(initials(name))}</span><span class="visually-hidden">Sign out</span></a>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Rostr</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body class="${shell ? 'has-shell' : 'no-shell'}">
  ${sidebar}
  <main class="content">
    ${header}
    ${body}
  </main>
  ${toastHtml(flash)}
</body>
</html>`;
}

module.exports = { page, escapeHtml, personName, ROLE_CHIP };
