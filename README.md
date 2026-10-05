# Okta IAM Lifecycle Lab

A learning lab for Lanternfield Goods, a fictional retailer. The HR source is a JSON file in Git. Okta holds the users, groups, and policies. A mock rostering app, Rostr, is the SaaS app still to be built, so both sides of SAML, OIDC, and SCIM can be read.

The work is day-to-day Okta administration, SaaS onboarding, joiner-mover-leaver automation, and the audit evidence those produce. It is aimed at hands-on Okta practice. About 52 hours over three weeks.

This is a learning lab, not production Okta experience. Every claim points at a file in this repository.

Code is written with AI assistance (Cursor) and reviewed by me. Okta configuration, testing, and the write-ups are done in the org and recorded here.

The domain is `lanternfieldgoods.co.uk`. The org is a 30-day Workforce Identity free trial (`trial-7464750`), not the Integrator Free Plan the design assumed. The 10-user and 5-flow budgets in the design note still apply. Lifecycle Management on this trial ends when the 30 days end.

## Where the project is

Phase 0 and Phase 1 are done. Staff are in Okta, department groups fill from rules, Okta Verify is required, and a help desk admin can reset a lost phone without changing apps or policies. Rostr, SCIM, Workflows, and the governance outputs are not built.

| Phase | Focus | Time box | Status | Where to read it |
| --- | --- | --- | --- | --- |
| 0 | Prep, domain, org, and design | 5 h | Done | [docs/decisions](docs/decisions) |
| 1 | Okta foundation | 6 h | Done | [docs/phases/01-foundation.md](docs/phases/01-foundation.md) |
| 2 | SaaS onboarding: SAML and OIDC | 8 h | Not started | Milestone M1, end of week 1 |
| 3 | SCIM provisioning | 8 h | Not started | |
| 4 | Joiner, mover, and leaver | 7 h | Not started | Milestone M2 |
| 5 | Governance and audit evidence | 7.5 h | Not started | |
| 6 | Failure drills | 6 h | Not started | |
| 7 | Write-up and teardown | 4 h | Not started | Milestone M3 |

## What is in place

- Domain and catch-all mail: [docs/decisions/00-domain.md](docs/decisions/00-domain.md).
- Org, daily admin, and break-glass: [docs/decisions/01-org.md](docs/decisions/01-org.md), [docs/decisions/02-break-glass.md](docs/decisions/02-break-glass.md).
- User budget, five flows, and naming: [docs/decisions/02-design.md](docs/decisions/02-design.md).
- Seven staff, group rules, session policies, help desk role, MFA reset, and the Entra-to-Okta names: [docs/phases/01-foundation.md](docs/phases/01-foundation.md).
- Lost-phone reset: [docs/runbooks/mfa-reset.md](docs/runbooks/mfa-reset.md).

## Repository

| Path | Holds | Now |
| --- | --- | --- |
| [docs/decisions](docs/decisions) | Numbered decisions | Domain, org, break-glass, design |
| [docs/phases](docs/phases) | One note per phase | [01-foundation.md](docs/phases/01-foundation.md) |
| [docs/runbooks](docs/runbooks) | Repeatable admin steps | [mfa-reset.md](docs/runbooks/mfa-reset.md) |
| [docs/incidents](docs/incidents) | Failure-drill records | Empty until Phase 6 |
| [docs/worklog](docs/worklog) | Session log | [week-1.md](docs/worklog/week-1.md) |
| [evidence](evidence) | Screenshots and log extracts | Tasks 0.2 through 1.7 |
| [hr](hr) | HR source of truth | [employees.json](hr/employees.json). [okta-import.csv](hr/okta-import.csv) was the one-time load |
| `rostr/` | Mock SaaS app | Empty until Phase 2 |
| `scripts/` | `hr-sync` and review exports | Empty until Phase 4 |
| [.env.example](.env.example) | Placeholder names only | No secrets |
