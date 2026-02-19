# Deep Scanner Guide

The Deep Scanner is a multi-pass code analysis engine that continuously analyzes your codebase for anti-patterns, architectural issues, performance problems, and security vulnerabilities.

## Scanner Overview

The Deep Scanner operates as part of the SDLC framework, providing real-time code analysis during development. It uses pattern matching and AST analysis to identify issues across four analysis passes.

```
┌─────────────────────────────────────────────────────────────┐
│                     Deep Scanner                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Anti-Patterns   │  │  Architecture   │                  │
│  │ Pass            │  │  Pass           │                  │
│  │                 │  │                 │                  │
│  │ • Code smells   │  │ • Dependencies  │                  │
│  │ • Complexity    │  │ • Coupling      │                  │
│  │ • Naming        │  │ • Layer checks  │                  │
│  │ • Duplicates    │  │ • Cycles        │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Performance     │  │  Security       │                  │
│  │ Pass            │  │  Pass           │                  │
│  │                 │  │                 │                  │
│  │ • Bottlenecks   │  │ • SAST          │                  │
│  │ • Memory leaks  │  │ • Dependencies  │                  │
│  │ • N+1 queries   │  │ • Secrets       │                  │
│  │ • Algorithms    │  │ • OWASP         │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Pattern Matcher + MCP Server Integration                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Running Scans

### CLI Commands

```bash
# Run all scan passes
npx kilo-framework scan

# Run specific pass
npx kilo-framework scan --pass anti-patterns
npx kilo-framework scan --pass architecture
npx kilo-framework scan --pass performance
npx kilo-framework scan --pass security

# Scan specific file or directory
npx kilo-framework scan --file src/utils/parser.ts
npx kilo-framework scan --path src/services/

# Output options
npx kilo-framework scan --json          # JSON output
npx kilo-framework scan --verbose       # Detailed output
npx kilo-framework scan --quiet         # Minimal output
```

### Scan Options

| Option | Description |
|--------|-------------|
| `--pass <name>` | Run specific scan pass |
| `--file <path>` | Scan specific file |
| `--path <path>` | Scan specific directory |
| `--severity <level>` | Filter by minimum severity |
| `--format <type>` | Output format (text, json, markdown) |
| `--output <file>` | Write output to file |
| `--max-findings <n>` | Limit number of findings |

### Programmatic Usage

```typescript
import { createDeepScanner } from '@kilocode/framework'

// Create and initialize scanner
const scanner = await createDeepScanner({
  workspacePath: '/path/to/project',
  config: {
    enabled: true,
    passes: ['anti-patterns', 'security'],
    maxFindingsPerPass: 100,
  },
  onProgress: (event) => {
    console.log(`[${event.type}] ${event.message}`)
  },
})

// Run all passes
const findings = await scanner.run()

// Run specific pass
const securityFindings = await scanner.run('security')

// Get scanner state
const state = scanner.getState()
console.log(`Total scans: ${state.totalScans}`)
console.log(`Last findings: ${state.lastFindings.length}`)
```

## Understanding Findings

### Finding Structure

Each finding contains the following information:

```typescript
interface Finding {
  id: string           // Unique identifier (e.g., "AP-001")
  severity: Severity   // critical, high, medium, low, info
  message: string      // Human-readable description
  file: string         // Relative file path
  line: number         // Line number (1-based)
  column: number       // Column number (1-based)
  pass: ScanPass       // Which pass detected it
  codeSnippet?: string // Relevant code snippet
  suggestion?: string  // How to fix it
  patternId?: string   // Pattern that matched
  metadata?: object    // Additional context
  timestamp: string    // When detected
}
```

### Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| `critical` | Must fix immediately | Blocks pipeline |
| `high` | Should fix soon | May block pipeline |
| `medium` | Should fix eventually | Warning |
| `low` | Minor issue | Informational |
| `info` | Suggestion | Optional |

### Example Finding

```json
{
  "id": "AP-001",
  "severity": "medium",
  "message": "Long method detected (45 lines). Consider breaking into smaller functions.",
  "file": "src/services/parser.ts",
  "line": 120,
  "column": 1,
  "pass": "anti-patterns",
  "codeSnippet": "function parseComplexData(input: string) {\n  // 45 lines of code...\n}",
  "suggestion": "Extract logical sections into separate helper functions with descriptive names.",
  "patternId": "long-method",
  "timestamp": "2026-02-19T18:00:00.000Z"
}
```

## Scanner Passes Explained

### 1. Anti-Patterns Pass

Detects code smells, complexity issues, and common anti-patterns.

**Patterns Detected:**

| Pattern | Description | Severity |
|---------|-------------|----------|
| `long-method` | Methods exceeding 30 lines | medium |
| `large-class` | Classes exceeding 500 lines | medium |
| `duplicate-code` | Similar code blocks | medium |
| `complex-condition` | Conditions with high complexity | medium |
| `magic-numbers` | Unnamed numeric constants | low |
| `dead-code` | Unreachable code | high |
| `god-object` | Classes doing too much | high |
| `spaghetti-code` | Tangled control flow | high |

**Example Detection:**
```
src/utils/helpers.ts:45
  [medium] Long method detected: processData() has 52 lines
  Suggestion: Break into smaller, focused functions
```

### 2. Architecture Pass

Analyzes code structure, dependencies, and architectural constraints.

**Patterns Detected:**

| Pattern | Description | Severity |
|---------|-------------|----------|
| `circular-dependency` | Circular imports between modules | high |
| `layer-violation` | Cross-layer dependencies | high |
| `tight-coupling` | High coupling between components | medium |
| `low-cohesion` | Modules with unrelated responsibilities | medium |
| `dependency-clusters` | Tightly coupled module groups | medium |
| `unstable-dependency` | Dependencies on unstable modules | medium |

**Example Detection:**
```
src/services/api.ts → src/services/auth.ts → src/services/api.ts
  [high] Circular dependency detected between api.ts and auth.ts
  Suggestion: Extract shared functionality to a common module
```

### 3. Performance Pass

Identifies performance bottlenecks and resource issues.

**Patterns Detected:**

| Pattern | Description | Severity |
|---------|-------------|----------|
| `n-plus-one` | N+1 query patterns | high |
| `memory-leak` | Potential memory leaks | high |
| `inefficient-loop` | Suboptimal loop patterns | medium |
| `blocking-io` | Synchronous I/O in hot paths | medium |
| `large-bundle` | Large import bundles | low |
| `unnecessary-computation` | Redundant calculations | low |

**Example Detection:**
```
src/db/queries.ts:78
  [high] N+1 query pattern detected in getUserOrders()
  Suggestion: Use eager loading or batch queries
```

### 4. Security Pass

Scans for security vulnerabilities and compliance issues.

**Patterns Detected:**

| Pattern | Description | Severity |
|---------|-------------|----------|
| `sql-injection` | Unsanitized SQL inputs | critical |
| `xss` | Cross-site scripting risks | critical |
| `hardcoded-secret` | Secrets in code | critical |
| `insecure-random` | Weak random number generation | high |
| `path-traversal` | File path injection risks | high |
| `unsafe-deserialize` | Insecure deserialization | high |
| `missing-auth` | Unprotected sensitive endpoints | high |
| `sensitive-logging` | Sensitive data in logs | medium |

**Example Detection:**
```
src/db/queries.ts:34
  [critical] SQL injection vulnerability: User input directly interpolated
  Code: const query = `SELECT * FROM users WHERE id = ${userId}`
  Suggestion: Use parameterized queries
```

## Continuous Scanning

### Enabling Continuous Mode

Continuous scanning runs automatically during the implementation phase:

```bash
# Enable via CLI
npx kilo-framework start --continuous-scan

# Or in configuration
```

```yaml
scanner:
  enabled: true
  continuous: true
  continuous_interval: 60000  # Scan every 60 seconds
```

### How Continuous Scanning Works

```
┌─────────────────────────────────────────────────────────────┐
│                 Continuous Scan Cycle                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Implementation Phase                                       │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ Code    │────▶│ Scan    │────▶│ Report  │              │
│   │ Change  │     │ Files   │     │ Findings│              │
│   └─────────┘     └─────────┘     └─────────┘              │
│        │                               │                     │
│        │                               ▼                     │
│        │                        ┌─────────────┐             │
│        │                        │ Integrate   │             │
│        │                        │ Feedback    │             │
│        │                        └─────────────┘             │
│        │                               │                     │
│        └───────────────────────────────┘                     │
│                    (Repeat)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Incremental Scanning

Continuous mode uses incremental scanning to only analyze changed files:

```yaml
scanner:
  continuous: true
  incremental: true  # Only scan changed files
  watch_paths:
    - src/
    - packages/
```

## Pattern Learning

### Pattern Repertoire

The scanner maintains a repertoire of known patterns in `.framework/scanner-repertoire.md`:

```markdown
# Scanner Pattern Repertoire

## Anti-Patterns

### AP-001: Long Method
- **Description**: Methods exceeding 30 lines
- **Severity**: medium
- **Pattern**: function.*{[\s\S]{500,}}

### AP-002: Duplicate Code
- **Description**: Similar code blocks in multiple locations
- **Severity**: medium
- **Detection**: AST-based similarity analysis

## Security

### SEC-001: SQL Injection
- **Description**: User input in SQL queries
- **Severity**: critical
- **Pattern**: (SELECT|INSERT|UPDATE|DELETE).*\$\{
```

### Adding Custom Patterns

Extend the repertoire with project-specific patterns:

```yaml
# .framework/scanner-config.yaml
custom_patterns:
  - id: PROJ-001
    name: Deprecated API Usage
    severity: medium
    pass: architecture
    pattern: "deprecatedApi\\("
    message: "Deprecated API detected"
    suggestion: "Use newApi() instead"
```

### Learning from Findings

The scanner can learn from accepted/rejected findings:

```yaml
scanner:
  learning:
    enabled: true
    # Auto-suppress known acceptable patterns
    suppress_accepted: true
    # Learn from code reviews
    learn_from_reviews: true
```

## Scanner Configuration

### Basic Configuration

```yaml
scanner:
  enabled: true
  passes:
    - anti-patterns
    - architecture
    - performance
    - security
  continuous: false
  state_file: ".framework/scanner-state.md"
  repertoire_file: ".framework/scanner-repertoire.md"
```

### Advanced Configuration

```yaml
scanner:
  enabled: true
  
  # Pass-specific configuration
  passes:
    - name: anti-patterns
      enabled: true
      max_findings: 50
    - name: security
      enabled: true
      max_findings: 100
      severity_threshold: medium
  
  # File filtering
  include_patterns:
    - "src/**/*.ts"
    - "packages/**/*.ts"
  exclude_patterns:
    - "**/*.test.ts"
    - "**/*.spec.ts"
    - "**/node_modules/**"
    - "**/dist/**"
  
  # Performance settings
  max_file_size: 1048576  # 1MB
  max_findings_per_pass: 100
  timeout_per_file: 5000  # 5 seconds
  
  # MCP server integration
  mcp_servers:
    - codegraph-context
  
  # Output settings
  output_format: markdown
  output_path: ".framework/reports/scan-report.md"
```

### Pass-Specific Options

```yaml
scanner:
  passes_config:
    anti-patterns:
      max_method_lines: 30
      max_class_lines: 500
      complexity_threshold: 10
    
    architecture:
      check_circular_deps: true
      check_layer_violations: true
      layers:
        - name: presentation
          paths: ["src/ui/**", "src/components/**"]
        - name: business
          paths: ["src/services/**", "src/core/**"]
        - name: data
          paths: ["src/db/**", "src/repositories/**"]
    
    performance:
      check_n_plus_one: true
      check_memory_leaks: true
      hot_paths: ["src/api/**", "src/handlers/**"]
    
    security:
      check_sql_injection: true
      check_xss: true
      check_secrets: true
      secret_patterns:
        - "api[_-]?key"
        - "password"
        - "secret"
        - "token"
```

## Scanner State

### State File

The scanner maintains state in `.framework/scanner-state.md`:

```markdown
# Scanner State

**Version:** 1.0.0
**Created:** 2026-02-19T18:00:00.000Z
**Updated:** 2026-02-19T18:30:00.000Z
**Total Scans:** 15
**Continuous Mode:** false
**Workspace:** /path/to/project

## Pass States

### anti-patterns
- **Enabled:** true
- **Last Run:** 2026-02-19T18:30:00.000Z
- **Findings:** 12
- **Duration:** 2340ms

### security
- **Enabled:** true
- **Last Run:** 2026-02-19T18:30:00.000Z
- **Findings:** 3
- **Duration:** 1560ms
```

### Resetting State

```bash
# Clear scanner state
rm .framework/scanner-state.md

# Re-initialize
npx kilo-framework scan
```

## Integration with SDLC Pipeline

### Automatic Scanning

The scanner integrates with the SDLC pipeline:

1. **Research Phase**: Scanner provides context about codebase health
2. **Planning Phase**: Scanner findings inform task prioritization
3. **Implementation Phase**: Continuous scanning monitors code quality
4. **Verification Phase**: Full scan validates final code

### Blocking vs Non-Blocking

Configure which findings block the pipeline:

```yaml
scanner:
  blocking_severity:
    - critical  # Always blocks
    - high      # Blocks in verification phase
  
  non_blocking_in:
    - research
    - planning
```

## Best Practices

1. **Run security scans early** - Catch vulnerabilities before they reach production
2. **Use continuous scanning** - Get real-time feedback during development
3. **Configure severity thresholds** - Focus on what matters most
4. **Customize patterns** - Add project-specific checks
5. **Review findings regularly** - Don't ignore accumulated warnings
6. **Integrate with CI/CD** - Run scans in your pipeline

## See Also

- [Configuration Reference](./configuration-reference.md) - Scanner configuration options
- [SDLC Run Process](./sdlc-run-process.md) - Pipeline integration
- [Troubleshooting](./troubleshooting.md) - Common scanner issues
