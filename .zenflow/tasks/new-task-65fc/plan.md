# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: 2c6ca925-05d3-4bbd-90b2-47c04478dd21 -->

Assess the task's difficulty, as underestimating it leads to poor outcomes.
- easy: Straightforward implementation, trivial bug fix or feature
- medium: Moderate complexity, some edge cases or caveats to consider
- hard: Complex logic, many caveats, architectural considerations, or high-risk changes

Create a technical specification for the task that is appropriate for the complexity level:
- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach
- Source code structure changes
- Data model / API / interface changes
- Verification approach

If the task is complex enough, create a detailed implementation plan based on `{@artifacts_path}/spec.md`:
- Break down the work into concrete tasks (incrementable, testable milestones)
- Each task should reference relevant contracts and include verification steps
- Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

Save to `{@artifacts_path}/plan.md`. If the feature is trivial and doesn't warrant this breakdown, keep the Implementation step below as is.

---

### [ ] Step: Research OpenRewrite integration
- Validate Node.js options (`rewrite-javascript` package, JVM child process) and supported languages.
- Record findings in `.framework/notes/lst-integration-research.md`.

### [ ] Step: Add parser mode types and config wiring
- Add `ParserMode` and `LSTOptions` types.
- Extend code index config interfaces and schemas.
- Update `CodeIndexConfigManager` to load/store parser mode + LST options.
- Add unit tests for config loading and restart detection if needed.

### [ ] Step: Implement LST parser and normalization
- Implement `parseWithLST` with language routing and fallback to Tree-sitter.
- Normalize LST output to `CodeBlock` format (include type metadata when available).
- Add tests for parser selection and fallback behavior.

### [ ] Step: Update indexing workflow to honor parser mode
- Wire configured parser into `CodeIndexServiceFactory`, `DirectoryScanner`, and `FileWatcher`.
- Add parser mode indicator to index metadata/state.
- Add tests covering parser mode propagation.

### [ ] Step: Add VS Code settings and localization
- Add `kilo.codeIndex.parserMode` and `kilo.codeIndex.lstOptions` to `src/package.json`.
- Update `src/package.nls.json` and translation files as required.

### [ ] Step: Add LST dependencies and setup docs
- Update `package.json` with OpenRewrite dependencies (prefer optional peer dependencies if possible).
- Document setup in `.framework/docs/lst-setup.md`.

### [ ] Step: Verification
- Run targeted unit tests from `src/` workspace.
- Run `pnpm lint` and `pnpm check-types` from `src/`.
- Perform manual indexing smoke test (Tree-sitter vs LST).
- Write `{@artifacts_path}/report.md` with implementation and test summary.
