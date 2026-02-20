# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 4667068a-17fb-41ca-b0a0-7c4a2b2ea480 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 982cfaed-2291-4013-b9a7-46b58c520f05 -->

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
<!-- chat-id: e0c5ec70-d5c4-40f8-b5d6-87ec3a74a75b -->

Implementation plan created based on `{@artifacts_path}/spec.md`.

### [x] Step: Align requirements mode configuration
<!-- chat-id: 6e796d0d-f7a6-4de9-93ed-f8728d8d5288 -->
- Update `.framework/modes/requirements.yaml` to match the spec (role definition, elicitation/validation gates, output spec, available tools).
- Confirm schema expectations in `.framework/schema.json` and update if new fields are required.
- Update `src/services/framework/__tests__/config-loader.spec.ts` to cover the requirements mode config loading behavior.

### [ ] Step: Implement requirements workflow orchestration
<!-- chat-id: 0a2db66d-f277-4908-a627-65b9eab48c2b -->
- Add a requirements workflow runner under `src/services/framework/requirements/` to manage the question loop, “why” chains, assumption capture, and gating.
- Integrate the requirements workflow into mode/task routing (likely `src/core/task/Task.ts` and/or prompt selection flow).
- Add unit tests in `src/services/framework/__tests__/requirements-workflow.spec.ts` for questioning loops, SMART gating, and error conditions.

### [x] Step: Generate requirements documents with metadata
<!-- chat-id: 5f6ae2c2-f6e2-43b9-8da4-a0a21ad7c841 -->
- Implement a writer utility to create `.framework/requirements/{issue-id}-requirements.md` with IEEE 830 sections and metadata front matter.
- Ensure EARS syntax formatting for functional requirements and explicit acceptance criteria.
- Add tests for document formatting and metadata serialization in `src/services/framework/__tests__/requirements-doc-writer.spec.ts`.

### [ ] Step: Integrate issue context and codebase validation
- Accept GitHub issue inputs (ID, body, comments) using `src/services/webhooks/handlers/issue.ts` and related types.
- Use `codebase_search` and `src/services/code-index/manager.ts` to validate feasibility and detect similar features.
- Add tests with issue payload fixtures and stubbed codebase search in `src/services/framework/__tests__/requirements-issue-context.spec.ts`.

### [ ] Step: Add approval flow and ntfy notification
- Implement an ntfy client under `src/integrations/notifications/ntfy.ts` (using `fetch`) and wire it into the requirements workflow.
- Send summary notifications with approval actions and persist approval status in the requirements document metadata.
- Add unit tests in `src/integrations/notifications/__tests__/ntfy.spec.ts` for request/response handling and approval updates.

### [ ] Step: Verification
- Run `pnpm lint` and `pnpm check-types` from the repo root.
- Run `cd src && pnpm test <new-or-updated-test-files>` for the added specs.
