// kilocode_change - new file

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	applyRequirementsApprovalUpdate,
	sendNtfyNotification,
	sendRequirementsApprovalNotification,
	type NtfyConfig,
} from "../ntfy"
import { updateRequirementsApprovalStatus } from "../../../services/framework/requirements/requirements-doc-writer"

vi.mock("../../../services/framework/requirements/requirements-doc-writer", () => ({
	updateRequirementsApprovalStatus: vi.fn(),
}))

const mockedUpdateApproval = vi.mocked(updateRequirementsApprovalStatus)

describe("ntfy", () => {
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockedUpdateApproval.mockReset()
		fetchMock = vi.fn()
		globalThis.fetch = fetchMock as unknown as typeof fetch
	})

	it("sends a notification with headers and parses response", async () => {
		const config: NtfyConfig = {
			baseUrl: "https://ntfy.sh/",
			topic: "kilo-test",
			accessToken: "token-123",
		}
		const response = {
			ok: true,
			status: 200,
			headers: new Headers({ "content-type": "application/json" }),
			text: vi.fn().mockResolvedValue(JSON.stringify({ id: "msg-1" })),
		}
		fetchMock.mockResolvedValue(response)

		const result = await sendNtfyNotification(config, {
			message: "Summary text",
			title: "Requirements",
			tags: ["requirements"],
			priority: 3,
		})

		expect(result).toEqual({ ok: true, status: 200, id: "msg-1", error: undefined })
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe("https://ntfy.sh/kilo-test")
		const headers = init.headers as Headers
		expect(headers.get("Authorization")).toBe("Bearer token-123")
		expect(headers.get("Title")).toBe("Requirements")
		expect(headers.get("Tags")).toBe("requirements")
		expect(headers.get("Priority")).toBe("3")
	})

	it("builds approval actions for requirements", async () => {
		const config: NtfyConfig = {
			baseUrl: "https://ntfy.sh",
			topic: "approvals",
		}
		const response = {
			ok: true,
			status: 200,
			headers: new Headers({ "content-type": "application/json" }),
			text: vi.fn().mockResolvedValue(JSON.stringify({ id: "msg-2" })),
		}
		fetchMock.mockResolvedValue(response)

		await sendRequirementsApprovalNotification(config, {
			summary: "Review requirements",
			approveUrl: "https://example.com/approve",
			changesUrl: "https://example.com/changes",
			issueId: "ISSUE-9",
		})

		const [, init] = fetchMock.mock.calls[0]
		const headers = init.headers as Headers
		expect(headers.get("Title")).toBe("Requirements approval needed (ISSUE-9)")
		const actions = headers.get("Actions")
		expect(actions).toContain("http,Approve,https://example.com/approve,method=POST,clear=true")
		expect(actions).toContain("http,Request changes,https://example.com/changes,method=POST")
	})

	it("applies approval updates via requirements writer", async () => {
		mockedUpdateApproval.mockResolvedValue({
			path: "/workspace/.framework/requirements/ISSUE-1-requirements.md",
			content: "---\napprovalStatus: approved\n---\n",
			metadata: { approvalStatus: "approved" },
		})

		const result = await applyRequirementsApprovalUpdate({
			documentPath: "/workspace/.framework/requirements/ISSUE-1-requirements.md",
			approvalStatus: "approved",
		})

		expect(mockedUpdateApproval).toHaveBeenCalledWith({
			documentPath: "/workspace/.framework/requirements/ISSUE-1-requirements.md",
			approvalStatus: "approved",
			approvedAt: undefined,
		})
		expect(result.metadata.approvalStatus).toBe("approved")
	})
})
