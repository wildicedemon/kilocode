# Technical Specification

## Technical Context
- **Language/Format**: YAML configuration files aligned to `.framework/schema.json` and existing mode definitions in `.kilo/modes/*.yaml`.
- **Target Area**: VS Code extension framework configuration under `.framework/`.
- **Dependencies**: No new dependencies; use built-in Kilo tools and existing schema patterns.

## Implementation Approach
1. **Mirror existing mode schema**
   - Follow the structure used in `.kilo/modes/scanner.yaml` (top-level `modeDefinition`, `roleDefinition`, `groups`, `tools`, `customInstructions`, `source`).
   - Ensure values match requirements: `slug: scanner`, `name: Deep Code Scanner`, `description: Adversarial multi-pass codebase analysis with infinite research loop`.
2. **Populate Scanner role definition**
   - Describe adversarial, multi-pass scanning behavior; emphasize depth, use of `codebase_search`, and structured reporting.
3. **Custom instructions with phased methodology**
   - Add explicit phases with concrete `codebase_search` queries per phase (anti-patterns, architecture, performance, security, code quality).
   - Include infinite research loop meta-prompt and pattern-learning behaviors (refine queries, expand pattern library).
4. **Integration points**
   - Describe ntfy notifications for HIGH/CRITICAL findings with action buttons.
   - Define structured findings storage and reference `.framework/scanner-repertoire.md` for known patterns.
5. **Tools and output format**
   - Explicit tools list (`codebase_search`, `read_file`, `write_file`, `execute_command`, `ntfy_me`).
   - Output format for `.framework/scans/{timestamp}-scan-report.md` with required sections and per-finding fields.

## Source Code Structure Changes
- **Create**: `.framework/modes/scanner.yaml` (new mode definition).
- **No other files modified** unless schema validation or cross-references require adjustment.

## Data Model / API / Interface Changes
- **None**. Configuration-only addition that conforms to existing mode schema.

## Verification Approach
1. **Schema alignment**: Compare new file structure against `.framework/schema.json` and `.kilo/modes/*.yaml` examples.
2. **Manual validation**: Ensure required fields (`modeDefinition`, `roleDefinition`, `groups`, `tools`, `customInstructions`, `source`) are present and consistent with existing modes.
3. **Project checks** (later during implementation):
   - `pnpm lint`
   - `pnpm check-types`
   - No tests expected for YAML-only change unless a validation suite exists.
