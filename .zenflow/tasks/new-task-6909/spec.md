# Technical Specification: Autonomous SDLC Orchestration Workflow

## Technical Context
- **Runtime**: VS Code extension (TypeScript) in a pnpm Turbo monorepo.
- **Framework configuration**: `.framework/config.yaml` loaded by [./src/services/framework/config-loader.ts](./src/services/framework/config-loader.ts) with schema validation in [./.framework/schema.json](./.framework/schema.json).
- **Framework types**: SDLC/phase state definitions in [./src/services/framework/types.ts](./src/services/framework/types.ts).
- **Modes**: Default mode slugs include `requirements`, `architect`, `code`, `scanner`, and `review` in [./packages/types/src/mode.ts](./packages/types/src/mode.ts).
- **Constraints**: No new external dependencies. Use existing orchestration patterns and MCP integrations. Extension-only changes.

## Implementation Approach
1. **Workflow Definition**
   - Add `.framework/workflows/autonomous-sdlc.yaml` describing the five phases (requirements → architecture → implementation → scan → review).
   - Align with existing framework configuration patterns in `.framework/config.yaml`, ensuring naming and paths are consistent with `.framework` conventions.

2. **Workflow State & Persistence**
   - Extend framework state representation in [./src/services/framework/types.ts](./src/services/framework/types.ts) to include:
     - Workflow run ID
     - `currentPhase`, per-phase status (`not_started`, `in_progress`, `awaiting_approval`, `completed`, `failed`)
     - `artifacts` map with output file paths
     - `approvalsReceived` with timestamps and decisions
     - `budgetConsumed` (tokens and/or USD)
     - `elapsedTime` (per phase and total)
   - Persist state in `.framework/workflows/state/{id}-state.json` using the framework’s file system utilities (same approach as config loader state management).

3. **Orchestrator Integration**
   - Introduce a workflow runner service under `src/services/framework/workflows/` (new module) that:
     - Loads workflow YAML definitions from `.framework/workflows/`.
     - Coordinates mode invocation and phase transitions.
     - Uses the `orchestrator` mode’s tooling to delegate to `requirements`, `architect`, `code`, `scanner`, and `review` modes.
   - Leverage existing CodeIndex/MCP integrations for context gathering where appropriate (e.g., requirements and scan phases).

4. **Approval Gates & Notifications**
   - Implement approval gates for requirements, architecture, and review phases.
   - Send ntfy notifications with phase summary and budget status. Action buttons: Approve, Request Changes, Cancel.
   - On `Request Changes`, capture feedback and restart the phase.
   - On timeout, re-notify and pause.

5. **Error Handling & Recovery**
   - Phase timeouts: notify user and request extend/cancel.
   - Model errors: retry with fallback model configuration (using existing provider settings), otherwise switch to manual.
   - Approval timeout: raise priority and pause.
   - Critical scanner findings: pause before review and require acknowledgment.
   - Log errors to `.framework/workflows/logs/{id}.log`.

6. **Budget Management**
   - Use framework cost oversight settings (`cost_oversight` in `.framework/config.yaml`) as defaults.
   - Track per-phase consumption and emit a warning at 80% budget.
   - Pause execution if the budget exceeds limits and require user approval to continue.
   - Include budget status in all approval notifications.

## Source Code Structure Changes
- **New workflow definition**: `.framework/workflows/autonomous-sdlc.yaml`.
- **New workflow runner**: `src/services/framework/workflows/` (e.g., `runner.ts`, `types.ts`, `state-store.ts`).
- **Types update**: `src/services/framework/types.ts` to add workflow state models and statuses.
- **Potential integration hook**: Orchestrator dispatch entrypoint (location to be identified in extension task execution pipeline).

## Data Model / API / Interface Changes
- **WorkflowDefinition** (YAML):
  - `name`, `version`, `description`, `trigger`.
  - `phases[]` with: `id`, `name`, `mode`, `input`, `output`, `approval`, `timeout`, `retryPolicy`.
- **WorkflowState** (JSON):
  - `workflowId`, `currentPhase`, `phaseStatus`, `artifacts`, `approvalsReceived`, `budgetConsumed`, `elapsedTime`.
- **Notification Payload**:
  - `phaseId`, `summary`, `budgetStatus`, `actions` (Approve/Request Changes/Cancel), `priority`.

## Delivery Phases
1. **Workflow Definition**: add the YAML config with all phases and triggers.
2. **State & Types**: add workflow state structures and persistence utilities.
3. **Runner & Approval Gate Logic**: orchestrate phases, approval pauses, and recovery handling.
4. **Notifications & Budget**: integrate ntfy notifications and budget tracking into runner.
5. **Scanner & Review Gate**: enforce critical scan acknowledgment before review.

## Verification Approach
- **Lint**: `pnpm lint` (workspace root).
- **Typecheck**: `pnpm check-types` (workspace root).
- **Targeted tests** (when added): run Vitest from the package containing new tests, e.g. `cd src && pnpm test path/to/new.spec.ts`.
