const fs = require('fs');
const path = require('path');

function recordSignIn(file, event) {
  const protocol = event.protocol;
  const user = event.user;
  const outcome = event.outcome;
  if (!protocol || !user || !outcome) {
    throw new Error('A sign-in log line needs protocol, user, and outcome');
  }
  const line = JSON.stringify({
    time: event.time || new Date().toISOString(),
    protocol,
    user,
    outcome,
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${line}\n`);
}

module.exports = { recordSignIn };
