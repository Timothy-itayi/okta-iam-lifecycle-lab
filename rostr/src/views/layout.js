const { escapeHtml, initials } = require('./format');
const { icon } = require('./icons');

const ROLE_CHIP = { staff: 'Staff', admin: 'Manager', hr: 'HR' };
// Helen's browser cached the /app.css 404 from before public/ was in the image.
// Cloudflare rewrites the cache header to 4 hours, so the URL has to change.
const ASSET_VERSION = '9';

function asset(path) {
  return `${path}?v=${ASSET_VERSION}`;
}

function groupItems(groups) {
  if (!groups) return [];
  const list = Array.isArray(groups) ? groups : String(groups).split(',');
  return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))].sort();
}

function photoKey(user) {
  if (!user) return '';
  return String(user.email || user.userName || user.sub || '').trim().toLowerCase();
}

function avatarHtml(name, large) {
  const size = large ? ' avatar-lg' : '';
  return `<span class="avatar${size}" data-avatar>
    <img alt="" hidden>
    <span class="avatar-initials">${escapeHtml(initials(name))}</span>
  </span>`;
}

function identityFacts({ department, jobTitle, groups, role }) {
  const items = groupItems(groups);
  const groupHtml = items.length
    ? `<ul class="group-list">${items.map((group) => `<li>${escapeHtml(group)}</li>`).join('')}</ul>`
    : '<span class="fact-empty">None in this sign-in</span>';
  const roleHtml = role
    ? `<div><dt>Role</dt><dd><span class="chip chip-role">${ROLE_CHIP[role] || 'Staff'}</span></dd></div>`
    : '';
  return `<dl class="facts">
    <div><dt>Department</dt><dd>${escapeHtml(department || 'Not recorded')}</dd></div>
    <div><dt>Title</dt><dd>${escapeHtml(jobTitle || 'Not recorded')}</dd></div>
    <div><dt>Groups</dt><dd>${groupHtml}</dd></div>
    ${roleHtml}
  </dl>`;
}

function accountMeta({ department, jobTitle, groups, role }) {
  const line = [ROLE_CHIP[role] || '', department, jobTitle].filter(Boolean).join(' · ');
  const names = groupItems(groups);
  return `${line ? `<p class="account-meta">${escapeHtml(line)}</p>` : ''}${names.length ? `<p class="account-groups">${escapeHtml(names.join(', '))}</p>` : ''}`;
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

function promptHtml(flash) {
  if (!flash) return '';
  const message = typeof flash === 'string' ? { text: flash } : flash;
  const title = message.title || 'Notice';
  const view = message.href ? `<a class="btn secondary" href="${escapeHtml(message.href)}">View request</a>` : '';
  return `<dialog class="prompt" open aria-labelledby="prompt-title">
    <h2 id="prompt-title">${escapeHtml(title)}</h2>
    <p>${escapeHtml(message.text)}</p>
    <div class="prompt-actions">
      ${view}
      <button type="button" class="btn primary" data-prompt-close autofocus>OK</button>
    </div>
  </dialog>
  <script>
    var prompt = document.querySelector('.prompt');
    if (prompt && typeof prompt.showModal === 'function') {
      if (prompt.open) prompt.close();
      prompt.showModal();
      prompt.querySelector('[data-prompt-close]').addEventListener('click', function () { prompt.close(); });
    }
  </script>`;
}

function photoScript() {
  return `<script src="${asset('/profile.js')}"></script>`;
}

function page({ title, context, action, user, role, jobTitle, groups, body, flash, current, nav, banner }) {
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
  const facts = identityFacts({
    department: user.department,
    jobTitle,
    groups: groups && groups.length ? groups : user.groups,
    role,
  });
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
<body class="has-shell" data-user-key="${escapeHtml(photoKey(user))}">
  <header class="global-nav">
    <div class="column nav-row">
      <a class="brand" href="/"><span class="mark" aria-hidden="true"></span>Rostr</a>
      <span class="org">Lanternfield Goods</span>
      <details class="account">
        <summary>
          ${avatarHtml(name)}
          <span class="account-name">${escapeHtml(name)}</span>
        </summary>
        <div class="account-menu">
          <p class="account-person">${escapeHtml(name)}</p>
          ${accountMeta({
            department: user.department,
            jobTitle,
            groups: groups && groups.length ? groups : user.groups,
            role,
          })}
          <nav class="account-links" aria-label="Account">
            <a href="/me">${icon('user')} Profile</a>
            <a href="/leave">${icon('calendar')} My leave</a>
            <a href="/logout">${icon('log-out')} Sign out</a>
          </nav>
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
          ${facts}
          ${context ? `<p class="context">${escapeHtml(context)}</p>` : ''}
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
  ${promptHtml(flash)}
  ${photoScript()}
</body>
</html>`;
}

module.exports = { page, escapeHtml, personName, ROLE_CHIP, identityFacts, photoKey };
