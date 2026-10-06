const fs = require('fs');
const path = require('path');

function recordSignIn(file, event) {
  const protocol = event.protocol;
  const user = event.user;
  const outcome = event.outcome;
  if (!protocol || !user || !outcome) {
    throw new Error('A sign-in log line needs protocol, user, and outcome');
  }
  const entry = {
    time: event.time || new Date().toISOString(),
    protocol,
    user,
    outcome,
  };
  if (event.reason) {
    entry.reason = event.reason;
  }
  const line = JSON.stringify(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${line}\n`);
}

module.exports = { recordSignIn };
