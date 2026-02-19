# Bootstrap Guide

The bootstrap process initializes the AI Agentic Autonomous SDLC Framework in your project. This guide explains what bootstrap does, how to run it, and how to troubleshoot common issues.

## What Bootstrap Does

The bootstrap command performs the following operations:

```
┌─────────────────────────────────────────────────────────────┐
│                    Bootstrap Process                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Health Checks                                            │
│     ├── Node.js version check (18+)                         │
│     ├── Git installation check                              │
│     ├── Package manager check (npm/pnpm)                    │
│     └── Workspace access verification                       │
│                                                              │
│  2. Dependency Installation                                  │
│     ├── Check for package.json                              │
│     ├── Install dependencies if node_modules missing        │
│     └── Verify installation success                         │
│                                                              │
│  3. MCP Server Configuration                                 │
│     ├── Create .kilocode/mcp/ directory                     │
│     ├── Generate servers.json configuration                 │
│     └── Configure default MCP servers                       │
│                                                              │
│  4. Configuration File Generation                            │
│     ├── Create .framework/ directory                        │
│     ├── Generate config.yaml                                │
│     ├── Generate state.json                                 │
│     └── Create scanner state files                          │
│                                                              │
│  5. Validation                                                │
│     └── Verify all components are properly configured       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Running Bootstrap

### Basic Usage

```bash
npx kilo-framework bootstrap
```

### Command Options

| Option | Short | Description |
|--------|-------|-------------|
| `--skip-dependencies` | | Skip dependency installation |
| `--skip-mcp` | | Skip MCP server configuration |
| `--skip-config` | | Skip configuration file generation |
| `--skip-health-check` | | Skip health checks |
| `--overwrite` | `-f` | Overwrite existing configuration files |
| `--mcp-servers <list>` | | Comma-separated list of MCP servers to configure |
| `--verbose` | `-v` | Enable verbose output |
| `--quiet` | `-q` | Suppress non-essential output |
| `--json` | `-j` | Output in JSON format |

### Examples

```bash
# Basic bootstrap
npx kilo-framework bootstrap

# Force overwrite existing configuration
npx kilo-framework bootstrap --overwrite

# Skip dependency installation (if already installed)
npx kilo-framework bootstrap --skip-dependencies

# Configure specific MCP servers only
npx kilo-framework bootstrap --mcp-servers codegraph-context,rag-memory

# Verbose output for debugging
npx kilo-framework bootstrap --verbose

# Non-interactive mode with all defaults
npx kilo-framework bootstrap --non-interactive

# JSON output for scripting
npx kilo-framework bootstrap --json
```

## Environment Checks

### Node.js Version Check

Bootstrap verifies that Node.js 18.0.0 or higher is installed:

```
✓ Node.js Version: Node.js 20.10.0 (✓)
```

If this check fails:
- Install Node.js 18+ from [nodejs.org](https://nodejs.org/)
- Or use a version manager like `nvm`:
  ```bash
  nvm install 18
  nvm use 18
  ```

### Git Check

Bootstrap verifies Git is installed and accessible:

```
✓ Git: Git is installed
```

If this check fails:
- Install Git from [git-scm.com](https://git-scm.com/)
- Ensure Git is in your PATH

### Package Manager Check

Bootstrap checks for npm or pnpm:

```
✓ Package Manager: npm and pnpm are installed
```

If this check fails:
```bash
# Install npm (comes with Node.js)
# Install pnpm globally
npm install -g pnpm
```

### Workspace Access Check

Bootstrap verifies the workspace directory is accessible:

```
✓ Workspace Access: Workspace directory is accessible
```

If this check fails:
- Check directory permissions
- Ensure you have read/write access to the project directory

## Dependency Installation

### Automatic Installation

If `node_modules` doesn't exist, bootstrap will run the package manager:

```bash
# Uses pnpm if available, otherwise npm
pnpm install
# or
npm install
```

### Skipping Dependencies

To skip dependency installation:

```bash
npx kilo-framework bootstrap --skip-dependencies
```

This is useful when:
- Dependencies are already installed
- Running in a CI/CD environment with cached dependencies
- Testing configuration changes only

## MCP Server Configuration

### Default MCP Servers

Bootstrap configures these MCP servers by default:

| Server | Package | Purpose |
|--------|---------|---------|
| `codegraph-context` | `@kilocode/mcp-codegraph-context` | Code graph analysis |
| `rag-memory` | `@kilocode/mcp-rag-memory` | Retrieval-augmented memory |
| `taskmaster` | `@kilocode/mcp-taskmaster` | Task management |

### Configuration Location

MCP server configuration is stored in:

```
.kilocode/mcp/servers.json
```

Example configuration:
```json
{
  "version": "1.0.0",
  "servers": {
    "codegraph-context": {
      "enabled": true,
      "package": "@kilocode/mcp-codegraph-context"
    },
    "rag-memory": {
      "enabled": true,
      "package": "@kilocode/mcp-rag-memory"
    },
    "taskmaster": {
      "enabled": true,
      "package": "@kilocode/mcp-taskmaster"
    }
  }
}
```

### Selective MCP Configuration

To configure specific MCP servers:

```bash
# Only configure codegraph-context
npx kilo-framework bootstrap --mcp-servers codegraph-context

# Configure multiple servers
npx kilo-framework bootstrap --mcp-servers codegraph-context,rag-memory
```

### Skipping MCP Configuration

To skip MCP server configuration:

```bash
npx kilo-framework bootstrap --skip-mcp
```

## Configuration File Generation

### Generated Files

Bootstrap creates the following files:

```
.framework/
├── config.yaml          # Main framework configuration
├── state.json           # Initial pipeline state
├── scanner-state.md     # Scanner state persistence
└── scanner-repertoire.md # Known patterns database
```

### config.yaml

The main configuration file contains all framework settings:

```yaml
framework:
  name: "Kilo Framework"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
    timeout: 3600
  # ... more configuration
```

### state.json

The initial state file tracks the pipeline status:

```json
{
  "framework_version": "1.0.0",
  "created_at": "2026-02-19T18:00:00.000Z",
  "updated_at": "2026-02-19T18:00:00.000Z",
  "current_phase": null,
  "phases": {
    "research": { "name": "research", "active": false, "tasks": [] },
    "planning": { "name": "planning", "active": false, "tasks": [] },
    "implementation": { "name": "implementation", "active": false, "tasks": [] },
    "verification": { "name": "verification", "active": false, "tasks": [] }
  },
  "checkpoint_count": 0
}
```

### Overwriting Existing Files

By default, bootstrap will not overwrite existing configuration files. Use the `--overwrite` flag to replace them:

```bash
npx kilo-framework bootstrap --overwrite
```

## Health Checks

### Running Health Checks Only

To run health checks without making changes:

```bash
npx kilo-framework bootstrap --skip-dependencies --skip-mcp --skip-config
```

### Health Check Output

```
──────────────────────────────────────────────────────────
  Health Checks
──────────────────────────────────────────────────────────
  ✓ Node.js Version: Node.js 20.10.0 (✓)
  ✓ Git: Git is installed
  ✓ Package Manager: npm and pnpm are installed
  ✓ Workspace Access: Workspace directory is accessible
```

### Skipping Health Checks

To skip health checks (not recommended):

```bash
npx kilo-framework bootstrap --skip-health-check
```

## Bootstrap Output

### Successful Bootstrap

```
═══════════════════════════════════════════════════════════
  Kilo Framework Bootstrap
═══════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────
  Health Checks
──────────────────────────────────────────────────────────
  ✓ Node.js Version: Node.js 20.10.0 (✓)
  ✓ Git: Git is installed
  ✓ Package Manager: npm and pnpm are installed
  ✓ Workspace Access: Workspace directory is accessible

──────────────────────────────────────────────────────────
  Dependencies
──────────────────────────────────────────────────────────
  node_modules already exists

──────────────────────────────────────────────────────────
  MCP Servers
──────────────────────────────────────────────────────────
  Configured 3 MCP servers

──────────────────────────────────────────────────────────
  Configuration Files
──────────────────────────────────────────────────────────
  Generated .framework/config.yaml
  Generated .framework/state.json

═══════════════════════════════════════════════════════════
  Bootstrap Complete
═══════════════════════════════════════════════════════════
  Dependencies installed: 0
  MCP servers configured: 3
  Config files generated: 2

  Next steps:
    1. Review .framework/config.yaml
    2. Run 'kilo-framework start' to begin
```

## Troubleshooting Common Issues

### Node.js Version Too Old

**Error**: `Node.js 16.x.x is below minimum required version 18.0.0`

**Solution**:
```bash
# Using nvm
nvm install 18
nvm use 18

# Or install from nodejs.org
```

### Git Not Found

**Error**: `Git is not installed or not in PATH`

**Solution**:
- Install Git from [git-scm.com](https://git-scm.com/)
- Ensure Git is added to PATH during installation
- Restart your terminal after installation

### Package Manager Not Found

**Error**: `No package manager found`

**Solution**:
```bash
# npm comes with Node.js
# Verify Node.js installation
node --version
npm --version

# Install pnpm if preferred
npm install -g pnpm
```

### Permission Denied

**Error**: `Cannot access workspace: Permission denied`

**Solution**:
```bash
# Check directory permissions
ls -la .

# Fix permissions (Unix/macOS)
chmod 755 .

# Run with appropriate permissions
```

### Configuration Already Exists

**Warning**: `config.yaml already exists (use --overwrite to replace)`

**Solution**:
```bash
# To overwrite existing configuration
npx kilo-framework bootstrap --overwrite

# Or manually edit the existing configuration
```

### Dependency Installation Failed

**Error**: `Failed to install dependencies: npm install exited with code 1`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Then retry bootstrap
npx kilo-framework bootstrap --skip-config --skip-mcp
```

### MCP Server Configuration Failed

**Error**: `Failed to write MCP config`

**Solution**:
```bash
# Create directory manually
mkdir -p .kilocode/mcp

# Retry bootstrap
npx kilo-framework bootstrap --skip-dependencies --skip-config
```

## Post-Bootstrap Steps

After successful bootstrap:

1. **Review Configuration**:
   ```bash
   cat .framework/config.yaml
   ```

2. **Customize Settings**:
   - Edit `.framework/config.yaml` for project-specific settings
   - Configure API keys in environment variables

3. **Verify MCP Servers**:
   ```bash
   cat .kilocode/mcp/servers.json
   ```

4. **Start the Pipeline**:
   ```bash
   npx kilo-framework start
   ```

## Re-bootstrap

To re-initialize the framework:

```bash
# Full re-bootstrap with overwrite
npx kilo-framework bootstrap --overwrite

# Selective re-bootstrap
npx kilo-framework bootstrap --skip-dependencies --overwrite
```

## See Also

- [Setup Guide](./setup-guide.md) - Complete installation instructions
- [Configuration Reference](./configuration-reference.md) - All configuration options
- [Troubleshooting](./troubleshooting.md) - More troubleshooting tips
