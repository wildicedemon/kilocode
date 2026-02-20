# Product Requirements Document: Requirements Gathering Mode

## Problem Statement
Kilo Code’s autonomous SDLC lacks a dedicated requirements elicitation phase that forces clarity, validates feasibility, and produces formal, testable requirements before development. This results in ambiguity, rework, and misalignment with the existing codebase.

## Goals and Objectives
1. Establish a dedicated Requirements Analyst mode that performs adversarial elicitation.
2. Enforce validation gates so requirements are SMART, testable, consistent, feasible, and complete.
3. Generate a formal requirements document with standardized sections and EARS syntax.
4. Integrate with issue tracking and codebase search to ground requirements in reality.
5. Require explicit user approval before proceeding to the next SDLC phase.

## Functional Requirements
1. When a Requirements mode session starts, the system shall ask probing questions using Socratic techniques until requirements are specific and testable.
2. When a requirement is provided, the system shall ask “why” at least three layers deep to uncover root goals and constraints.
3. When ambiguity or assumptions are detected, the system shall document them and request clarification.
4. When requirements are stated, the system shall validate them against SMART, testability, consistency, feasibility, and completeness gates before acceptance.
5. When feasibility is evaluated, the system shall use codebase_search to verify alignment with current architecture and patterns.
6. When requirements originate from a GitHub issue, the system shall reference the issue number, extract issue context, and scan the codebase for related paths or similar features.
7. When requirements are ready for review, the system shall generate a formal requirements document at `.framework/requirements/{issue-id}-requirements.md` with the required sections and EARS-formatted functional requirements.
8. When requirements are summarized, the system shall send an ntfy notification stating: “Requirements complete. Review and approve?”
9. When the user approves via the notification action, the system shall record approval status in the requirements document metadata.
10. When changes are requested after review, the system shall resume elicitation, update the document, and re-run validation gates.

## Non-Functional Requirements
1. The mode shall minimize external dependencies and rely on existing Kilo Code capabilities.
2. Requirements validation shall be deterministic and auditable in the generated document.
3. Requirements documentation shall follow IEEE 830-style structure and be readable by non-developers.
4. The mode shall operate within the VS Code extension scope only (no CLI changes).

## Constraints and Assumptions
1. The implementation will leverage existing CodeIndexService, Orchestrator mode, and MCP tooling.
2. The requirements output location is `.framework/requirements/{issue-id}-requirements.md`.
3. ntfy notification infrastructure is available or will be configured for the extension.
4. Requirements mode configuration will live under `.framework/modes/`.

## Acceptance Criteria
1. Starting Requirements mode with a vague request results in multiple probing questions before acceptance.
2. Requirements are rejected until they pass SMART, testability, consistency, feasibility, and completeness checks.
3. The system generates a requirements document with the required sections and EARS syntax.
4. The system sends the ntfy approval notification and waits for explicit approval before completion.
5. Approval status is recorded in the requirements document metadata.

## Dependencies and Impacts
1. ntfy notification integration in the VS Code extension.
2. Access to codebase_search and read tools for feasibility validation.
3. Updates to .framework configuration or mode loading to include requirements.yaml.

## Open Questions
1. What ntfy endpoint or notification channel should the extension use?
2. What approval action payload or response format should be treated as confirmation?
3. How should issue identifiers be provided when requirements are user-initiated without a GitHub issue?
4. Should the requirements document metadata follow an existing front matter schema?
