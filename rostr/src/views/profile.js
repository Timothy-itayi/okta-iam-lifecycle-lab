const { escapeHtml, initials } = require('./format');

function profileBody(user) {
  const name = [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email || user.userName || '';
  const rows = Object.entries(user).map(([key, value]) => {
    return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`;
  }).join('');
  return `<section class="panel photo-panel">
    <div class="photo-row">
      <span class="avatar avatar-lg" data-avatar>
        <img alt="" hidden>
        <span class="avatar-initials">${escapeHtml(initials(name))}</span>
      </span>
      <div>
        <h2 class="panel-title">Photo</h2>
        <p class="helper">Stored in this browser for this sign-in only. Rostr does not receive the file.</p>
        <div class="photo-actions">
          <label class="btn secondary">Add photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-photo-input></label>
          <button type="button" class="btn secondary" data-photo-remove>Remove photo</button>
        </div>
        <p class="helper" data-photo-status role="status"></p>
      </div>
    </div>
  </section>
  <section class="panel table-panel" aria-labelledby="signin-title">
    <h2 id="signin-title" class="panel-title">This sign-in</h2>
    <table>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

module.exports = { profileBody };
