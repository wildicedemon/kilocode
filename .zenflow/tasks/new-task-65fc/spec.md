# Technical Specification

## Difficulty
**hard** — introduces a second parser stack, new settings/config, optional dependencies, and cross-language parsing behavior with fallbacks.

## Technical Context
- **Language**: TypeScript (VS Code extension)
- **Core area**: `src/services/code-index/`
- **Current parser**: Tree-sitter via `CodeParser` in `src/services/code-index/processors/parser.ts`
- **Settings**: `src/package.json` contributes settings; localized in `src/package.nls*.json`
- **Config state**: `src/services/code-index/config-manager.ts`, `src/services/code-index/interfaces/config.ts`, `packages/types/src/codebase-index.ts`
- **Indexing pipeline**: `CodeIndexServiceFactory`, `CodeIndexOrchestrator`, `FileWatcher`, `DirectoryScanner`

## Implementation Approach
1. **OpenRewrite integration research**
   - Evaluate Node options for LST parsing:
     - `rewrite-javascript` npm package for JS/TS.
     - Java process (child process) for `rewrite-java` / `rewrite-kotlin` as needed.
     - REST bridge optional but likely out of scope unless already present.
   - Determine minimal supported languages for initial LST mode (Java + TypeScript/JavaScript).
   - Record findings and integration constraints in `.framework/notes/lst-integration-research.md`.

2. **Parser mode configuration**
   - Add `ParserMode` enum (`TREE_SITTER`, `LST`, `HYBRID`) and `LSTOptions` interface.
   - Extend code index configuration and settings storage to include:
     - `kilo.codeIndex.parserMode` (default `tree-sitter`).
     - `kilo.codeIndex.lstOptions` object (`preserveFormatting`, `includeTypeInfo`, `captureComments`).

3. **LST parser implementation**
   - Implement `parseWithLST(filePath: string, options: LSTOptions)` in the parser layer.
   - Route based on file extension and parser mode:
     - LST path for `.java`, `.ts`, `.tsx`, `.js`, `.jsx`.
     - Tree-sitter fallback for unsupported or LST failures.
   - Normalize LST output into existing `CodeBlock` format with added metadata fields where needed (e.g., `typeInfo`, `symbols`, `imports`) so indexing and embeddings remain compatible.

4. **Indexing workflow updates**
   - Update `CodeIndexServiceFactory` to provide parser configured by settings.
   - Ensure `DirectoryScanner` and `FileWatcher` use the configured parser mode.
   - Add parser mode indicator to index metadata/state updates (likely in `CodeIndexStateManager` or search metadata records).

5. **Dependencies and setup**
   - Add OpenRewrite packages to extension `package.json` (prefer optional peer dependencies if supported).
   - Document local setup in `.framework/docs/lst-setup.md` (required Java runtime, npm package install, optional jar path config if needed).

## Source Code Structure Changes
**Add/Modify**:
- `src/services/code-index/interfaces/config.ts` — add parser mode and LST options to config.
- `src/services/code-index/config-manager.ts` — read/store parser mode + LST options from settings.
- `src/services/code-index/processors/parser.ts` — add LST parsing pathway and fallback logic.
- `src/services/code-index/processors/index.ts` — expose LST-capable parser if needed.
- `src/services/code-index/service-factory.ts` — create parser with configured mode.
- `src/services/code-index/orchestrator.ts` and `src/services/code-index/processors/file-watcher.ts` — ensure updates use configured parser.
- `packages/types/src/codebase-index.ts` — extend settings schema with parser mode and LST options.
- `src/package.json` — add settings contributions for parser mode and LST options.
- `src/package.nls.json` (+ translations as required) — add localized descriptions.
- `.framework/notes/lst-integration-research.md` — research findings.
- `.framework/docs/lst-setup.md` — setup/installation guidance.

## Data Model / API / Interface Changes
- **New enum**: `ParserMode` (`TREE_SITTER`, `LST`, `HYBRID`).
- **New interface**: `LSTOptions` (`preserveFormatting`, `includeTypeInfo`, `captureComments`).
- **Config additions**: `parserMode`, `lstOptions` in code index configuration.
- **Index metadata**: extend to include parser mode and whether type info is present.

## Verification Approach
- **Unit tests** (add alongside implementation):
  - Parser mode selection logic in `CodeParser` (Tree-sitter vs LST vs fallback).
  - Config manager loading/storing parser mode and LST options.
  - File watcher/scanner uses configured parser mode.
- **Manual checks**:
  - Index a Java project with Tree-sitter and LST modes; compare search results.
  - Confirm LST mode yields type info fields in normalized blocks.
- **Commands**:
  - Lint: `pnpm lint` (from `src/` workspace).
  - Typecheck: `pnpm check-types` (from `src/` workspace).
  - Tests: `cd src && pnpm test <relevant-test-file>`.
