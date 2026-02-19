# AI Agentic Autonomous SDLC Framework

## Overview

The AI Agentic Autonomous SDLC Framework is an integrated system for Kilo Code that provides autonomous software development lifecycle management using LangGraph-based state machines. It enables AI agents to autonomously manage the entire software development process from requirements gathering through deployment, with built-in oversight, quality controls, and cost management.

## Key Features

- **Autonomous SDLC Pipeline**: Complete software development lifecycle automation from research to verification
- **LangGraph State Machines**: Robust workflow management with cycles, branching, and conditional logic
- **Deep Code Scanner**: Multi-pass code analysis for anti-patterns, architecture, performance, and security
- **Cost Oversight**: Real-time budget tracking and automatic cost controls
- **Waste Detection**: Token usage monitoring and loop detection to prevent runaway costs
- **MCP Server Integration**: Extensible analysis capabilities through Model Context Protocol servers
- **Custom AI Modes**: Specialized personas for different SDLC phases
- **GitHub Webhook Integration**: Event-driven automation for CI/CD workflows

## Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Git** (for version control integration)
- **VS Code** with **Kilo Code extension** installed
- **pnpm** (recommended) or npm

### Installation

1. **Install the Kilo Code extension** in VS Code

2. **Bootstrap the framework**:
   ```bash
   npx kilo-framework bootstrap
   ```

3. **Review the generated configuration**:
   ```bash
   # Configuration file location
   cat .framework/config.yaml
   ```

4. **Start the SDLC pipeline**:
   ```bash
   npx kilo-framework start
   ```

### First Run

After bootstrapping, the framework will:
1. Create the `.framework/` directory structure
2. Generate default configuration files
3. Configure MCP servers for enhanced analysis
4. Initialize the scanner state

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Agentic SDLC Framework                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Research   │───▶│   Planning   │───▶│Implementation│       │
│  │    Phase     │    │    Phase     │    │    Phase     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│          │                  │                   │               │
│          │                  │                   ▼               │
│          │                  │          ┌──────────────┐         │
│          │                  └─────────▶│ Verification │         │
│          │                             │    Phase     │         │
│          │                             └──────────────┘         │
│          ▼                                      │               │
│  ┌──────────────────────────────────────────────┴─────────────┐ │
│  │                    Deep Scanner                              │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │ │
│  │  │Anti-Patterns│ │Architecture │ │ Performance │ │Security│ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ Waste Detection │  │ Cost Oversight  │  │  MCP Servers    │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Description |
|-----------|-------------|
| **SDLC Pipeline** | LangGraph-based state machine managing the development lifecycle |
| **Deep Scanner** | Multi-pass code analysis engine with pattern matching |
| **State Manager** | Checkpoint and recovery system for pipeline state |
| **Config Loader** | Hierarchical configuration with hot reload support |
| **CLI** | Command-line interface for framework operations |

### SDLC Phases

1. **Research Phase**: Requirements gathering, context analysis, and documentation review
2. **Planning Phase**: Architecture design, task decomposition, and strategy formulation
3. **Implementation Phase**: Code writing, refactoring, and actual development work
4. **Verification Phase**: Testing, validation, quality assurance, and coverage analysis

## Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](./setup-guide.md) | Detailed installation and configuration instructions |
| [Bootstrap Guide](./bootstrap-guide.md) | Framework initialization process |
| [SDLC Run Process](./sdlc-run-process.md) | Running and monitoring the SDLC pipeline |
| [Deep Scanner Guide](./deep-scanner-guide.md) | Code analysis and scanning documentation |
| [Configuration Reference](./configuration-reference.md) | Complete configuration options |
| [Troubleshooting](./troubleshooting.md) | Common issues and solutions |

## CLI Commands

```bash
# Initialize the framework
kilo-framework bootstrap [options]

# Start the SDLC pipeline
kilo-framework start [options]

# Check framework status
kilo-framework status [options]

# Run the deep scanner
kilo-framework scan [options]

# Display help
kilo-framework help [command]
```

### Common Options

| Option | Description |
|--------|-------------|
| `--verbose`, `-v` | Enable verbose output |
| `--json`, `-j` | Output in JSON format |
| `--quiet`, `-q` | Suppress non-essential output |
| `--config <path>` | Path to configuration file |
| `--dry-run`, `-d` | Simulate without making changes |

## Configuration

The framework uses a hierarchical configuration system:

```
Configuration Priority (highest to lowest):
├── User Settings (VS Code settings / environment variables)
├── Project Config (.framework/config.yaml)
└── Framework Defaults
```

### Basic Configuration Example

```yaml
# .framework/config.yaml
framework:
  name: "AI Agentic Autonomous SDLC Framework"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
    timeout: 1800
  planning:
    enabled: true
    timeout: 1200
  implementation:
    enabled: true
    timeout: 3600
  verification:
    enabled: true
    timeout: 1800

scanner:
  enabled: true
  passes:
    - anti-patterns
    - architecture
    - performance
    - security
```

See the [Configuration Reference](./configuration-reference.md) for complete documentation.

## Custom Modes

The framework includes specialized AI modes for different SDLC phases:

| Mode | Purpose |
|------|---------|
| `orchestrator` | Workflow coordination and phase management |
| `requirements` | Requirements analysis and specification |
| `scanner` | Deep codebase analysis |
| `review` | Code review and quality assurance |

Mode configurations are stored in `.kilo/modes/*.yaml`.

## MCP Server Integration

The framework integrates with MCP (Model Context Protocol) servers for enhanced capabilities:

| Server | Purpose |
|--------|---------|
| `codegraph-context` | Code graph analysis for context-aware scanning |
| `rag-memory` | Retrieval-augmented generation for memory |
| `taskmaster` | Task management and coordination |

## Cost Management

The framework includes built-in cost oversight:

- **Per-task budget**: Configurable maximum cost per task
- **Per-phase budget**: Budget limits for each SDLC phase
- **Real-time tracking**: Monitor API usage and costs
- **Automatic pausing**: Halt execution when budget exceeded

```yaml
cost_oversight:
  enabled: true
  budget_per_task: 10.00    # USD
  budget_per_phase: 50.00   # USD
  currency: "USD"
```

## Contributing

This framework is part of the Kilo Code project. See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

See the [LICENSE](../../LICENSE) file for license information.

## Support

- **Documentation**: Browse the docs in this directory
- **Issues**: Report bugs and request features on GitHub
- **Troubleshooting**: See [troubleshooting.md](./troubleshooting.md) for common issues
