# ADR 0001: Web platform and module boundaries

Status: Accepted
Date: 2026-08-15

## Context

The project needs a practical full-stack foundation that supports the learning roadmap while keeping frontend, backend and learning work independently understandable.

## Decision

- Use a single Git monorepo with npm workspaces.
- Build the responsive web client with React, Vite and TypeScript.
- Build the API with Node.js, Fastify and TypeScript.
- Keep frontend and backend isolated by directory and an OpenAPI contract.
- Keep the learning plan in the same repository so lessons can cite real code, but give it a separate Codex task and write boundary.
- Use Lanhu for design review and developer handoff; do not depend on Figma.
- Use separate Codex worktrees for concurrent frontend and backend work.

## Consequences

- Cross-module behavior must be agreed in `docs/api/openapi.yaml` before implementation.
- Shared code is not introduced until repeated duplication proves a package boundary is needed.
- Integration stays in the Product & Architecture task; feature tasks do not merge or push autonomously.
- Design creation must use a web-capable authoring source before upload to Lanhu because Lanhu handoff is not itself the application runtime.
