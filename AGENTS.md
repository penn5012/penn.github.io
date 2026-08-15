# AChat repository guidance

## Purpose

This repository contains a responsive web product, its API service, architecture documents, and the learning material derived from the real project.

## Source of truth

Use these files in order when a decision crosses module boundaries:

1. `docs/product/PRD.md` for product scope and acceptance criteria.
2. `docs/api/openapi.yaml` for frontend/backend HTTP contracts.
3. `docs/adr/` for durable technical decisions.
4. `docs/design/` for responsive behavior and design handoff.

When implementation and a source-of-truth document disagree, do not silently guess. Update the contract in the product/architecture task before changing both applications.

## Ownership

- `frontend/`: owned by the Frontend task.
- `backend/`: owned by the Backend task.
- `学习计划/`: owned by the Learning task.
- `docs/`, root configuration, integration and releases: owned by the Product & Architecture task.

Agents may read the entire repository. By default they only write inside their owned path. Cross-boundary changes require an explicit task or coordination through the Product & Architecture task.

## Shared rules

- This is responsive web only; do not introduce native mobile application code.
- Design review and handoff use Lanhu. Do not create or depend on Figma assets.
- Keep secrets server-side and out of Git. Frontend variables must never contain provider API keys.
- Add or change an API in `docs/api/openapi.yaml` before depending on it across modules.
- Preserve unrelated user changes and avoid broad rewrites.
- Do not push, merge, delete branches, or publish external artifacts unless the user explicitly asks.

## Verification

From the repository root, prefer:

```bash
npm run typecheck
npm run build
```

Run the narrowest relevant checks during iteration, then both workspace checks before integration when dependencies are available.
