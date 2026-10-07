# Jev 03 — UI on Kaizen tokens

Previous: [Jev 02 — Decision model](jev-02-decision-model.md).

Decision date: 2026-10-08

The leave hub uses [Kaizen](https://github.com/cultureamp/kaizen-design-system), Culture Amp's public design system, for its visual language. The spec is [docs/leave/design-spec.md](../leave/design-spec.md).

## Why

Kaizen is the design system of a real HR product, it is public, and the token package is MIT. Rostr should look like that class of tool. Building a second palette from scratch, which the first staff screens did, is the work this replaces.

## What is used

`@kaizen/design-tokens` `11.0.20`. The CSS variables are served from the package at `/vendor/kaizen/variables.css`. `rostr/public/app.css` names them by job (`--rs-ink`, `--rs-action`, and the rest) and does not repeat the hex values. UI text is Inter, self-hosted, weights 400, 500 and 600. Icons stay Lucide, because Kaizen's icons ship inside the React package.

The shell is Culture Amp's shape, rebuilt in HTML: a purple global nav, a TitleBlock, and tabs. Staff and manager pages use the purple band. HR pages use the light admin band. Jev, when it is built, is orange. Purple, blue, green, yellow and red are already taken by the brand, the actions, and the statuses.

## What is not used

`@kaizen/components`. Those are React, and Rostr renders HTML on the server. Culture Amp's logo, illustrations, product names, and the Tiempos Headline font. Tiempos is commercial. The Rostr mark stays a lantern, half filled with Kaizen's yellow.

## Check

[evidence/leave/kaizen-my-leave-1440.png](../../evidence/leave/kaizen-my-leave-1440.png), [kaizen-request-sheet-1440.png](../../evidence/leave/kaizen-request-sheet-1440.png), [kaizen-hr-1440.png](../../evidence/leave/kaizen-hr-1440.png), [kaizen-my-leave-390.png](../../evidence/leave/kaizen-my-leave-390.png). The `04-` shots are the skin this replaced.
