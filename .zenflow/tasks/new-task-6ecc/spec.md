# Technical Specification: Requirements Gathering Mode

## Technical Context
- Language: TypeScript (VS Code extension), React for webview UI where applicable
- Monorepo: pnpm + Turbo
- Testing: vitest (run from package workspace)
- Lint/Types: `pnpm lint`, `pnpm check-types`
- Existing capabilities to leverage: Orchestrator mode, CodeIndexService, MCP integration, codebase_search tool

## Implementation Approach
### Mode Definition
- Add new mode configuration at `.framework/modes/requirements.yaml` with the provided metadata (slug, name, description, roleDefinition).
- Align structure with existing mode YAMLs in `.framework/modes/` (fields, prompt sections, policy blocks).

### Requirements Elicitation Workflow
- Extend the Orchestrator mode or mode runtime to support a Requirements phase that:
  - Uses Socratic questioning templates.
  - Enforces “why” chains at least three layers deep.
  - Extracts assumptions and marks them explicitly.
  - Captures functional and non-functional requirements, including edge cases and error handling.
- Validate feasibility by invoking `codebase_search` and/or CodeIndexService to confirm architecture compatibility and related feature presence.

### Validation Gates
- Add a validation step that checks:
  - SMART criteria
  - Testability
  - Consistency
  - Feasibility against codebase
  - Completeness across scenarios
- Gate acceptance of requirements until all checks pass; continue questioning if any criteria fail.

### Requirements Document Generation
- Generate `.framework/requirements/{issue-id}-requirements.md` with IEEE 830-style sections:
  - Problem Statement
  - Goals and Objectives
  - Functional Requirements (EARS syntax)
  - Non-Functional Requirements
  - Constraints and Assumptions
  - Acceptance Criteria
  - Dependencies and Impacts
  - Open Questions
- Add metadata block at the top (front matter) to record:
  - Issue reference (if any)
  - Approval status (pending/approved)
  - Timestamp

### Issue Tracking Integration
- If a GitHub issue is supplied:
  - Parse issue ID, description, and comments as input context.
  - Search for mentioned paths and similar features via codebase search.
  - Reference the issue in the generated document metadata and content.
- If no issue is supplied:
  - Prompt user for a synthetic identifier or generate a session-based identifier.

### Approval Mechanism
- After document generation, summarize requirements and send an ntfy notification:
  - Message: “Requirements complete. Review and approve?”
  - Include action button payload for approval.
- Wait for approval response and update metadata in the requirements document.
- If changes are requested, resume elicitation and re-run validation gates.

## Source Code Structure Changes
- `.framework/modes/requirements.yaml` (new)
- `.framework/requirements/` (new or existing folder for outputs)
- Extension logic (likely under `src/`):
  - Mode loading / orchestration updates
  - Requirements workflow handler
  - Validation utility
  - Requirements document writer
  - ntfy notification trigger

## Data Model / API / Interface Changes
- Requirements metadata schema for front matter:
  - `issueId?: string`
  - `approvalStatus: "pending" | "approved"`
  - `approvedAt?: string`
  - `createdAt: string`
- Internal interface for requirements validation results:
  - `criteria: { smart: boolean; testable: boolean; consistent: boolean; feasible: boolean; complete: boolean }`
  - `failures: string[]`

## Delivery Phases
1. **Mode Configuration**: Add `requirements.yaml` and ensure mode is discoverable by orchestrator.
2. **Elicitation + Validation**: Implement questioning loop and validation gates.
3. **Document Generation**: Create requirements document with metadata and EARS requirements.
4. **Issue Integration**: Parse issue context, run codebase search, and link references.
5. **Approval Flow**: Send ntfy notification, wait for approval, persist status.

## Verification Approach
- Lint: `pnpm lint`
- Type check: `pnpm check-types`
- Tests (vitest): run from the appropriate workspace (`src/` or `webview-ui/`) depending on new test locations.
- Manual scenario:
  - Start Requirements mode with vague prompt and confirm probing questions.
  - Validate gating behavior.
  - Confirm requirements document format and metadata.
  - Trigger and handle ntfy approval flow.
