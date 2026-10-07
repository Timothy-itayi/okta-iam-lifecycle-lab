const fs = require('fs');

function copyEmployee(employee) {
  return {
    ...employee,
    leave: employee.leave ? { ...employee.leave } : employee.leave,
  };
}

function createHrReader(file) {
  let cache = { mtimeMs: null, employees: [] };

  function load() {
    const mtimeMs = fs.statSync(file).mtimeMs;
    if (cache.mtimeMs === mtimeMs) return cache.employees;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('HR file must be a JSON array');
    cache = { mtimeMs, employees: parsed };
    return cache.employees;
  }

  return {
    listEmployees() {
      return load().map(copyEmployee);
    },
    getEmployeeByEmail(email) {
      const key = String(email || '').trim().toLowerCase();
      if (!key) return null;
      const found = load().find((employee) => String(employee.email || '').toLowerCase() === key);
      return found ? copyEmployee(found) : null;
    },
  };
}

module.exports = { createHrReader };
