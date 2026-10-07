const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHrReader } = require('../src/hr');

function tempFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-hr-'));
  const file = path.join(dir, 'employees.json');
  fs.writeFileSync(file, JSON.stringify(contents));
  return file;
}

test('getEmployeeByEmail is case-insensitive and reloads when the file changes', () => {
  const file = tempFile([{
    employeeId: 'EMP-1003',
    email: 'priya.shah@lanternfieldgoods.co.uk',
    status: 'active',
    leave: { annual: 2, sick: 8, personal: 2 },
  }]);
  const hr = createHrReader(file);
  assert.equal(hr.getEmployeeByEmail('Priya.Shah@lanternfieldgoods.co.uk').leave.annual, 2);
  assert.equal(hr.listEmployees().length, 1);

  fs.writeFileSync(file, JSON.stringify([{
    employeeId: 'EMP-1003',
    email: 'priya.shah@lanternfieldgoods.co.uk',
    status: 'active',
    leave: { annual: 1, sick: 8, personal: 2 },
  }]));
  const later = new Date(Date.now() + 2000);
  fs.utimesSync(file, later, later);

  assert.equal(hr.getEmployeeByEmail('priya.shah@lanternfieldgoods.co.uk').leave.annual, 1);
});

test('a missing email is null', () => {
  const file = tempFile([]);
  const hr = createHrReader(file);
  assert.equal(hr.getEmployeeByEmail('nobody@example.invalid'), null);
});
