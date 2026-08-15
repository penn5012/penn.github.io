# AChat Web Product — PRD

Status: Draft 0.1

Owner: Product & Architecture task

Platform: Responsive web

## Product statement

AChat is a focused AI workspace where a user can create conversations, send messages, follow streaming responses and return to previous work without exposing model credentials in the browser.

The project is also the practical backbone of the AI application learning plan: new concepts should be introduced through real product capabilities and verified code.

## Primary user

An individual learner or knowledge worker who wants a clear, dependable web interface for repeated AI-assisted work.

## V1 goals

- Create, list, open, rename and delete conversations.
- Send a message and render an incremental assistant response.
- Stop generation, retry failures and recover from a temporary disconnect.
- Persist conversation history securely through the backend.
- Present understandable loading, empty, error and disabled states.
- Keep all model credentials and provider calls on the server.
- Work at desktop, tablet and mobile browser widths.

## Core user flow

```text
Open workspace
  → create or select a conversation
  → write a message
  → submit to backend
  → render streaming assistant output
  → save the completed exchange
  → resume it later from conversation history
```

## V1 pages

1. Workspace: conversation navigation, active conversation and composer.
2. Authentication: register, sign in and signed-out recovery.
3. Settings: profile, appearance and model-facing preferences that are safe for users to control.

## Explicit non-goals for V1

- Native iOS or Android applications.
- Multi-agent autonomous planning.
- Enterprise administration, billing or marketplace features.
- Training or fine-tuning models.
- Exposing provider API keys to the client.

## Acceptance baseline

- A new user can create a conversation and receive a streamed response.
- Refreshing the page restores authenticated conversation history.
- A failed request has a clear retry path and does not duplicate the user message.
- Stopping generation releases the active client and server resources.
- No secret is present in frontend source, bundles, browser storage or network responses.
- Keyboard-only users can reach and operate all primary controls.

Open product questions are recorded in the Product & Architecture task before implementation begins.
