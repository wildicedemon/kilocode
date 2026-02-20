# Technical Specification: Architect Mode

## Technical Context
- **Language/runtime**: TypeScript (Node.js) for VS Code extension logic.
- **Workspace**: pnpm monorepo with extension sources under `src/`.
- **Framework configuration**: `.framework/config.yaml` loaded by `src/services/framework/config-loader.ts` and validated by `.framework/schema.json`.
- **Mode definitions**: YAML files with `modeDefinition`, `roleDefinition`, `groups`, `tools`, and `customInstructions` (see [./.kilo/modes/requirements.yaml](./.kilo/modes/requirements.yaml), [./.kilo/modes/review.yaml](./.kilo/modes/review.yaml), [./.kilo/modes/scanner.yaml](./.kilo/modes/scanner.yaml)).
- **Notifications**: Existing OS-level notification helper in [./src/integrations/notifications/index.ts](./src/integrations/notifications/index.ts).
- **Testing**: Vitest tests in `src/` (run from `src` workspace).

## Implementation Approach
1. **Add Architect mode definition**
   - Create `.framework/modes/architect.yaml` matching existing mode schema:
     - `modeDefinition.slug`: `architect`
     - `modeDefinition.name`: `Solution Architect`
     - `modeDefinition.description`: `Design solutions consistent with codebase architecture`
     - `roleDefinition`: Senior architect balancing ideal design and pragmatic constraints.
     - `groups/tools`: align with existing modes (include `read`, `browser`, `command`, and tools such as `read_file`, `search_files`, `codebase_search`, `list_files`, `execute_command`, `new_task`, `ask_followup_question`, `attempt_completion`).
   - `customInstructions` must include:
     - **Architecture analysis methodology**: mandate `codebase_search` for similar features, architecture layers, dependencies/data flow, configuration patterns; analyze package/module structure; identify tech stack; locate ADRs.
     - **Design principles** in priority order: consistency, SOLID, DRY, YAGNI, security by design, performance/scalability. Require ADR justification for deviations.
     - **Architecture document output**: generate `.framework/architecture/{issue-id}-architecture.md` with required sections from requirements.
     - **ADR format**: create `.framework/architecture/decisions/{number}-{title}.md` with Status/Context/Decision/Consequences/Alternatives and link from main doc.
     - **Task decomposition**: atomic tasks with dependencies, acceptance criteria references, complexity (S/M/L), and component/layer tags.
     - **Approval mechanism**: send an `ntfy` notification containing architecture summary + cost/time estimate and wait for approval before proceeding. If rejected, revise.
     - **Testing guidance**: include verification checklist required by requirements.

2. **Register Architect mode in framework config**
   - Update `.framework/config.yaml` to add `architect` under `modes` with `enabled: true` and `config: ".framework/modes/architect.yaml"`.
   - Ensure `.framework/modes/` exists and contains the new file.

3. **Update framework configuration defaults and schema**
   - Update `DEFAULT_CONFIG` in [./src/services/framework/config-loader.ts](./src/services/framework/config-loader.ts) to include the `architect` mode entry.
   - Update `ModesConfig` in [./src/services/framework/types.ts](./src/services/framework/types.ts) to include an `architect: ModeConfig` property.
   - Update `.framework/schema.json`:
     - Add `architect` to `modes.required`.
     - Add `architect` to `modes.properties` with the `modeConfig` ref and description.

4. **Notification integration for ntfy**
   - Reuse existing notification patterns with minimal dependencies.
   - Implement a simple `fetch`-based helper or existing command execution path (TBD during implementation) to POST to the configured `ntfy` endpoint.
   - If no endpoint is configured, surface a clear error in the architecture output and require user input.

## Source Code Structure Changes
- **New**: `.framework/modes/architect.yaml`
- **Updated**: `.framework/config.yaml`
- **Updated**: `.framework/schema.json`
- **Updated**: `src/services/framework/config-loader.ts`
- **Updated**: `src/services/framework/types.ts`
- **Potential**: Add helper under `src/integrations/notifications/` if `ntfy` integration requires new module.

## Data Model / API / Interface Changes
- **FrameworkConfig**: add `architect` to `ModesConfig` (type and default config).
- **Schema**: require `modes.architect`.
- **No external API changes** unless a new `ntfy` config entry is added during implementation.

## Delivery Phases
1. **Phase 1**: Add architect mode definition file and register in `.framework/config.yaml`.
2. **Phase 2**: Update framework types/defaults/schema to include architect mode.
3. **Phase 3**: Add/adjust tests for config defaults and schema validation paths (if needed).

## Verification Approach
1. **Tests** (from `src` workspace):
   - `pnpm test services/framework/__tests__/config-loader.spec.ts`
2. **Lint** (repo root):
   - `pnpm lint`
3. **Typecheck** (repo root):
   - `pnpm check-types`

## Notes / Assumptions
- Architect mode YAML follows the same schema as existing modes under `.kilo/modes`.
- `{issue-id}` resolves from the workflow context; if unavailable, the mode must request it via follow-up question before generating architecture artifacts.
- `ntfy` configuration details are not currently defined; implementation will follow existing notification patterns and avoid new dependencies.
