function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function utcDate(day) {
  return new Date(`${day}T00:00:00Z`);
}

function format(day, options) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...options }).format(utcDate(day));
}

// Mon 20 Oct
function shortDay(day) {
  return format(day, { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

// Monday 20 October
function longDay(day) {
  return format(day, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
}

// 20–22 Oct, 30 Oct – 2 Nov, 2 Oct
function shortRange(start, end) {
  const startDay = format(start, { day: 'numeric' });
  const startMonth = format(start, { month: 'short' });
  if (start === end) return `${startDay} ${startMonth}`;
  const endDay = format(end, { day: 'numeric' });
  const endMonth = format(end, { month: 'short' });
  if (startMonth === endMonth) return `${startDay}–${endDay} ${startMonth}`;
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

// Mon 20 – Wed 22 October
function longRange(start, end) {
  if (start === end) return longDay(start);
  const startText = format(start, { weekday: 'short', day: 'numeric' }).replace(',', '');
  return `${startText} – ${format(end, { weekday: 'short', day: 'numeric', month: 'long' }).replace(',', '')}`;
}

function sydneyStamp(iso) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type) => (parts.find((part) => part.type === type) || {}).value || '';
  return `${get('day')} ${get('month')} ${get('hour')}:${get('minute')}`;
}

function sydneyShort(iso) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short' }).format(new Date(iso));
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
}

module.exports = { escapeHtml, shortDay, longDay, shortRange, longRange, sydneyStamp, sydneyShort, plural, initials };
