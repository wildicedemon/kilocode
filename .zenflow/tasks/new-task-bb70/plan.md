# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: c5cfeadf-6709-4e84-8680-bb459e1caff7 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 7a1d499a-4755-4f18-a464-9c73ef443eea -->

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
<!-- chat-id: ec268694-fde7-41b1-a38c-ba79ad8c9ded -->

Implementation plan created below.

### [ ] Step: Add Review mode configuration
- Add `.framework/modes/review.yaml` with required properties and review-layer guidance aligned with the spec.
- Register the mode in `.framework/config.yaml` (or the existing mode registry) if required by the loader.
- Add/update unit tests covering mode loading/validation if available.
- Verification: run targeted tests for mode config parsing/loading.

### [ ] Step: Implement review orchestration pipeline
- Create/extend the review runner under `src/` using existing orchestrator/service patterns.
- Implement layered checks: requirements traceability, architecture compliance, code quality, testing coverage, and security review.
- Integrate `codebase_search`, scanner findings, and requirements/architecture artifacts.
- Add unit tests with mocked services to verify layer sequencing and outputs.
- Verification: run relevant unit tests for the review pipeline.

### [ ] Step: Implement multi-model consensus and report generation
- Add consensus helper to call three configured LLM providers and aggregate verdicts.
- Implement orchestrator decision path for split verdicts with rationale capture.
- Add report writer to generate `.framework/reviews/{issue-id}-review.md` with all required sections and consensus details.
- Add unit tests for consensus logic and report formatting.
- Verification: run unit tests covering consensus/report generation.

### [ ] Step: Integrate automated testing, linting, and notifications
- Run `pnpm test`, `pnpm lint`, and `pnpm check-types` from the review workflow and capture results.
- Enforce fail-fast behavior when tests/lint/type checks fail, and include details in the report.
- Send ntfy notifications with status, issue counts, and action prompt; handle conditional pass and auto-merge gating.
- Add unit tests for notification payloads and failure handling.
- Verification: run relevant unit tests for notifications and automation hooks.

### [ ] Step: Workspace verification
- Run `pnpm lint`, `pnpm check-types`, and `pnpm test` from the repo root.
- Manually execute Review mode on a sample issue to validate report and notification output.
