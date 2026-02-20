// kilocode_change - new file
const { mockGetConfiguration, mockGetInstance } = vi.hoisted(() => ({
	mockGetConfiguration: vi.fn(),
	mockGetInstance: vi.fn(),
}))

vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: mockGetConfiguration,
	},
}))

vi.mock("../../../core/webview/ClineProvider", () => ({
	ClineProvider: {
		getInstance: mockGetInstance,
	},
}))

import { sendNtfyNotification } from "../ntfy-helper"

describe("sendNtfyNotification", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns early when ntfy is disabled", async () => {
		const mockGet = vi.fn().mockReturnValue(false)
		mockGetConfiguration.mockReturnValue({ get: mockGet })

		await sendNtfyNotification("Title", "Message")

		expect(mockGetInstance).not.toHaveBeenCalled()
	})

	it("returns early when topic is missing", async () => {
		const mockGet = vi.fn((key: string, defaultValue?: boolean | string) => {
			if (key === "notifications.ntfy.enabled") {
				return true
			}
			return defaultValue
		})
		mockGetConfiguration.mockReturnValue({ get: mockGet })

		await sendNtfyNotification("Title", "Message")

		expect(mockGetInstance).not.toHaveBeenCalled()
	})

	it("calls MCP tool when configured", async () => {
		const mockGet = vi.fn((key: string, defaultValue?: boolean | string) => {
			switch (key) {
				case "notifications.ntfy.enabled":
					return true
				case "notifications.ntfy.topic":
					return "kilo-topic"
				case "notifications.ntfy.server":
					return "https://ntfy.sh"
				case "notifications.ntfy.token":
					return "secret-token"
				default:
					return defaultValue
			}
		})
		const mockCallTool = vi.fn().mockResolvedValue({ content: [] })

		mockGetConfiguration.mockReturnValue({ get: mockGet })
		mockGetInstance.mockResolvedValue({
			getMcpHub: () => ({
				callTool: mockCallTool,
			}),
		})

		await sendNtfyNotification("Hello", "World", {
			priority: 3,
			tags: ["kilo"],
			attachments: ["https://example.com/image.png"],
		})

		expect(mockCallTool).toHaveBeenCalledWith("ntfy-me-mcp", "ntfy_me", {
			title: "Hello",
			message: "World",
			topic: "kilo-topic",
			server: "https://ntfy.sh",
			token: "secret-token",
			priority: 3,
			tags: ["kilo"],
			attachments: ["https://example.com/image.png"],
		})
	})
})
