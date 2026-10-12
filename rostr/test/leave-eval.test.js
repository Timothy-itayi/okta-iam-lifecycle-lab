const { test } = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('../../scripts/leave-eval');

test('leave eval matches the written rules, and a tighter notice window fails five cases', () => {
  const { baseline, compared } = main([]);
  assert.equal(baseline.length >= 20, true);
  assert.equal(baseline.every((row) => row.pass), true);
  const worse = compared.filter((row, index) => baseline[index].pass && !row.pass).map((row) => row.id);
  assert.deepEqual(worse, [
    'notice-fourteen-days',
    'cover-one-approved',
    'cover-submitted-does-not-count',
    'annual-eighteen-days',
    'annual-twenty-days',
  ]);
});
