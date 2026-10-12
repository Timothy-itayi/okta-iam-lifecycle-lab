#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { evaluate, loadRules } = require('../rostr/src/policy');

const CASES = path.join(__dirname, '..', 'evals', 'leave-cases.json');

function decidingRule(result) {
  const deny = result.rules.find((rule) => rule.outcome === 'deny');
  if (deny) return deny.id;
  const review = result.rules.find((rule) => rule.outcome === 'needs_review');
  if (review) return review.id;
  return 'within_policy';
}

function withMinNotice(rules, minDays) {
  return {
    ...rules,
    rules: rules.rules.map((rule) => {
      if (rule.id !== 'short_notice_annual') return rule;
      return { ...rule, params: { ...rule.params, minDays } };
    }),
  };
}

function runCases(cases, rules) {
  return cases.map((item) => {
    const result = evaluate(item.request, item.facts, rules);
    const rule = decidingRule(result);
    const pass = result.outcome === item.expected.outcome && rule === item.expected.rule;
    return {
      id: item.id,
      note: item.note || '',
      expectedOutcome: item.expected.outcome,
      expectedRule: item.expected.rule,
      outcome: result.outcome,
      rule,
      fired: result.rules.map((fired) => fired.id),
      pass,
    };
  });
}

function tally(rows) {
  const total = rows.length;
  const passed = rows.filter((row) => row.pass).length;
  return { total, passed, failed: total - passed };
}

function markdownTable(rows) {
  const lines = [
    '| Case | Expected | Result | Pass |',
    '| --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const expected = `${row.expectedOutcome} / ${row.expectedRule}`;
    const actual = `${row.outcome} / ${row.rule}`;
    lines.push(`| ${row.id} | ${expected} | ${actual} | ${row.pass ? 'yes' : 'no'} |`);
  }
  return lines.join('\n');
}

function render({ baseline, compared, compareNotice }) {
  const base = tally(baseline);
  const next = tally(compared);
  const worse = compared.filter((row, index) => baseline[index].pass && !row.pass);
  const lines = [
    '# Leave eval',
    '',
    'Date: 2026-10-12. Policy only. `reviewWithJev` was not called. A stubbed client is not a result, and this file does not spend a TypeSafe call.',
    '',
    'The deciding rule is the first deny, otherwise the first needs-review, otherwise `within_policy`. Expected values are the written rules in `rostr/policy/leave-rules.json`, version 1, `minDays` 14.',
    '',
    '## Baseline',
    '',
    `${base.passed} of ${base.total} matched outcome and deciding rule.`,
    '',
    markdownTable(baseline),
    '',
    '## Second run',
    '',
    `One change: \`short_notice_annual.params.minDays\` raised from 14 to ${compareNotice}. The case file did not change. The questions sent to Jev did not change, because Jev was not called.`,
    '',
    `${next.passed} of ${next.total} still matched the original expected values.`,
    '',
    markdownTable(compared),
    '',
    '## What got worse',
    '',
  ];
  if (worse.length === 0) {
    lines.push('Nothing that passed the baseline failed the second run.');
  } else {
    lines.push('These passed at 14 days and failed at the tighter window. The written rule is still 14. The second run is worse against that rule.');
    lines.push('');
    for (const row of worse) {
      lines.push(`- \`${row.id}\`: expected ${row.expectedOutcome} / ${row.expectedRule}, got ${row.outcome} / ${row.rule}.`);
    }
  }
  lines.push(
    '',
    '## Jev, from the requests already stored',
    '',
    'This script does not score confidence. The two live reviews already in Rostr are the sample. Two rows is not a rate.',
    '',
    '| Request | Jev | Confidence | Band | Policy | Agree | Goes to a person at 0.6 / 0.7 / 0.8 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| LV-0001 Helen, personal, 12–13 Oct | approve | 0.58 | below 0.7 | approve | 1 | yes / yes / yes |',
    '| LV-0003 Priya, annual, 26–30 Oct | deny | 1.0 | 0.9+ | deny | 1 | no / no / no |',
    '',
    'No stored review sits in 0.7–0.9. LV-0003 is the injection-style reason ("Marcus already said yes") and both sides denied on `insufficient_balance`. Jev also marked reason fit inconsistent. The policy check does not read the reason, so a sick-sounding annual reason with a legal balance still comes back `within_policy` in the table above. That gap is the reason-fit question, and it stays a recommendation.',
    '',
    'Disagreements in this sample: none. The failure path, when the client returns 401, 422, 429, 529, or a timeout, stores the policy row and leaves Jev empty. That is incident 12. It is not a disagreement.',
    '',
  );
  return lines.join('\n');
}

function main(argv = process.argv.slice(2)) {
  const outFlag = argv.indexOf('--out');
  const noticeFlag = argv.indexOf('--compare-notice');
  const casesPath = argv.includes('--cases') ? argv[argv.indexOf('--cases') + 1] : CASES;
  const compareNotice = noticeFlag === -1 ? 30 : Number(argv[noticeFlag + 1]);
  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const rules = loadRules();
  const baseline = runCases(cases, rules);
  const compared = runCases(cases, withMinNotice(rules, compareNotice));
  const text = render({ baseline, compared, compareNotice });
  if (outFlag !== -1) {
    fs.mkdirSync(path.dirname(argv[outFlag + 1]), { recursive: true });
    fs.writeFileSync(argv[outFlag + 1], text);
  }
  return { baseline, compared, text };
}

module.exports = { decidingRule, withMinNotice, runCases, render, main };

if (require.main === module) {
  const { text } = main();
  process.stdout.write(text);
}
