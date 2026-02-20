# Technical Specification — Docker + Qdrant Auto-Provisioning

## Difficulty
- **hard**: New services, commands, UI, settings, and bootstrap workflow changes with multiple edge cases (Docker availability, daemon state, container lifecycle, port conflicts).

## Technical Context
- **Language**: TypeScript
- **Platform**: VS Code extension (`src/`)
- **Existing systems**: `CodeIndexManager`, `CodeIndexConfigManager`, bootstrap service (`src/services/bootstrap`), command registration (`src/activate/registerCommands.ts`), extension activation (`src/extension.ts`), settings (`src/package.json` + `src/package.nls.json`), status bar patterns (`src/services/autocomplete/AutocompleteStatusBar.ts`).
- **Dependencies**: Use existing Node/VSC APIs; no new external dependencies.

## Implementation Approach
1. **Docker utilities**
   - Add `DockerManager` service for Docker detection and install prompts. Use `child_process` execution pattern already used in the repo (e.g., from existing command/terminal utilities) to run `docker --version` and daemon checks (`docker info`/`docker ps`).
   - Provide `getInstallInstructions()` returning OS-specific URLs and `offerInstallation()` using `vscode.window.showInformationMessage` with OS-specific action buttons.

2. **Qdrant container lifecycle**
   - Add `QdrantManager` with container constants, data path resolution, and `start/stop/restart/status` methods.
   - Use `docker ps -a --filter name=...` to detect containers, `docker start/stop`, and `docker run` for initial provisioning. Handle port conflict by inspecting `docker ps`/`docker inspect` and return actionable status.
   - Implement `waitForHealthy()` by polling `http://localhost:6333/healthz` with existing fetch utilities (`src/utils` or direct `fetch`).
   - Persist data to `.kilo/qdrant-data` (workspace) or a global storage path from settings.

3. **Auto-configure indexer**
   - Extend `CodeIndexConfigManager` to resolve `codebaseIndexQdrantUrl` to `http://localhost:6333` when `QdrantManager.isRunning()` and no explicit URL override exists.
   - Ensure status updates propagate via existing `CodeIndexManager.handleSettingsChange()` flow.

4. **VS Code integration**
   - Create a `QdrantStatusBar` (modeled after `AutocompleteStatusBar`) that reflects running state.
   - Add commands: `kilo.docker.startQdrant`, `kilo.docker.stopQdrant`, `kilo.docker.viewQdrantLogs` (open terminal with `docker logs kilo-qdrant`).
   - Add quick pick menu from status bar click: Start/Stop/Restart/View Logs/Configure.
   - Wire commands in `registerCommands` and include in `src/package.json` contributions and `src/package.nls.json` strings.

5. **Bootstrap integration**
   - Enhance bootstrap checks to verify Qdrant connectivity. If not reachable, present options:
     - Start local Docker container (if Docker available)
     - Configure cloud Qdrant URL
     - Skip
   - Persist selection in workspace settings and/or global state (consistent with current `codebaseIndexConfig` storage in `ContextProxy`).

6. **Settings**
   - Add `kilo-code.docker.autoStart` (boolean, default `false`).
   - Add `kilo-code.docker.qdrantDataPath` (string, default empty). Resolve to workspace `.kilo/qdrant-data` if empty.
   - Update `kilo-code.codeIndex.qdrantUrl` auto-detection behavior (prefer explicit setting; otherwise use local Docker if running).

## Source Code Structure Changes
- **New**
  - `src/services/docker/manager.ts` — `DockerManager` (`// kilocode_change - new file`)
  - `src/services/docker/qdrant-manager.ts` — `QdrantManager` (`// kilocode_change - new file`)
  - `src/services/docker/qdrant-status-bar.ts` — status bar UI (`// kilocode_change - new file`)
  - `src/services/docker/index.ts` — exports (`// kilocode_change - new file`)
- **Modified**
  - `src/activate/registerCommands.ts` — register Qdrant commands and status bar handler.
  - `src/extension.ts` — initialize Docker/Qdrant services on activation; honor `autoStart`.
  - `src/services/code-index/config-manager.ts` — resolve Qdrant URL from local Docker when applicable.
  - `src/services/bootstrap/bootstrap.ts` + `src/services/bootstrap/checks/*` — add Qdrant connectivity check and Docker option flow.
  - `src/package.json` — new commands and settings.
  - `src/package.nls.json` + localized variants — new setting descriptions and command titles.

## Data Model / API / Interface Changes
- **New settings**:
  - `kilo-code.docker.autoStart: boolean`
  - `kilo-code.docker.qdrantDataPath: string`
- **New commands**:
  - `kilo.docker.startQdrant`
  - `kilo.docker.stopQdrant`
  - `kilo.docker.viewQdrantLogs`
- **Code index config**: add auto-detection logic for `codebaseIndexQdrantUrl` when local container is running.

## Verification Approach
- **Unit tests** (Vitest, run from `src/`):
  - Add tests for `DockerManager` and `QdrantManager` behavior (mock command execution + health checks).
  - Update `code-index/config-manager` tests to cover auto-detected local Qdrant URL.
- **Manual checks**:
  - With Docker missing: bootstrap and status bar should offer install guidance without errors.
  - With Docker installed but daemon stopped: prompt to start or show informative error.
  - Start container via command/status bar and verify data persistence.
- **Commands**:
  - `pnpm lint` (from `src/`)
  - `pnpm check-types` (from `src/`)
  - `pnpm test <test-path>` (from `src/`)
