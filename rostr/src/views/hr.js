const { escapeHtml, shortRange, plural, sydneyShort } = require('./format');
const { icon } = require('./icons');
const { TYPE_LABEL } = require('../leave');
const { jevWell, policyWell, agreement, weekGrid, flagBlock } = require('./queue');
const { progressHtml } = require('./leave');

const VIEWS = [
  ['waiting', 'Waiting'],
  ['approved', 'Approved'],
  ['declined', 'Declined'],
  ['all', 'All'],
];

function matches(row, view) {
  if (view === 'approved') return row.status === 'approved';
  if (view === 'declined') return row.status === 'denied';
  if (view === 'all') return true;
  return row.status === 'with_hr';
}

function managerLabel(row, names) {
  if (!row.manager_actor) return '<span class="muted">Not sent</span>';
  if (row.manager_actor === 'rostr') return '<span class="muted">Straight to HR</span>';
  return `${icon('check')}<span>${escapeHtml(names[row.manager_actor] || row.manager_actor)}</span>`;
}

function hrQueueBody({ rows, view, dept, names }) {
  const departments = [...new Set(rows.map((row) => row.department).filter(Boolean))].sort();
  const shown = rows.filter((row) => matches(row, view) && (!dept || row.department === dept));
  const count = (id) => rows.filter((row) => matches(row, id) && (!dept || row.department === dept)).length;
  const tabs = VIEWS.map(([id, label]) => {
    const href = `/hr/leave?view=${id}${dept ? `&dept=${encodeURIComponent(dept)}` : ''}`;
    return `<a href="${href}"${view === id ? ' aria-current="page"' : ''}>${label} <span class="tab-count">(${count(id)})</span></a>`;
  }).join('');
  const options = ['<option value="">All</option>'].concat(departments.map((name) => {
    const selected = name === dept ? ' selected' : '';
    return `<option value="${escapeHtml(name)}"${selected}>${escapeHtml(name)}</option>`;
  }));
  const empty = view === 'waiting'
    ? 'Nothing is waiting for HR.'
    : 'Nothing in this list.';
  const body = shown.length
    ? `<div class="table-wrap"><table class="hr-queue">
        <caption class="visually-hidden">Leave for HR</caption>
        <thead><tr>
          <th scope="col">Person</th><th scope="col">Department</th><th scope="col">Dates</th>
          <th scope="col" class="days-col">Days</th><th scope="col">Manager</th><th scope="col">Jev</th><th scope="col">Policy</th>
        </tr></thead>
        <tbody>${shown.map((row) => `<tr>
          <th scope="row"><a href="/hr/leave/${escapeHtml(row.ref)}">${escapeHtml(names[row.email] || row.email)}</a></th>
          <td>${escapeHtml(row.department || '')}</td>
          <td class="num">${shortRange(row.start_day, row.end_day)}</td>
          <td class="num days-col">${row.days}</td>
          <td class="signal">${managerLabel(row, names)}</td>
          <td class="signal">${jevCell(row)}</td>
          <td class="signal">${policyCell(row)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : `<p class="empty-copy">${empty}</p>`;
  return `<div class="queue-tools">
      <nav class="filter-tabs" aria-label="HR queue">${tabs}</nav>
      <form class="dept-filter" method="get" action="/hr/leave">
        <input type="hidden" name="view" value="${escapeHtml(view)}">
        <label for="dept">Department</label>
        <select id="dept" name="dept" onchange="this.form.submit()">${options.join('')}</select>
      </form>
    </div>
    <section class="panel table-panel">${body}</section>`;
}

function jevCell(row) {
  const { jevIsSure } = require('../jev');
  if (!row.jev_outcome) return '<span class="muted">No review</span>';
  if (!jevIsSure(row.jev_confidence)) return '<span class="muted">Isn\'t sure</span>';
  const percent = Math.round(Number(row.jev_confidence) * 100);
  const text = row.jev_outcome === 'deny' ? 'Deny' : row.jev_outcome === 'needs_review' ? 'Needs review' : 'Approve';
  return `${icon('sparkles')}<span>${text} · ${percent}%</span>`;
}

function policyCell(row) {
  if (!row.policy_outcome) return '<span class="muted">No check</span>';
  const mark = row.policy_outcome === 'deny' ? 'x' : row.policy_outcome === 'approve' ? 'check' : 'alert-triangle';
  const text = row.policy_outcome === 'deny' ? 'Deny' : row.policy_outcome === 'needs_review' ? 'Needs review' : 'Approve';
  return `${icon(mark)}<span>${text}</span>`;
}

function managerWell(events, names) {
  const row = [...events].reverse().find((event) => event.action === 'to_hr');
  if (!row) return '';
  if (row.actor === 'rostr') {
    return `<section class="well well-manager"><h2>${icon('info')} Manager</h2><p>${escapeHtml(row.note || 'No other admin in the department. It came straight to HR.')}</p></section>`;
  }
  const name = names[row.actor] || row.actor;
  const when = row.at ? sydneyShort(row.at) : '';
  const note = row.note ? `<p>${escapeHtml(row.note)}</p>` : '';
  return `<section class="well well-manager"><h2>${icon('check')} Manager</h2><p>Approved by ${escapeHtml(name)}${when ? `, ${escapeHtml(when)}` : ''}.</p>${note}</section>`;
}

function hrDecisionBody({ request, review, facts, events, names, own, error, week, flag, flagError }) {
  const form = own || request.status !== 'with_hr'
    ? ''
    : `<form method="post" action="/hr/leave/${escapeHtml(request.ref)}" class="decide">
        <label for="hr-note">Note <span>Needed to decline</span></label>
        <textarea id="hr-note" name="note" rows="3" maxlength="500"></textarea>
        ${error ? `<p class="field-error">${icon('alert-triangle')}${escapeHtml(error)}</p>` : ''}
        <div class="decide-actions">
          <button type="submit" class="btn destructive" name="action" value="deny">Decline</button>
          <button type="submit" class="btn primary" name="action" value="approve">Approve and update balance</button>
        </div>
      </form>`;
  const ownNote = own
    ? '<p class="banner-caution">You can\'t approve your own leave. It needs another HR approver.</p>'
    : '';
  const closed = !own && request.status !== 'with_hr'
    ? `<p class="helper">This request is ${escapeHtml(request.status === 'approved' ? 'approved' : request.status === 'denied' ? 'declined' : request.status)}.</p>`
    : '';
  return `<div class="decision">
    <section class="panel">
      ${progressHtml(request, events)}
      <h2 class="panel-title">Reason</h2>
      <blockquote class="reason">${escapeHtml(request.reason)}</blockquote>
      <dl class="decision-facts">
        <div><dt>Balance</dt><dd>${facts.remaining} ${TYPE_LABEL[request.leave_type] || request.leave_type} days left</dd></div>
        <div><dt>Notice</dt><dd>${facts.noticeDays} days</dd></div>
        <div><dt>Length</dt><dd>${plural(request.days, 'working day')}</dd></div>
      </dl>
      ${weekGrid(week)}
    </section>
    <section class="panel decision-side">
      ${ownNote}
      ${managerWell(events, names)}
      ${agreement(review)}
      ${jevWell(review)}
      ${policyWell(review)}
      ${form}
      ${closed}
      ${flagBlock({ action: `/hr/leave/${request.ref}/flag`, flag, own, error: flagError })}
    </section>
  </div>`;
}

function exportBody(changes, names = {}) {
  if (!changes.length) {
    return '<section class="panel empty"><p>Nothing to export. An HR approval writes a balance change here.</p></section>';
  }
  const rows = changes.map((row) => `<tr>
    <th scope="row">${escapeHtml(row.ref)}</th>
    <td>${escapeHtml(names[row.email] || row.email)}</td>
    <td>${escapeHtml(TYPE_LABEL[row.leave_type] || row.leave_type)}</td>
    <td class="num">${row.days}</td>
  </tr>`).join('');
  return `<section class="panel">
      <p>Each row is working days to take off that balance. Downloading does not change the HR file. Run leave-apply with a REQ number, and pass --apply once the dry-run is right.</p>
      <p class="export-action"><a class="btn primary" href="/hr/export.json">Download JSON</a></p>
    </section>
    <section class="panel table-panel"><table>
      <caption class="visually-hidden">Balance changes not yet applied</caption>
      <thead><tr><th scope="col">Request</th><th scope="col">Person</th><th scope="col">Type</th><th scope="col">Days</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></section>`;
}

module.exports = { hrQueueBody, hrDecisionBody, exportBody };
