# Setup Guide

This guide provides detailed instructions for setting up the AI Agentic Autonomous SDLC Framework in your development environment.

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|-----------------|---------|
| **Node.js** | 18.0.0 | Runtime environment |
| **Git** | 2.0.0 | Version control integration |
| **VS Code** | 1.80.0 | IDE integration |
| **Kilo Code Extension** | Latest | AI agent capabilities |

### Optional Software

| Software | Purpose |
|----------|---------|
| **pnpm** | Preferred package manager (faster than npm) |
| **Docker** | Containerized MCP servers |

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: 500MB for framework + project dependencies
- **Network**: Internet access for API calls and package installation

## Installation Steps

### Step 1: Install Node.js

#### Windows

1. Download the LTS installer from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the prompts
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

#### macOS

Using Homebrew (recommended):
```bash
brew install node@18
```

Or download the installer from [nodejs.org](https://nodejs.org/).

#### Linux (Ubuntu/Debian)

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Install Git

#### Windows

1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer with default options

#### macOS

```bash
brew install git
```

#### Linux

```bash
sudo apt-get install git
```

### Step 3: Install pnpm (Recommended)

```bash
npm install -g pnpm

# Verify installation
pnpm --version
```

### Step 4: Install VS Code

1. Download from [code.visualstudio.com](https://code.visualstudio.com/)
2. Install the application for your platform

### Step 5: Install Kilo Code Extension

1. Open VS Code
2. Go to the Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Kilo Code"
4. Click "Install"

Alternatively, install via command line:
```bash
code --install-extension kilo-code.kilo-code
```

### Step 6: Configure API Keys

The framework requires API keys for AI model access. Set up your API keys:

#### Option A: Environment Variables

```bash
# For Anthropic Claude (recommended)
export ANTHROPIC_API_KEY="your-api-key-here"

# For OpenAI
export OPENAI_API_KEY="your-api-key-here"

# For Langfuse (optional, for analytics)
export LANGFUSE_PUBLIC_KEY="your-public-key"
export LANGFUSE_SECRET_KEY="your-secret-key"
```

#### Option B: VS Code Settings

1. Open VS Code Settings (Ctrl+, / Cmd+,)
2. Search for "Kilo Code"
3. Enter your API key in the appropriate field

#### Option C: Configuration File

Create or edit `.framework/config.yaml`:
```yaml
# API keys can be referenced via environment variables
api:
  provider: anthropic
  key: "${ANTHROPIC_API_KEY}"
```

## Project Setup

### For New Projects

1. **Create a new project directory**:
   ```bash
   mkdir my-project
   cd my-project
   git init
   ```

2. **Initialize npm/pnpm**:
   ```bash
   # Using pnpm (recommended)
   pnpm init

   # Or using npm
   npm init -y
   ```

3. **Run the bootstrap command**:
   ```bash
   npx kilo-framework bootstrap
   ```

### For Existing Projects

1. **Navigate to your project**:
   ```bash
   cd existing-project
   ```

2. **Run the bootstrap command**:
   ```bash
   npx kilo-framework bootstrap
   ```

3. **Review generated configuration**:
   ```bash
   cat .framework/config.yaml
   ```

## Configuration Options

### Basic Configuration

Edit `.framework/config.yaml` to customize the framework:

```yaml
framework:
  name: "My Project SDLC"
  version: "1.0.0"

sdlc:
  research:
    enabled: true
    timeout: 1800  # 30 minutes
  planning:
    enabled: true
    timeout: 1200  # 20 minutes
  implementation:
    enabled: true
    timeout: 3600  # 60 minutes
    max_iterations: 10
  verification:
    enabled: true
    timeout: 1800  # 30 minutes
    test_coverage_threshold: 80

scanner:
  enabled: true
  passes:
    - anti-patterns
    - architecture
    - performance
    - security
  continuous: false

cost_oversight:
  enabled: true
  budget_per_task: 10.00
  budget_per_phase: 50.00
```

### Environment-Specific Configuration

Create environment-specific configuration files:

```bash
# Development
.framework/config.dev.yaml

# Production
.framework/config.prod.yaml
```

Use the `--config` flag to specify:
```bash
npx kilo-framework start --config .framework/config.dev.yaml
```

### Mode Configuration

Custom modes are stored in `.kilo/modes/`. Each mode has its own configuration file:

```yaml
# .kilo/modes/requirements.yaml
slug: requirements
name: Requirements Analyst
roleDefinition: |
  You are a requirements analysis expert specializing in...

customInstructions: |
  When analyzing requirements:
  1. Parse specifications
  2. Identify gaps
  3. Document findings

availableTools:
  - codebase_search
  - read_file
  - search_files
```

## First-Time Setup Checklist

Complete this checklist to ensure proper setup:

- [ ] **Node.js 18+ installed**
  ```bash
  node --version  # Should show v18.x.x or higher
  ```

- [ ] **Git installed and configured**
  ```bash
  git --version
  git config --global user.name "Your Name"
  git config --global user.email "your@email.com"
  ```

- [ ] **VS Code installed**
  ```bash
  code --version
  ```

- [ ] **Kilo Code extension installed**
  - Check Extensions view in VS Code

- [ ] **API keys configured**
  - Set environment variables or configure in VS Code

- [ ] **Framework bootstrapped**
  ```bash
  npx kilo-framework bootstrap
  ```

- [ ] **Configuration reviewed**
  ```bash
  cat .framework/config.yaml
  ```

- [ ] **MCP servers configured** (optional)
  ```bash
  cat .kilocode/mcp/servers.json
  ```

- [ ] **Test run successful**
  ```bash
  npx kilo-framework status
  ```

## Verifying Installation

Run these commands to verify your installation:

```bash
# Check framework version
npx kilo-framework --version

# Check framework status
npx kilo-framework status

# Run a test scan
npx kilo-framework scan --pass anti-patterns --dry-run
```

## Next Steps

After completing setup:

1. **Read the [Bootstrap Guide](./bootstrap-guide.md)** to understand the initialization process
2. **Review the [Configuration Reference](./configuration-reference.md)** for all available options
3. **Start the SDLC pipeline** with `npx kilo-framework start`
4. **Monitor progress** using `npx kilo-framework status --watch`

## Upgrading

To upgrade the framework:

```bash
# Re-run bootstrap with overwrite flag
npx kilo-framework bootstrap --overwrite

# Or manually update specific files
npx kilo-framework bootstrap --skip-dependencies
```

## Uninstalling

To remove the framework from a project:

```bash
# Remove framework directory
rm -rf .framework/

# Remove MCP configuration
rm -rf .kilocode/mcp/

# Remove mode configurations (optional)
rm -rf .kilo/modes/
```

## Getting Help

If you encounter issues during setup:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Run with verbose output: `npx kilo-framework bootstrap --verbose`
3. Check the logs in `.framework/logs/`
