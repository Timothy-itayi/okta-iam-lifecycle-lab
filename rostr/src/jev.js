const { choice, score } = require('@typesafe-ai/sdk');

const MODEL = 'jev-latest';
const TIMEOUT_MS = 5000;

const URGENCY = [
  'Can wait',
  'Soon, not this week',
  'This week',
  'Next couple of days',
  'Same-day emergency',
];

function minConfidence(env = process.env) {
  const raw = env.JEV_MIN_CONFIDENCE;
  if (raw == null || String(raw).trim() === '') return 0.7;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) return 0.7;
  return value;
}

function jevIsSure(confidence, env = process.env) {
  return typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= minConfidence(env);
}

function buildState(request, facts, rules) {
  return {
    rules: rules.rules.map((rule) => ({ id: rule.id, outcome: rule.outcome, text: rule.text })),
    facts: {
      hrStatus: facts.employee ? facts.employee.status : null,
      rostrActive: Boolean(facts.rostr && facts.rostr.active),
      department: request.department,
      leaveType: request.leave_type,
      remainingBalance: facts.remaining,
      noticeDays: facts.noticeDays,
      othersOff: (facts.cover || []).map((row) => ({
        email: row.email,
        status: row.status,
        start: row.start_day,
        end: row.end_day,
      })),
    },
    request: {
      type: request.leave_type,
      start: request.start_day,
      end: request.end_day,
      workingDays: request.days,
      reasonWrittenByEmployee: request.reason,
    },
  };
}

function buildQuestions(rules) {
  const ruleChoices = {};
  for (const rule of rules.rules) ruleChoices[rule.id] = rule.text;
  return {
    recommendation: choice(
      'Recommend one outcome for this leave request from the rules and facts in the state.',
      {
        approve: 'The request fits the rules.',
        deny: 'A hard rule says deny.',
        needs_review: 'A person should look before anyone decides.',
      },
    ),
    deciding_rule: choice('Which single rule decides this request?', ruleChoices),
    reason_fit: choice('Does the reason the employee wrote match the leave type in the state?', {
      consistent: 'The reason matches the leave type.',
      inconsistent: 'The reason does not match the leave type.',
    }),
    urgency: score('How soon does this request need a decision?', URGENCY),
  };
}

function errorCode(error) {
  if (error && Number.isInteger(error.status)) return String(error.status);
  const name = error && error.name;
  if (name === 'APITimeoutError' || name === 'TimeoutError') return 'timeout';
  return 'error';
}

function urgencyOnPlanScale(scoreValue) {
  const value = Number(scoreValue);
  if (!Number.isFinite(value)) return null;
  return value + 1;
}

async function reviewWithJev(request, facts, rules, { client, timeoutMs = TIMEOUT_MS } = {}) {
  if (!client) return { ok: false, code: 'no_key' };
  const state = buildState(request, facts, rules);
  const questions = buildQuestions(rules);
  try {
    const result = await client.systemOne(
      { state, questions, model: MODEL },
      { timeout: timeoutMs, retry: { maxRetries: 0 } },
    );
    const recommendation = result.answers.recommendation;
    const deciding = result.answers.deciding_rule;
    const fit = result.answers.reason_fit;
    const urgency = result.answers.urgency;
    return {
      ok: true,
      model: result.model || MODEL,
      outcome: recommendation.choice,
      rule: deciding.choice,
      confidence: recommendation.confidence,
      probabilities: recommendation.probabilities,
      reasonFit: fit.choice,
      urgency: urgencyOnPlanScale(urgency.score),
      sure: jevIsSure(recommendation.confidence),
    };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
}

module.exports = {
  MODEL,
  TIMEOUT_MS,
  URGENCY,
  minConfidence,
  jevIsSure,
  buildState,
  buildQuestions,
  errorCode,
  reviewWithJev,
};
