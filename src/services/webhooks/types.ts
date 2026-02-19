// kilocode_change - new file

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
	/** Port to listen on */
	port: number
	/** GitHub webhook secret for signature validation */
	secret: string
	/** Path for the webhook endpoint (default: /webhook) */
	path?: string
	/** Enable verbose logging */
	verbose?: boolean
}

/**
 * GitHub Event Types
 */
export type GitHubEventType =
	| "issues"
	| "pull_request"
	| "pull_request_review"
	| "workflow_run"
	| "push"
	| "release"
	| "create"
	| "delete"
	| "fork"
	| "star"
	| "watch"

/**
 * GitHub Event Action Types
 */
export type IssueAction = "opened" | "edited" | "deleted" | "transferred" | "pinned" | "unpinned" | "closed" | "reopened" | "assigned" | "unassigned" | "labeled" | "unlabeled" | "locked" | "unlocked" | "milestoned" | "demilestoned"

export type PullRequestAction = "opened" | "edited" | "closed" | "reopened" | "assigned" | "unassigned" | "review_requested" | "review_request_removed" | "ready_for_review" | "labeled" | "unlabeled" | "synchronize" | "converted_to_draft" | "locked" | "unlocked" | "milestoned" | "demilestoned" | "enqueued" | "dequeued"

export type WorkflowRunAction = "completed" | "requested" | "in_progress" | "queued"

/**
 * Base GitHub Event interface
 */
export interface GitHubEvent<T = unknown> {
	/** Event type from X-GitHub-Event header */
	eventType: GitHubEventType
	/** Event action */
	action?: string
	/** Delivery ID from X-GitHub-Delivery header */
	deliveryId: string
	/** Repository information */
	repository: {
		id: number
		name: string
		full_name: string
		owner: {
			login: string
		}
		html_url: string
	}
	/** Sender information */
	sender?: {
		login: string
		id: number
		type: string
	}
	/** Raw payload */
	payload: T
	/** Timestamp when event was received */
	timestamp: number
}

/**
 * GitHub Issue Event Payload
 */
export interface IssueEventPayload {
	action: IssueAction
	issue: {
		id: number
		number: number
		title: string
		body?: string
		html_url: string
		state: "open" | "closed"
		labels: Array<{
			id: number
			name: string
			color: string
		}>
		assignees: Array<{
			login: string
			id: number
		}>
		milestone?: {
			id: number
			title: string
			number: number
		}
		created_at: string
		updated_at: string
		closed_at?: string
		user: {
			login: string
			id: number
		}
	}
	repository: {
		id: number
		name: string
		full_name: string
		owner: {
			login: string
		}
		html_url: string
	}
	sender: {
		login: string
		id: number
	}
}

/**
 * GitHub Pull Request Event Payload
 */
export interface PullRequestEventPayload {
	action: PullRequestAction
	number: number
	pull_request: {
		id: number
		number: number
		title: string
		body?: string
		html_url: string
		state: "open" | "closed"
		draft: boolean
		merged: boolean
		mergeable?: boolean
		mergeable_state?: string
		merged_at?: string
		closed_at?: string
		created_at: string
		updated_at: string
		user: {
			login: string
			id: number
		}
		head: {
			ref: string
			sha: string
			repo: {
				name: string
				full_name: string
				owner: {
					login: string
				}
			}
		}
		base: {
			ref: string
			sha: string
			repo: {
				name: string
				full_name: string
				owner: {
					login: string
				}
			}
		}
		labels: Array<{
			id: number
			name: string
			color: string
		}>
		assignees: Array<{
			login: string
			id: number
		}>
		requested_reviewers: Array<{
			login: string
			id: number
		}>
		requested_teams: Array<{
			name: string
			id: number
		}>
		commits: number
		additions: number
		deletions: number
		changed_files: number
	}
	repository: {
		id: number
		name: string
		full_name: string
		owner: {
			login: string
		}
		html_url: string
	}
	sender: {
		login: string
		id: number
	}
}

/**
 * GitHub Workflow Run Event Payload
 */
export interface WorkflowRunEventPayload {
	action: WorkflowRunAction
	workflow_run: {
		id: number
		name: string
		run_number: number
		run_attempt: number
		status: "queued" | "in_progress" | "completed" | "waiting" | "requested" | "pending"
		conclusion?: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null
		html_url: string
		created_at: string
		updated_at: string
		run_started_at?: string
		jobs_url: string
		logs_url: string
		check_suite_url: string
		artifacts_url: string
		cancel_url: string
		rerun_url: string
		workflow_url: string
		head_commit: {
			id: string
			message: string
			timestamp: string
			author: {
				name: string
				email: string
			}
			committer: {
				name: string
				email: string
			}
		}
		head_branch: string
		head_sha: string
		repository: {
			id: number
			name: string
			full_name: string
			owner: {
				login: string
			}
		}
		event: string
		triggering_actor?: {
			login: string
			id: number
			type: string
		}
	}
	workflow: {
		id: number
		name: string
		path: string
		state: "active" | "deleted" | "disabled_fork" | "disabled_inactivity" | "disabled_manually"
	}
	repository: {
		id: number
		name: string
		full_name: string
		owner: {
			login: string
		}
		html_url: string
	}
	sender: {
		login: string
		id: number
	}
	organization?: {
		login: string
		id: number
	}
}

/**
 * Issue Event wrapper
 */
export interface IssueEvent extends GitHubEvent<IssueEventPayload> {
	eventType: "issues"
}

/**
 * Pull Request Event wrapper
 */
export interface PullRequestEvent extends GitHubEvent<PullRequestEventPayload> {
	eventType: "pull_request"
}

/**
 * Workflow Run Event wrapper
 */
export interface WorkflowRunEvent extends GitHubEvent<WorkflowRunEventPayload> {
	eventType: "workflow_run"
}

/**
 * Webhook Handler function type
 */
export type WebhookHandler<T extends GitHubEvent = GitHubEvent> = (event: T) => Promise<void> | void

/**
 * Handler registration options
 */
export interface HandlerOptions {
	/** Only handle specific actions */
	actions?: string[]
	/** Filter by repository */
	repositories?: string[]
	/** Filter by sender */
	senders?: string[]
	/** Priority for handler execution (higher = earlier) */
	priority?: number
}

/**
 * Registered handler entry
 */
export interface RegisteredHandler {
	/** Event type to handle */
	eventType: GitHubEventType | "*"
	/** Handler function */
	handler: WebhookHandler
	/** Handler options */
	options?: HandlerOptions
	/** Unique identifier for this handler */
	id: string
}

/**
 * Task created from webhook
 */
export interface WebhookTask {
	/** Unique task identifier */
	id: string
	/** Source event */
	sourceEvent: GitHubEvent
	/** Task type */
	type: "issue_implementation" | "pr_review" | "ci_remediation"
	/** Task title */
	title: string
	/** Task description */
	description: string
	/** Priority level */
	priority: "low" | "medium" | "high" | "critical"
	/** Labels from source */
	labels: string[]
	/** Repository information */
	repository: {
		owner: string
		name: string
		fullName: string
		url: string
	}
	/** Related entity (issue, PR, etc.) */
	entity: {
		type: "issue" | "pull_request" | "workflow_run"
		number: number
		url: string
		title: string
	}
	/** Assigned users */
	assignees: string[]
	/** Creation timestamp */
	createdAt: number
	/** Task status */
	status: "pending" | "in_progress" | "completed" | "failed"
}

/**
 * Webhook server status
 */
export interface WebhookServerStatus {
	/** Whether the server is running */
	running: boolean
	/** Port the server is listening on */
	port: number | null
	/** Number of registered handlers */
	handlerCount: number
	/** Number of events processed */
	eventsProcessed: number
	/** Number of events failed */
	eventsFailed: number
	/** Server start time */
	startTime: number | null
	/** Last event processed time */
	lastEventTime: number | null
}

/**
 * Label to priority mapping
 */
export interface LabelPriorityMapping {
	/** Label name pattern (supports wildcards) */
	labelPattern: string
	/** Priority level */
	priority: "low" | "medium" | "high" | "critical"
}

/**
 * Default label priority mappings
 */
export const DEFAULT_LABEL_PRIORITIES: LabelPriorityMapping[] = [
	{ labelPattern: "critical", priority: "critical" },
	{ labelPattern: "urgent", priority: "critical" },
	{ labelPattern: "blocker", priority: "critical" },
	{ labelPattern: "high", priority: "high" },
	{ labelPattern: "important", priority: "high" },
	{ labelPattern: "bug", priority: "high" },
	{ labelPattern: "medium", priority: "medium" },
	{ labelPattern: "enhancement", priority: "medium" },
	{ labelPattern: "feature", priority: "medium" },
	{ labelPattern: "low", priority: "low" },
	{ labelPattern: "documentation", priority: "low" },
	{ labelPattern: "good first issue", priority: "low" },
]
