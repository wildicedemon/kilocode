// kilocode_change - new file

import type { PullRequestEvent, PullRequestEventPayload, WebhookTask } from "../types"

/**
 * PR Review Handler - Processes GitHub pull request events and triggers code reviews.
 *
 * This handler:
 * - Parses pull request events
 * - Triggers code review mode
 * - Creates review tasks
 * - Posts review comments
 *
 * @example
 * ```typescript
 * import { PrReviewHandler, createPrReviewTask } from './handlers/pr-review'
 *
 * const handler = new PrReviewHandler({
 *   autoReview: true,
 *   reviewDrafts: false
 * })
 *
 * server.registerHandler('pull_request', handler.handle)
 * ```
 */

/**
 * PR Review handler configuration
 */
export interface PrReviewHandlerConfig {
	/** Automatically trigger review on PR open/ready_for_review */
	autoReview?: boolean
	/** Review draft PRs */
	reviewDrafts?: boolean
	/** Skip review for certain authors */
	skipAuthors?: string[]
	/** Skip review for certain labels */
	skipLabels?: string[]
	/** Require review for certain labels */
	requireLabels?: string[]
	/** Callback when a review task is created */
	onReviewTaskCreated?: (task: WebhookTask) => Promise<void> | void
	/** Callback when a review is triggered */
	onReviewTriggered?: (pr: PullRequestEventPayload["pull_request"]) => Promise<void> | void
	/** Callback when an error occurs */
	onError?: (error: Error, event: PullRequestEvent) => void
}

/**
 * Default configuration values
 */
const DEFAULT_PR_REVIEW_CONFIG: Omit<PrReviewHandlerConfig, "onReviewTaskCreated"> = {
	autoReview: true,
	reviewDrafts: false,
	skipAuthors: [],
	skipLabels: [],
	requireLabels: [],
}

/**
 * PR Review handler for processing GitHub pull request events.
 */
export class PrReviewHandler {
	private config: PrReviewHandlerConfig

	constructor(config: PrReviewHandlerConfig = {}) {
		this.config = { ...DEFAULT_PR_REVIEW_CONFIG, ...config }
	}

	/**
	 * Main handler method for pull request events.
	 */
	handle = async (event: PullRequestEvent): Promise<void> => {
		const { action, pull_request, repository, sender } = event.payload

		try {
			// Check if we should process this PR
			if (!this.shouldProcessPR(event)) {
				return
			}

			// Handle different actions
			switch (action) {
				case "opened":
				case "ready_for_review":
					await this.handleNewPR(event)
					break

				case "synchronize":
					await this.handlePRUpdate(event)
					break

				case "closed":
					if (pull_request.merged) {
						await this.handlePRMerged(event)
					}
					break

				case "review_requested":
					await this.handleReviewRequested(event)
					break

				default:
					// Ignore other actions
					break
			}
		} catch (error) {
			console.error(
				`[PrReviewHandler] Error processing PR #${pull_request.number}:`,
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
	 * Check if this PR should be processed.
	 */
	private shouldProcessPR(event: PullRequestEvent): boolean {
		const { pull_request, sender } = event.payload

		// Skip if author is in skip list
		if (this.config.skipAuthors?.includes(sender.login)) {
			console.log(`[PrReviewHandler] Skipping PR from author: ${sender.login}`)
			return false
		}

		// Skip draft PRs if configured
		if (pull_request.draft && !this.config.reviewDrafts) {
			console.log(`[PrReviewHandler] Skipping draft PR #${pull_request.number}`)
			return false
		}

		// Check skip labels
		const prLabels = pull_request.labels.map((l) => l.name.toLowerCase())
		if (this.config.skipLabels?.some((l) => prLabels.includes(l.toLowerCase()))) {
			console.log(`[PrReviewHandler] Skipping PR with skip label`)
			return false
		}

		// Check require labels (if configured, PR must have at least one)
		if (this.config.requireLabels && this.config.requireLabels.length > 0) {
			const hasRequiredLabel = this.config.requireLabels.some((l) =>
				prLabels.includes(l.toLowerCase()),
			)
			if (!hasRequiredLabel) {
				console.log(`[PrReviewHandler] Skipping PR without required label`)
				return false
			}
		}

		return true
	}

	/**
	 * Handle new PR (opened or ready for review).
	 */
	private async handleNewPR(event: PullRequestEvent): Promise<void> {
		const { pull_request, repository } = event.payload

		// Create review task
		const task = this.createReviewTask(event)

		// Notify via callback
		if (this.config.onReviewTaskCreated) {
			await this.config.onReviewTaskCreated(task)
		}

		// Trigger review if auto-review is enabled
		if (this.config.autoReview && this.config.onReviewTriggered) {
			await this.config.onReviewTriggered(pull_request)
		}

		console.log(
			`[PrReviewHandler] Created review task for PR #${pull_request.number} in ${repository.full_name}`,
		)
	}

	/**
	 * Handle PR update (new commits pushed).
	 */
	private async handlePRUpdate(event: PullRequestEvent): Promise<void> {
		const { pull_request, repository } = event.payload

		// Create updated review task
		const task = this.createReviewTask(event)
		task.description = `**Updated PR** - New commits pushed\n\n${task.description}`

		// Notify via callback
		if (this.config.onReviewTaskCreated) {
			await this.config.onReviewTaskCreated(task)
		}

		console.log(
			`[PrReviewHandler] PR #${pull_request.number} updated, created new review task`,
		)
	}

	/**
	 * Handle merged PR.
	 */
	private async handlePRMerged(event: PullRequestEvent): Promise<void> {
		const { pull_request, repository } = event.payload

		console.log(
			`[PrReviewHandler] PR #${pull_request.number} merged in ${repository.full_name}`,
		)

		// Could trigger cleanup, notifications, etc.
	}

	/**
	 * Handle review requested event.
	 */
	private async handleReviewRequested(event: PullRequestEvent): Promise<void> {
		const { pull_request, repository } = event.payload

		// Create review task
		const task = this.createReviewTask(event)

		// Notify via callback
		if (this.config.onReviewTaskCreated) {
			await this.config.onReviewTaskCreated(task)
		}

		console.log(
			`[PrReviewHandler] Review requested for PR #${pull_request.number} in ${repository.full_name}`,
		)
	}

	/**
	 * Create a WebhookTask for PR review.
	 */
	createReviewTask(event: PullRequestEvent): WebhookTask {
		const { pull_request, repository, sender } = event.payload

		// Determine priority from labels
		const priority = this.determinePriority(pull_request.labels.map((l) => l.name))

		// Build description
		const description = this.buildDescription(event.payload)

		// Get reviewers
		const reviewers = pull_request.requested_reviewers.map((r) => r.login)

		return {
			id: `pr-review-${repository.full_name.replace("/", "-")}-${pull_request.number}`,
			sourceEvent: event,
			type: "pr_review",
			title: `Review PR #${pull_request.number}: ${pull_request.title}`,
			description,
			priority,
			labels: pull_request.labels.map((l) => l.name),
			repository: {
				owner: repository.owner.login,
				name: repository.name,
				fullName: repository.full_name,
				url: repository.html_url,
			},
			entity: {
				type: "pull_request",
				number: pull_request.number,
				url: pull_request.html_url,
				title: pull_request.title,
			},
			assignees: reviewers,
			createdAt: Date.now(),
			status: "pending",
		}
	}

	/**
	 * Determine task priority from PR labels.
	 */
	private determinePriority(labels: string[]): "low" | "medium" | "high" | "critical" {
		for (const label of labels) {
			const labelLower = label.toLowerCase()

			// Critical
			if (["critical", "urgent", "hotfix", "security"].some((p) => labelLower.includes(p))) {
				return "critical"
			}

			// High
			if (["high", "important", "bug"].some((p) => labelLower.includes(p))) {
				return "high"
			}

			// Medium
			if (["medium", "enhancement", "feature"].some((p) => labelLower.includes(p))) {
				return "medium"
			}
		}

		// Default to medium for PRs
		return "medium"
	}

	/**
	 * Build task description from PR.
	 */
	private buildDescription(payload: PullRequestEventPayload): string {
		const { pull_request, sender } = payload
		const parts: string[] = []

		// Add PR reference
		parts.push(`**Pull Request:** #${pull_request.number}`)
		parts.push(`**Title:** ${pull_request.title}`)
		parts.push(`**URL:** ${pull_request.html_url}`)
		parts.push(`**Author:** @${sender.login}`)

		// Branch info
		parts.push("")
		parts.push(`**Base:** ${pull_request.base.ref}`)
		parts.push(`**Head:** ${pull_request.head.ref}`)

		// Stats
		parts.push("")
		parts.push(
			`**Changes:** ${pull_request.changed_files} files, +${pull_request.additions}/-${pull_request.deletions}`,
		)

		// Body
		if (pull_request.body) {
			parts.push("")
			parts.push("**Description:**")
			parts.push(pull_request.body)
		}

		// Labels
		if (pull_request.labels.length > 0) {
			parts.push("")
			parts.push(`**Labels:** ${pull_request.labels.map((l) => l.name).join(", ")}`)
		}

		// Reviewers
		if (pull_request.requested_reviewers.length > 0) {
			parts.push("")
			parts.push(
				`**Requested Reviewers:** ${pull_request.requested_reviewers.map((r) => `@${r.login}`).join(", ")}`,
			)
		}

		return parts.join("\n")
	}
}

/**
 * Create a PR review handler with default configuration.
 */
export function createPrReviewHandler(config?: PrReviewHandlerConfig): PrReviewHandler {
	return new PrReviewHandler(config)
}

/**
 * Utility function to create a review task from a PR event directly.
 */
export function createPrReviewTask(event: PullRequestEvent): WebhookTask {
	const handler = new PrReviewHandler()
	return handler.createReviewTask(event)
}

/**
 * Check if a PR event should trigger a review.
 */
export function shouldTriggerReview(
	event: PullRequestEvent,
	config?: PrReviewHandlerConfig,
): boolean {
	const handler = new PrReviewHandler(config)
	return handler["shouldProcessPR"](event)
}
