// kilocode_change - new file

/**
 * Webhook Handlers - Re-exports for convenient importing
 */

// Issue handler
export {
	IssueHandler,
	createIssueHandler,
	createIssueTask,
	mapLabelsToPriority,
	type IssueHandlerConfig,
} from "./issue"

// PR Review handler
export {
	PrReviewHandler,
	createPrReviewHandler,
	createPrReviewTask,
	shouldTriggerReview,
	type PrReviewHandlerConfig,
} from "./pr-review"

// CI Failure handler
export {
	CiFailureHandler,
	createCiFailureHandler,
	createCiFailureTask,
	isWorkflowFailure,
	getFailedWorkflowName,
	getWorkflowBranch,
	type CiFailureHandlerConfig,
	type FailureDetails,
} from "./ci-failure"
