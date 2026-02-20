# Full SDD workflow

## Configuration

- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements

<!-- chat-id: 7dd287d6-6750-4084-b2fc-79cab6dd5379 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

<!-- chat-id: 8760019a-4688-41fe-bdb4-6c80eabfca94 -->

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

<!-- chat-id: 6b0e054f-2013-4db1-b585-5534ffddccab -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Add architect mode definition and framework registration

<!-- chat-id: 60eace26-3ddd-4048-8d84-cb367fd3d85d -->

- Create `.framework/modes/architect.yaml` matching mode schema and required instructions from [./.zenflow/tasks/new-task-be5e/spec.md](./.zenflow/tasks/new-task-be5e/spec.md)
- Ensure `customInstructions` includes architecture analysis methodology, design principles, document/ADR specs, task decomposition, approval mechanism, and testing guidance
- Update `.framework/config.yaml` to register `architect` with `enabled: true` and config path
- Add/update tests that validate config parsing for new mode if needed

### [x] Step: Update framework types, defaults, and schema

<!-- chat-id: e14573e4-ed69-4432-a9ab-32e30091d763 -->

- Update `src/services/framework/config-loader.ts` `DEFAULT_CONFIG` to include `architect` (add `kilocode_change` markers)
- Update `src/services/framework/types.ts` `ModesConfig` to include `architect: ModeConfig` (add `kilocode_change` markers)
- Update `.framework/schema.json` to require `modes.architect` and add property description
- Extend/adjust tests in `src/services/framework/__tests__/config-loader.spec.ts` (or relevant tests) to cover schema/defaults changes

### [x] Step: Implement ntfy approval notification integration

<!-- chat-id: 390761ee-de61-424a-bd02-7bedbdc976d8 -->

- Review [./src/integrations/notifications/index.ts](./src/integrations/notifications/index.ts) for existing patterns
- Add minimal helper or reuse existing notification path to POST to ntfy endpoint without new dependencies
- If endpoint missing, surface a clear error path (architecture output should request config/approval input)
- Add/adjust tests covering notification configuration behavior and error handling

### [!] Step: Verification

<!-- chat-id: a5317bc0-d3e6-4dfd-883a-1c608f97d711 -->

- Run `pnpm test services/framework/__tests__/config-loader.spec.ts` from `src` workspace and record results
- Run `pnpm lint` from repo root and record results
- Run `pnpm check-types` from repo root and record results
