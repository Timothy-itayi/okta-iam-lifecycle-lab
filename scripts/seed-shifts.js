#!/usr/bin/env node
// Two weeks of weekday shifts for every active employee in the HR file.
// Re-running does not add a second shift for the same person and day.

const fs = require('fs');
const path = require('path');
const { openDatabase, insertShift } = require('../rostr/src/db');
const { seedShifts } = require('../rostr/src/shifts');

const root = path.join(__dirname, '..');
const hrFile = process.env.HR_FILE || path.join(root, 'hr', 'employees.json');
const dbPath = process.env.ROSTR_DB_PATH || path.join(root, 'rostr', 'data', 'rostr.sqlite');
const from = process.argv[2] || '2026-10-12';

const employees = JSON.parse(fs.readFileSync(hrFile, 'utf8'));
const db = openDatabase(dbPath);
const result = seedShifts(db, employees, { from, insertShift });
db.close();
console.log(`shifts from ${from}: ${result.people} people, ${result.days} weekdays, ${result.inserted} new rows`);
