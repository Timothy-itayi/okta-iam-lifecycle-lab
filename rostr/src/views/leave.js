const { escapeHtml, shortDay, listRange, longRange, sydneyStamp, sydneyShort, plural } = require('./format');
const { icon } = require('./icons');
const { LEAVE_TYPES, TYPE_LABEL, ENTITLEMENT, annualNoticeDays, REASON_MAX } = require('../leave');
const { OPEN } = require('../leave-state');

const TYPE_ICON = { annual: 'plane', sick: 'thermometer', personal: 'user' };

const STAFF_STATUS = {
  submitted: { text: 'Sent', tone: 'warn', icon: 'clock' },
  with_admin: { text: 'With manager', tone: 'warn', icon: 'clock' },
  with_hr: { text: 'With HR', tone: 'warn', icon: 'clock' },
  approved: { text: 'Approved', tone: 'ok', icon: 'check' },
  denied: { text: 'Declined', tone: 'bad', icon: 'x' },
  cancelled: { text: 'Cancelled', tone: 'muted', icon: null },
};

function statusChip(status) {
  const item = STAFF_STATUS[status] || { text: status, tone: 'muted', icon: null };
  return `<span class="chip chip-${item.tone}">${item.icon ? icon(item.icon) : ''}${escapeHtml(item.text)}</span>`;
}

function balanceTiles(balance) {
  return `<ul class="tiles" aria-label="Leave balances">${LEAVE_TYPES.map((type) => {
    const left = Number(balance[type] ?? 0);
    const total = ENTITLEMENT[type];
    const percent = Math.max(0, Math.min(100, Math.round((left / total) * 100)));
    const low = left < 3 ? ' low' : '';
    return `<li class="tile">
      <p class="tile-type">${icon(TYPE_ICON[type])}${TYPE_LABEL[type]}</p>
      <p class="tile-figure"><span class="balance">${left}</span> ${left === 1 ? 'day' : 'days'} left</p>
      <div class="bar${low}" role="img" aria-label="${left} of ${total} days left"><span style="width:${percent}%"></span></div>
      <p class="tile-foot">of ${total}</p>
    </li>`;
  }).join('')}</ul><p class="tiles-foot">From HR records</p>`;
}

function chainSteps(status) {
  const steps = [
    { label: 'Sent', state: 'done' },
    { label: 'Manager', state: 'upcoming' },
    { label: 'HR', state: 'upcoming' },
    { label: 'Done', state: 'upcoming' },
  ];
  if (status === 'submitted' || status === 'with_admin') steps[1].state = 'current';
  else if (status === 'with_hr') {
    steps[1].state = 'done';
    steps[2].state = 'current';
  } else if (status === 'approved') steps.forEach((step) => { step.state = 'done'; });
  else if (status === 'denied') steps[1].state = 'declined';
  else if (status === 'cancelled') steps[0].state = 'cancelled';
  return steps;
}

function chainHtml(status) {
  return `<ol class="chain">${chainSteps(status).map((step) => {
    const mark = step.state === 'done' ? icon('check') : step.state === 'declined' ? icon('x') : '';
    return `<li class="chain-step chain-${step.state}"${step.state === 'current' ? ' aria-current="step"' : ''}>
      <span class="chain-dot" aria-hidden="true">${mark}</span>
      <span>${escapeHtml(step.label)}</span>
    </li>`;
  }).join('')}</ol>`;
}

function requestRow(request) {
  return `<li><a class="request-card" href="/leave/${escapeHtml(request.ref)}">
    <span class="request-top">
      <span class="request-ref">${escapeHtml(request.ref)}</span>
      <span class="request-what">${TYPE_LABEL[request.leave_type] || escapeHtml(request.leave_type)} leave</span>
      ${statusChip(request.status)}
    </span>
    <span class="request-when num">${listRange(request.start_day, request.end_day)} · ${plural(request.days, 'day')}</span>
    ${chainHtml(request.status)}
  </a></li>`;
}

function requestList(requests) {
  if (!requests.length) {
    return `<section class="panel empty">${icon('calendar')}<h2 class="panel-title">No leave requested yet.</h2><a class="btn primary" href="/leave/new" data-sheet-open>Request leave</a></section>`;
  }
  const open = requests.filter((request) => OPEN.has(request.status));
  const past = requests.filter((request) => !OPEN.has(request.status));
  return `<section class="panel list-panel" aria-labelledby="requests-title">
    <h2 id="requests-title" class="panel-title">Requests</h2>
    ${open.length ? `<ul class="rows">${open.map(requestRow).join('')}</ul>` : ''}
    ${past.length ? `<h3 class="section-label">Past requests</h3><ul class="rows">${past.map(requestRow).join('')}</ul>` : ''}
  </section>`;
}

function fieldError(errors, field) {
  const error = errors.find((item) => item.field === field);
  return error ? `<p class="field-error" id="error-${field}">${icon('alert-triangle')}${escapeHtml(error.message)}</p>` : '';
}

function describedBy(errors, field, helper) {
  const ids = [];
  if (errors.some((item) => item.field === field)) ids.push(`error-${field}`);
  if (helper) ids.push(helper);
  return ids.length ? ` aria-describedby="${ids.join(' ')}"` : '';
}

function invalid(errors, field) {
  return errors.some((item) => item.field === field) ? ' aria-invalid="true"' : '';
}

function errorSummary(errors) {
  if (!errors.length) return '';
  const target = { leave_type: 'type-annual', start_day: 'field-start_day', end_day: 'field-end_day', reason: 'field-reason' };
  const seen = new Set();
  const items = errors.filter((error) => !seen.has(error.message) && seen.add(error.message));
  return `<div class="error-summary" role="alert" tabindex="-1" id="error-summary">
    <p class="error-summary-title">${icon('alert-triangle')}Fix ${items.length === 1 ? 'this' : 'these'} to send the request</p>
    <ul>${items.map((error) => `<li><a href="#${target[error.field]}">${escapeHtml(error.message)}</a></li>`).join('')}</ul>
  </div>`;
}

function requestForm({ value = {}, errors = [], notices = [], balance, openDays, route, today, standalone = false }) {
  const data = escapeHtml(JSON.stringify({ balance, openDays, today, notice: annualNoticeDays() }));
  const summary = value.days ? `${plural(value.days, 'working day')} · ${longRange(value.start_day, value.end_day)}` : 'Choose a start and end date.';
  const reason = value.reason || '';
  const closeHref = '/leave';
  return `<form method="post" action="/leave" class="sheet-form" id="leave-form" novalidate data-leave="${data}">
    ${standalone ? '' : `<div class="sheet-head">
      <h2 id="sheet-title">Request leave</h2>
      <a class="icon-btn" href="${closeHref}" data-sheet-close aria-label="Close">${icon('x')}</a>
    </div>`}
    <div class="sheet-body">
      ${errorSummary(errors)}
      <fieldset class="field"${describedBy(errors, 'leave_type')}>
        <legend>Type</legend>
        <div class="type-cards">
          ${LEAVE_TYPES.map((type, index) => {
            const left = Number(balance[type] ?? 0);
            return `<input type="radio" name="leave_type" value="${type}" id="type-${type}"${value.leave_type === type ? ' checked' : ''}${index === 0 ? invalid(errors, 'leave_type') : ''}>
            <label for="type-${type}" class="type-card">${icon(TYPE_ICON[type])}<span class="type-name">${TYPE_LABEL[type]}</span><span class="type-left num">${left} ${left === 1 ? 'day' : 'days'} left</span></label>`;
          }).join('')}
        </div>
        ${fieldError(errors, 'leave_type')}
      </fieldset>
      <fieldset class="field">
        <legend>Dates</legend>
        <div class="date-pair">
          <div>
            <label for="field-start_day">Start</label>
            <input type="date" name="start_day" id="field-start_day" value="${escapeHtml(value.start_day || '')}"${invalid(errors, 'start_day')}${describedBy(errors, 'start_day')}>
            ${fieldError(errors, 'start_day')}
          </div>
          <div>
            <label for="field-end_day">End</label>
            <input type="date" name="end_day" id="field-end_day" value="${escapeHtml(value.end_day || '')}"${invalid(errors, 'end_day')}${describedBy(errors, 'end_day')}>
            ${fieldError(errors, 'end_day')}
          </div>
        </div>
        <p class="helper num" id="date-summary" aria-live="polite">${escapeHtml(summary)}</p>
      </fieldset>
      <div id="notices" aria-live="polite">${notices.map((text) => `<div class="notice">${icon('alert-triangle')}<p>${escapeHtml(text)}</p></div>`).join('')}</div>
      <div class="field">
        <label for="field-reason">Reason</label>
        <textarea name="reason" id="field-reason" rows="4" maxlength="${REASON_MAX}"${invalid(errors, 'reason')}${describedBy(errors, 'reason', 'reason-help')}>${escapeHtml(reason)}</textarea>
        ${fieldError(errors, 'reason')}
        <p class="helper split" id="reason-help"><span>Your manager and HR will read this.</span><span class="num" id="reason-count">${reason.length} / ${REASON_MAX}</span></p>
      </div>
    </div>
    <div class="sheet-foot">
      <p>${escapeHtml(route)}</p>
      <div class="actions">
        <a class="btn secondary" href="${closeHref}" data-sheet-close>Cancel</a>
        <button type="submit" class="btn primary">Send request</button>
      </div>
    </div>
  </form>`;
}

const FORM_SCRIPT = `<script>
(function () {
  var form = document.getElementById('leave-form');
  if (!form) return;
  var data = JSON.parse(form.getAttribute('data-leave'));
  var dayMs = 86400000;
  function parse(v) { return /^\\d{4}-\\d{2}-\\d{2}$/.test(v) ? new Date(v + 'T00:00:00Z') : null; }
  function fmt(d, o) { o.timeZone = 'UTC'; return new Intl.DateTimeFormat('en-AU', o).format(d).replace(',', ''); }
  function weekdays(a, b) { var n = 0; for (var t = a.getTime(); t <= b.getTime(); t += dayMs) { var w = new Date(t).getUTCDay(); if (w && w !== 6) n++; } return n; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  var mark = ${JSON.stringify(icon('alert-triangle'))};
  function notice(text) { return '<div class="notice">' + mark + '<p>' + text + '</p></div>'; }
  function update() {
    var type = (form.querySelector('input[name=leave_type]:checked') || {}).value;
    var a = parse(form.start_day.value), b = parse(form.end_day.value);
    var summary = document.getElementById('date-summary'), box = document.getElementById('notices');
    var html = '';
    if (a && b && b >= a) {
      var days = weekdays(a, b);
      var range = a.getTime() === b.getTime() ? fmt(a, { weekday: 'long', day: 'numeric', month: 'long' })
        : fmt(a, { weekday: 'short', day: 'numeric' }) + ' – ' + fmt(b, { weekday: 'short', day: 'numeric', month: 'long' });
      summary.textContent = days ? plural(days, 'working day') + ' · ' + range : 'No weekdays in these dates.';
      if (type && days) {
        var open = data.openDays[type] || 0, left = (data.balance[type] || 0) - open;
        if (days > left) {
          var over = days - Math.max(left, 0);
          html += notice('This is ' + plural(over, 'day') + ' more than your ' + type + ' balance' + (open ? ' after the ' + open + ' already requested' : '') + '. You can still send it; your approver will see this.');
        }
        if (type === 'annual' && (a - parse(data.today)) / dayMs < data.notice) {
          html += notice('Annual leave needs ' + data.notice + " days' notice. You can still send it.");
        }
      }
    } else if (a && b) {
      summary.textContent = 'Choose an end date on or after the start date.';
    } else {
      summary.textContent = 'Choose a start and end date.';
    }
    box.innerHTML = html;
    document.getElementById('reason-count').textContent = form.reason.value.length + ' / ${REASON_MAX}';
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  var sheet = document.getElementById('request-sheet');
  if (sheet && sheet.showModal) {
    document.querySelectorAll('[data-sheet-open]').forEach(function (link) {
      link.addEventListener('click', function (event) { event.preventDefault(); sheet.showModal(); form.querySelector('input[name=leave_type]').focus(); });
    });
    sheet.querySelectorAll('[data-sheet-close]').forEach(function (link) {
      link.addEventListener('click', function (event) { event.preventDefault(); sheet.close(); });
    });
    sheet.addEventListener('click', function (event) { if (event.target === sheet) sheet.close(); });
  }
  var summaryBox = document.getElementById('error-summary');
  if (summaryBox) summaryBox.focus();
})();
</script>`;

function myLeaveBody({ balance, requests, form }) {
  return `${balanceTiles(balance)}
  ${requestList(requests)}
  <dialog id="request-sheet" class="sheet" aria-labelledby="sheet-title">${form}</dialog>
  ${FORM_SCRIPT}`;
}

function newLeaveBody({ form }) {
  return `<div class="sheet sheet-page">${form}</div>${FORM_SCRIPT}`;
}

function stepsFor(request, events) {
  const routedToHr = events.find((event) => event.action === 'to_hr');
  const skippedManager = routedToHr && routedToHr.actor === 'rostr';
  const at = (action) => (events.find((event) => event.action === action) || {}).at;
  const closing = events.find((event) => ['deny', 'cancel', 'approve'].includes(event.action));
  const steps = [
    { label: 'Sent', state: 'done', sub: sydneyShort(request.created_at) },
    { label: 'Manager', state: 'future', sub: '' },
    { label: 'HR', state: 'future', sub: '' },
    { label: 'Done', state: 'future', sub: '' },
  ];
  const manager = steps[1];
  const hr = steps[2];
  const done = steps[3];
  if (skippedManager) {
    manager.state = 'skipped';
    manager.sub = 'No manager step';
  } else if (routedToHr) {
    manager.state = 'done';
    manager.sub = sydneyShort(routedToHr.at);
  }
  const stage = routedToHr ? hr : manager;
  if (request.status === 'with_admin' || request.status === 'with_hr') {
    stage.state = 'current';
    stage.sub = 'Waiting';
  } else if (request.status === 'approved') {
    hr.state = 'done';
    hr.sub = sydneyShort(at('approve'));
    done.state = 'done';
    done.sub = 'Approved';
  } else if (request.status === 'denied') {
    stage.state = 'declined';
    stage.sub = 'Declined';
  } else if (request.status === 'cancelled') {
    stage.state = 'cancelled';
    stage.sub = closing ? `Cancelled ${sydneyShort(closing.at)}` : 'Cancelled';
  }
  return steps;
}

function stepper(steps) {
  return `<ol class="stepper">${steps.map((step) => {
    const mark = step.state === 'done' ? icon('check') : step.state === 'declined' ? icon('x') : '';
    return `<li class="step step-${step.state}"${step.state === 'current' ? ' aria-current="step"' : ''}>
      <span class="step-dot" aria-hidden="true">${mark}</span>
      <span class="step-label">${escapeHtml(step.label)}</span>
      <span class="step-sub">${escapeHtml(step.sub)}</span>
    </li>`;
  }).join('')}</ol>`;
}

const STAFF_ACTIONS = new Set(['submitted', 'to_admin', 'to_hr', 'approve', 'deny', 'cancel']);

function activityText(event, request) {
  switch (event.action) {
    case 'submitted': return 'You sent this request';
    case 'to_admin': return `Sent to ${event.note || 'your manager'}`;
    case 'to_hr': return event.actor === 'rostr' ? `Sent to HR. ${event.note || ''}`.trim() : 'Your manager approved it. Sent to HR';
    case 'approve': return 'HR approved it';
    case 'deny': return event.note ? `Declined: "${event.note}"` : 'Declined';
    case 'cancel': return event.actor.toLowerCase() === request.email.toLowerCase() ? 'You cancelled this request' : 'Cancelled';
    default: return event.action;
  }
}

function detailBody({ request, events, confirm }) {
  const steps = stepsFor(request, events);
  const visible = events.filter((event) => STAFF_ACTIONS.has(event.action));
  const cancel = OPEN.has(request.status) && confirm
    ? `<section class="panel confirm" aria-labelledby="confirm-title">
        <h2 id="confirm-title" class="panel-title">Cancel ${escapeHtml(request.ref)}?</h2>
        <p>Your approver won't see it any more. You can send a new request later.</p>
        <form method="post" action="/leave/${escapeHtml(request.ref)}/cancel" class="actions">
          <a class="btn secondary" href="/leave/${escapeHtml(request.ref)}">Keep it</a>
          <button type="submit" class="btn destructive">Cancel request</button>
        </form>
      </section>`
    : '';
  return `${cancel}
  <section class="panel">
    ${stepper(steps)}
  </section>
  <section class="panel">
    <h2 class="panel-title">Your reason</h2>
    <blockquote class="reason">${escapeHtml(request.reason)}</blockquote>
  </section>
  <section class="panel">
    <h2 class="panel-title">Activity</h2>
    <ul class="activity">${visible.map((event) => `<li><time class="num" datetime="${escapeHtml(event.at)}">${sydneyStamp(event.at)}</time><span>${escapeHtml(activityText(event, request))}</span></li>`).join('')}</ul>
  </section>`;
}

function detailHeader(request) {
  return {
    title: `${request.ref} · ${TYPE_LABEL[request.leave_type] || request.leave_type} leave`,
    context: `${longRange(request.start_day, request.end_day)} · ${plural(request.days, 'working day')}`,
  };
}

function progressHtml(request, events) {
  return stepper(stepsFor(request, events));
}

function rosterBody({ shifts, leaveDays }) {
  if (!shifts.length) {
    return '<section class="panel empty"><p>No shifts on your roster yet.</p></section>';
  }
  const rows = shifts.map((shift) => {
    const onLeave = leaveDays.has(shift.day);
    return `<tr${onLeave ? ' class="released"' : ''}>
      <th scope="row" class="num">${escapeHtml(shortDay(shift.day))}</th>
      <td class="num">${onLeave ? `<s>${escapeHtml(shift.start)}–${escapeHtml(shift.end)}</s>` : `${escapeHtml(shift.start)}–${escapeHtml(shift.end)}`}</td>
      <td>${onLeave ? '<span class="chip chip-muted">On leave</span>' : 'Scheduled'}</td>
    </tr>`;
  }).join('');
  return `<section class="panel table-panel">
    <table>
      <caption class="visually-hidden">Your shifts</caption>
      <thead><tr><th scope="col">Day</th><th scope="col">Shift</th><th scope="col">Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

module.exports = {
  statusChip,
  balanceTiles,
  requestForm,
  myLeaveBody,
  newLeaveBody,
  detailBody,
  detailHeader,
  stepsFor,
  progressHtml,
  rosterBody,
};
