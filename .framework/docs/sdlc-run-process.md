# SDLC Run Process

This document explains how to run, monitor, and manage the SDLC (Software Development Lifecycle) pipeline in the AI Agentic Autonomous SDLC Framework.

## Overview

The SDLC pipeline is a LangGraph-based state machine that orchestrates the entire software development process through four main phases:

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐     ┌───────────────┐
│  Research   │────▶│  Planning   │────▶│ Implementation│────▶│ Verification  │
│   Phase     │     │   Phase     │     │    Phase      │     │    Phase      │
└─────────────┘     └─────────────┘     └───────────────┘     └───────────────┘
      │                   │                     │                     │
      │                   │                     │                     │
      ▼                   ▼                     ▼                     ▼
  Requirements        Architecture          Code Changes          Test Results
  Analysis            Design               & Refactoring         & QA Reports
```

## SDLC Phases Explained

### 1. Research Phase

The Research Phase gathers requirements, analyzes context, and reviews documentation.

**Activities:**
- Parse specifications from PR descriptions, issues, or documents
- Identify gaps in requirements
- Research technologies and approaches
- Document findings for the planning phase

**Configuration:**
```yaml
sdlc:
  research:
    enabled: true
    timeout: 1800        # 30 minutes max
    checkpoint_interval: 300  # Save every 5 minutes
```

**Outputs:**
- Research report with findings
- Identified requirements gaps
- Technology recommendations

### 2. Planning Phase

The Planning Phase designs architecture, decomposes tasks, and formulates strategy.

**Activities:**
- Decompose work into atomic, actionable tasks
- Map task dependencies
- Sequence work for optimal execution
- Allocate resources (modes and tools)

**Configuration:**
```yaml
sdlc:
  planning:
    enabled: true
    timeout: 1200        # 20 minutes max
    checkpoint_interval: 300
```

**Outputs:**
- Execution plan with task breakdown
- Dependency graph
- Resource allocation map

### 3. Implementation Phase

The Implementation Phase executes the plan through self-directed code development.

**Activities:**
- Self-directed execution of assigned tasks
- Progress monitoring and tracking
- Adaptive replanning when issues are discovered
- Code writing and refactoring

**Configuration:**
```yaml
sdlc:
  implementation:
    enabled: true
    timeout: 3600        # 60 minutes max
    checkpoint_interval: 600  # Save every 10 minutes
    max_iterations: 10   # Max iterations per task
```

**Outputs:**
- Implemented code changes
- Progress reports
- Updated plans (if replanned)

### 4. Verification Phase

The Verification Phase tests, validates, and ensures quality of the implementation.

**Activities:**
- Run unit, integration, and E2E tests
- Code review (scanner and human-in-the-loop)
- Integration verification
- Quality gate checks (coverage, linting, security)

**Configuration:**
```yaml
sdlc:
  verification:
    enabled: true
    timeout: 1800        # 30 minutes max
    test_coverage_threshold: 80  # Minimum coverage %
```

**Outputs:**
- Test results
- Coverage reports
- Quality gate status
- Issues for failed checks

## Starting the Pipeline

### Basic Start

```bash
# Start from the beginning (research phase)
npx kilo-framework start
```

### Start Options

| Option | Description |
|--------|-------------|
| `--phase <name>` | Start from a specific phase |
| `--skip-to <name>` | Skip directly to a specific phase |
| `--checkpoint <id>` | Resume from a checkpoint |
| `--max-iterations <n>` | Maximum implementation iterations |
| `--continuous-scan` | Enable continuous scanning during implementation |
| `--config <path>` | Path to configuration file |
| `--dry-run` | Simulate without making changes |

### Examples

```bash
# Start from planning phase
npx kilo-framework start --phase planning

# Skip to implementation
npx kilo-framework start --skip-to implementation

# Resume from checkpoint
npx kilo-framework start --checkpoint cp-2026-02-19-001

# With maximum iterations
npx kilo-framework start --max-iterations 5

# With continuous scanning
npx kilo-framework start --continuous-scan

# Dry run (simulation)
npx kilo-framework start --dry-run
```

## Monitoring Progress

### Status Command

Check the current pipeline status:

```bash
npx kilo-framework status
```

**Output:**
```
═══════════════════════════════════════════════════════════
  SDLC Pipeline Status
═══════════════════════════════════════════════════════════

Session: session-xyz123
Framework: AI Agentic Autonomous SDLC Framework v1.0.0

Current Phase: implementation
Status: in_progress

Phase Status:
  ✓ Research      - Completed (15m 32s)
  ✓ Planning      - Completed (8m 45s)
  ● Implementation - In Progress (23m 12s)
  ○ Verification  - Pending

Metrics:
  Tokens Used: 45,230
  Cost: $0.87
  Time Elapsed: 47m 29s

Checkpoints: 3
Last Checkpoint: cp-2026-02-19-003
```

### Watch Mode

Continuously monitor status:

```bash
npx kilo-framework status --watch
```

### JSON Output

For programmatic access:

```bash
npx kilo-framework status --json
```

**Output:**
```json
{
  "session": "session-xyz123",
  "framework": {
    "name": "AI Agentic Autonomous SDLC Framework",
    "version": "1.0.0"
  },
  "currentPhase": "implementation",
  "status": "in_progress",
  "phases": {
    "research": { "status": "completed", "duration": 932 },
    "planning": { "status": "completed", "duration": 525 },
    "implementation": { "status": "in_progress", "duration": 1392 },
    "verification": { "status": "pending", "duration": 0 }
  },
  "metrics": {
    "tokensUsed": 45230,
    "cost": 0.87,
    "timeElapsed": 2849
  },
  "checkpoints": 3,
  "lastCheckpoint": "cp-2026-02-19-003"
}
```

## Phase Transitions

### Automatic Transitions

By default, the pipeline automatically transitions between phases when:
- Phase completes successfully
- All phase tasks are finished
- No errors require intervention

### Manual Transitions

To manually control phase transitions:

```bash
# Skip to a specific phase
npx kilo-framework start --skip-to verification

# Start from a specific phase
npx kilo-framework start --phase planning
```

### Transition Conditions

Each phase has completion criteria:

| Phase | Completion Criteria |
|-------|---------------------|
| Research | Research report generated, no blocking gaps |
| Planning | Execution plan created, tasks defined |
| Implementation | All tasks completed or max iterations reached |
| Verification | All tests pass, quality gates met |

## Checkpoint Management

### What are Checkpoints?

Checkpoints save the complete pipeline state at regular intervals, enabling:
- Recovery from failures
- Resuming interrupted work
- Rolling back to previous states

### Checkpoint Files

Checkpoints are stored in `.framework/checkpoints/`:

```
.framework/checkpoints/
├── cp-2026-02-19-001.json
├── cp-2026-02-19-002.json
└── cp-2026-02-19-003.json
```

### Checkpoint Contents

Each checkpoint contains:
- Current phase and status
- Phase-specific context
- Metrics (tokens, cost, time)
- Task progress
- Configuration snapshot

### Resuming from Checkpoints

```bash
# Resume from specific checkpoint
npx kilo-framework start --checkpoint cp-2026-02-19-002

# Resume from latest checkpoint
npx kilo-framework start --checkpoint latest
```

### Checkpoint Intervals

Configure checkpoint frequency in `config.yaml`:

```yaml
sdlc:
  research:
    checkpoint_interval: 300   # Every 5 minutes
  planning:
    checkpoint_interval: 300
  implementation:
    checkpoint_interval: 600   # Every 10 minutes
  verification:
    checkpoint_interval: 300
```

## Error Handling

### Error Types

| Error Type | Description | Recovery |
|------------|-------------|----------|
| `TIMEOUT` | Phase exceeded time limit | Resume from checkpoint |
| `BUDGET_EXCEEDED` | Cost limit reached | Increase budget or optimize |
| `VALIDATION_FAILED` | Quality gate failed | Fix issues and retry |
| `DEPENDENCY_ERROR` | Missing or broken dependencies | Install/fix dependencies |
| `API_ERROR` | AI API error | Retry or check API status |

### Error Recovery

When an error occurs:

1. **Automatic checkpoint** is created before failure
2. **Error is logged** to `.framework/logs/`
3. **Status is updated** with error details
4. **Recovery options** are suggested

### Manual Recovery

```bash
# View error details
npx kilo-framework status --verbose

# Resume from last checkpoint
npx kilo-framework start --checkpoint latest

# Skip problematic phase (use with caution)
npx kilo-framework start --skip-to verification
```

### Budget Alerts

When cost thresholds are approached:

```
⚠ Warning: Token usage at 80% of budget (40,000/50,000)
⚠ Warning: Phase cost at 90% of budget ($45/$50)
```

When budget is exceeded:

```
✗ Error: Budget exceeded - pausing execution
  Task cost: $12.50 (limit: $10.00)
  Use --budget-override to continue
```

## Quality Gates

### Verification Phase Gates

The verification phase enforces quality gates:

| Gate | Default Threshold | Configurable |
|------|-------------------|--------------|
| Test Coverage | 80% | Yes |
| Linting | 0 errors | Yes |
| Security Scan | 0 critical/high | Yes |
| Type Check | 0 errors | Yes |

### Configuring Quality Gates

```yaml
sdlc:
  verification:
    test_coverage_threshold: 80
    quality_gates:
      linting:
        enabled: true
        max_errors: 0
        max_warnings: 10
      security:
        enabled: true
        max_critical: 0
        max_high: 0
      typescript:
        enabled: true
        max_errors: 0
```

### Bypassing Gates (Not Recommended)

```bash
# Skip specific gates
npx kilo-framework start --skip-gates linting,security
```

## Integration with Scanner

### Continuous Scanning

Enable continuous scanning during implementation:

```bash
npx kilo-framework start --continuous-scan
```

Or in configuration:

```yaml
scanner:
  enabled: true
  continuous: true
```

### Scanner Feedback

The scanner provides real-time feedback during implementation:

```
[Scanner] Anti-patterns pass: 3 findings
  - Long method in src/utils/parser.ts:45
  - Duplicate code in src/services/api.ts:120
  - Complex condition in src/core/logic.ts:78

[Scanner] Security pass: 1 finding
  - Potential SQL injection in src/db/queries.ts:34
```

## Workflow Examples

### Full SDLC Cycle

```bash
# 1. Bootstrap (first time)
npx kilo-framework bootstrap

# 2. Start the pipeline
npx kilo-framework start

# 3. Monitor progress (in another terminal)
npx kilo-framework status --watch

# 4. Review results when complete
npx kilo-framework status --verbose
```

### Resume Interrupted Work

```bash
# 1. Check status
npx kilo-framework status

# 2. Resume from checkpoint
npx kilo-framework start --checkpoint latest
```

### Quick Implementation Only

```bash
# Skip research and planning
npx kilo-framework start --skip-to implementation
```

### Debug Mode

```bash
# Run with maximum verbosity
npx kilo-framework start --verbose --log-level debug
```

## Best Practices

1. **Always bootstrap first** - Ensures proper configuration
2. **Monitor with watch mode** - Keep an eye on progress
3. **Set appropriate budgets** - Prevent runaway costs
4. **Use checkpoints** - Enable recovery from failures
5. **Review scanner findings** - Address issues promptly
6. **Don't skip phases** - Each phase adds value
7. **Configure quality gates** - Maintain code quality

## See Also

- [Deep Scanner Guide](./deep-scanner-guide.md) - Scanner documentation
- [Configuration Reference](./configuration-reference.md) - All configuration options
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
