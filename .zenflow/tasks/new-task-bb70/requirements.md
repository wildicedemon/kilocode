# Product Requirements Document

## Overview
Implement a **Review mode** in the Kilo Code VS Code extension to perform adversarial, multi-layered code review and quality validation as the final SDLC phase before merge. The mode must integrate with existing framework components (scanner, orchestrator, MCP, codebase search) and produce an actionable review report with a clear approval decision.

## Goals
- **Provide a rigorous, multi-layer review** that verifies requirements, architecture, code quality, testing, and security.
- **Use multi-model consensus** for critical decisions and document the outcome.
- **Run automated tests and quality checks** before finalizing review results.
- **Generate a comprehensive, structured review report** for auditability.
- **Notify stakeholders** with summary and required actions.

## Non-Goals
- Changes to the CLI or external tooling outside the VS Code extension.
- Adding new external dependencies unless strictly required.
- Implementing new scanners beyond the existing scanner integration.

## Stakeholders & Users
- **Primary**: Developers and reviewers using Kilo Code in VS Code.
- **Secondary**: Release managers or CI systems consuming review results.

## Functional Requirements

### FR1: Review Mode Configuration
- Create `.framework/modes/review.yaml` with:
  - `slug`: `review`
  - `name`: `Code Reviewer`
  - `description`: `Adversarial code review and quality validation`
  - `roleDefinition`: Senior reviewer who finds issues others miss

### FR2: Multi-Layer Review Methodology
Review must perform the following layers in order and record findings:
1. **Requirements Traceability**
   - Verify implementation covers all requirements and acceptance criteria.
   - Use `codebase_search` to confirm implementation completeness.
2. **Architecture Compliance**
   - Validate adherence to architecture documents and ADRs.
   - Check pattern consistency with existing codebase.
3. **Code Quality**
   - Incorporate scanner findings.
   - Identify anti-patterns, maintainability risks, and error handling gaps.
4. **Testing Coverage**
   - Verify tests are present and comprehensive, including edge cases.
   - Confirm integration tests for external dependencies where applicable.
5. **Security Review**
   - Confirm input validation, auth checks, and data handling are safe.
   - Ensure no sensitive data exposure.

### FR3: Multi-Model Consensus for Critical Decisions
- For critical decisions (approve/reject; blocking security, architecture violations, major performance issues):
  - Submit the decision context to **three different LLM models**.
  - Collect verdicts (approve/reject or blocking/non-blocking).
  - **Unanimous**: accept verdict.
  - **Split**: orchestrator analyzes and decides.
  - Document consensus results in the review report.

### FR4: Review Report Generation
- Generate `.framework/reviews/{issue-id}-review.md` with sections:
  - Review Summary (Pass / Conditional / Fail)
  - Requirements Traceability Matrix
  - Architecture Compliance Assessment
  - Critical Issues (blocking)
  - Major Issues (should fix)
  - Minor Issues (nice to have)
  - Testing Coverage Analysis
  - Security Assessment
  - Performance Considerations
  - Recommendations
  - Approval Decision

### FR5: Automated Testing Integration
- Before review completion:
  - Run all existing tests via project-defined command (e.g., `pnpm test` / workspace-specific variant).
  - Run linters and static analysis as configured.
  - Check test coverage if available.
- If any test or lint fails: **automatic review rejection** with details included in report.

### FR6: Notification & Approval
- Send **ntfy** notification with:
  - Status: Pass / Conditional / Fail
  - Critical issues count
  - Major issues count
  - Action required: `Review Complete - View Report`
- For **Conditional Pass**:
  - List items to address.
  - Wait for fixes before final approval.
- For **Pass**:
  - Indicate ready to merge.
  - Trigger merge if auto-merge is enabled.

## Integrations & Dependencies
- **Framework components**: Orchestrator mode, CodeIndexService, scanner integration, MCP services, `codebase_search` tool.
- **Configuration**: `.framework/config.yaml` already references review mode.
- **Reports**: stored under `.framework/reviews/`.

## Data & Artifacts
- Review report: `.framework/reviews/{issue-id}-review.md`.
- Consensus log: stored in report section(s).
- Test/lint results: summarized in report.

## Assumptions
- A consistent **issue-id** is available from task context or orchestrator metadata.
- ntfy integration already exists or is available via existing notification services.
- Available models are configurable and can be invoked via existing provider infrastructure.
- Repository test/lint commands can be discovered from workspace configuration or standard scripts.

## Acceptance Criteria
- Review mode YAML exists with required metadata.
- Review executes all five layers and records results.
- Critical decisions use multi-model consensus and are documented.
- Tests/lint run before final decision; failures auto-reject.
- Review report generated with required sections.
- ntfy notification sent with summary and action.
