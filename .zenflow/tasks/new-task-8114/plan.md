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
<!-- chat-id: 95e92bf5-09a2-4445-be3e-c35579919c0d -->

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

### [x] Step: Docker and Qdrant services
<!-- chat-id: 6dea4948-d406-484d-915d-e6cc8d91ece2 -->
- Implement `DockerManager` and `QdrantManager` (new `src/services/docker/*` files).
- Add unit tests for Docker detection, container lifecycle, and health polling.

### [ ] Step: VS Code command + status bar integration
- Add status bar item + quick pick actions.
- Register commands (`kilo.docker.startQdrant`, `kilo.docker.stopQdrant`, `kilo.docker.viewQdrantLogs`).
- Add unit tests for command routing/status bar updates.

### [ ] Step: Bootstrap + settings integration
- Add new settings, command titles, and localized strings.
- Update `CodeIndexConfigManager` auto-detection of local Qdrant URL.
- Extend bootstrap flow to offer Docker start / cloud config / skip.
- Add unit tests for config changes and bootstrap decision paths.

### [ ] Step: Verification and reporting
- Run `pnpm lint`, `pnpm check-types`, and relevant `pnpm test` targets (from `src/`).
- Perform manual smoke checks for Docker missing/daemon stopped/port conflict.
- Write report to `{@artifacts_path}/report.md` with implementation + testing summary.
