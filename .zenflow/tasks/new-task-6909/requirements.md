# Product Requirements Document: Autonomous SDLC Orchestration Workflow

## Summary
Create a workflow definition that orchestrates the full autonomous SDLC using existing Kilo Code modes and framework structure. The workflow must coordinate requirements, architecture, implementation, scanning, and review phases with approvals, state persistence, error recovery, budget enforcement, and notifications.

## Goals
- Provide a single workflow configuration that drives the autonomous SDLC sequence.
- Ensure approval gates pause execution and are recoverable after restart.
- Track state, artifacts, time, and cost across phases.
- Surface errors, critical scan findings, and budget overruns promptly.
- Use existing Kilo capabilities (orchestrator mode, MCP integration, CodeIndexService).

## Non-Goals
- Changes to CLI tooling or non-VS Code targets.
- Introducing new external dependencies or services beyond existing integrations.
- Implementing new SDLC phases outside the specified five-phase flow.

## Users & Stakeholders
- **Primary users**: Kilo Code users running autonomous workflows in VS Code.
- **Secondary**: Project maintainers overseeing workflow execution and approvals.

## Assumptions
- Ntfy notification integration exists or can be invoked through existing tooling without new dependencies.
- The orchestrator mode can interpret workflow YAML definitions and manage phase transitions.
- IDs for workflow runs are available from existing workflow triggering context (issue ID, task ID, or generated UUID).

## Functional Requirements

### Workflow Configuration
- Provide a new workflow definition file at `.framework/workflows/autonomous-sdlc.yaml`.
- Required properties:
  - **name**: "Autonomous Software Development Lifecycle"
  - **version**: "1.0.0"
  - **description**: "Full SDLC automation from requirements to deployment"
  - **trigger**: manual, issue_assigned, schedule

### Phase Definitions (Ordered)
1. **Requirements Gathering**
   - **Mode**: `requirements`
   - **Input**: Issue description or user request
   - **Output**: `.framework/requirements/{id}-requirements.md`
   - **Approval**: Required
   - **Timeout**: 30 minutes
   - **Retry**: Allow user to add context and restart phase

2. **Architecture Design**
   - **Mode**: `architect`
   - **Input**: Requirements document
   - **Output**: `.framework/architecture/{id}-architecture.md`
   - **Approval**: Required
   - **Timeout**: 45 minutes

3. **Implementation**
   - **Mode**: `code`
   - **Input**: Architecture document and task breakdown
   - **Output**: Code changes in working directory
   - **Approval**: Optional
   - **Timeout**: 2 hours (or budget-based)

4. **Deep Scan**
   - **Mode**: `scanner`
   - **Input**: Changed files from implementation
   - **Output**: `.framework/scans/{id}-scan-report.md`
   - **Approval**: Not required
   - **Timeout**: 30 minutes

5. **Code Review**
   - **Mode**: `review`
   - **Input**: All prior artifacts
   - **Output**: `.framework/reviews/{id}-review.md`
   - **Approval**: Required
   - **Timeout**: 30 minutes

### State Management
- Persist workflow state in `.framework/workflows/state/{id}-state.json`.
- State must include:
  - **currentPhase**
  - **phaseStatus**: not_started, in_progress, awaiting_approval, completed, failed
  - **artifacts**: file paths for outputs per phase
  - **approvalsReceived**: approvals and timestamps
  - **budgetConsumed**: tokens and/or USD
  - **elapsedTime**: per phase and overall

### Approval Gates
- For approval-required phases:
  - Pause execution and wait for user response.
  - Send ntfy notification with phase summary and budget status.
  - Provide actions: **Approve**, **Request Changes**, **Cancel**.
  - On timeout: pause and resend notification.
  - On request changes: capture feedback and restart the phase.
  - On cancel: terminate workflow and persist state.

### Error Handling
- **Phase timeout**: notify user and offer extend/cancel.
- **Model errors**: retry with fallback model or switch to manual step.
- **Approval timeout**: escalate notification priority and pause.
- **Critical scanner findings**: pause before review, require acknowledgment.
- Log all errors to `.framework/workflows/logs/{id}.log`.

### Budget Management
- Track token and/or USD cost per phase and across the workflow.
- Support configured budget limits.
- Warn at 80% budget consumed.
- Pause when budget is exceeded, requiring approval to continue.
- Include budget status in approval notifications.

### Notification Strategy
- **Silent**: phase progress updates.
- **Default**: phase completion.
- **High**: approval required.
- **Urgent**: critical issues, budget exceeded, errors.
- Batch non-urgent notifications to avoid spamming.

## Success Criteria
- Workflow runs phases in the required order.
- Approvals pause and resume execution correctly.
- State survives VS Code restarts.
- Error recovery behaves as specified.
- Budget controls block runaway costs.
- Notifications align with priority rules.

## Open Questions
- Where is the existing ntfy integration located, and what payload format is expected?
- How are workflow run IDs generated in the orchestrator context (issue ID vs. UUID)?
- What model-fallback strategy is already supported by the orchestrator mode?
