# Rostr design spec — leave hub (staff, admin, HR)

Design spec for the Rostr leave hub described in [rostr-leave-jev-plan.md](rostr-leave-jev-plan.md). It covers the look, the layout, every screen and its states. It is written for a Cursor agent to build from. It replaces the loose styling notes in steps 3.0 to 3.2 of the plan; everything else in the plan stands.

Build constraints from the plan still apply: server-rendered HTML from `rostr/src/views/`, one stylesheet at `rostr/public/app.css`, small inline scripts only, no front-end framework or build step.

## 1. Direction

**Subject.** Rostr is the internal people app for Lanternfield Goods, a small retailer. Staff use it a few times a month, managers a few times a week, HR daily. It should feel like a calm, trustworthy work tool that respects people's time off: corporate and organised, but warm and human, in the spirit of Culture Amp, without copying it.

**The idea that makes it Lanternfield's own.** The name gives it: a lantern in a field at dusk. Deep pine green for structure, a single warm lantern-amber light for the things that need attention or are yours. Amber is never decoration. It marks "your turn" — the primary action, the focus ring, a pending item waiting on you.

**The one memorable element.** Spend the boldness in one place: the **decision panel** that admins and HR see, where Jev's case and the policy check sit side by side and agree or disagree visibly. Everything else stays quiet.

**Patterns borrowed from current HR and work apps** (the kind collected on Mobbin): leave balances shown up front before you ask (BambooHR, Rippling, Deel); a side sheet for the request form instead of a separate page; a status stepper so people know where their request is; a queue with tabs and a detail view (Linear-style triage); AI suggestions clearly labelled as suggestions, never presented as decisions.

## 2. Tokens

Put these in `:root` at the top of `app.css`. Name every colour by its job, not its hue.

### 2.0 Colour

| Token | Hex | Use |
| --- | --- | --- |
| `--pine-900` | `#17302B` | Sidebar, headings, primary button fill |
| `--pine-700` | `#2A4A43` | Hover on pine, secondary headings |
| `--pine-100` | `#E3ECE8` | Selected row, active nav item background |
| `--lantern` | `#E9A23B` | Primary action accent, focus ring, "waiting on you" dot. Fill only, never text on white |
| `--lantern-100` | `#FCEFD8` | Pending chip background, notice banners |
| `--paper` | `#F5F6F3` | Page background (cool, sage-tinted; not cream) |
| `--surface` | `#FFFFFF` | Panels, tables, form |
| `--line` | `#DDE2DC` | Borders and dividers |
| `--ink` | `#1A2421` | Body text |
| `--ink-muted` | `#5B6661` | Secondary text, labels, helper text |
| `--jev` | `#4B47B8` | Everything from Jev, and nothing else |
| `--jev-100` | `#ECEBFA` | Jev panel background |
| `--ok` | `#1F7A55` / bg `#DDF2E7` | Approved, policy pass |
| `--warn` | `#8A5A00` / bg `--lantern-100` | Needs review, pending |
| `--bad` | `#B42318` / bg `#FDE5E2` | Denied, policy fail, errors |

Rules:
- Text on white must reach WCAG AA (4.5:1). `--ink-muted` passes on `--surface` and `--paper`. Amber fails as text, so amber only appears as a fill with pine text on it, or as a dot or ring.
- Jev's indigo is reserved for Jev. No other element uses it, so a reader always knows what came from the model.
- Status is never shown by colour alone: every chip has a word, and status icons differ in shape.

### 2.1 Type

| Role | Family | Notes |
| --- | --- | --- |
| Headings | **Bricolage Grotesque**, weights 600 and 700 | Characterful but corporate. Slight negative tracking at large sizes (`-0.01em`). |
| UI and body | **Instrument Sans**, weights 400, 500, 600 | Clear at small sizes in tables and forms. |
| Numbers | Instrument Sans with `font-variant-numeric: tabular-nums` | Dates, day counts, balances, confidence. Columns of numbers line up. |

Self-host both as `woff2` files in `rostr/public/fonts/` (download from Google Fonts or `@fontsource`). Don't load from a CDN: it's an internal app behind Okta and shouldn't call third parties on every page.

Scale (rem, 16px base), sentence case everywhere, no all-caps labels:

| Token | Size / line-height | Use |
| --- | --- | --- |
| `--text-xs` | 0.75 / 1.4 | Timestamps, helper text |
| `--text-sm` | 0.875 / 1.45 | Tables, labels, chips |
| `--text-md` | 1 / 1.55 | Body, form inputs |
| `--text-lg` | 1.25 / 1.4 | Panel titles |
| `--text-xl` | 1.625 / 1.25 | Page titles (Bricolage) |
| `--text-2xl` | 2.25 / 1.1 | Balance numbers only (Bricolage) |

Body copy and helper text: max line length 70 characters.

### 2.2 Space, radius, elevation

- Spacing on a 4 px grid: `4, 8, 12, 16, 24, 32, 48`. Panels use 24 px padding on desktop, 16 px on mobile.
- Radius follows hierarchy, not one value everywhere: `6px` controls (inputs, buttons), `10px` panels and the side sheet, `999px` chips and avatars.
- Panels sit on `--paper` with a 1 px `--line` border and no shadow. Shadows are only for things floating above the page: the side sheet, menus and toasts (`0 12px 32px rgba(23, 48, 43, .18)`).

### 2.3 Icons

[Lucide](https://lucide.dev) icons, copied as inline SVG into one partial (`views/icons.js`), 18 px, 1.75 stroke, `currentColor`. Set used: `calendar`, `plane` (annual), `thermometer` (sick), `user` (personal), `check`, `x`, `clock`, `flag`, `sparkles` (Jev only), `scale` (policy only), `download`, `log-out`, `chevron-right`, `alert-triangle`.

### 2.4 Motion

- Side sheet: slides in from the right, 220 ms, ease-out.
- Toast: rises 8 px and fades in, 180 ms; stays 4 s; fades out.
- Deciding a request: its row in the queue collapses out over 200 ms. This is the one orchestrated moment; it shows the queue getting shorter.
- Nothing animates on page load. Respect `prefers-reduced-motion`: replace movement with instant changes.

## 3. App shell (all roles)

```
Desktop (≥ 1024 px)
┌────────────┬──────────────────────────────────────────────┐
│ ◐ Rostr    │  Page title                    [Primary btn] │
│            │  One line of context                         │
│ My leave   │ ──────────────────────────────────────────── │
│ My roster  │                                              │
│            │  Content, max-width 1120 px, left-aligned    │
│ Team       │                                              │
│ Requests ● │                                              │
│            │                                              │
│ HR         │                                              │
│ All leave  │                                              │
│ Export     │                                              │
│            │                                              │
│ ────────── │                                              │
│ (PS) Priya │                                              │
│ Operations │                                              │
│ Staff      │                                              │
│ Sign out   │                                              │
└────────────┴──────────────────────────────────────────────┘

Mobile (< 768 px): sidebar becomes a top bar with the logo and avatar,
and a bottom tab bar with up to 4 items for the person's role.
```

- **Sidebar**: 248 px, `--pine-900`, white text at 80% opacity, active item white at 100% on a slightly lighter pine with a 3 px amber bar on the left. Logo mark: a small circle half filled amber (a lantern seen from above) and "Rostr" in Bricolage.
- **Navigation by role.** Only sections a person can use are rendered. Hiding is for clarity, not security; the server still enforces access.
  - Staff: My leave, My roster.
  - Admin: adds "Team" section with Requests (shows an amber dot and count when anything waits on them).
  - HR: adds "HR" section with All leave and Export.
- **Identity block** at the bottom: initials avatar, full name, department, role chip (Staff / Manager / HR). This shows what Okta says about the person, which helps when demoing group changes.
- **Page header**: title (Bricolage `--text-xl`), one line of context in `--ink-muted`, primary action on the right.
- Content is left-aligned. Nothing is centred except empty states.

## 4. Shared components

### 4.0 Buttons
- **Primary**: `--pine-900` fill, white text, 40 px tall (44 px on mobile), 6 px radius. Focus: 2 px `--lantern` ring with 2 px offset.
- **Secondary**: white fill, `--line` border, `--ink` text.
- **Destructive** (Deny): white fill, `--bad` border and text. Solid red only inside a confirm step.
- Labels say what happens: "Send request", "Approve", "Deny", "Flag Jev's suggestion". No arrows appended.

### 4.1 Status chips
Pill, `--text-sm`, icon plus word.

| Status | Text | Colours |
| --- | --- | --- |
| `with_admin` | With manager | `--warn` on `--lantern-100`, `clock` |
| `with_hr` | With HR | `--warn` on `--lantern-100`, `clock` |
| `approved` | Approved | `--ok` on its bg, `check` |
| `denied` | Declined | `--bad` on its bg, `x` |
| `cancelled` | Cancelled | `--ink-muted` on `--paper`, no icon |

Use "Declined" in the staff view (softer) and "Denied" only in audit exports. Use one word per view consistently.

### 4.2 Jev chip and policy chip
- **Jev chip**: `sparkles` icon, `--jev` text on `--jev-100`, e.g. "Suggests approve · 92%". Low confidence: "Not sure" in the same colours, no percentage emphasis.
- **Policy chip**: `scale` icon, outcome colour, e.g. "Policy: needs review".
- **Agreement mark** in tables: a small `check` in `--ok` when they agree; `alert-triangle` in `--bad` with the text "Differs" when they don't.

### 4.3 Form fields
- Label above the field (`--text-sm`, 600, `--ink`). Helper text below in `--ink-muted`. No placeholder-only labels.
- Inputs: 44 px tall, white, `--line` border, 6 px radius; hover border `--ink-muted`; focus amber ring.
- Errors: border `--bad`, message below starting with what to do ("Choose an end date on or after the start date"), linked with `aria-describedby`. On submit with errors, a summary box at the top of the form lists each error as a link to its field.

### 4.4 Toast
Bottom-left on desktop, bottom of screen above the tab bar on mobile. White surface, shadow, 4 px left bar in the outcome colour, message and an optional "View" link. `role="status"`, so screen readers announce it. Copy repeats the action name: button "Send request" → toast "Request LV-0007 sent to Marcus Bell".

### 4.5 Empty, loading and error states
- Empty states are centred in their panel: one line of what's here and one action. "No leave requested yet. Request leave".
- Jev unavailable: the Jev panel shows "Jev couldn't review this request (error 401). Use the policy check." in `--ink-muted` with no indigo, so missing AI isn't styled like AI.
- Server errors: the page header area shows a `--bad` banner that says what failed and what to try.

## 5. Staff screens

### 5.0 My leave (`GET /leave`)

```
My leave                                           [Request leave]
Your balances and requests

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ ✈ Annual         │ │ 🌡 Sick           │ │ 👤 Personal      │
│ 2  days left     │ │ 8  days left     │ │ 2  days left     │
│ ▓▓░░░░░░░░ of 15 │ │ ▓▓▓▓▓▓▓▓▓▓ of 8  │ │ ▓▓▓▓▓▓▓▓▓▓ of 2  │
└──────────────────┘ └──────────────────┘ └──────────────────┘

Requests
┌─────────────────────────────────────────────────────────────┐
│ Annual · 20–22 Oct · 3 days      [With manager]   LV-0007 › │
│ Sick · 2 Oct · 1 day             [Approved]       LV-0004 › │
└─────────────────────────────────────────────────────────────┘
```

- Balance tiles: number in Bricolage `--text-2xl`, "days left" beside it, a thin bar showing remaining against the yearly amount. Bar fill pine; under 3 days left, the bar turns amber. Balances come from the HR file; the tile footnote reads "From HR records".
- Requests list: newest first, one row each, the whole row is a link to the request. Open requests first, then decided ones under a "Past" divider.

### 5.1 Request leave (side sheet)

Opens from "Request leave" as a side sheet 480 px wide on desktop and full screen on mobile. It's a real `<form>` posting to `POST /leave`; the sheet also works as a normal page at `/leave/new` without JavaScript.

```
Request leave                                              ✕
────────────────────────────────────────────────────────────
Type
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ✈ Annual     │ │ 🌡 Sick       │ │ 👤 Personal  │
│ 2 days left  │ │ 8 days left  │ │ 2 days left  │
└──────────────┘ └──────────────┘ └──────────────┘

Dates
[ Start  20/10/2026 ]   [ End  22/10/2026 ]
3 working days · Mon 20 – Wed 22 October

┌────────────────────────────────────────────────────────┐
│ ⚠ This is 1 day more than your annual balance.          │
│   You can still send it; your manager will see this.    │
└────────────────────────────────────────────────────────┘

Reason
┌────────────────────────────────────────────────────────┐
│                                                        │
└────────────────────────────────────────────────────────┘
Your manager and HR will read this.               0 / 500

────────────────────────────────────────────────────────────
Goes to Marcus Bell, then HR.        [Cancel] [Send request]
```

- **Type** is a radio group styled as three cards. Each card shows its remaining balance. Selected: pine border 2 px and `--pine-100` fill. Arrow keys move between them (native radio behaviour).
- **Dates**: two native `<input type="date">` fields side by side (stacked on mobile). Below, a live summary in tabular numbers: working days and the date range in words. The server recalculates; the client count is a convenience.
- **Inline notices** (amber box, not an error) appear when the request would exceed the balance, or annual leave starts within 14 days ("Annual leave needs 14 days' notice. You can still send it."). They inform; they don't block. Policy decides later. This matches the plan: staff don't see Jev.
- **Reason**: textarea, 4 rows, counter right-aligned. Helper text says who reads it.
- **Footer** is sticky: who it goes to (manager name from the HR file) and the actions.
- On send: the sheet closes, the toast shows, and the new row appears at the top of the list with "With manager".

### 5.2 Request detail (staff, `GET /leave/:ref`)

```
LV-0007 · Annual leave                              [Cancel request]
Mon 20 – Wed 22 October · 3 working days

  ●───────────●───────────○───────────○
  Sent        Manager     HR          Done
  8 Oct       waiting

Your reason
"Family wedding in Ballarat."

Activity
8 Oct 14:02  You sent this request
```

- The stepper is the main thing on this page. Done steps pine, current step amber ring, future steps outline only. On decline, the line stops and the last step shows "Declined" in `--bad` with the decider's note.
- Activity comes from `leave_events`, written in plain words. Jev and policy events are not shown to staff.
- "Cancel request" only shows while the request is open, and asks to confirm.

### 5.3 My roster

A simple week list: day, shift times, location. Released shifts show struck through with "On leave". Out of scope for detail; keep the same table style as the queues.

## 6. Manager (admin) screens

Managers see everything staff see for themselves, plus the Team section.

### 6.0 Team requests queue (`GET /admin/leave`)

```
Team requests                                       Operations
Leave waiting for your decision

[ Waiting 3 ]  Decided   Flagged

┌──────────────────────────────────────────────────────────────────────┐
│ Person        Dates          Days  Type    Jev              Policy    │
├──────────────────────────────────────────────────────────────────────┤
│ (PS) Priya    20–22 Oct      3     Annual  ✦ Deny · 88%     ✕ Deny  ✓│
│ (JH) Jonah    21 Oct         1     Annual  ✦ Approve · 74%  ⚖ Review ⚠│
│ (LO) Lena     4 Nov          1     Sick    ✦ Not sure       ✓ Approve │
└──────────────────────────────────────────────────────────────────────┘
```

- Tabs are links with counts; the active tab has a 2 px pine underline.
- Table: `--surface`, rows 56 px, hover `--paper`, the whole row links to the detail page. Column headers `--text-sm` 500 `--ink-muted`, sentence case.
- The department name sits at the right of the header as plain text, so it's clear the list is scoped.
- Sort: oldest waiting first, because that's who has waited longest.
- Mobile: rows become stacked cards with person and dates on top, chips below.
- Empty: "Nothing waiting. New requests from Operations will appear here."

### 6.1 Decision view (`GET /admin/leave/:ref`)

The memorable screen. Two columns on desktop (60 / 40), stacked on mobile with the decision panel first.

```
‹ Team requests
Priya Shah · Annual leave                          LV-0007
Mon 20 – Wed 22 October · 3 working days · sent 8 Oct

┌─ Request ──────────────────────────┐ ┌─ Decision ─────────────────────┐
│ Reason                             │ │ ⚠ Jev and the policy check     │
│ "Family wedding in Ballarat."      │ │   disagree. Check before        │
│                                    │ │   deciding.                     │
│ Balance        2 annual days left  │ │                                 │
│ Notice         12 days             │ │ ┌ ✦ Jev suggests ────────────┐ │
│                                    │ │ │ Approve            74%     │ │
│ Team that week                     │ │ │ ▓▓▓▓▓▓▓░░░                 │ │
│        Mon  Tue  Wed  Thu  Fri     │ │ │ Rule: within policy         │ │
│ Priya  ▒▒▒  ▒▒▒  ▒▒▒  ███  ███     │ │ │ Reason fits leave type      │ │
│ Jonah  ███  ▒▒▒  ███  ███  ███     │ │ │ Urgency 2 of 5              │ │
│ Lena   ███  ███  ███  ███  ███     │ │ └────────────────────────────┘ │
│ ▒ requested   ░ on leave  █ shift  │ │ ┌ ⚖ Policy check ────────────┐ │
│                                    │ │ │ Deny                        │ │
│ Activity                           │ │ │ ✕ Insufficient balance      │ │
│ 8 Oct 14:02  Priya sent request    │ │ │   3 days requested, 2 left  │ │
│ 8 Oct 14:02  Reviewed by Jev       │ │ │ ⚠ Short notice (12 of 14)   │ │
│                                    │ │ └────────────────────────────┘ │
│                                    │ │                                 │
│                                    │ │ Note (required to deny)         │
│                                    │ │ [                            ] │
│                                    │ │ [Deny]            [Approve]     │
│                                    │ │ Flag Jev's suggestion           │
└────────────────────────────────────┘ └─────────────────────────────────┘
```

- **Decision panel** is sticky on desktop so actions stay in view.
- **Disagreement banner** only appears when Jev and policy differ: `--bad` text on `--lantern-100`, `alert-triangle` icon. When they agree, a quiet single line instead: "Jev and the policy check agree."
- **Jev card**: `--jev-100` background, `--jev` left border 3 px, `sparkles` icon and "Jev suggests". Recommendation in `--text-lg`, confidence as a number and a thin bar in `--jev`. Below the threshold, the recommendation is replaced with "Jev isn't sure. Decide using the policy check." and the bar is grey. Under it, the rule it picked (using the rule's plain text), whether the reason fits, urgency. A one-line footnote: "Suggestion only. Jev can't approve or deny."
- **Policy card**: white, `--line` border, `scale` icon. Outcome in `--text-lg` in its colour. Every rule that fired, each with an icon and the numbers behind it ("3 days requested, 2 left").
- The two cards look clearly different (tinted vs plain), so the model's opinion is never mistaken for the rule.
- **Team that week**: a compact grid, one row per person in the department, five weekday cells. Requested days hatched pine, approved leave light grey, shifts solid pine at 20%. It answers "can we cover this?" at a glance. Include a text legend; cells have `aria-label`s like "Jonah, Tuesday, requested leave".
- **Actions**: Approve is primary (pine). Deny is destructive-secondary and needs the note. "Flag Jev's suggestion" is a text link that opens a small inline form: "What should Jev have suggested?" (radio: approve / deny / needs review) plus a note, and "Save flag". Flagging doesn't decide the request.
- After deciding: redirect to the queue, the row collapses out, toast "Approved. Sent to HR." or "Denied. Priya has been told."
- **Own request** (manager is the requester): the decision panel is replaced with "You can't decide your own request. It's gone to HR." No buttons.

## 7. HR screens

HR uses the same components as the manager views. The differences are scope, one extra column, and the final decision.

### 7.0 All leave (`GET /hr/leave`)

```
All leave                                            [Export changes]
Requests approved by managers, waiting for HR

[ Waiting 4 ]  Approved   Declined   All
Department: [All ▾]

│ Person   Dept        Dates      Days  Type    Manager          Jev        Policy   │
│ Priya    Operations  20–22 Oct  3     Annual  ✓ Marcus Bell    ✦ Deny 88% ✕ Deny ✓ │
```

- Extra columns: Department, and Manager decision (name with a check). Wider table; on screens under 1280 px the Type column folds into the Dates cell.
- Department filter is a native `<select>`. Filters are in the URL (`?dept=Operations`) so views are shareable.
- **Export changes** opens a small panel: how many balance changes are waiting, "Download JSON", and one line on what happens next: "Run leave-apply with a REQ number to update the HR file." This is the bridge to the script in the plan.

### 7.1 HR decision view (`GET /hr/leave/:ref`)

Same layout as 6.1, with:
- The stepper at the top of the request column showing Manager approved with the manager's name and note.
- A third card in the decision panel, above Jev: **Manager decision**, white with a pine left border: "Approved by Marcus Bell, 9 Oct — 'Covered by Lena.'"
- Buttons: "Approve and update balance" (primary) and "Decline".
- **Own request** (Helen): "You can't approve your own leave. It needs another HR approver." Panel shows the conflict state in amber, no buttons. This is the separation-of-duties gap from the plan made visible.

## 8. Copy guide

- Sentence case everywhere. Plain words. No "Submit", "Process", or "Item".
- Staff-facing: "Declined", "With manager", "Your manager and HR will read this."
- Manager and HR-facing: name the person, the days and the rule. "Deny" is fine here.
- Jev is always "Jev suggests", never "Jev decided" or "AI approved".
- Errors say what to do: "Choose a leave type." "End date must be on or after the start date."
- Numbers: "3 working days", "2 days left", "92%". Dates as "Mon 20 Oct" in lists, "Monday 20 October" in detail headers. Australian date order in inputs.

## 9. Accessibility checklist

- AA contrast on all text; check `--ink-muted`, chips and the Jev card text with a contrast tool before shipping.
- Visible focus on every interactive element (amber ring). Never remove outlines.
- Everything works with the keyboard alone, including the side sheet (focus moves into it, `Esc` closes it, focus returns to the "Request leave" button).
- The side sheet is a `<dialog>` with `aria-labelledby` on its title.
- Tables use real `<table>`, `<th scope>`, and a visually hidden `<caption>`.
- Touch targets at least 44 × 44 px on mobile.
- Status is text plus colour plus icon, never colour alone.
- `prefers-reduced-motion` disables the slide and collapse animations.
- Language set (`<html lang="en-AU">`).

## 10. Build order for the agent

This slots into the plan without changing its phases:

| Plan step | Build from this spec |
| --- | --- |
| 3.0 – 3.2 | Sections 2, 3 and 4: tokens, fonts, icons, shell, buttons, chips, fields, toast |
| 4.0 – 4.2 | Section 5: My leave, request side sheet, request detail |
| 7.0 – 7.1 | Section 6: queue and decision view |
| 8.0 | Section 7: HR queue, HR decision view, export panel |

After each step, take a screenshot at 1440 px and 390 px wide, compare against the wireframes here, and save them to `evidence/phase-N/`.
