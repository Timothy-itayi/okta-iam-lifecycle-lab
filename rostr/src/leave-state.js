const OPEN = new Set(['submitted', 'with_admin', 'with_hr']);

const MOVES = {
  to_admin: { from: new Set(['submitted']), to: 'with_admin' },
  to_hr: { from: new Set(['with_admin']), to: 'with_hr' },
  approve: { from: new Set(['with_hr']), to: 'approved' },
  deny: { from: new Set(['with_admin', 'with_hr']), to: 'denied' },
  cancel: { from: OPEN, to: 'cancelled' },
};

function transition(request, action, actor) {
  if (!request || typeof request.status !== 'string' || !request.status) {
    throw new Error('request status is required');
  }
  if (!actor) throw new Error('actor is required');
  const move = MOVES[action];
  if (!move || !move.from.has(request.status)) {
    throw new Error(`illegal move: ${request.status} cannot ${action}`);
  }
  return { ...request, status: move.to };
}

module.exports = { transition, OPEN, MOVES };
