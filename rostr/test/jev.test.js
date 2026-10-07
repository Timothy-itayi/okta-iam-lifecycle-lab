const test = require('node:test');
const assert = require('node:assert/strict');
const { findLeaveRequestByRef, findLeaveReview, listLeaveEvents } = require('../src/db');
const { loadRules } = require('../src/policy');
const { jevIsSure, minConfidence, buildState, buildQuestions, reviewWithJev } = require('../src/jev');
const { appWithSession, listen, close, sessionFor, postForm, PEOPLE } = require('./helpers');

const REASON = 'UNIQUE-REASON-TOKEN family wedding in Ballarat.';

function answer(overrides = {}) {
  return {
    model: 'jev-latest',
    answers: {
      recommendation: {
        choice: 'deny',
        confidence: 0.91,
        probabilities: { deny: 0.91, approve: 0.04, needs_review: 0.05 },
      },
      deciding_rule: { choice: 'insufficient_balance', confidence: 0.88, probabilities: {} },
      reason_fit: { choice: 'consistent', confidence: 0.8, probabilities: {} },
      urgency: { score: 0, confidence: 0.6 },
      ...overrides,
    },
  };
}

function stub(result) {
  const calls = [];
  return {
    calls,
    systemOne(payload, options) {
      calls.push({ payload, options });
      if (result instanceof Error) return Promise.reject(result);
      return Promise.resolve(result);
    },
  };
}

function failure(status, name) {
  const error = new Error('jev failed');
  if (status != null) error.status = status;
  if (name) error.name = name;
  return error;
}

test('0.7 is the display gate, and a bad setting falls back to it', () => {
  assert.equal(minConfidence({}), 0.7);
  assert.equal(minConfidence({ JEV_MIN_CONFIDENCE: '' }), 0.7);
  assert.equal(minConfidence({ JEV_MIN_CONFIDENCE: 'nope' }), 0.7);
  assert.equal(minConfidence({ JEV_MIN_CONFIDENCE: '0.85' }), 0.85);
  assert.equal(jevIsSure(0.7, {}), true);
  assert.equal(jevIsSure(0.699, {}), false);
  assert.equal(jevIsSure(null, {}), false);
});

test('the employee reason is state, and the questions do not contain it', () => {
  const rules = loadRules();
  const request = {
    department: 'Operations',
    leave_type: 'annual',
    start_day: '2026-10-20',
    end_day: '2026-10-22',
    days: 3,
    reason: REASON,
  };
  const facts = { employee: { status: 'active' }, rostr: { active: true }, remaining: 2, noticeDays: 12, cover: [] };
  const state = buildState(request, facts, rules);
  const questions = buildQuestions(rules);
  assert.equal(state.request.reasonWrittenByEmployee, REASON);
  assert.equal(JSON.stringify(questions).includes(REASON), false);
  assert.equal(JSON.stringify(questions).includes('reasonWrittenByEmployee'), false);
});

test('Priya over balance: policy denies, Jev is stored beside it, and the request stays with Marcus', async () => {
  const client = stub(answer());
  const { app, db } = appWithSession({ jev: client });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.priya);
    const sent = await postForm(base, '/leave', cookie, {
      leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: REASON,
    });
    assert.equal(sent.status, 303);

    const request = findLeaveRequestByRef(db, 'LV-0001');
    assert.equal(request.status, 'with_admin');
    const review = findLeaveReview(db, request.id);
    assert.equal(review.policy_outcome, 'deny');
    assert.deepEqual(JSON.parse(review.policy_rules), ['insufficient_balance', 'short_notice_annual']);
    assert.equal(review.jev_outcome, 'deny');
    assert.equal(review.jev_rule, 'insufficient_balance');
    assert.equal(review.jev_confidence, 0.91);
    assert.deepEqual(JSON.parse(review.jev_probabilities), { deny: 0.91, approve: 0.04, needs_review: 0.05 });
    assert.equal(review.jev_reason_fit, 'consistent');
    assert.equal(review.jev_urgency, 1);
    assert.equal(review.agree, 1);
    assert.equal(review.model, 'jev-latest');
    assert.equal(jevIsSure(review.jev_confidence, {}), true);

    const call = client.calls[0];
    assert.equal(call.payload.model, 'jev-latest');
    assert.equal(call.options.timeout, 5000);
    assert.equal(call.options.retry.maxRetries, 0);
    assert.equal(call.payload.state.request.reasonWrittenByEmployee, REASON);
    assert.equal(JSON.stringify(call.payload.questions).includes(REASON), false);
    assert.equal(JSON.stringify(call.payload.questions).includes('UNIQUE-REASON-TOKEN'), false);

    const notes = listLeaveEvents(db, request.id).map((event) => event.note || '');
    assert.equal(notes.some((note) => note.includes(REASON)), false);
  } finally {
    await close(server);
    db.close();
  }
});

test('a low confidence is stored and is not treated as sure', async () => {
  const client = stub(answer({
    recommendation: { choice: 'needs_review', confidence: 0.4, probabilities: { needs_review: 0.4 } },
    urgency: { score: 4 },
  }));
  const seen = await reviewWithJev(
    { leave_type: 'annual', days: 3, reason: REASON, department: 'Operations', start_day: '2026-10-20', end_day: '2026-10-22' },
    { employee: { status: 'active' }, rostr: { active: true }, remaining: 2, noticeDays: 12, cover: [] },
    loadRules(),
    { client },
  );
  assert.equal(seen.ok, true);
  assert.equal(seen.outcome, 'needs_review');
  assert.equal(seen.confidence, 0.4);
  assert.equal(seen.sure, false);
  assert.equal(seen.urgency, 5);
});

test('an API failure stores the policy check and leaves Jev empty', async () => {
  const cases = [
    { name: '401', error: failure(401, 'AuthenticationError'), note: '401' },
    { name: '422', error: failure(422, 'UnprocessableEntityError'), note: '422' },
    { name: '429', error: failure(429, 'RateLimitError'), note: '429' },
    { name: '529', error: failure(529, 'APIError'), note: '529' },
    { name: 'timeout', error: failure(null, 'APITimeoutError'), note: 'timeout' },
  ];
  for (const item of cases) {
    const client = stub(item.error);
    const { app, db } = appWithSession({ jev: client });
    const { server, base } = listen(app);
    try {
      const cookie = await sessionFor(base, PEOPLE.priya);
      const sent = await postForm(base, '/leave', cookie, {
        leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: REASON,
      });
      assert.equal(sent.status, 303, item.name);
      const request = findLeaveRequestByRef(db, 'LV-0001');
      assert.equal(request.status, 'with_admin', item.name);
      const review = findLeaveReview(db, request.id);
      assert.equal(review.policy_outcome, 'deny', item.name);
      assert.equal(review.jev_outcome, null, item.name);
      assert.equal(review.jev_confidence, null, item.name);
      assert.equal(review.agree, null, item.name);
      assert.equal(review.model, null, item.name);
      const jevEvent = listLeaveEvents(db, request.id).find((event) => event.actor === 'jev');
      assert.equal(jevEvent.action, 'jev_unavailable', item.name);
      assert.equal(jevEvent.note, item.note, item.name);
      assert.equal(jevEvent.note.includes('jev failed'), false, item.name);
    } finally {
      await close(server);
      db.close();
    }
  }
});

test('a disagreement is stored as agree 0 and does not change the request', async () => {
  const client = stub(answer({
    recommendation: { choice: 'approve', confidence: 0.8, probabilities: { approve: 0.8 } },
  }));
  const { app, db } = appWithSession({ jev: client });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.priya);
    const sent = await postForm(base, '/leave', cookie, {
      leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: REASON,
    });
    assert.equal(sent.status, 303);
    const request = findLeaveRequestByRef(db, 'LV-0001');
    assert.equal(request.status, 'with_admin');
    const review = findLeaveReview(db, request.id);
    assert.equal(review.policy_outcome, 'deny');
    assert.equal(review.jev_outcome, 'approve');
    assert.equal(review.agree, 0);
  } finally {
    await close(server);
    db.close();
  }
});
