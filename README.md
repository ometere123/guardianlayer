# GUARDIAN LAYER

GUARDIAN LAYER is a GenLayer-powered security response layer for Web3 teams. It lets a protocol team register its protocol, monitor suspicious signals, escalate those signals into incidents, submit the incident evidence to a GenLayer intelligent contract, and sync the final on-chain verdict back into the Guardian dashboard and API.

The important idea is simple: Supabase and the dashboard prepare the operational data, but GenLayer is the source of truth for the final emergency decision.

## What It Does

- Creates an organisation workspace with an embedded wallet.
- Registers protocols and monitored contract addresses.
- Accepts exploit/risk signals from the UI or API.
- Rejects caller-submitted verdict fields such as `threat_level`, `recommended_action`, and `confidence_label`.
- Escalates signals into incidents with a canonical SHA-256 evidence packet.
- Writes protocol registration and incident submission to GenLayer Studionet.
- Requests GenLayer AI validator adjudication for incident verdicts.
- Syncs finalized GenLayer verdicts back into Supabase for the dashboard, API, webhooks, and audit logs.
- Exposes `/api/v1/guard/check` so customer apps can check current protocol risk before risky actions.

## GenLayer Contract Flow

The app uses the intelligent contract in [contracts/GuardianLayerProtocol.py](contracts/GuardianLayerProtocol.py).

Current Studionet contract address:

```text
0x996bA0915d08bcDa465352581A7ABFAd48F41626
```

Flow:

1. `register_protocol` stores the protocol identity and policy hash on-chain.
2. `submit_incident` stores an immutable incident/evidence reference on-chain.
3. `adjudicate_incident` asks GenLayer validators to evaluate the evidence using an equivalence principle.
4. `get_incident`, `get_guard_state`, and `is_incident_adjudicated` are read back after writes to prove contract state changed.
5. `/api/genlayer/sync` mirrors the finalized on-chain verdict into Supabase.

Adjudication must use `gl.eq_principle.prompt_comparative(...)` around the nondeterministic LLM call. Calling `gl.nondet.exec_prompt(...)` directly from the write path is forbidden by GenVM and can produce a finalized transaction without mutating contract state.

## Tech Stack

- Next.js App Router
- TypeScript
- Supabase Auth and Postgres
- GenLayer Studionet
- Playwright E2E tests
- Vitest unit tests
- Tailwind-style utility CSS

## Required Environment

Create `.env.local` from `.env.example` and fill the values for Supabase, GenLayer, API key pepper, and app URLs.

Important values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
API_KEY_PEPPER=

GENLAYER_DEPLOYER_PRIVATE_KEY=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS=0x996bA0915d08bcDa465352581A7ABFAd48F41626
```

Never commit `.env.local`. It contains private keys and service role credentials.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful app pages:

- `/login`
- `/onboarding`
- `/app/overview`
- `/app/profile`
- `/app/settings`
- `/app/protocols`
- `/app/signals`
- `/app/incidents`
- `/app/genlayer`
- `/app/genlayer/contract`

## Demo / Operator Flow

1. Sign up or log in.
2. Create an organisation.
3. Generate the embedded wallet during onboarding.
4. Register a protocol in the dashboard.
5. Add monitored contracts for that protocol.
6. Register the protocol on GenLayer.
7. Submit a suspicious signal.
8. Escalate the signal to an incident.
9. Submit the incident to GenLayer.
10. Adjudicate the incident.
11. Sync the finalized GenLayer decision.
12. Check the protocol state through the dashboard or `/api/v1/guard/check`.

## API Overview

API keys are created in the dashboard and stored as hashes only. Clients send them as Bearer tokens.

```http
Authorization: Bearer gl_live_...
```

Main public integration endpoints:

- `GET /api/v1/guard/check?protocol_id=<uuid>`
- `POST /api/v1/signals`
- `GET /api/v1/incidents/:id`
- `GET /api/v1/protocols/:id/status`

Signal submissions are evidence-only. Verdict fields are rejected because GenLayer is the verdict authority.

## Tests And Smoke Checks

You do not need to rerun these before submission if you are using the current verified build and contract address. They are documented here so teammates can reproduce the checks later.

Common commands:

```bash
npm run lint
npm exec tsc -- --noEmit
npm test
npm run build
npm run test:e2e
npm run smoke-test
```

For live on-chain E2E:

```bash
set E2E_ONCHAIN=1
set E2E_USER_EMAIL=<test-user-email>
set E2E_USER_PASSWORD=<test-user-password>
set E2E_ORG_NAME=<organisation-name>
npm exec playwright test -- tests/e2e/authenticated-contract.spec.ts --workers=1 --retries=0
```

For HTTP smoke tests, provide a valid API key and protocol id:

```bash
set SMOKE_BASE_URL=http://127.0.0.1:3000
set SMOKE_API_KEY=gl_live_...
set SMOKE_PROTOCOL_ID=<protocol-uuid>
npm run smoke-test
```

Last known full local verification:

- Lint: passed
- TypeScript: passed
- Unit tests: 38 passed
- Production build: passed
- Full Playwright suite: 31 passed
- HTTP smoke: 19 passed
- Live on-chain E2E: passed for register, submit, adjudicate, sync, and live contract reads

## Deploying The Contract

Deploy the current contract source to GenLayer Studionet:

```bash
npm run deploy:contract
```

After deployment, copy the printed contract address into:

```env
NEXT_PUBLIC_GUARDIAN_LAYER_CONTRACT_ADDRESS=<new-address>
```

Set the same value in the hosted environment, not only in local `.env.local`.

## Notes For Team Members

- GenLayer is authoritative for final verdicts.
- Supabase mirrors verdicts after `/api/genlayer/sync`.
- Do not mark adjudication successful unless the contract read confirms `adjudicated: true`.
- A tx hash alone is not proof of state mutation.
- Keep API keys, private keys, and service role keys out of git and screenshots.
