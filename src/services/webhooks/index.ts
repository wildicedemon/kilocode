// kilocode_change - new file

/**
 * Webhooks and GitHub Integration Module
 *
 * This module provides comprehensive webhook handling for GitHub events:
 *
 * - **WebhookServer**: HTTP server for receiving GitHub webhooks
 * - **Security**: HMAC-SHA256 signature validation
 * - **Handlers**: Pre-built handlers for common GitHub events
 *   - Issue handler: Create tasks from GitHub issues
 *   - PR Review handler: Trigger code reviews on pull requests
 *   - CI Failure handler: Create remediation tasks for failed workflows
 *
 * @example
 * ```typescript
 * import {
 *   WebhookServer,
 *   IssueHandler,
 *   PrReviewHandler,
 *   CiFailureHandler
 * } from './services/webhooks'
 *
 * // Create webhook server
 * const server = new WebhookServer({
 *   port: 3000,
 *   secret: 'my-webhook-secret',
 *   verbose: true
 * })
 *
 * // Register handlers
 * const issueHandler = new IssueHandler({
 *   onTaskCreated: async (task) => {
 *     console.log('New task:', task.title)
 *   }
 * })
 * server.registerHandler('issues', issueHandler.handle)
 *
 * // Start server
 * await server.start()
 * ```
 */

// Types
export type {
	WebhookConfig,
	GitHubEventType,
	GitHubEvent,
	IssueEvent,
	IssueEventPayload,
	PullRequestEvent,
	PullRequestEventPayload,
	WorkflowRunEvent,
	WorkflowRunEventPayload,
	WebhookHandler,
	HandlerOptions,
	RegisteredHandler,
	WebhookTask,
	WebhookServerStatus,
	LabelPriorityMapping,
	IssueAction,
	PullRequestAction,
	WorkflowRunAction,
} from "./types"

export { DEFAULT_LABEL_PRIORITIES } from "./types"

// Security
export {
	validateSignature,
	computeSignature,
	timingSafeEqual,
	parseEventType,
	parseDeliveryId,
	validateWebhookRequest,
	type SecurityValidationResult,
} from "./security"

// Server
export { WebhookServer, createWebhookServer } from "./server"

// Handlers
export {
	// Issue handler
	IssueHandler,
	createIssueHandler,
	createIssueTask,
	mapLabelsToPriority,
	type IssueHandlerConfig,

	// PR Review handler
	PrReviewHandler,
	createPrReviewHandler,
	createPrReviewTask,
	shouldTriggerReview,
	type PrReviewHandlerConfig,

	// CI Failure handler
	CiFailureHandler,
	createCiFailureHandler,
	createCiFailureTask,
	isWorkflowFailure,
	getFailedWorkflowName,
	getWorkflowBranch,
	type CiFailureHandlerConfig,
	type FailureDetails,
} from "./handlers"
