# Architect Mode Requirements

## Goal
Enable an **Architect mode** in the Kilo Code VS Code extension that designs solutions consistent with existing codebase architecture and produces formal architecture documentation with ADRs, task breakdown, and an approval gate.

## Background
The autonomous SDLC framework already supports mode definitions (e.g., Requirements, Review, Scanner). A new Architect mode is required as the second SDLC phase after Requirements. This mode must analyze current architectural patterns using `codebase_search`, generate architecture artifacts, and require approval before implementation continues.

## Requirements
1. **Architect mode definition**
   - Create `.framework/modes/architect.yaml` with the following properties:
     - `slug`: `architect`
     - `name`: `Solution Architect`
     - `description`: `Design solutions consistent with codebase architecture`
     - `roleDefinition`: Senior architect who balances ideal design with pragmatic constraints.
2. **Architecture analysis methodology**
   - Provide explicit instructions for the mode to:
     - Use `codebase_search` to find similar features, architectural layers, dependencies, data flow, and configuration patterns.
     - Analyze package/module structure and identify the tech stack/frameworks.
     - Locate and reference existing ADRs if present.
3. **Design principles priority**
   - Instruct the mode to apply principles in order:
     1) Consistency with existing patterns
     2) SOLID principles
     3) DRY
     4) YAGNI
     5) Security by design
     6) Performance/scalability
   - Require ADR justification for any departures from existing patterns.
4. **Architecture document generation**
   - Generate `.framework/architecture/{issue-id}-architecture.md` with sections:
     - Context and Goals (link to requirements)
     - Architectural Approach (high-level)
     - Component Design (detailed)
     - Data Model Changes (if applicable)
     - API Design (interfaces/contracts)
     - Error Handling Strategy
     - Testing Strategy
     - Security Considerations
     - Performance Implications
     - Migration Path (if applicable)
     - Architecture Decision Records (ADRs)
     - Implementation Task Breakdown
5. **ADR integration**
   - For each significant decision, create ADRs at `.framework/architecture/decisions/{number}-{title}.md` with:
     - Status: Proposed
     - Context
     - Decision
     - Consequences
     - Alternatives Considered
   - Link ADRs from the main architecture document.
6. **Task decomposition**
   - Provide a task breakdown in the architecture document:
     - Atomic, independently testable tasks
     - Prerequisites/dependencies
     - Acceptance criteria references
     - Complexity estimate (S/M/L)
     - Component/layer tags
7. **Approval mechanism**
   - Send an `ntfy` notification with an architecture summary and estimated implementation cost/time.
   - Require approval before any implementation proceeds.
   - If rejected, incorporate feedback and revise.
8. **Testing guidance for the mode**
   - The mode must instruct verification steps:
     - Run Architect mode on a completed requirements document
     - Confirm extensive `codebase_search` usage
     - Validate ADR format/completeness
     - Ensure task breakdown is atomic
     - Confirm approval notification sent

## Acceptance Criteria
- **AC1**: `.framework/modes/architect.yaml` exists with the required metadata and role definition.
- **AC2**: The mode instructions explicitly require `codebase_search` for architectural pattern discovery, stack analysis, and ADR discovery.
- **AC3**: Design principles are listed in the specified priority order and enforce ADR justification for deviations.
- **AC4**: Architecture document is produced in `.framework/architecture/{issue-id}-architecture.md` with all required sections.
- **AC5**: ADRs are created in `.framework/architecture/decisions/` with the specified format and linked from the architecture document.
- **AC6**: The architecture document includes an atomic, testable task breakdown with dependencies, acceptance criteria references, complexity, and tags.
- **AC7**: An `ntfy` notification is sent containing an architecture summary and estimated cost/time, and the flow waits for approval before implementation.
- **AC8**: Testing instructions for the mode include the listed verification steps.

## Out of Scope
- Implementation of the Architect mode runtime behavior or UI changes beyond configuration/specification updates.
- CLI or JetBrains plugin modifications.
- Changes to existing SDLC phases other than adding Architect mode and related documentation artifacts.

## Open Questions
- What is the exact `ntfy` endpoint/channel configuration to use for notifications? (Assumption: reuse existing notification integration patterns in the extension.)
- How should `{issue-id}` be derived in multi-issue workflows? (Assumption: use the current task/issue identifier provided by the workflow.)

## Dependencies
- Existing `.framework/` configuration and mode loading infrastructure.
- Availability of `codebase_search` tool and notification integrations.

## Assumptions
- Architect mode is configured similarly to other modes in `.framework/modes/`.
- The extension already supports writing files under `.framework/architecture/` and `.framework/architecture/decisions/`.
- `ntfy` notifications can be sent via existing notification or webhook facilities in the extension.