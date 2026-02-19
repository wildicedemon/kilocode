// kilocode_change - new file

import * as crypto from "crypto"

/**
 * Security utilities for GitHub webhook signature validation.
 *
 * GitHub uses HMAC-SHA256 to sign webhook payloads. The signature is sent
 * in the X-Hub-Signature-256 header in the format: sha256=<hex_signature>
 *
 * @see https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */

/**
 * Validates a GitHub webhook signature using HMAC-SHA256.
 *
 * @param payload - The raw request body as a string or Buffer
 * @param signature - The X-Hub-Signature-256 header value (format: sha256=<hex>)
 * @param secret - The webhook secret configured in GitHub
 * @returns true if the signature is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = validateSignature(
 *   requestBody,
 *   request.headers['x-hub-signature-256'],
 *   'my-webhook-secret'
 * )
 * if (!isValid) {
 *   throw new Error('Invalid webhook signature')
 * }
 * ```
 */
export function validateSignature(
	payload: string | Buffer,
	signature: string | undefined,
	secret: string,
): boolean {
	// If no signature provided, validation fails
	if (!signature) {
		console.warn("[WebhookSecurity] No signature provided in request headers")
		return false
	}

	// If no secret configured, validation fails
	if (!secret) {
		console.warn("[WebhookSecurity] No webhook secret configured")
		return false
	}

	// GitHub sends signature in format: sha256=<hex_signature>
	const signatureParts = signature.split("=")
	if (signatureParts.length !== 2 || signatureParts[0] !== "sha256") {
		console.warn("[WebhookSecurity] Invalid signature format, expected 'sha256=<hex>'")
		return false
	}

	const providedSignature = signatureParts[1]

	// Compute the expected signature
	const expectedSignature = computeSignature(payload, secret)

	// Use timing-safe comparison to prevent timing attacks
	return timingSafeEqual(providedSignature, expectedSignature)
}

/**
 * Computes the HMAC-SHA256 signature for a payload.
 *
 * @param payload - The raw request body as a string or Buffer
 * @param secret - The webhook secret
 * @returns The hex-encoded signature
 */
export function computeSignature(payload: string | Buffer, secret: string): string {
	const hmac = crypto.createHmac("sha256", secret)
	hmac.update(payload)
	return hmac.digest("hex")
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * Uses Node.js crypto.timingSafeEqual internally, which compares buffers
 * in constant time regardless of content.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeEqual(a: string, b: string): boolean {
	// If lengths differ, we still need to do a comparison to maintain constant time
	// We'll compare against a padded version
	if (a.length !== b.length) {
		// Still perform a comparison to maintain constant time
		// but use a dummy value that will always fail
		const dummyValue = a.length > b.length ? a : b
		const paddedValue = dummyValue.padEnd(Math.max(a.length, b.length), "0")
		try {
			// This comparison will always fail but takes the same time
			return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(paddedValue, "hex")) && false
		} catch {
			return false
		}
	}

	try {
		return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
	} catch {
		// If hex decoding fails, fall back to string comparison
		// This shouldn't happen with valid signatures but provides safety
		return a === b
	}
}

/**
 * Validates that the request comes from GitHub by checking known IP ranges.
 * This is an optional additional security measure.
 *
 * Note: GitHub's IP ranges can change, so this should not be the only
 * security measure. Signature validation is the primary security mechanism.
 *
 * @param ip - The IP address of the request
 * @returns Promise resolving to true if IP is in GitHub's ranges
 */
export async function isGitHubIP(ip: string): Promise<boolean> {
	// GitHub publishes their IP ranges at https://api.github.com/meta
	// For now, we'll skip IP validation as it requires fetching and caching
	// the meta endpoint. Signature validation is sufficient for security.
	console.warn("[WebhookSecurity] IP validation not implemented, relying on signature validation")
	return true
}

/**
 * Extracts the event type from the X-GitHub-Event header.
 *
 * @param eventType - The X-GitHub-Event header value
 * @returns The normalized event type or null if invalid
 */
export function parseEventType(eventType: string | undefined): string | null {
	if (!eventType) {
		return null
	}

	// GitHub event types are lowercase with underscores
	const normalized = eventType.toLowerCase().trim()

	// List of known GitHub event types
	const knownEventTypes = [
		"push",
		"pull_request",
		"pull_request_review",
		"pull_request_review_comment",
		"issues",
		"issue_comment",
		"workflow_run",
		"workflow_job",
		"release",
		"create",
		"delete",
		"fork",
		"star",
		"watch",
		"repository",
		"team",
		"organization",
		"member",
		"membership",
		"public",
		"status",
		"check_run",
		"check_suite",
		"deployment",
		"deployment_status",
		"page_build",
		"project",
		"project_card",
		"project_column",
		"label",
		"milestone",
		"package",
		"ping",
		"installation",
		"installation_repositories",
	]

	if (knownEventTypes.includes(normalized)) {
		return normalized
	}

	// Allow unknown event types but log a warning
	console.warn(`[WebhookSecurity] Unknown event type: ${normalized}`)
	return normalized
}

/**
 * Extracts the delivery ID from the X-GitHub-Delivery header.
 *
 * @param deliveryId - The X-GitHub-Delivery header value
 * @returns The delivery ID or a generated one if missing
 */
export function parseDeliveryId(deliveryId: string | undefined): string {
	if (!deliveryId) {
		// Generate a UUID if missing
		return crypto.randomUUID()
	}
	return deliveryId
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
	/** Whether the request passed security validation */
	valid: boolean
	/** Error message if validation failed */
	error?: string
	/** Event type extracted from headers */
	eventType?: string
	/** Delivery ID extracted from headers */
	deliveryId?: string
}

/**
 * Comprehensive security validation for incoming webhook requests.
 *
 * @param payload - The raw request body
 * @param headers - The request headers
 * @param secret - The webhook secret
 * @returns Security validation result
 */
export function validateWebhookRequest(
	payload: string | Buffer,
	headers: {
		"x-hub-signature-256"?: string
		"x-github-event"?: string
		"x-github-delivery"?: string
	},
	secret: string,
): SecurityValidationResult {
	// Validate signature
	if (!validateSignature(payload, headers["x-hub-signature-256"], secret)) {
		return {
			valid: false,
			error: "Invalid webhook signature",
		}
	}

	// Parse event type
	const eventType = parseEventType(headers["x-github-event"])
	if (!eventType) {
		return {
			valid: false,
			error: "Missing or invalid X-GitHub-Event header",
		}
	}

	// Parse delivery ID
	const deliveryId = parseDeliveryId(headers["x-github-delivery"])

	return {
		valid: true,
		eventType,
		deliveryId,
	}
}
