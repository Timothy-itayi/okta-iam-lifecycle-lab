function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const HUBS = {
  staff: { href: '/leave', label: 'My leave' },
  admin: { href: '/admin/leave', label: 'Department' },
  hr: { href: '/hr/leave', label: 'HR' },
};

const BADGE = { staff: 'Staff', admin: 'Admin', hr: 'HR' };

function page({ title, user, role, body, flash }) {
  const name = user
    ? [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email || user.userName || 'Signed in'
    : '';
  const links = role && HUBS[role]
    ? `<a href="${HUBS[role].href}">${HUBS[role].label}</a>`
    : '';
  const who = user
    ? `<span class="who">${escapeHtml(name)}</span>
       <span class="dept">${escapeHtml(user.department || '')}</span>
       <span class="badge">${BADGE[role] || 'Staff'}</span>
       <a href="/logout">Sign out</a>`
    : '<a href="/oidc/login">Sign in</a>';
  const toast = flash
    ? `<p class="toast" role="status">${escapeHtml(flash)}</p>
       <script>setTimeout(function () {
         var node = document.querySelector('.toast');
         if (node) node.classList.add('gone');
       }, 4000);</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <header class="top">
    <a class="brand" href="/">Rostr</a>
    <nav>${links}</nav>
    <div class="account">${who}</div>
  </header>
  <main>
    ${toast}
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

module.exports = { page, escapeHtml };
