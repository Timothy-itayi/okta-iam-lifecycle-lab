const path = require('path');
const { openDatabase } = require('./src/db');
const { createApp } = require('./src/app');

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('SESSION_SECRET is required. Set it in the environment. Do not commit it.');
  process.exit(1);
}

const dbPath = process.env.ROSTR_DB_PATH || path.join(__dirname, 'data', 'rostr.sqlite');
const authLogPath = process.env.ROSTR_AUTH_LOG || path.join(__dirname, '..', 'logs', 'rostr-auth.jsonl');
const port = Number(process.env.PORT || 3000);

const db = openDatabase(dbPath);
const app = createApp({ db, authLogPath, sessionSecret });

app.listen(port, '0.0.0.0', () => {
  console.log(`Rostr listening on ${port}`);
});
