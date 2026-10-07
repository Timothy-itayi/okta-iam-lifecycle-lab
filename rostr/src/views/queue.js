const { escapeHtml, listRange, longRange, plural } = require('./format');
const { activityList, approverLine } = require('./leave');
const { icon } = require('./icons');
const { TYPE_LABEL } = require('../leave');
const { loadRules } = require('../policy');
const { jevIsSure } = require('../jev');

const OUTCOME = { approve: 'Approve', deny: 'Deny', needs_review: 'Needs review' };

function outcomeText(value) {
  return OUTCOME[value] || value || '';
}

function ruleText(id) {
  const rules = loadRules();
  const rule = rules.rules.find((item) => item.id === id);
  return rule ? rule.text : id;
}

function personCell(name) {
  return escapeHtml(name || 'Unknown');
}

function jevCell(row) {
  if (!row.jev_outcome) return '<span class="muted">No review</span>';
  if (!jevIsSure(row.jev_confidence)) return '<span class="muted">Isn\'t sure</span>';
  const percent = Math.round(Number(row.jev_confidence) * 100);
  return `${icon('sparkles')}<span>${escapeHtml(outcomeText(row.jev_outcome))} · ${percent}%</span>`;
}

function policyCell(row) {
  if (!row.policy_outcome) return '<span class="muted">No check</span>';
  const mark = row.policy_outcome === 'deny' ? 'x' : row.policy_outcome === 'approve' ? 'check' : 'alert-triangle';
  return `${icon(mark)}<span>${escapeHtml(outcomeText(row.policy_outcome))}</span>`;
}

function queueBody({ waiting, decided, view, names }) {
  const rows = view === 'decided' ? decided : waiting;
  const tab = (id, label, count) => {
    const active = view === id;
    return `<a href="/admin/leave?view=${id}"${active ? ' aria-current="page"' : ''}>${label} <span class="tab-count">(${count})</span></a>`;
  };
  const empty = view === 'decided'
    ? 'Nothing decided yet.'
    : 'Nothing waiting. New requests from your department will appear here.';
  const body = rows.length
    ? `<div class="table-wrap"><table>
        <caption class="visually-hidden">${view === 'decided' ? 'Decided requests' : 'Requests waiting for you'}</caption>
        <thead><tr><th scope="col">Person</th><th scope="col">Dates</th><th scope="col">Days</th><th scope="col">Type</th><th scope="col">Jev</th><th scope="col">Policy</th></tr></thead>
        <tbody>${rows.map((row) => `<tr>
          <th scope="row"><a href="/admin/leave/${escapeHtml(row.ref)}">${personCell(names[row.email])}</a></th>
          <td class="num">${listRange(row.start_day, row.end_day)}</td>
          <td class="num">${row.days}</td>
          <td>${escapeHtml(TYPE_LABEL[row.leave_type] || row.leave_type)}</td>
          <td class="signal">${jevCell(row)}</td>
          <td class="signal">${policyCell(row)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : `<p class="empty-copy">${empty}</p>`;
  return `<nav class="filter-tabs" aria-label="Queue">${tab('waiting', 'Waiting', waiting.length)}${tab('decided', 'Decided', decided.length)}</nav>
    <section class="panel table-panel">${body}</section>`;
}

function jevWell(review) {
  if (!review || !review.jev_outcome) {
    return `<section class="well well-muted"><h2>${icon('sparkles')} Jev suggests</h2><p>Jev couldn't review this request. Use the policy check.</p></section>`;
  }
  if (!jevIsSure(review.jev_confidence)) {
    return `<section class="well well-muted"><h2>${icon('sparkles')} Jev suggests</h2><p>Jev isn't sure. Decide using the policy check.</p></section>`;
  }
  const percent = Math.round(Number(review.jev_confidence) * 100);
  const fit = review.jev_reason_fit === 'inconsistent'
    ? 'Reason does not fit the leave type'
    : 'Reason fits the leave type';
  const urgency = Number.isFinite(Number(review.jev_urgency))
    ? `<p>Urgency ${review.jev_urgency} of 5</p>`
    : '';
  return `<section class="well well-jev">
    <h2>${icon('sparkles')} Jev suggests</h2>
    <p class="well-outcome">${escapeHtml(outcomeText(review.jev_outcome))}</p>
    <p class="confidence"><span style="width:${percent}%"></span></p>
    <p>${percent}%</p>
    <p>Rule: ${escapeHtml(ruleText(review.jev_rule))}</p>
    <p>${escapeHtml(fit)}</p>
    ${urgency}
    <p class="footnote">Suggestion only. Jev can't approve or deny.</p>
  </section>`;
}

function policyWell(review) {
  let ids = [];
  try { ids = JSON.parse(review && review.policy_rules || '[]'); } catch { ids = []; }
  const items = ids.map((id) => `<li>${escapeHtml(ruleText(id))}</li>`).join('');
  const outcome = review && review.policy_outcome;
  return `<section class="well">
    <h2>${icon('scale')} Policy check</h2>
    <p class="well-outcome outcome-${escapeHtml(outcome || 'none')}">${escapeHtml(outcome ? outcomeText(outcome) : 'No check')}</p>
    ${items ? `<ul>${items}</ul>` : ''}
  </section>`;
}

function agreement(review) {
  if (!review || review.agree == null || !review.jev_outcome) return '';
  if (review.agree) return `<p class="agree">${icon('check')} Jev and the policy check agree.</p>`;
  return `<p class="disagree">${icon('alert-triangle')} Jev and the policy check disagree. Check before deciding.</p>`;
}

const CELL = {
  requested: 'requested leave',
  leave: 'on leave',
  rostered: 'rostered',
  '': 'nothing scheduled',
};

function weekdayName(day, style) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: style }).format(new Date(`${day}T00:00:00Z`));
}

function weekGrid(weeks) {
  if (!weeks || !weeks.length) return '';
  const tables = weeks.map((week) => {
    const head = week.days.map((day) => `<th scope="col">${escapeHtml(weekdayName(day, 'short'))}</th>`).join('');
    const body = week.rows.map((row) => `<tr>
      <th scope="row">${escapeHtml(row.name)}</th>
      ${row.cells.map((state, index) => {
        const day = week.days[index];
        const label = `${row.name}, ${weekdayName(day, 'long')}, ${CELL[state] || CELL['']}`;
        return `<td class="cell-${state || 'empty'}" aria-label="${escapeHtml(label)}"></td>`;
      }).join('')}
    </tr>`).join('');
    return `<div class="table-wrap"><table class="week">
      <caption class="visually-hidden">Team that week</caption>
      <thead><tr><th scope="col">Person</th>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }).join('');
  return `<h2 class="panel-title">Team that week</h2>
    ${tables}
    <ul class="week-legend">
      <li><span class="swatch cell-requested"></span> Requested</li>
      <li><span class="swatch cell-leave"></span> On leave</li>
      <li><span class="swatch cell-rostered"></span> Rostered</li>
    </ul>`;
}

function flagBlock({ action, flag, own, error }) {
  if (own) return '';
  const saved = flag
    ? `<p class="flag-saved">${icon('flag')} Flagged. You said Jev should have suggested ${escapeHtml(outcomeText(flag.suggested))}. The suggestion itself is unchanged.</p>`
    : '';
  const choices = [
    ['approve', 'Approve'],
    ['deny', 'Deny'],
    ['needs_review', 'Needs review'],
  ].map(([value, label]) => `<label><input type="radio" name="suggested" value="${value}"> ${label}</label>`).join('');
  return `${saved}
    <details class="flag"${error ? ' open' : ''}>
      <summary>Flag Jev's suggestion</summary>
      <form method="post" action="${escapeHtml(action)}">
        <fieldset>
          <legend>What should Jev have suggested?</legend>
          <div class="flag-options">${choices}</div>
        </fieldset>
        <label for="flag-note">Note</label>
        <textarea id="flag-note" name="note" rows="3" maxlength="500"></textarea>
        ${error ? `<p class="field-error">${icon('alert-triangle')}${escapeHtml(error)}</p>` : ''}
        <button type="submit" class="btn secondary">Save flag</button>
      </form>
    </details>`;
}

function decisionBody({ request, review, facts, events, names, own, error, week, flag, flagError }) {
  const form = own || request.status !== 'with_admin'
    ? ''
    : `<form method="post" action="/admin/leave/${escapeHtml(request.ref)}" class="decide">
        <label for="decision-note">Note <span>Needed to deny</span></label>
        <textarea id="decision-note" name="note" rows="3" maxlength="500"></textarea>
        ${error ? `<p class="field-error">${icon('alert-triangle')}${escapeHtml(error)}</p>` : ''}
        <div class="decide-actions">
          <button type="submit" class="btn destructive" name="action" value="deny">Deny</button>
          <button type="submit" class="btn primary" name="action" value="approve">Approve</button>
        </div>
      </form>`;
  const ownNote = own
    ? '<p class="banner banner-info">You can\'t decide your own request. It has gone to HR.</p>'
    : '';
  const closed = !own && request.status !== 'with_admin'
    ? `<p class="helper">This request is ${escapeHtml(request.status === 'denied' ? 'declined' : request.status === 'with_hr' ? 'with HR' : request.status)}.</p>`
    : '';
  return `<div class="decision">
    <section class="panel">
      <h2 class="panel-title">Reason</h2>
      <blockquote class="reason">${escapeHtml(request.reason)}</blockquote>
      <dl class="decision-facts">
        <div><dt>Balance</dt><dd>${facts.remaining} ${TYPE_LABEL[request.leave_type] || request.leave_type} days left</dd></div>
        <div><dt>Notice</dt><dd>${facts.noticeDays} days</dd></div>
        <div><dt>Length</dt><dd>${plural(request.days, 'working day')}</dd></div>
      </dl>
      ${weekGrid(week)}
      ${activityList(events, (event) => approverLine(event, request, names))}
    </section>
    <section class="panel decision-side">
      ${ownNote}
      ${agreement(review)}
      ${jevWell(review)}
      ${policyWell(review)}
      ${form}
      ${closed}
      ${flagBlock({ action: `/admin/leave/${request.ref}/flag`, flag, own, error: flagError })}
    </section>
  </div>`;
}

module.exports = { queueBody, decisionBody, jevWell, policyWell, agreement, weekGrid, flagBlock };
