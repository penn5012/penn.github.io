# Codex task collaboration

## Long-lived tasks

| Task | Responsibility | Default write scope |
| --- | --- | --- |
| Product & Architecture | Product decisions, contracts, design handoff, integration and release checks | `docs/`, root configuration |
| Frontend | Responsive React experience and frontend tests | `frontend/` |
| Backend | Fastify API, persistence, AI providers and backend tests | `backend/` |
| Learning | Explanations, exercises and project-based reviews | `学习计划/` |

These are separate Codex tasks with separate conversational context. They share the same Git history, while frontend and backend use worktrees for filesystem isolation during concurrent work.

## Delivery sequence

```text
Product requirement or change
  → update PRD / ADR / OpenAPI contract
  → Frontend and Backend implement in their owned worktrees
  → Product & Architecture integrates and verifies
  → Learning task turns the completed capability into lessons and exercises
```

## Coordination rules

- The Product & Architecture task owns cross-cutting decisions.
- Frontend and Backend tasks do not edit each other's directory.
- The Learning task reads product code but writes only learning material by default.
- A temporary subagent may review, test or investigate a bounded issue; it is not a permanent module owner.
- No task pushes, merges or deletes Git state without an explicit user request.
