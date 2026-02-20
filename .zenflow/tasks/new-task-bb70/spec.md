# Technical Specification

## Technical Context
- **Workspace**: pnpm monorepo using Turbo (`pnpm lint`, `pnpm check-types`, `pnpm test`).
- **Primary implementation area**: VS Code extension under `src/` with supporting services and framework config in `.framework/`.
- **Mode definitions**: `.kilo/modes/*.yaml` provides existing mode structure to mirror in `.framework/modes/`.
- **Key integrations**: Code index services (`src/services/code-index`), scanner configuration (`.framework/scanner-*`), MCP services, and notification tooling (ntfy) as already available in the extension.

## Implementation Approach
1. **Review mode definition**
   - Add `.framework/modes/review.yaml` modeled after `.kilo/modes/review.yaml`.
   - Populate required properties (`slug`, `name`, `description`, `roleDefinition`) and include review-layer instructions aligned with FR2–FR5.
   - Ensure the mode definition aligns with `.framework/config.yaml` mode registry.

2. **Review workflow orchestration**
   - Implement/extend a review runner that executes the five layers in order:
     1. Requirements traceability via `codebase_search` and requirements artifacts.
     2. Architecture compliance against ADRs/architecture docs.
     3. Code quality using scanner findings and anti-pattern checks.
     4. Testing coverage verification with test inventory and edge-case checks.
     5. Security review covering validation, auth, and sensitive data handling.
   - Reuse existing orchestration patterns (e.g., code index orchestrator/manager patterns for multi-step workflows) to maintain consistency.

3. **Multi-model consensus**
   - Add a consensus helper that sends the decision context to three distinct configured LLM providers.
   - Aggregate verdicts:
     - Unanimous: accept verdict.
     - Split: orchestrator decides and records rationale.
   - Persist the model verdicts and final decision in the review report.

4. **Automated test + lint integration**
   - Execute workspace scripts before final decision:
     - `pnpm test` (workspace-aware) and `pnpm lint` / `pnpm check-types` as defined in the repo.
   - Capture output and exit codes. Any failure forces **Fail** status with details in report.

5. **Review report generation**
   - Write `.framework/reviews/{issue-id}-review.md` with the required sections and include:
     - Per-layer findings and references to files.
     - Test/lint results and coverage summary if available.
     - Consensus log for critical decisions.

6. **Notification + approval**
   - Send an ntfy notification with summary status, counts, and action prompt.
   - Conditional pass records required fixes and halts merge until re-review.
   - Pass signals ready-to-merge and triggers merge only if auto-merge is enabled.

## Source Code Structure Changes
- **New configuration**: `.framework/modes/review.yaml`.
- **Review execution**: new/extended review runner under `src/` (expected near existing orchestration and task execution services).
- **Consensus utility**: shared helper under a review/quality service folder to call multiple providers.
- **Report writer**: module for `.framework/reviews/*` output and formatting.
- **Notification hook**: reuse existing notification service; extend only if missing review summary payload support.

## Data Model / API / Interface Changes
- **Review context**: includes `issueId`, requirements artifacts path, architecture docs, and code index references.
- **Consensus result**: `{ decisionType, modelVerdicts, finalVerdict, rationale }` embedded in report.
- **Review report schema**: markdown with fixed section headings to ensure predictable parsing.

## Delivery Phases
1. **Mode config**: add `.framework/modes/review.yaml` and verify config registry.
2. **Review engine**: implement layered review pipeline with scanner + codebase search integration.
3. **Consensus + reporting**: add consensus logic and report generator.
4. **Automation**: wire tests/lint/coverage checks and ensure fail-fast behavior.
5. **Notification**: send ntfy message with summary + action.

## Verification Approach
- **Unit tests**: add/extend tests around consensus and report generation.
- **Integration checks**: simulate review run with mocked `codebase_search` and scanner data.
- **Commands**:
  - `pnpm lint`
  - `pnpm check-types`
  - `pnpm test`
- **Manual**: run review mode on a sample issue and validate report + notification output.
