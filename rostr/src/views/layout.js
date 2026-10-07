const { escapeHtml, initials } = require('./format');
const { icon } = require('./icons');

const ROLE_CHIP = { staff: 'Staff', admin: 'Manager', hr: 'HR' };
// Helen's browser cached the /app.css 404 from before public/ was in the image.
// Cloudflare rewrites the cache header to 4 hours, so the URL has to change.
const ASSET_VERSION = '2';

function asset(path) {
  return `${path}?v=${ASSET_VERSION}`;
}

function personName(user) {
  if (!user) return '';
  return [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email || user.userName || 'Signed in';
}

function tab(item, current) {
  const active = current === item.href || (item.match && item.match(current));
  const count = item.count
    ? ` <span class="tab-count" aria-label="${item.count} waiting">(${item.count})</span>`
    : '';
  return `<li><a href="${item.href}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}${count}</a></li>`;
}

function tabsFor(role, current, nav = {}) {
  const onHrDesk = String(current || '').startsWith('/hr');
  const mine = [
    { href: '/leave', label: 'My leave', match: (path) => String(path).startsWith('/leave') },
    { href: '/roster', label: 'My roster' },
  ];
  if (role === 'admin') mine.push({ href: '/admin/leave', label: 'Team requests', count: nav.waiting });
  if (role === 'hr' && !onHrDesk) {
    mine.push({ href: '/hr/leave', label: 'All leave', count: nav.waiting });
    mine.push({ href: '/hr/export', label: 'Export' });
  }
  const items = role === 'hr' && onHrDesk
    ? [
      { href: '/hr/leave', label: 'All leave', count: nav.waiting, match: (path) => path === '/hr/leave' },
      { href: '/hr/export', label: 'Export' },
    ]
    : mine;
  return `<ul>${items.map((item) => tab(item, current)).join('')}</ul>`;
}

function toastHtml(flash) {
  if (!flash) return '';
  const message = typeof flash === 'string' ? { text: flash } : flash;
  const tone = message.tone || 'ok';
  const view = message.href ? ` <a href="${escapeHtml(message.href)}">View</a>` : '';
  const stay = tone === 'bad' ? 'true' : 'false';
  return `<div class="toast toast-${tone}" role="status">
    <p>${escapeHtml(message.text)}${view}</p>
    <button type="button" class="toast-close" aria-label="Dismiss">${icon('x')}</button>
  </div>
  <script>
    var toast = document.querySelector('.toast');
    if (toast) {
      toast.querySelector('.toast-close').addEventListener('click', function () { toast.classList.add('gone'); });
      if (!${stay}) setTimeout(function () { toast.classList.add('gone'); }, 5000);
    }
  </script>`;
}

function page({ title, context, action, user, role, body, flash, current, nav, banner }) {
  const name = personName(user);
  const shell = user && role;
  if (!shell) {
    return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Rostr</title>
  <link rel="stylesheet" href="${asset('/vendor/kaizen/variables.css')}">
  <link rel="stylesheet" href="${asset('/fonts/inter.css')}">
  <link rel="stylesheet" href="${asset('/app.css')}">
</head>
<body class="no-shell">
  <main class="content column">
    <h1>${escapeHtml(title)}</h1>
    ${context ? `<p class="context">${escapeHtml(context)}</p>` : ''}
    ${body}
  </main>
</body>
</html>`;
  }

  const variant = String(current || '').startsWith('/hr') ? 'admin' : 'default';
  const subtitle = context || [name, user.department].filter(Boolean).join(' · ');
  const groups = user.groups ? String(user.groups) : '';
  const crumb = variant === 'admin'
    ? `<a class="crumb" href="/leave">${icon('chevron-left')}<span>Back to my leave</span></a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Rostr</title>
  <link rel="stylesheet" href="${asset('/vendor/kaizen/variables.css')}">
  <link rel="stylesheet" href="${asset('/fonts/inter.css')}">
  <link rel="stylesheet" href="${asset('/app.css')}">
</head>
<body class="has-shell">
  <header class="global-nav">
    <div class="column nav-row">
      <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Rostr</a>
      <span class="org">Lanternfield Goods</span>
      <details class="account">
        <summary>
          <span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
          <span class="account-name">${escapeHtml(name)}</span>
        </summary>
        <div class="account-menu">
          <p>${escapeHtml(user.department || 'No department')}</p>
          <p><span class="chip chip-role">${ROLE_CHIP[role] || 'Staff'}</span></p>
          ${groups ? `<p class="account-groups">${escapeHtml(groups)}</p>` : ''}
          <a href="/logout">${icon('log-out')} Sign out</a>
        </div>
      </details>
    </div>
  </header>
  <section class="titleblock titleblock-${variant}">
    <div class="column">
      <div class="title-row">
        <div class="title-text">
          ${crumb}
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="context">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${action ? `<div class="page-actions">${action}</div>` : ''}
      </div>
      <nav class="tabs" aria-label="Sections">${tabsFor(role, current, nav)}</nav>
    </div>
  </section>
  <main class="content">
    <div class="column">
      ${banner ? `<div class="banner banner-bad" role="alert">${icon('alert-triangle')}<p>${escapeHtml(banner)}</p></div>` : ''}
      ${body}
    </div>
  </main>
  ${toastHtml(flash)}
</body>
</html>`;
}

module.exports = { page, escapeHtml, personName, ROLE_CHIP };
