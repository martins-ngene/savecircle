# SaveCircle frontend

A Next.js frontend for SaveCircle’s Stellar Testnet savings circles.

## Run locally

From the repository root:

```sh
npm ci
npm run frontend:dev
```

Open http://localhost:3000.

## Verify

```sh
npm run frontend:lint
npm run frontend:build
npm run frontend:test
```

The planner tests use Node.js 22.18 or newer.

## MVVM

- **Model** — `features/landing/plan.ts` calculates rotating payouts and handles monetary amounts in cents. `content.ts` defines the landing page content.
- **View model** — `features/landing/use-planner.ts` manages planner inputs, derived totals, and clipboard feedback.
- **View** — `app/page.tsx` renders the landing page. `features/landing/planner.tsx` binds the controls and results to the view model.

The landing-page planner uses illustrative inputs. Dashboard screens use the SaveCircle API and the connected Freighter wallet. See [the local Docker guide](../../LOCAL_DOCKER.md) for backend setup.
