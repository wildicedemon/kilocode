// kilocode_change - new file

import type {
	IssueEvent,
	IssueEventPayload,
	WebhookTask,
	LabelPriorityMapping,
	DEFAULT_LABEL_PRIORITIES,
} from "../types"

/**
 * Issue Handler - Processes GitHub issue events and creates implementation tasks.
 *
 * This handler:
 * - Parses GitHub issue events
 * - Creates tasks from issues
 * - Maps labels to task priorities
 * - Triggers appropriate SDLC phase
 *
 * @example
 * ```typescript
 * import { IssueHandler, createIssueTask } from './handlers/issue'
 *
 * const handler = new IssueHandler({
 *   labelPriorities: customPriorities,
 *   autoAssign: true
 * })
 *
 * server.registerHandler('issues', handler.handle)
 * ```
 */

/**
 * Issue handler configuration
 */
export interface IssueHandlerConfig {
	/** Custom label to priority mappings */
	labelPriorities?: LabelPriorityMapping[]
	/** Auto-assign task to issue assignees */
	autoAssign?: boolean
	/** Include issue body in task description */
	includeBody?: boolean
	/** Filter labels to exclude from task */
	excludeLabels?: string[]
	/** Callback when a task is created */
	onTaskCreated?: (task: WebhookTask) => Promise<void> | void
	/** Callback when an error occurs */
	onError?: (error: Error, event: IssueEvent) => void
}

/**
 * Default configuration values
 */
const DEFAULT_ISSUE_CONFIG: Omit<IssueHandlerConfig, "labelPriorities"> = {
	autoAssign: true,
	includeBody: true,
	excludeLabels: [],
}

/**
 * Issue handler for processing GitHub issue events.
 */
export class IssueHandler {
	private config: IssueHandlerConfig
	private labelPriorities: LabelPriorityMapping[]

	constructor(config: IssueHandlerConfig = {}) {
		this.config = { ...DEFAULT_ISSUE_CONFIG, ...config }
		this.labelPriorities = config.labelPriorities || []
	}

	/**
	 * Main handler method for issue events.
	 */
	handle = async (event: IssueEvent): Promise<void> => {
		const { action, issue, repository, sender } = event.payload

		// Only handle opened and reopened issues
		if (action !== "opened" && action !== "reopened") {
			return
		}

		try {
			// Create a task from the issue
			const task = this.createTaskFromIssue(event)

			// Notify via callback
			if (this.config.onTaskCreated) {
				await this.config.onTaskCreated(task)
			}

			console.log(
				`[IssueHandler] Created task '${task.title}' from issue #${issue.number} in ${repository.full_name}`,
			)
		} catch (error) {
			console.error(`[IssueHandler] Error processing issue #${issue.number}:`, error)

			if (this.config.onError) {
				this.config.onError(error instanceof Error ? error : new Error(String(error)), event)
			}
		}
	}

	/**
	 * Create a WebhookTask from an issue event.
	 */
	createTaskFromIssue(event: IssueEvent): WebhookTask {
		const { issue, repository, sender } = event.payload

		// Extract labels
		const labels = this.extractLabels(issue.labels)

		// Determine priority from labels
		const priority = this.determinePriority(labels)

		// Build description
		const description = this.buildDescription(issue)

		// Get assignees
		const assignees = this.config.autoAssign
			? issue.assignees.map((a) => a.login)
			: []

		return {
			id: `issue-${repository.full_name.replace("/", "-")}-${issue.number}`,
			sourceEvent: event,
			type: "issue_implementation",
			title: issue.title,
			description,
			priority,
			labels,
			repository: {
				owner: repository.owner.login,
				name: repository.name,
				fullName: repository.full_name,
				url: repository.html_url,
			},
			entity: {
				type: "issue",
				number: issue.number,
				url: issue.html_url,
				title: issue.title,
			},
			assignees,
			createdAt: Date.now(),
			status: "pending",
		}
	}

	/**
	 * Extract label names from issue labels.
	 */
	private extractLabels(
		issueLabels: IssueEventPayload["issue"]["labels"],
	): string[] {
		const labels = issueLabels.map((l) => l.name)

		// Filter out excluded labels
		if (this.config.excludeLabels && this.config.excludeLabels.length > 0) {
			return labels.filter(
				(label) =>
					!this.config.excludeLabels!.some((excluded) =>
						label.toLowerCase().includes(excluded.toLowerCase()),
					),
			)
		}

		return labels
	}

	/**
	 * Determine task priority from labels.
	 */
	private determinePriority(labels: string[]): "low" | "medium" | "high" | "critical" {
		// Check custom label priorities first
		for (const label of labels) {
			for (const mapping of this.labelPriorities) {
				if (this.matchesPattern(label, mapping.labelPattern)) {
					return mapping.priority
				}
			}
		}

		// Check default priorities
		for (const label of labels) {
			const labelLower = label.toLowerCase()

			// Critical
			if (["critical", "urgent", "blocker", "hotfix"].some((p) => labelLower.includes(p))) {
				return "critical"
			}

			// High
			if (["high", "important", "bug", "security"].some((p) => labelLower.includes(p))) {
				return "high"
			}

			// Medium
			if (
				["medium", "enhancement", "feature", "improvement"].some((p) => labelLower.includes(p))
			) {
				return "medium"
			}

			// Low
			if (
				["low", "documentation", "good first issue", "help wanted"].some((p) =>
					labelLower.includes(p),
				)
			) {
				return "low"
			}
		}

		// Default to medium
		return "medium"
	}

	/**
	 * Check if a label matches a pattern (supports wildcards).
	 */
	private matchesPattern(label: string, pattern: string): boolean {
		const regex = new RegExp(
			"^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
			"i",
		)
		return regex.test(label)
	}

	/**
	 * Build task description from issue.
	 */
	private buildDescription(issue: IssueEventPayload["issue"]): string {
		const parts: string[] = []

		// Add issue reference
		parts.push(`**Issue:** #${issue.number} - ${issue.title}`)
		parts.push(`**URL:** ${issue.html_url}`)
		parts.push(`**Author:** @${issue.user.login}`)

		if (this.config.includeBody && issue.body) {
			parts.push("")
			parts.push("**Description:**")
			parts.push(issue.body)
		}

		if (issue.labels.length > 0) {
			parts.push("")
			parts.push(`**Labels:** ${issue.labels.map((l) => l.name).join(", ")}`)
		}

		if (issue.milestone) {
			parts.push(`**Milestone:** ${issue.milestone.title}`)
		}

		return parts.join("\n")
	}
}

/**
 * Create an issue handler with default configuration.
 */
export function createIssueHandler(config?: IssueHandlerConfig): IssueHandler {
	return new IssueHandler(config)
}

/**
 * Utility function to create a task from an issue event directly.
 */
export function createIssueTask(
	event: IssueEvent,
	options?: {
		labelPriorities?: LabelPriorityMapping[]
		includeBody?: boolean
	},
): WebhookTask {
	const handler = new IssueHandler(options)
	return handler.createTaskFromIssue(event)
}

/**
 * Map issue labels to priority.
 */
export function mapLabelsToPriority(
	labels: string[],
	mappings?: LabelPriorityMapping[],
): "low" | "medium" | "high" | "critical" {
	const handler = new IssueHandler({ labelPriorities: mappings })
	return handler["determinePriority"](labels)
}
