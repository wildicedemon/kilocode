# Troubleshooting Guide

This guide covers common issues, error messages, and solutions for the AI Agentic Autonomous SDLC Framework.

## Quick Diagnostics

Run these commands to diagnose common issues:

```bash
# Check framework version
npx kilo-framework --version

# Check framework status
npx kilo-framework status --verbose

# Run health checks
npx kilo-framework bootstrap --skip-dependencies --skip-mcp --skip-config

# Validate configuration
npx kilo-framework start --dry-run --verbose

# Check logs
cat .framework/logs/latest.log
```

## Common Issues

### Installation Issues

#### Node.js Version Too Old

**Error:**
```
Error: Node.js 16.x.x is below minimum required version 18.0.0
```

**Solution:**
```bash
# Check current version
node --version

# Using nvm (recommended)
nvm install 18
nvm use 18
nvm alias default 18

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

#### Package Manager Not Found

**Error:**
```
Error: No package manager found
```

**Solution:**
```bash
# Verify npm (comes with Node.js)
npm --version

# Install pnpm (recommended)
npm install -g pnpm

# Verify installation
pnpm --version
```

#### Permission Denied

**Error:**
```
Error: EACCES: permission denied, mkdir '.framework'
```

**Solution:**
```bash
# Check directory permissions
ls -la .

# Fix permissions (Unix/macOS)
chmod 755 .

# Or use sudo (not recommended)
sudo npx kilo-framework bootstrap

# Better: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.bashrc or ~/.zshrc:
export PATH=~/.npm-global/bin:$PATH
```

### Bootstrap Issues

#### Bootstrap Fails Silently

**Symptoms:**
- Bootstrap exits without error
- No files generated

**Solution:**
```bash
# Run with verbose output
npx kilo-framework bootstrap --verbose

# Check for existing configuration
ls -la .framework/

# Force overwrite
npx kilo-framework bootstrap --overwrite --verbose
```

#### Configuration Already Exists

**Warning:**
```
Warning: config.yaml already exists (use --overwrite to replace)
```

**Solution:**
```bash
# To overwrite existing configuration
npx kilo-framework bootstrap --overwrite

# To preserve existing config, skip config generation
npx kilo-framework bootstrap --skip-config
```

#### Dependency Installation Failed

**Error:**
```
Error: Failed to install dependencies: npm install exited with code 1
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock files
rm -rf node_modules package-lock.json pnpm-lock.yaml

# Reinstall dependencies
npm install
# or
pnpm install

# Retry bootstrap
npx kilo-framework bootstrap --skip-config --skip-mcp
```

#### MCP Server Configuration Failed

**Error:**
```
Error: Failed to write MCP config
```

**Solution:**
```bash
# Create directory manually
mkdir -p .kilocode/mcp

# Check permissions
ls -la .kilocode/

# Retry bootstrap
npx kilo-framework bootstrap --skip-dependencies --skip-config
```

### SDLC Pipeline Issues

#### Pipeline Won't Start

**Error:**
```
Error: Cannot start pipeline - framework not initialized
```

**Solution:**
```bash
# Run bootstrap first
npx kilo-framework bootstrap

# Verify configuration exists
cat .framework/config.yaml

# Then start
npx kilo-framework start
```

#### Phase Timeout

**Error:**
```
Error: Phase 'implementation' exceeded timeout of 3600 seconds
```

**Solution:**
```bash
# Increase timeout in config.yaml
sdlc:
  implementation:
    timeout: 7200  # Increase to 2 hours

# Or resume from checkpoint
npx kilo-framework start --checkpoint latest
```

#### Budget Exceeded

**Error:**
```
Error: Budget exceeded - pausing execution
  Task cost: $12.50 (limit: $10.00)
```

**Solution:**
```bash
# Increase budget in config.yaml
cost_oversight:
  budget_per_task: 20.00
  budget_per_phase: 100.00

# Or override for current run
npx kilo-framework start --budget-override
```

#### Checkpoint Not Found

**Error:**
```
Error: Checkpoint 'cp-2026-02-19-001' not found
```

**Solution:**
```bash
# List available checkpoints
ls -la .framework/checkpoints/

# Use latest checkpoint
npx kilo-framework start --checkpoint latest

# Or start fresh
npx kilo-framework start
```

#### Quality Gate Failed

**Error:**
```
Error: Quality gate failed: test_coverage (75% < 80%)
```

**Solution:**
```bash
# Option 1: Fix the underlying issue
# Add more tests to increase coverage

# Option 2: Adjust threshold (not recommended for production)
sdlc:
  verification:
    test_coverage_threshold: 75

# Option 3: Skip specific gate (use with caution)
npx kilo-framework start --skip-gates test_coverage
```

### Scanner Issues

#### Scanner Not Initialized

**Error:**
```
Error: Scanner not initialized. Call initialize() first.
```

**Solution:**
```bash
# Ensure scanner is enabled in config
scanner:
  enabled: true

# Run scan with verbose output
npx kilo-framework scan --verbose
```

#### Scan Already in Progress

**Error:**
```
Error: Scan already in progress
```

**Solution:**
```bash
# Wait for current scan to complete
# Or check scanner state
cat .framework/scanner-state.md

# Force stop (if stuck)
# Remove state file
rm .framework/scanner-state.md

# Re-run scan
npx kilo-framework scan
```

#### No Findings Returned

**Symptoms:**
- Scan completes but returns no findings
- Expected issues not detected

**Solution:**
```bash
# Check which passes are enabled
npx kilo-framework scan --verbose

# Run specific pass
npx kilo-framework scan --pass security

# Check pattern repertoire
cat .framework/scanner-repertoire.md

# Verify file patterns
scanner:
  include_patterns:
    - "src/**/*.ts"
  exclude_patterns:
    - "**/*.test.ts"
```

#### Scanner Performance Issues

**Symptoms:**
- Scans take too long
- High memory usage

**Solution:**
```yaml
# Optimize scanner configuration
scanner:
  max_file_size: 1048576  # 1MB limit
  max_findings_per_pass: 50
  timeout_per_file: 5000  # 5 seconds
  
  # Exclude large directories
  exclude_patterns:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/.git/**"
```

### API and Authentication Issues

#### API Key Not Set

**Error:**
```
Error: API key not configured
```

**Solution:**
```bash
# Set environment variable
export ANTHROPIC_API_KEY="your-api-key"

# Or in ~/.bashrc or ~/.zshrc
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $ANTHROPIC_API_KEY
```

#### API Rate Limited

**Error:**
```
Error: API rate limit exceeded
```

**Solution:**
```bash
# Wait and retry
# The framework will auto-retry with backoff

# If persistent, check API status
# https://status.anthropic.com/

# Reduce request frequency
sdlc:
  implementation:
    max_iterations: 5  # Reduce iterations
```

#### Invalid API Key

**Error:**
```
Error: Invalid API key
```

**Solution:**
```bash
# Verify key format
echo $ANTHROPIC_API_KEY

# Regenerate key from provider dashboard
# https://console.anthropic.com/

# Update environment variable
export ANTHROPIC_API_KEY="new-api-key"
```

### Configuration Issues

#### Configuration Validation Failed

**Error:**
```
Error: Configuration validation failed
  - sdlc.research.timeout: must be >= 60
  - scanner.passes[0]: must be one of [...]
```

**Solution:**
```bash
# Check configuration syntax
cat .framework/config.yaml

# Fix validation errors
# Ensure values are within valid ranges
sdlc:
  research:
    timeout: 1800  # Must be >= 60

# Validate with dry-run
npx kilo-framework start --dry-run
```

#### Configuration File Not Found

**Error:**
```
Error: Configuration file not found: .framework/config.yaml
```

**Solution:**
```bash
# Run bootstrap to generate config
npx kilo-framework bootstrap

# Or specify config path
npx kilo-framework start --config path/to/config.yaml
```

#### Environment Variable Not Resolved

**Error:**
```
Error: Environment variable 'GITHUB_WEBHOOK_SECRET' not found
```

**Solution:**
```bash
# Set the environment variable
export GITHUB_WEBHOOK_SECRET="your-secret"

# Or provide default in config
webhooks:
  github:
    secret: "${GITHUB_WEBHOOK_SECRET:-default-secret}"
```

### Webhook Issues

#### Webhook Server Won't Start

**Error:**
```
Error: Port 3000 already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :3000  # Unix/macOS
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
webhooks:
  port: 3001

# Or disable webhooks
webhooks:
  enabled: false
```

#### Webhook Signature Invalid

**Error:**
```
Error: Invalid webhook signature
```

**Solution:**
```bash
# Verify secret matches GitHub settings
# GitHub repo → Settings → Webhooks → Your webhook

# Update secret
webhooks:
  github:
    secret: "${GITHUB_WEBHOOK_SECRET}"

# Ensure secret is set correctly
export GITHUB_WEBHOOK_SECRET="your-secret-from-github"
```

## Error Messages Explained

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INIT_FAILED` | Scanner initialization failed | Check config, run bootstrap |
| `NOT_INITIALIZED` | Component not initialized | Run bootstrap or initialize |
| `SCAN_IN_PROGRESS` | Scan already running | Wait or stop current scan |
| `NO_STATE` | No state to save | Initialize component first |
| `SAVE_FAILED` | Failed to save state | Check permissions, disk space |
| `LOAD_FAILED` | Failed to load state | Check file exists, valid format |
| `TIMEOUT` | Operation timed out | Increase timeout or optimize |
| `BUDGET_EXCEEDED` | Cost limit reached | Increase budget or optimize |
| `VALIDATION_FAILED` | Quality gate failed | Fix issues or adjust thresholds |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Authentication error |
| 4 | Network error |
| 5 | Timeout error |
| 6 | Budget exceeded |
| 7 | Validation failed |

## Debug Mode

### Enabling Debug Mode

```bash
# Maximum verbosity
npx kilo-framework start --verbose --log-level debug

# Debug specific component
DEBUG=scanner npx kilo-framework scan
DEBUG=sdlc npx kilo-framework start
DEBUG=* npx kilo-framework start
```

### Debug Output

Debug mode provides:
- Detailed operation logs
- Timing information
- Internal state dumps
- API request/response details

### Log Files

Logs are stored in `.framework/logs/`:

```
.framework/logs/
├── 2026-02-19.log      # Daily log file
├── error.log           # Errors only
└── debug.log           # Debug output
```

## Getting Help

### Before Asking for Help

1. **Check this guide** - Search for your error message
2. **Run diagnostics** - Use the quick diagnostics above
3. **Check logs** - Review `.framework/logs/`
4. **Try verbose mode** - Add `--verbose` to commands

### Information to Provide

When reporting issues, include:

1. **Framework version**: `npx kilo-framework --version`
2. **Node.js version**: `node --version`
3. **Operating system**: Windows/macOS/Linux and version
4. **Error message**: Full error text
5. **Steps to reproduce**: What commands did you run?
6. **Configuration**: Relevant parts of `config.yaml`
7. **Logs**: Relevant log excerpts

### Support Channels

- **Documentation**: Check all docs in `.framework/docs/`
- **GitHub Issues**: Report bugs and request features
- **Community**: Join discussions on GitHub

## Prevention Tips

1. **Always run bootstrap first** - Ensures proper setup
2. **Keep configuration valid** - Use `--dry-run` to validate
3. **Monitor costs** - Set appropriate budgets
4. **Use checkpoints** - Enable recovery from failures
5. **Review logs regularly** - Catch issues early
6. **Update regularly** - Keep framework and dependencies updated

## See Also

- [Setup Guide](./setup-guide.md) - Installation instructions
- [Bootstrap Guide](./bootstrap-guide.md) - Initialization process
- [Configuration Reference](./configuration-reference.md) - All configuration options
- [SDLC Run Process](./sdlc-run-process.md) - Running the pipeline
