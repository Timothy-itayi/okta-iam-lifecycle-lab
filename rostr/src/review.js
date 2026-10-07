const { evaluate, factsFor, loadRules } = require('./policy');
const { insertLeaveEvent, insertLeaveReview } = require('./db');
const { reviewWithJev } = require('./jev');

async function reviewLeave(db, hr, request, { today, client, at = new Date().toISOString() } = {}) {
  const rules = loadRules();
  const facts = factsFor(db, hr, request, { today });
  const policy = evaluate(request, facts, rules);
  const jev = await reviewWithJev(request, facts, rules, { client });
  const ruleIds = policy.rules.map((rule) => rule.id);
  const agree = jev.ok ? (jev.outcome === policy.outcome ? 1 : 0) : null;
  insertLeaveReview(db, {
    request_id: request.id,
    policy_outcome: policy.outcome,
    policy_rules: JSON.stringify(ruleIds),
    jev_outcome: jev.ok ? jev.outcome : null,
    jev_rule: jev.ok ? jev.rule : null,
    jev_confidence: jev.ok ? jev.confidence : null,
    jev_probabilities: jev.ok && jev.probabilities != null ? JSON.stringify(jev.probabilities) : null,
    jev_reason_fit: jev.ok ? jev.reasonFit : null,
    jev_urgency: jev.ok ? jev.urgency : null,
    agree,
    model: jev.ok ? jev.model : null,
    reviewed_at: at,
  });
  insertLeaveEvent(db, {
    request_id: request.id,
    at,
    actor: 'policy',
    action: 'policy',
    note: `${policy.outcome}: ${ruleIds.join(', ')}`,
  });
  insertLeaveEvent(db, {
    request_id: request.id,
    at,
    actor: 'jev',
    action: jev.ok ? 'jev' : 'jev_unavailable',
    note: jev.ok ? `${jev.outcome} ${jev.confidence}` : jev.code,
  });
  return { policy, jev, facts };
}

module.exports = { reviewLeave };
