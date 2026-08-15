# Frontend task guidance

## Scope

Own `frontend/`. Read `docs/product/PRD.md`, `docs/design/` and `docs/api/openapi.yaml` before implementing a user-facing flow.

## Boundaries

- Do not edit `backend/` or `学习计划/` unless the user explicitly expands the task.
- Do not invent backend fields, routes or error shapes. Propose contract changes through `docs/api/openapi.yaml` and the Product & Architecture task.
- Keep API access in `src/api/`; UI components must not embed request URLs or transport details.
- Never place model, database or authentication secrets in browser code or `VITE_` variables.

## Product expectations

- Build responsive web layouts for desktop, tablet and mobile browser widths.
- Implement loading, empty, error, disabled and retry states alongside happy paths.
- Reuse accessible components and support keyboard interaction and visible focus states.
- Treat Lanhu annotations and approved screenshots as visual references; repository contracts remain authoritative for behavior.

## Verification

Run from the repository root:

```bash
npm run typecheck --workspace frontend
npm run build --workspace frontend
```
