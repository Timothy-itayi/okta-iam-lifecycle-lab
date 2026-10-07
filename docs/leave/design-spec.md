# Rostr design spec — leave hub on Kaizen

Design spec for the Rostr leave hub in [rostr-leave-jev-plan.md](rostr-leave-jev-plan.md). Rostr's visual language comes from **Kaizen**, Culture Amp's public design system, released under the MIT licence. This spec says which Kaizen tokens to use, which Kaizen component each part of the UI copies, and how every screen and state looks. It is written for a Cursor agent to build from, and replaces the styling notes in plan steps 3.0 to 3.2.

Build constraints from the plan still apply: server-rendered HTML from `rostr/src/views/`, plain CSS, small inline scripts only, no front-end framework. Kaizen's components are React, so Rostr **does not** use them. It uses Kaizen's **design tokens** directly and rebuilds the component patterns in HTML and CSS.

## 1. Kaizen in this project

### 1.0 What we use and what we don't

| Use | Don't use |
| --- | --- |
| `@kaizen/design-tokens` CSS variables (colour, type, spacing, border, shadow, motion) | `@kaizen/components` React components (Rostr has no React) |
| Kaizen component patterns, rebuilt as HTML + CSS: TitleBlock, Button, Tag, Well, Card, Table, Tabs, InlineNotification, ToastNotification, TextField, TextArea, Radio, Avatar, EmptyState | Culture Amp's logo, illustrations, product names or marketing imagery |
| Inter, the open-licence font Kaizen uses for UI text | Tiempos Headline (Kaizen's display serif). It's a commercial font and not needed here |

Rostr keeps its own name and Lanternfield Goods branding. Someone familiar with Culture Amp should recognise the system, not mistake Rostr for a Culture Amp product.

### 1.1 Install and serve the tokens

```bash
cd rostr && npm install @kaizen/design-tokens
```

Checked version: `11.0.20`, MIT. The CSS variables are in `node_modules/@kaizen/design-tokens/css/variables.css` as a single `:root { ... }` block.

Serve it as a static file. In `rostr/src/app.js`:

```js
const path = require('node:path');
const kaizenCss = path.dirname(require.resolve('@kaizen/design-tokens/package.json'));
app.use('/vendor/kaizen', express.static(path.join(kaizenCss, 'css')));
```

In the layout `<head>`, load in this order:

```html
<link rel="stylesheet" href="/vendor/kaizen/variables.css">
<link rel="stylesheet" href="/fonts/inter.css">
<link rel="stylesheet" href="/app.css">
```

`app.css` only references `var(--...)` tokens. No raw hex values outside a short alias block (1.3).

### 1.2 Credit

- `README.md`: one line under the Rostr section: "UI built on Kaizen design tokens (Culture Amp, MIT licence)" with a link to `https://github.com/cultureamp/kaizen-design-system`.
- `docs/decisions/jev-03-ui-kaizen.md`: why Kaizen (public, permissive licence, a real HR product's design language), what was used, what wasn't (components, brand, Tiempos), and how the tokens are served.

### 1.3 Rostr aliases

Name tokens by job in one block at the top of `app.css`, pointing at Kaizen variables. Screens use these aliases, so a change of mind is one edit.

```css
:root {
  /* text */
  --rs-ink: var(--color-purple-800);                 /* #2f2438, Kaizen's text colour */
  --rs-ink-muted: rgba(var(--color-purple-800-rgb), .7);
  /* surfaces */
  --rs-page: var(--color-gray-100);                  /* #f9f9f9 */
  --rs-surface: var(--color-white);
  --rs-line: var(--color-gray-300);                  /* #eaeaec */
  --rs-line-strong: var(--color-gray-500);           /* #878792, input borders */
  /* brand */
  --rs-nav: var(--color-purple-700);                 /* #4a234d, global nav */
  --rs-title: var(--color-purple-600);               /* #5f3361, TitleBlock default */
  /* actions */
  --rs-action: var(--color-blue-500);                /* #0168b3, Kaizen primary button */
  --rs-action-hover: var(--color-blue-600);
  --rs-focus: var(--color-blue-500);
  /* status */
  --rs-ok-bg: var(--color-green-100);    --rs-ok: var(--color-green-700);    --rs-ok-icon: var(--color-green-500);
  --rs-wait-bg: var(--color-yellow-100); --rs-wait: var(--color-yellow-700);
  --rs-bad-bg: var(--color-red-100);     --rs-bad: var(--color-red-700);     --rs-bad-icon: var(--color-red-500);
  --rs-info-bg: var(--color-blue-100);   --rs-info: var(--color-blue-700);
  /* Jev — reserved, nothing else uses orange */
  --rs-jev-bg: var(--color-orange-100);  --rs-jev: var(--color-orange-700);  --rs-jev-line: var(--color-orange-500);
}
```

**Why Jev is orange.** Kaizen uses purple for the brand, blue for actions, and green, yellow and red for status. Orange is the one family left free, so it can mean "this came from Jev" and nothing else. Jev's suggestions never look like an action, a status, or a person's decision.

## 2. Foundations

### 2.0 Type

Self-host **Inter** (SIL Open Font License) as `woff2` in `rostr/public/fonts/`, weights 400, 500 and 600, with `rostr/public/fonts/inter.css` declaring the `@font-face` rules. Kaizen's font-family tokens already list Inter first, so nothing else changes.

| Rostr use | Kaizen token prefix | Size / line height / weight |
| --- | --- | --- |
| Page title in TitleBlock | `--typography-heading-2-*` | 1.75 / 2.25 rem, 600 |
| Panel title | `--typography-heading-4-*` | 1.125 / 1.5 rem, 600 |
| Small section heading | `--typography-heading-6-*` | 0.875 / 1.5 rem, 600 |
| Body, inputs | `--typography-paragraph-body-*` | 1 / 1.5 rem, 400, max width 780 px |
| Tables, chips, helper text | `--typography-paragraph-small-*` | 0.875 / 1.125 rem, 400 |
| Timestamps | `--typography-paragraph-extra-small-*` | 0.75 rem |
| Balance numbers | `--typography-data-small-*` | 1.5 rem, 700 |
| Bold inline | `--typography-paragraph-bold-font-weight` | 600 |

All numbers (dates, days, balances, confidence) use `font-variant-numeric: tabular-nums`. Sentence case everywhere. No all-caps labels.

### 2.1 Space, border, shadow, motion

- Spacing: Kaizen named steps. `--spacing-xs` 6 px, `--spacing-sm` 12 px, `--spacing-md` 24 px, `--spacing-lg` 36 px, `--spacing-xl` 48 px. Use the numeric ones (`--spacing-8`, `--spacing-16`) for fine adjustments.
- Panels, inputs and cards: `--border-solid-border-radius` (7 px). Focus rings: `--border-focus-ring-border-radius` (10 px). Chips: fully rounded.
- Input borders: `--border-solid-border-width` (2 px), colour `--rs-line-strong`. This 2 px border is part of what makes Kaizen look like Kaizen; keep it.
- Panel borders: `--border-width-1` in `--rs-line`. No shadow.
- Shadows: `--shadow-small-box-shadow` for menus and toasts, `--shadow-large-box-shadow` for the side sheet. Nothing else floats.
- Motion: `--animation-duration-rapid` (200 ms) with `--animation-easing-function-ease-out` for the side sheet and toasts; `--animation-duration-fast` (300 ms) for the queue row collapsing after a decision. Nothing animates on page load. `prefers-reduced-motion` turns motion off.

### 2.2 Icons

Kaizen's icon set comes from its React package, so use **Lucide** instead (ISC licence), inline SVG, 20 px, 1.75 stroke, `currentColor`, collected in `views/icons.js`. Set: `calendar`, `plane` (annual), `thermometer` (sick), `user` (personal), `check`, `x`, `clock`, `flag`, `sparkles` (Jev only), `scale` (policy only), `download`, `log-out`, `chevron-left`, `alert-triangle`, `info`.

### 2.3 Focus

Every interactive element: `outline: var(--border-focus-ring-border-width) solid var(--rs-focus); outline-offset: 1px;`. On the purple TitleBlock and nav, use `--color-blue-300` so the ring stays visible. This mirrors Kaizen's Input and Button focus rules.

## 3. App shell

Culture Amp's structure, rebuilt: a dark global nav bar, then a TitleBlock band with the page title, actions and tabs, then content on a light page.

```
┌───────────────────────────────────────────────────────────────────────┐
│ ◐ Rostr   Lanternfield Goods                       (PS) Priya Shah ▾  │  global nav, --rs-nav
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  My leave                                          [Request leave]    │  TitleBlock, --rs-title
│  Priya Shah · Operations                                               │
│                                                                       │
│  My leave   My roster   Team requests (3)                             │  navigation tabs
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   content, max-width 1080 px, centred column, left-aligned inside     │  --rs-page
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.0 Global nav
56 px tall, `--rs-nav` background, white text. Left: the Rostr mark (a small circle, half filled `--color-yellow-400`, like a lantern seen from above) and "Rostr", then "Lanternfield Goods" at 70% white. Right: avatar (Kaizen Avatar pattern, `--color-orange-100` background for "personal") with the person's name and a menu holding their department, role, Okta groups (for demos) and "Sign out".

### 3.1 TitleBlock
Copies Kaizen's TitleBlock: full-width band, content in the centred column, minimum 88 px tall title row, title in heading-2, a subtitle line, and the page's primary action on the right. Primary actions on the dark band use the **reversed** button (white fill, `--rs-ink` text), as in Kaizen.

**Variant by role**, using Kaizen's own variants:

| Area | Variant | Background | Text |
| --- | --- | --- | --- |
| Staff pages (My leave, My roster) | default | `--color-purple-600` | white |
| Manager pages (Team requests) | default | `--color-purple-600` | white |
| HR pages (All leave, Export) | admin | `--color-gray-100` with a bottom border in `--rs-line` | `--rs-ink` |

The HR area looking different is deliberate. Kaizen uses the admin variant for admin tools, and HR's desk is an admin tool. It also makes it obvious when you're acting with HR rights.

### 3.2 Navigation tabs
Inside the TitleBlock, like Kaizen's NavigationTabs. Links with white text at 70%, the active tab at 100% with a 5 px bar along the top edge. On the HR (light) band: `--rs-ink` at 75%, active bar in `--color-blue-500`. Only the tabs a role can use are rendered:

| Role | Tabs |
| --- | --- |
| Staff | My leave, My roster |
| Manager | My leave, My roster, Team requests (count) |
| HR | My leave, My roster, All leave (count), Export |

HR pages show the HR tabs only; a "Back to my leave" breadcrumb (Kaizen's round breadcrumb button, `chevron-left`) sits left of the title.

Hiding tabs is for clarity. The server still enforces every route.

### 3.3 Mobile (< 768 px)
Global nav keeps the mark and avatar. TitleBlock stacks: title, subtitle, full-width primary action. Tabs scroll sideways with the Kaizen edge fade. Content gets `--spacing-sm` side padding.

## 4. Components

### 4.0 Button (Kaizen Button)
- **Primary**: `--rs-action` fill and border, white text, min height 40 px (48 px on mobile), radius 7 px, label in `--typography-button-primary-*` weight 500.
- **Secondary**: white fill, 2 px `--color-gray-500` border, `--rs-ink` text. Hover `--color-gray-200`.
- **Tertiary**: text only, `--rs-action`, underline on hover. Used for "Flag Jev's suggestion".
- **Destructive**: secondary style with `--color-red-500` border and `--color-red-600` text. Used for Deny.
- **Reversed** (on the purple band): white fill, `--rs-ink` text.
- Labels are verbs that say what happens: "Request leave", "Send request", "Approve", "Deny", "Approve and update balance".

### 4.1 Tag (Kaizen Tag)
Pill, paragraph-small, icon + word, coloured with Kaizen's Tag pairs (light background, `-700` text, `-500` icon):

| Status | Text (staff) | Text (manager, HR) | Kaizen colour |
| --- | --- | --- | --- |
| `with_admin` | With manager | Waiting for you / With manager | yellow, `clock` |
| `with_hr` | With HR | With HR | yellow, `clock` |
| `approved` | Approved | Approved | green, `check` |
| `denied` | Declined | Denied | red, `x` |
| `cancelled` | Cancelled | Cancelled | gray, no icon |

Jev tag: orange, `sparkles`, "Suggests approve · 92%", or "Not sure" under the threshold.
Policy tag: `scale` icon, coloured by outcome (green approve, yellow needs review, red deny), "Policy: deny".
Agreement in tables: `check` in `--rs-ok-icon` when they agree; `alert-triangle` in `--rs-bad-icon` plus the word "Differs" when they don't.

### 4.2 Well (Kaizen Well)
Bordered, tinted box, 1 px border, 7 px radius, `--spacing-md` padding. Rostr uses three, and their colours are fixed:

| Well | Kaizen colours | Holds |
| --- | --- | --- |
| Jev | orange: `--color-orange-100` bg, `--color-orange-500` border | Jev's suggestion |
| Policy | white: white bg, `--color-gray-500` border | Policy check |
| Manager decision | blue: `--color-blue-100` bg, `--color-blue-400` border | Manager's decision, on HR's view |

### 4.3 Notifications (Kaizen InlineNotification and ToastNotification)
- **Inline**: white text area with a coloured 1 px border and tinted background, icon on the left, title in bold, one line of body. Variants map to Kaizen's: `success` green, `informative` blue, `cautionary` yellow, `warning` red.
- **Toast**: stacked top-right below the TitleBlock on desktop, full-width at the bottom on mobile. White, `--shadow-small-box-shadow`, 7 px radius, a 4 px left bar in the variant colour, title + body, close button. `role="status"`. Disappears after 5 seconds, or stays until closed for errors.
- Toast copy repeats the button: "Send request" → "Request sent. LV-0007 is with Marcus Bell."

### 4.4 Fields (Kaizen TextField, TextArea, Radio, FieldMessage)
- Label above, paragraph-small 600. Optional description below the label in `--rs-ink-muted`.
- Input: white, 2 px `--color-gray-500` border, 7 px radius, 48 px tall, body text. Hover border `--color-gray-600`. Focus: 2 px `--color-blue-500` outline, 1 px offset.
- Error: border `--color-red-500`, FieldMessage below with `alert-triangle`, linked by `aria-describedby`. Messages say what to do: "Choose an end date on or after the start date."
- On submit with errors, a `warning` InlineNotification at the top of the form lists each error as a link to its field.

### 4.5 Table (Kaizen Table)
White panel, 1 px `--rs-line` border, 7 px radius. Header row: paragraph-small 600, `--rs-ink` at 70%, sentence case, bottom border. Rows: minimum 60 px, `--spacing-md` side padding, hover `--color-gray-100`, whole row is a link with a visible focus ring. Visually hidden `<caption>`, `<th scope="col">`.

### 4.6 Card (Kaizen Card)
White, 1 px `--rs-line`, 7 px radius, `--spacing-md` padding. Used for balance tiles and the request panel.

### 4.7 EmptyState (Kaizen EmptyState, text only)
Centred in its panel: a heading-4 line, one sentence, one button. Kaizen's illustrations belong to Culture Amp, so use a 48 px Lucide icon in `--rs-ink-muted` instead.

## 5. Staff screens

### 5.0 My leave (`GET /leave`)

```
TitleBlock (purple):  My leave                              [Request leave]
                      Priya Shah · Operations
                      My leave   My roster

┌ Annual ─────────────┐ ┌ Sick ───────────────┐ ┌ Personal ───────────┐
│ ✈                   │ │ 🌡                   │ │ 👤                  │
│ 2  days left        │ │ 8  days left        │ │ 2  days left        │
│ ▓▓░░░░░░░░░  of 15  │ │ ▓▓▓▓▓▓▓▓▓▓  of 8    │ │ ▓▓▓▓▓▓▓▓▓▓  of 2    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
From HR records

Requests                                                           heading-4
┌──────────────────────────────────────────────────────────────────────┐
│ Annual leave   Mon 20 – Wed 22 Oct   3 days   [◷ With manager]     › │
│ Sick leave     Thu 2 Oct             1 day    [✓ Approved]         › │
└──────────────────────────────────────────────────────────────────────┘
```

- Balance tiles are Cards in a 3-column grid (1 column on mobile). Number in `--typography-data-small-*`, "days left" in paragraph-small, a 6 px progress bar: track `--color-gray-300`, fill `--color-blue-500`, turning `--color-yellow-500` when under 3 days left. Footnote "From HR records" in extra-small muted.
- Requests table: open requests first, then decided ones under a "Past requests" heading-6.
- Empty: "No leave requested yet." + "Request leave".

### 5.1 Request leave (side sheet)

Opened by "Request leave". A `<dialog>` 520 px wide sliding in from the right with `--shadow-large-box-shadow`, full screen on mobile. It's a real form posting to `POST /leave`, and `/leave/new` renders the same form as a page without JavaScript.

```
Request leave                                                    ✕
───────────────────────────────────────────────────────────────────
Leave type
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ ✈ Annual      │ │ 🌡 Sick        │ │ 👤 Personal   │
│ 2 days left   │ │ 8 days left   │ │ 2 days left   │
└───────────────┘ └───────────────┘ └───────────────┘

Start date             End date
[ 20/10/2026     ]     [ 22/10/2026     ]
3 working days · Monday 20 to Wednesday 22 October

┌ ⚠ More than your balance ─────────────────────────────────────┐
│ This is 1 day more than your annual balance. You can still    │
│ send it, and your manager will see this.                      │
└───────────────────────────────────────────────────────────────┘

Reason
Your manager and HR will read this.
┌───────────────────────────────────────────────────────────────┐
│                                                               │
└───────────────────────────────────────────────────────────────┘
                                                        0 / 500
───────────────────────────────────────────────────────────────────
Goes to Marcus Bell, then HR.               [Cancel] [Send request]
```

- **Leave type**: native radio group styled as three Kaizen Tile-like cards. Each shows its icon, name and remaining balance. Selected: 2 px `--color-blue-500` border, `--color-blue-100` background. Arrow keys move between them.
- **Dates**: two native `<input type="date">` fields (stacked on mobile), then a live summary in tabular numbers. The server recalculates the working days.
- **Notices**: `cautionary` InlineNotifications for over-balance and for annual leave inside 14 days ("Annual leave needs 14 days' notice. You can still send it."). They inform; they never block. Policy decides later. Staff never see Jev.
- **Reason**: TextArea, 4 rows, description above, counter below right.
- **Footer**: sticky, with the manager's name from the HR file and the two buttons.
- On send: sheet closes, toast appears, the new row appears at the top with "With manager".
- `Esc` closes the sheet and focus returns to "Request leave".

### 5.2 Request detail (`GET /leave/:ref`)

```
TitleBlock (purple):  ‹  Annual leave · LV-0007              [Cancel request]
                         Mon 20 – Wed 22 October · 3 working days

┌ Progress ────────────────────────────────────────────────────────────┐
│   ●──────────────●──────────────○──────────────○                     │
│   Sent           Manager        HR             Done                  │
│   8 Oct          Waiting                                             │
└──────────────────────────────────────────────────────────────────────┘
┌ Your reason ─────────────────┐ ┌ Activity ───────────────────────────┐
│ Family wedding in Ballarat.  │ │ 8 Oct 14:02  You sent this request  │
└──────────────────────────────┘ └─────────────────────────────────────┘
```

- Progress copies the step pattern from Kaizen's Workflow: done steps filled `--color-blue-500`, current step a ring in `--color-yellow-500` with "Waiting", future steps outlined `--color-gray-400`. On decline, the line stops and the step shows a red `x` and the decider's note.
- Activity lists `leave_events` in plain words. Staff don't see Jev or policy events.
- "Cancel request" (reversed secondary button) only while open, with a confirm dialog.

### 5.3 My roster
A table of the week: day, start, end, location. Released shifts show a gray "On leave" tag in place of the times.

## 6. Manager screens

### 6.0 Team requests (`GET /admin/leave`)

```
TitleBlock (purple):  Team requests
                      Operations · leave waiting for your decision
                      My leave   My roster   Team requests (3)

[ Waiting 3 ]  Decided  Flagged                       ← in-page tabs

┌──────────────────────────────────────────────────────────────────────────┐
│ Person        Dates          Days  Type     Jev               Policy      │
├──────────────────────────────────────────────────────────────────────────┤
│ (PS) Priya    20–22 Oct      3     Annual   ✦ Deny · 88%     ✕ Deny   ✓  │
│ (JH) Jonah    Tue 21 Oct     1     Annual   ✦ Approve · 74%  ⚖ Review ⚠  │
│ (LO) Lena     Tue 4 Nov      1     Sick     ✦ Not sure       ✓ Approve    │
└──────────────────────────────────────────────────────────────────────────┘
```

- In-page tabs: links with counts, active tab underlined 3 px in `--color-blue-500`.
- Sort oldest waiting first.
- Mobile: each row becomes a Card with person and dates on top and tags below.
- Empty: "Nothing waiting. New requests from Operations will appear here."

### 6.1 Decision view (`GET /admin/leave/:ref`)

The screen this project is about. Two columns on desktop (7 / 5 of 12), stacked on mobile with the decision column first.

```
TitleBlock (purple):  ‹  Priya Shah · Annual leave                 LV-0007
                         Mon 20 – Wed 22 October · 3 working days · sent 8 Oct

┌ Request ─────────────────────────────┐ ┌ Decision ──────────────────────────┐
│ Reason                               │ │ ┌ ⚠ Jev and the policy check ────┐ │
│ Family wedding in Ballarat.          │ │ │   disagree. Check before        │ │
│                                      │ │ │   deciding.                     │ │
│ Balance       2 annual days left     │ │ └─────────────────────────────────┘ │
│ Notice        12 days                │ │                                     │
│                                      │ │ ┌ ✦ Jev suggests ── orange Well ──┐ │
│ Team that week                       │ │ │ Approve                    74%  │ │
│          Mon  Tue  Wed  Thu  Fri     │ │ │ ▓▓▓▓▓▓▓░░░                      │ │
│ Priya    ▒▒▒  ▒▒▒  ▒▒▒  ███  ███     │ │ │ Rule: within policy             │ │
│ Jonah    ███  ▒▒▒  ███  ███  ███     │ │ │ Reason fits the leave type      │ │
│ Lena     ███  ███  ███  ███  ███     │ │ │ Urgency 2 of 5                  │ │
│ ▒ requested  ░ on leave  █ rostered  │ │ │ Suggestion only. Jev can't      │ │
│                                      │ │ │ approve or deny.                │ │
│ Activity                             │ │ └─────────────────────────────────┘ │
│ 8 Oct 14:02  Priya sent request      │ │ ┌ ⚖ Policy check ── white Well ───┐ │
│ 8 Oct 14:02  Reviewed by Jev         │ │ │ Deny                            │ │
│ 8 Oct 14:02  Policy check ran        │ │ │ ✕ Insufficient balance          │ │
│                                      │ │ │   3 days requested, 2 left      │ │
│                                      │ │ │ ⚠ Short notice: 12 of 14 days   │ │
│                                      │ │ └─────────────────────────────────┘ │
│                                      │ │ Note (needed to deny)               │
│                                      │ │ [                                 ] │
│                                      │ │ [Deny]                  [Approve]   │
│                                      │ │ Flag Jev's suggestion               │
└──────────────────────────────────────┘ └─────────────────────────────────────┘
```

- **Decision column** is sticky on desktop so the buttons stay in view.
- **Agreement line**: when they disagree, a `warning` InlineNotification. When they agree, a plain line with a green `check`: "Jev and the policy check agree."
- **Jev Well** (orange): `sparkles` + "Jev suggests" in heading-6, the recommendation in heading-4, confidence as a number and a 6 px bar in `--color-orange-500`. Then the deciding rule in plain words from `leave-rules.json`, reason fit, urgency, and the fixed footnote. Below the threshold: "Jev isn't sure. Decide using the policy check." with a gray bar. If Jev was unavailable, the Well turns gray: "Jev couldn't review this request (error 401). Use the policy check."
- **Policy Well** (white): `scale` + "Policy check", outcome in heading-4 in its status colour, then every rule that fired with its icon and the numbers behind it.
- **Team that week**: a 5-column grid, one row per person in the department. Requested days hatched `--color-blue-400`, approved leave `--color-gray-300`, rostered shifts `--color-blue-100`. Text legend below; every cell has an `aria-label` such as "Jonah, Tuesday, requested leave".
- **Actions**: Approve (primary), Deny (destructive; needs the note), "Flag Jev's suggestion" (tertiary). Flag opens an inline form: "What should Jev have suggested?" (approve / deny / needs review) and a note, then "Save flag". Flagging doesn't decide the request.
- **After deciding**: back to the queue; the row collapses; toast "Approved. Sent to HR." or "Denied. Priya has been told."
- **Own request**: the decision column shows an `informative` notification "You can't decide your own request. It has gone to HR." and no buttons.

## 7. HR screens

Same components, admin TitleBlock variant, all departments.

### 7.0 All leave (`GET /hr/leave`)

```
TitleBlock (admin, light gray):  ‹  All leave                     [Export changes]
                                    Approved by managers, waiting for HR
                                    All leave (4)   Export

[ Waiting 4 ]  Approved  Declined  All          Department [ All ▾ ]

│ Person   Department  Dates      Days  Manager           Jev          Policy    │
│ Priya    Operations  20–22 Oct  3     ✓ Marcus Bell     ✦ Deny 88%  ✕ Deny  ✓ │
```

- Extra columns: Department, and Manager (a green `check` and the manager's name). Under 1280 px, Days moves into the Dates cell.
- Department filter is a native `<select>` styled as a Kaizen field. Filters live in the URL (`?dept=Operations`).
- **Export changes** (secondary button on the light band) opens a small modal: how many balance changes are waiting, "Download JSON" (primary), and one line on what comes next: "Run leave-apply with a REQ number to update the HR file."

### 7.1 HR decision view (`GET /hr/leave/:ref`)

Same layout as 6.1, with:
- the progress steps at the top of the request column showing "Manager approved" with the manager's name;
- a **Manager decision Well** (blue) first in the decision column: "Approved by Marcus Bell, 9 Oct", followed by their note;
- buttons "Approve and update balance" (primary) and "Decline" (destructive).

**Own request** (Helen): a `cautionary` notification "You can't approve your own leave. It needs another HR approver." and no buttons. This makes the separation-of-duties gap from the plan visible.

## 8. Copy

- Sentence case. Plain verbs. No "Submit", "Process" or "Item".
- Staff see "Declined" and "With manager". Managers and HR see "Deny" and "Waiting for you".
- Jev is always "Jev suggests". Never "Jev decided" or "AI approved".
- Errors say what to do. Empty states say what will appear and offer the next action.
- Numbers: "3 working days", "2 days left", "92%". Dates as "Mon 20 Oct" in tables and "Monday 20 October" in headers. Australian date order in inputs. `<html lang="en-AU">`.

## 9. Accessibility

- Text meets WCAG AA. Kaizen's pairs (light background, `-700` text) are built for this; check the orange Jev Well and `--rs-ink-muted` with a contrast tool.
- Every interactive element has a visible focus ring (2.3).
- Full keyboard use, including the side sheet and modals (`<dialog>`, focus moves in, `Esc` closes, focus returns).
- Real tables with captions and header scopes.
- Status is always word + icon + colour.
- Touch targets at least 44 × 44 px on mobile.
- Reduced motion respected.

## 10. Build order

| Plan step | From this spec |
| --- | --- |
| 3.0 – 3.2 | Sections 1–4: install and serve tokens, Inter, aliases, global nav, TitleBlock, tabs, buttons, tags, wells, notifications, fields, table |
| 4.0 – 4.2 | Section 5: My leave, request side sheet, request detail |
| 7.0 – 7.1 | Section 6: Team requests and the decision view |
| 8.0 | Section 7: All leave, HR decision view, export modal |
| 10.5 | Section 1.2: README credit and `jev-03-ui-kaizen.md` |

After each step, take screenshots at 1440 px and 390 px wide, compare them with the wireframes here, and save them to `evidence/phase-N/`. For reference while building, Kaizen's Storybook is at <https://cultureamp.design>.
