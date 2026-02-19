# Configuration Reference

This document provides a complete reference for all configuration options in the AI Agentic Autonomous SDLC Framework.

## Configuration File Location

The main configuration file is located at:

```
.framework/config.yaml
```

## Configuration Hierarchy

The framework uses a hierarchical configuration system with the following priority (highest to lowest):

1. **User Settings** - VS Code settings and environment variables
2. **Project Config** - `.framework/config.yaml`
3. **Framework Defaults** - Built-in defaults

Settings are deep-merged, with higher priority settings overriding lower ones.

## Complete Configuration Schema

```yaml
# =============================================================================
# FRAMEWORK METADATA
# =============================================================================
framework:
  name: string                    # Framework name
  version: string                 # Framework version (semver)
  description: string             # Framework description

# =============================================================================
# SDLC PHASES CONFIGURATION
# =============================================================================
sdlc:
  research:
    enabled: boolean              # Enable/disable phase
    timeout: number               # Max duration in seconds
    checkpoint_interval: number   # Save state every N seconds
  
  planning:
    enabled: boolean
    timeout: number
    checkpoint_interval: number
  
  implementation:
    enabled: boolean
    timeout: number
    checkpoint_interval: number
    max_iterations: number        # Max iterations per task
  
  verification:
    enabled: boolean
    timeout: number
    checkpoint_interval: number
    test_coverage_threshold: number  # Minimum coverage %

# =============================================================================
# CODE SCANNER CONFIGURATION
# =============================================================================
scanner:
  enabled: boolean
  passes: array                   # List of passes to run
  continuous: boolean             # Enable continuous scanning
  state_file: string              # Scanner state file path
  repertoire_file: string         # Pattern repertoire path
  mcp_servers: array              # MCP servers for analysis

# =============================================================================
# WASTE DETECTION CONFIGURATION
# =============================================================================
waste_detection:
  enabled: boolean
  token_thresholds:
    warn: number                  # Warning threshold
    pause: number                 # Auto-pause threshold
  loop_detection: boolean         # Enable loop detection
  alert_channels: array           # Alert destinations

# =============================================================================
# COST OVERSIGHT CONFIGURATION
# =============================================================================
cost_oversight:
  enabled: boolean
  budget_per_task: number         # Max USD per task
  budget_per_phase: number        # Max USD per phase
  currency: string                # Currency code
  langfuse_integration: boolean   # Enable Langfuse tracking

# =============================================================================
# WEBHOOK CONFIGURATION
# =============================================================================
webhooks:
  enabled: boolean
  port: number                    # HTTP server port
  github:
    enabled: boolean
    secret: string                # Webhook secret (env var)
    events: array                 # Events to subscribe

# =============================================================================
# BOOTSTRAP CONFIGURATION
# =============================================================================
bootstrap:
  auto_check_updates: boolean     # Check for updates
  mcp_servers: object             # MCP server definitions

# =============================================================================
# MODES CONFIGURATION
# =============================================================================
modes:
  orchestrator:
    enabled: boolean
    config: string                # Path to mode config
  requirements:
    enabled: boolean
    config: string
  scanner:
    enabled: boolean
    config: string
  review:
    enabled: boolean
    config: string

# =============================================================================
# VOICE CONFIGURATION
# =============================================================================
voice:
  enabled: boolean
  personaPlex:
    enabled: boolean
    config_path: string

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
logging:
  level: string                   # debug, info, warn, error
  output: string                  # Log directory path
  rotation: string                # daily, hourly, size
```

## Section Details

### Framework Metadata

```yaml
framework:
  name: "AI Agentic Autonomous SDLC Framework"
  version: "1.0.0"
  description: "Autonomous software development lifecycle management for Kilo Code"
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No | Framework display name |
| `version` | string | No | Framework version (informational) |
| `description` | string | No | Framework description |

### SDLC Configuration

#### Research Phase

```yaml
sdlc:
  research:
    enabled: true
    timeout: 1800           # 30 minutes
    checkpoint_interval: 300  # 5 minutes
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether to run this phase |
| `timeout` | number | `1800` | Maximum phase duration in seconds |
| `checkpoint_interval` | number | `300` | Seconds between state saves |

#### Planning Phase

```yaml
sdlc:
  planning:
    enabled: true
    timeout: 1200           # 20 minutes
    checkpoint_interval: 300
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether to run this phase |
| `timeout` | number | `1200` | Maximum phase duration in seconds |
| `checkpoint_interval` | number | `300` | Seconds between state saves |

#### Implementation Phase

```yaml
sdlc:
  implementation:
    enabled: true
    timeout: 3600           # 60 minutes
    checkpoint_interval: 600  # 10 minutes
    max_iterations: 10
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether to run this phase |
| `timeout` | number | `3600` | Maximum phase duration in seconds |
| `checkpoint_interval` | number | `600` | Seconds between state saves |
| `max_iterations` | number | `10` | Maximum implementation iterations per task |

#### Verification Phase

```yaml
sdlc:
  verification:
    enabled: true
    timeout: 1800           # 30 minutes
    checkpoint_interval: 300
    test_coverage_threshold: 80
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether to run this phase |
| `timeout` | number | `1800` | Maximum phase duration in seconds |
| `checkpoint_interval` | number | `300` | Seconds between state saves |
| `test_coverage_threshold` | number | `80` | Minimum test coverage percentage |

### Scanner Configuration

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
  mcp_servers:
    - codegraph-context
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable the scanner |
| `passes` | string[] | all passes | Scan passes to run |
| `continuous` | boolean | `false` | Enable continuous scanning |
| `state_file` | string | `.framework/scanner-state.md` | State file path |
| `repertoire_file` | string | `.framework/scanner-repertoire.md` | Pattern database path |
| `mcp_servers` | string[] | `[]` | MCP servers for analysis |

#### Available Scan Passes

| Pass | Description |
|------|-------------|
| `anti-patterns` | Code smells and anti-patterns |
| `architecture` | Dependency and structure analysis |
| `performance` | Performance bottleneck detection |
| `security` | Security vulnerability scanning |

### Waste Detection Configuration

```yaml
waste_detection:
  enabled: true
  token_thresholds:
    warn: 15000
    pause: 30000
  loop_detection: true
  alert_channels:
    - console
    - langfuse
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable waste detection |
| `token_thresholds.warn` | number | `15000` | Tokens for warning alert |
| `token_thresholds.pause` | number | `30000` | Tokens for auto-pause |
| `loop_detection` | boolean | `true` | Detect repetitive patterns |
| `alert_channels` | string[] | `["console"]` | Alert destinations |

#### Alert Channels

| Channel | Description |
|---------|-------------|
| `console` | Log to console output |
| `langfuse` | Send to Langfuse analytics |

### Cost Oversight Configuration

```yaml
cost_oversight:
  enabled: true
  budget_per_task: 10.00
  budget_per_phase: 50.00
  currency: "USD"
  langfuse_integration: true
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable cost tracking |
| `budget_per_task` | number | `10.00` | Maximum USD per task |
| `budget_per_phase` | number | `50.00` | Maximum USD per phase |
| `currency` | string | `"USD"` | Currency for tracking |
| `langfuse_integration` | boolean | `false` | Enable Langfuse cost tracking |

### Webhook Configuration

```yaml
webhooks:
  enabled: false
  port: 3000
  github:
    enabled: false
    secret: "${GITHUB_WEBHOOK_SECRET}"
    events:
      - issues
      - pull_request
      - workflow_run
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable webhook server |
| `port` | number | `3000` | HTTP server port |
| `github.enabled` | boolean | `false` | Enable GitHub webhooks |
| `github.secret` | string | - | Webhook secret (use env var) |
| `github.events` | string[] | `[]` | Events to subscribe |

#### GitHub Events

| Event | Description |
|-------|-------------|
| `issues` | Issue creation and updates |
| `pull_request` | PR creation, updates, merges |
| `workflow_run` | CI/CD workflow events |
| `push` | Code push events |

### Bootstrap Configuration

```yaml
bootstrap:
  auto_check_updates: true
  mcp_servers:
    codegraph-context:
      enabled: true
      package: "@kilocode/mcp-codegraph"
    rag-memory:
      enabled: true
      package: "@kilocode/mcp-rag-memory"
    taskmaster:
      enabled: true
      package: "@kilocode/mcp-taskmaster"
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `auto_check_updates` | boolean | `true` | Check for framework updates |
| `mcp_servers` | object | `{}` | MCP server definitions |

#### MCP Server Definition

```yaml
bootstrap:
  mcp_servers:
    server-name:
      enabled: true
      package: "@scope/package-name"
```

### Modes Configuration

```yaml
modes:
  orchestrator:
    enabled: true
    config: ".framework/modes/orchestrator.yaml"
  requirements:
    enabled: true
    config: ".framework/modes/requirements.yaml"
  scanner:
    enabled: true
    config: ".framework/modes/scanner.yaml"
  review:
    enabled: true
    config: ".framework/modes/review.yaml"
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable this mode |
| `config` | string | - | Path to mode configuration |

### Voice Configuration

```yaml
voice:
  enabled: false
  personaPlex:
    enabled: false
    config_path: ".framework/voice/personas.yaml"
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable voice features |
| `personaPlex.enabled` | boolean | `false` | Enable PersonaPlex |
| `personaPlex.config_path` | string | - | Path to persona config |

### Logging Configuration

```yaml
logging:
  level: "info"
  output: ".framework/logs/"
  rotation: "daily"
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `level` | string | `"info"` | Log level |
| `output` | string | `.framework/logs/` | Log directory |
| `rotation` | string | `"daily"` | Rotation strategy |

#### Log Levels

| Level | Description |
|-------|-------------|
| `debug` | Detailed debugging information |
| `info` | General information |
| `warn` | Warning messages |
| `error` | Error messages only |

#### Rotation Strategies

| Strategy | Description |
|----------|-------------|
| `daily` | New log file each day |
| `hourly` | New log file each hour |
| `size` | Rotate based on file size |

## Environment Variables

The following environment variables can be used in the configuration:

| Variable | Description | Usage |
|----------|-------------|-------|
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret | `${GITHUB_WEBHOOK_SECRET}` |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public API key | `${LANGFUSE_PUBLIC_KEY}` |
| `LANGFUSE_SECRET_KEY` | Langfuse secret API key | `${LANGFUSE_SECRET_KEY}` |
| `OPENAI_API_KEY` | OpenAI API key | `${OPENAI_API_KEY}` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `${ANTHROPIC_API_KEY}` |

### Using Environment Variables

```yaml
webhooks:
  github:
    secret: "${GITHUB_WEBHOOK_SECRET}"

api:
  openai_key: "${OPENAI_API_KEY}"
  anthropic_key: "${ANTHROPIC_API_KEY}"
```

## Schema Validation

The configuration is validated against a JSON schema. Invalid configurations will cause errors during bootstrap or startup.

### Validation Rules

1. **Required fields**: Some fields are required
2. **Type checking**: Values must match expected types
3. **Range constraints**: Numbers must be within valid ranges
4. **Enum values**: String values must be from allowed list
5. **Path validation**: File paths must be valid

### Validation Errors

```
Error: Configuration validation failed
  - sdlc.research.timeout: must be >= 60
  - scanner.passes[0]: must be one of [anti-patterns, architecture, performance, security]
  - logging.level: must be one of [debug, info, warn, error]
```

## Configuration Examples

### Minimal Configuration

```yaml
framework:
  name: "My Project"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
  planning:
    enabled: true
  implementation:
    enabled: true
  verification:
    enabled: true

scanner:
  enabled: true
```

### Development Configuration

```yaml
framework:
  name: "Development Project"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
    timeout: 900
  planning:
    enabled: true
    timeout: 600
  implementation:
    enabled: true
    timeout: 1800
    max_iterations: 5
  verification:
    enabled: true
    timeout: 900
    test_coverage_threshold: 60

scanner:
  enabled: true
  passes:
    - anti-patterns
    - security
  continuous: false

cost_oversight:
  enabled: true
  budget_per_task: 5.00
  budget_per_phase: 25.00

logging:
  level: "debug"
```

### Production Configuration

```yaml
framework:
  name: "Production Project"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
    timeout: 3600
    checkpoint_interval: 300
  planning:
    enabled: true
    timeout: 2400
    checkpoint_interval: 300
  implementation:
    enabled: true
    timeout: 7200
    checkpoint_interval: 600
    max_iterations: 20
  verification:
    enabled: true
    timeout: 3600
    checkpoint_interval: 300
    test_coverage_threshold: 90

scanner:
  enabled: true
  passes:
    - anti-patterns
    - architecture
    - performance
    - security
  continuous: true

waste_detection:
  enabled: true
  token_thresholds:
    warn: 25000
    pause: 50000
  loop_detection: true
  alert_channels:
    - console
    - langfuse

cost_oversight:
  enabled: true
  budget_per_task: 25.00
  budget_per_phase: 100.00
  langfuse_integration: true

webhooks:
  enabled: true
  port: 3000
  github:
    enabled: true
    secret: "${GITHUB_WEBHOOK_SECRET}"
    events:
      - issues
      - pull_request
      - workflow_run

logging:
  level: "info"
  output: ".framework/logs/"
  rotation: "daily"
```

### CI/CD Configuration

```yaml
framework:
  name: "CI/CD Pipeline"
  version: "1.0.0"

sdlc:
  research:
    enabled: false
  planning:
    enabled: false
  implementation:
    enabled: false
  verification:
    enabled: true
    timeout: 1800
    test_coverage_threshold: 80

scanner:
  enabled: true
  passes:
    - security
    - architecture

cost_oversight:
  enabled: false

logging:
  level: "warn"
```

## Hot Reloading

Configuration changes are automatically detected and applied without restarting the framework:

```yaml
# Enable hot reload (default: true)
hot_reload: true
```

Changes to the following sections trigger hot reload:
- `sdlc.*.timeout`
- `scanner.*`
- `cost_oversight.*`
- `logging.level`

Changes requiring restart:
- `framework.*`
- `webhooks.enabled`
- `modes.*`

## See Also

- [Setup Guide](./setup-guide.md) - Installation instructions
- [Bootstrap Guide](./bootstrap-guide.md) - Framework initialization
- [SDLC Run Process](./sdlc-run-process.md) - Running the pipeline
