# SaveCircle frontend

A Next.js landing page for SaveCircle’s Stellar Testnet savings circles. It uses the supplied photography, Manrope, and DM Serif Display Italic.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Verify

```sh
npm run lint
npm run build
node --test features/landing/plan.test.mjs
```

The planner tests use Node.js 22.18 or newer.

## MVVM

- **Model** — `features/landing/plan.ts` calculates rotating payouts and handles monetary amounts in cents. `content.ts` defines the landing page content.
- **View model** — `features/landing/use-planner.ts` manages planner inputs, derived totals, and clipboard feedback.
- **View** — `app/page.tsx` renders the landing page. `features/landing/planner.tsx` binds the controls and results to the view model.

The planner and member ledger use illustrative data. The wallet button describes the app connection flow, which requires a future integration.
