# Full SDD workflow

## Configuration

- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements

<!-- chat-id: 1ab46945-c11b-4bd6-888a-81c23227fce3 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

<!-- chat-id: 9c9524bd-f377-4a3a-97cb-9e3620bc886e -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

<!-- chat-id: 22a68367-fe1d-4dc8-ad9b-9526b63ff1ec -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Add ntfy MCP registry + settings schema

<!-- chat-id: 658f9527-9164-4467-a04c-f1447542d33b -->

- Create/update `.kilo/mcp-servers-registry.json` with `ntfy-me-mcp` entry, command, and env var metadata (mark optional).
- Update `src/package.json` `contributes.configuration` for `kilo-code.notifications.ntfy.{enabled,topic,server,token}` with defaults.
- Update `src/package.nls.json` for settings labels/descriptions.
- If needed, extend `packages/types/src/global-settings.ts` and any settings key lists/defaults to keep types aligned.
- Verification: `pnpm check-types` (repo root) if settings types change.

### [x] Step: Implement ntfy notification helper + tests

<!-- chat-id: d040d086-c2f3-4802-8786-a8dfeb923311 -->

- Add `src/services/notifications/ntfy-helper.ts` with `sendNtfyNotification` reading settings, guarding on disabled/missing topic, calling `McpHub.callTool`, and handling errors.
- Add unit tests for guard behavior and MCP invocation (mock settings + `McpHub`).
- Verification: `cd src && pnpm test path/to/new-test-file`.

### [x] Step: Implement ntfy bootstrap + command + tests

<!-- chat-id: 3a33bbd5-0229-4b4f-994e-e492cbbf0cee -->

- Add `src/services/notifications/bootstrap.ts` with `setupNtfy()` QuickPick flow, topic suggestion, workspace settings updates, and test notification.
- Add command ID in `packages/types/src/vscode.ts`, contribute in `src/package.json`, and register in `src/activate/registerCommands.ts`.
- Add unit tests covering setup flow and configuration updates (mock `vscode` APIs).
- Verification: `cd src && pnpm test path/to/new-test-file`.

### [x] Step: Add ntfy notifications documentation

<!-- chat-id: 6b464093-437a-44af-b2cc-fff7b6d45503 -->

- Create `.framework/docs/notifications.md` with enablement steps, app setup, topic subscription, workflow examples, and privacy notes.

### [x] Step: Final verification

<!-- chat-id: 43cb2de5-5fd5-4eb1-95dd-86f67b556f0b -->

- Run `pnpm lint` and `pnpm check-types` from repo root.
