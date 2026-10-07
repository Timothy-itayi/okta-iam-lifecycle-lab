# Leave hub — 9. Apply the balance

Date: 2026-10-08, 05:42–05:45 Sydney. An HR approval writes a balance change. This script is what puts that change into the HR file.

```
node scripts/leave-apply --ticket REQ-#### --in balance-changes.json
node scripts/leave-apply --ticket REQ-#### --in balance-changes.json --apply
```

Dry-run is the default. It prints the balance before and after. `--apply` changes that one number in `hr/employees.json` and sets the Rostr row's `exported` to 1. A second run refuses the row, so the same download cannot be subtracted twice. `hr-sync` still ignores a leave-only edit.

REQ-0010 applied LV-0002. Priya Shah, EMP-1003, annual leave, 2 → 0. Sick and personal on that row stayed 8 and 2. No other employee changed. `node scripts/hr-sync --ticket REQ-0010` then printed `no changes`.

The week grid and the Jev flag are not built.
