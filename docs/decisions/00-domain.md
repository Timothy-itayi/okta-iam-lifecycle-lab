# 00 — Domain and email

Decision date: 2026-10-06

## Decision

The lab domain is `lanternfieldgoods.co.uk`, registered on Cloudflare. The runbook's name is `lanternfieldgoods.com`. That name was not used. Every later task uses `.co.uk`: Okta usernames, the HR file, and `rostr.lanternfieldgoods.co.uk`.

Mail is inbound only. Cloudflare Email Routing forwards to the personal Gmail inbox `timmytam10@gmail.com`. Okta sends its own mail. This domain does not need to send.

Expiry date and auto-renew were not recorded. Fill both in before teardown.

## Address plan

| Address | Used for |
| --- | --- |
| `admin@lanternfieldgoods.co.uk` | Okta sign-up and the daily admin |
| `breakglass@lanternfieldgoods.co.uk` | Break-glass super administrator |
| `it@lanternfieldgoods.co.uk` | Service desk, osTicket, and the fallback Okta sign-up address |
| `firstname.lastname@lanternfieldgoods.co.uk` | The seven staff and later joiners. Delivered by the catch-all, not by a rule per person |
| `rostr.lanternfieldgoods.co.uk` | Rostr's public HTTPS hostname through Cloudflare Tunnel. Not an email address |

`test-env@lanternfieldgoods.co.uk` is a routing test. It is not part of the plan.

## Routing rules

Checked again 2026-10-06 01:17 +1100. Screenshot: [evidence/0.2-email-routing-catchall-active.png](../../evidence/0.2-email-routing-catchall-active.png). The earlier shot, with the catch-all Disabled and set to Drop, is [evidence/0.2-email-routing-rules.png](../../evidence/0.2-email-routing-rules.png).

| Rule | Action | Status |
| --- | --- | --- |
| Catch-all | Send to `timmytam10@gmail.com` | Active |
| `admin@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `breakglass@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `it@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `test-env@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |

## What was proved

- `test-env@lanternfieldgoods.co.uk` was mailed from `timothy_itayi@icloud.com` at 2026-10-06 00:25 +1100 and arrived in Gmail.
- `admin@lanternfieldgoods.co.uk` received Okta's activation mail. The org was activated with that address and Okta Verify was enrolled. See [01-org.md](01-org.md).

## Still open

The catch-all rule is on. A message to a staff address has not been shown arriving since that change. Task 0.2 still wants mail to `admin@lanternfieldgoods.co.uk` and to `ava.nguyen@lanternfieldgoods.co.uk` in Gmail. `ava.nguyen@` is now EMP-1001 in `hr/employees.json`, and the catch-all is what delivers the other six staff addresses too.

Do not add a routing rule per employee. Joiners need the same path.
