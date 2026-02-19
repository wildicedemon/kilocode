// kilocode_change - new file

import type { WorkflowRunEvent, WorkflowRunEventPayload, WebhookTask } from "../types"

/**
 * CI Failure Handler - Processes GitHub workflow_run events and creates remediation tasks.
 *
 * This handler:
 * - Parses workflow_run events
 * - Analyzes CI failures
 * - Creates remediation tasks
 * - Notifies relevant stakeholders
 *
 * @example
 * ```typescript
 * import { CiFailureHandler, createCiFailureTask } from './handlers/ci-failure'
 *
 * const handler = new CiFailureHandler({
 *   notifyOnFailure: true,
 *   createTasksFor: ['test', 'build', 'lint']
 * })
 *
 * server.registerHandler('workflow_run', handler.handle)
 * ```
 */

/**
 * CI Failure handler configuration
 */
export interface CiFailureHandlerConfig {
	/** Create tasks only for these workflow names (empty = all) */
	createTasksFor?: string[]
	/** Skip creating tasks for these workflow names */
	skipWorkflows?: string[]
	/** Notify stakeholders on failure */
	notifyOnFailure?: boolean
	/** Include logs in task description (if available) */
	includeLogs?: boolean
	/** Callback when a remediation task is created */
	onRemediationTaskCreated?: (task: WebhookTask) => Promise<void> | void
	/** Callback to fetch additional failure details */
	onFetchFailureDetails?: (
		workflowRun: WorkflowRunEventPayload["workflow_run"],
	) => Promise<FailureDetails | null>
	/** Callback when an error occurs */
	onError?: (error: Error, event: WorkflowRunEvent) => void
}

/**
 * Additional failure details from CI logs
 */
export interface FailureDetails {
	/** Error message from logs */
	errorMessage?: string
	/** Stack trace if available */
	stackTrace?: string
	/** Failed step name */
	failedStep?: string
	/** Raw log output */
	logs?: string
	/** Additional context */
	context?: Record<string, unknown>
}

/**
 * Default configuration values
 */
const DEFAULT_CI_FAILURE_CONFIG: Omit<CiFailureHandlerConfig, "onRemediationTaskCreated"> = {
	createTasksFor: [],
	skipWorkflows: [],
	notifyOnFailure: true,
	includeLogs: false,
}

/**
 * CI Failure handler for processing GitHub workflow_run events.
 */
export class CiFailureHandler {
	private config: CiFailureHandlerConfig

	constructor(config: CiFailureHandlerConfig = {}) {
		this.config = { ...DEFAULT_CI_FAILURE_CONFIG, ...config }
	}

	/**
	 * Main handler method for workflow_run events.
	 */
	handle = async (event: WorkflowRunEvent): Promise<void> => {
		const { action, workflow_run, workflow, repository } = event.payload

		// Only handle completed workflows
		if (action !== "completed") {
			return
		}

		// Only handle failures
		if (workflow_run.conclusion !== "failure") {
			return
		}

		// Check if we should process this workflow
		if (!this.shouldProcessWorkflow(workflow_run, workflow)) {
			return
		}

		try {
			// Fetch additional failure details if callback provided
			let failureDetails: FailureDetails | null = null
			if (this.config.onFetchFailureDetails) {
				failureDetails = await this.config.onFetchFailureDetails(workflow_run)
			}

			// Create remediation task
			const task = this.createRemediationTask(event, failureDetails)

			// Notify via callback
			if (this.config.onRemediationTaskCreated) {
				await this.config.onRemediationTaskCreated(task)
			}

			console.log(
				`[CiFailureHandler] Created remediation task for failed workflow '${workflow.name}' in ${repository.full_name}`,
			)
		} catch (error) {
			console.error(
				`[CiFailureHandler] Error processing workflow failure '${workflow.name}':`,
				error,
			)

			if (this.config.onError) {
				this.config.onError(
					error instanceof Error ? error : new Error(String(error)),
					event,
				)
			}
		}
	}

	/**
	 * Check if this workflow should be processed.
	 */
	private shouldProcessWorkflow(
		workflowRun: WorkflowRunEventPayload["workflow_run"],
		workflow: WorkflowRunEventPayload["workflow"],
	): boolean {
		const workflowName = workflow.name.toLowerCase()

		// Check skip list
		if (this.config.skipWorkflows?.some((w) => workflowName.includes(w.toLowerCase()))) {
			console.log(`[CiFailureHandler] Skipping workflow: ${workflow.name}`)
			return false
		}

		// Check include list (if specified, must match)
		if (this.config.createTasksFor && this.config.createTasksFor.length > 0) {
			const matches = this.config.createTasksFor.some((w) =>
				workflowName.includes(w.toLowerCase()),
			)
			if (!matches) {
				console.log(
					`[CiFailureHandler] Workflow '${workflow.name}' not in createTasksFor list`,
				)
				return false
			}
		}

		return true
	}

	/**
	 * Create a WebhookTask for CI failure remediation.
	 */
	createRemediationTask(
		event: WorkflowRunEvent,
		failureDetails?: FailureDetails | null,
	): WebhookTask {
		const { workflow_run, workflow, repository, sender } = event.payload

		// Determine priority based on workflow type and branch
		const priority = this.determinePriority(workflow_run)

		// Build description
		const description = this.buildDescription(event.payload, failureDetails)

		// Get commit author as assignee
		const assignees = workflow_run.head_commit?.author?.email
			? [workflow_run.head_commit.author.email]
			: []

		return {
			id: `ci-fix-${repository.full_name.replace("/", "-")}-${workflow_run.id}`,
			sourceEvent: event,
			type: "ci_remediation",
			title: `Fix CI failure: ${workflow.name} (${workflow_run.head_branch})`,
			description,
			priority,
			labels: ["ci-failure", "bug"],
			repository: {
				owner: repository.owner.login,
				name: repository.name,
				fullName: repository.full_name,
				url: repository.html_url,
			},
			entity: {
				type: "workflow_run",
				number: workflow_run.run_number,
				url: workflow_run.html_url,
				title: workflow.name,
			},
			assignees,
			createdAt: Date.now(),
			status: "pending",
		}
	}

	/**
	 * Determine task priority based on workflow and branch.
	 */
	private determinePriority(
		workflowRun: WorkflowRunEventPayload["workflow_run"],
	): "low" | "medium" | "high" | "critical" {
		const branch = workflowRun.head_branch.toLowerCase()
		const workflowName = workflowRun.name.toLowerCase()

		// Critical for main/master branch failures
		if (branch === "main" || branch === "master") {
			return "critical"
		}

		// High for release branches
		if (branch.startsWith("release/") || branch.startsWith("hotfix/")) {
			return "high"
		}

		// High for security-related workflows
		if (workflowName.includes("security") || workflowName.includes("sast")) {
			return "high"
		}

		// Medium for develop/staging branches
		if (branch === "develop" || branch === "staging" || branch.startsWith("feature/")) {
			return "medium"
		}

		// Low for other branches
		return "low"
	}

	/**
	 * Build task description from workflow run.
	 */
	private buildDescription(
		payload: WorkflowRunEventPayload,
		failureDetails?: FailureDetails | null,
	): string {
		const { workflow_run, workflow, sender } = payload
		const parts: string[] = []

		// Workflow info
		parts.push(`**Workflow:** ${workflow.name}`)
		parts.push(`**Run:** #${workflow_run.run_number}`)
		parts.push(`**URL:** ${workflow_run.html_url}`)
		parts.push(`**Status:** ${workflow_run.status}`)
		parts.push(`**Conclusion:** ${workflow_run.conclusion}`)

		// Branch and commit info
		parts.push("")
		parts.push(`**Branch:** ${workflow_run.head_branch}`)
		parts.push(`**Event:** ${workflow_run.event}`)

		if (workflow_run.head_commit) {
			parts.push("")
			parts.push("**Commit:**")
			parts.push(`- **Message:** ${workflow_run.head_commit.message}`)
			parts.push(`- **Author:** ${workflow_run.head_commit.author.name}`)
			parts.push(`- **SHA:** ${workflow_run.head_commit.id.substring(0, 7)}`)
		}

		// Triggering actor
		if (workflow_run.triggering_actor) {
			parts.push("")
			parts.push(`**Triggered by:** @${workflow_run.triggering_actor.login}`)
		}

		// Failure details
		if (failureDetails) {
			parts.push("")
			parts.push("**Failure Details:**")

			if (failureDetails.failedStep) {
				parts.push(`- **Failed Step:** ${failureDetails.failedStep}`)
			}

			if (failureDetails.errorMessage) {
				parts.push(`- **Error:** ${failureDetails.errorMessage}`)
			}

			if (failureDetails.stackTrace) {
				parts.push("")
				parts.push("**Stack Trace:**")
				parts.push("```")
				parts.push(failureDetails.stackTrace)
				parts.push("```")
			}

			if (this.config.includeLogs && failureDetails.logs) {
				parts.push("")
				parts.push("**Logs:**")
				parts.push("```")
				parts.push(failureDetails.logs.substring(0, 5000)) // Limit log size
				parts.push("```")
			}
		}

		// Links
		parts.push("")
		parts.push("**Quick Links:**")
		parts.push(`- [View Run](${workflow_run.html_url})`)
		parts.push(`- [View Logs](${workflow_run.logs_url})`)
		parts.push(`- [View Jobs](${workflow_run.jobs_url})`)

		return parts.join("\n")
	}
}

/**
 * Create a CI failure handler with default configuration.
 */
export function createCiFailureHandler(config?: CiFailureHandlerConfig): CiFailureHandler {
	return new CiFailureHandler(config)
}

/**
 * Utility function to create a remediation task from a workflow_run event directly.
 */
export function createCiFailureTask(
	event: WorkflowRunEvent,
	failureDetails?: FailureDetails,
): WebhookTask {
	const handler = new CiFailureHandler()
	return handler.createRemediationTask(event, failureDetails)
}

/**
 * Check if a workflow_run event represents a failure.
 */
export function isWorkflowFailure(event: WorkflowRunEvent): boolean {
	return event.payload.action === "completed" && event.payload.workflow_run.conclusion === "failure"
}

/**
 * Get the failed workflow name from an event.
 */
export function getFailedWorkflowName(event: WorkflowRunEvent): string {
	return event.payload.workflow.name
}

/**
 * Get the branch from a workflow_run event.
 */
export function getWorkflowBranch(event: WorkflowRunEvent): string {
	return event.payload.workflow_run.head_branch
}
