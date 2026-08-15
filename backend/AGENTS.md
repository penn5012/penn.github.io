# Backend task guidance

## Scope

Own `backend/`. Read `docs/product/PRD.md`, `docs/api/openapi.yaml` and relevant ADRs before changing public behavior.

## Boundaries

- Do not edit `frontend/` or `学习计划/` unless the user explicitly expands the task.
- Public request, response and error shapes must match `docs/api/openapi.yaml`.
- Keep `app.ts` free of port binding so routes can be tested through Fastify injection; keep listening in `server.ts`.
- Routes validate transport data, services hold business rules, and providers isolate databases and external AI vendors.
- Secrets must be read from validated server environment variables and must never appear in logs or responses.

## Product expectations

- Return consistent error envelopes and suitable HTTP status codes.
- Add request validation before business logic.
- Design for idempotency, cancellation, timeouts and resource ownership where relevant.
- Preserve a provider boundary around model APIs so application modules do not depend on one vendor SDK.

## Verification

Run from the repository root:

```bash
npm run typecheck --workspace backend
npm run build --workspace backend
```
