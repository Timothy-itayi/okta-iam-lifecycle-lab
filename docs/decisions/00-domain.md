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

Checked 2026-10-06 00:34 +1100 in Cloudflare Email Routing. Screenshot: [evidence/0.2-email-routing-rules.png](../../evidence/0.2-email-routing-rules.png).

| Rule | Action | Status |
| --- | --- | --- |
| `admin@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `breakglass@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `it@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| `test-env@lanternfieldgoods.co.uk` | Send to `timmytam10@gmail.com` | Active |
| Catch-all | Drop | Disabled |

## What was proved

- `test-env@lanternfieldgoods.co.uk` was mailed from `timothy_itayi@icloud.com` at 2026-10-06 00:25 +1100 and arrived in Gmail.
- `admin@lanternfieldgoods.co.uk` received Okta's activation mail. The org was activated with that address and Okta Verify was enrolled. See [01-org.md](01-org.md).

## Still open

The catch-all is off, and its action is Drop. A staff address such as `ava.nguyen@lanternfieldgoods.co.uk` will not arrive. Task 0.2 is not done until the catch-all action is Send to `timmytam10@gmail.com`, the rule is enabled, and both `admin@` and that invented staff address arrive in Gmail.

Do not add a routing rule per employee. The HR file does not exist yet, and joiners need the same path.
