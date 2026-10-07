const SHIFT_START = '09:00';
const SHIFT_END = '17:00';

function weekdayDates(from, weeks = 2) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('from must be YYYY-MM-DD');
  const start = new Date(`${from}T00:00:00Z`);
  if (start.getUTCDay() !== 1) throw new Error('from must be a Monday');
  const dates = [];
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

function seedShifts(db, employees, { from, insertShift }) {
  const dates = weekdayDates(from);
  const active = employees.filter((employee) => employee.status === 'active' && employee.email);
  let inserted = 0;
  for (const employee of active) {
    for (const day of dates) {
      const before = db.prepare('SELECT id FROM shifts WHERE email = ? AND day = ?').get(employee.email, day);
      insertShift(db, {
        email: employee.email,
        day,
        start: SHIFT_START,
        end: SHIFT_END,
        status: 'scheduled',
      });
      if (!before) inserted += 1;
    }
  }
  return { people: active.length, days: dates.length, inserted };
}

module.exports = { weekdayDates, seedShifts, SHIFT_START, SHIFT_END };
