// kilocode_change - new file
const { mockGetConfiguration } = vi.hoisted(() => ({
	mockGetConfiguration: vi.fn(),
}))

vi.mock("vscode", () => ({
	ConfigurationTarget: { Workspace: "Workspace" },
	window: {
		showQuickPick: vi.fn(),
		showInputBox: vi.fn(),
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
	workspace: {
		getConfiguration: mockGetConfiguration,
	},
}))

vi.mock("os", () => ({
	userInfo: vi.fn(() => ({ username: "tester" })),
}))

vi.mock("../ntfy-helper", () => ({
	sendNtfyNotification: vi.fn().mockResolvedValue(undefined),
}))

import * as vscode from "vscode"
import { sendNtfyNotification } from "../ntfy-helper"
import { setupNtfy } from "../bootstrap"

describe("setupNtfy", () => {
	const showQuickPick = vi.mocked(vscode.window.showQuickPick)
	const showInputBox = vi.mocked(vscode.window.showInputBox)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns early when already configured", async () => {
		const mockGet = vi.fn((key: string, defaultValue?: boolean | string) => {
			switch (key) {
				case "notifications.ntfy.enabled":
					return true
				case "notifications.ntfy.topic":
					return "kilo-topic"
				default:
					return defaultValue
			}
		})

		mockGetConfiguration.mockReturnValue({ get: mockGet, update: vi.fn() })

		await setupNtfy()

		expect(showQuickPick).not.toHaveBeenCalled()
	})

	it("returns when user declines setup", async () => {
		const mockGet = vi.fn((key: string, defaultValue?: boolean | string) => {
			if (key === "notifications.ntfy.enabled") {
				return false
			}
			return defaultValue
		})

		mockGetConfiguration.mockReturnValue({ get: mockGet, update: vi.fn() })
		showQuickPick.mockResolvedValue({ label: "Not now" } as any)

		await setupNtfy()

		expect(showInputBox).not.toHaveBeenCalled()
	})

	it("updates configuration and sends test notification", async () => {
		const update = vi.fn()
		const mockGet = vi.fn((key: string, defaultValue?: boolean | string) => {
			if (key === "notifications.ntfy.enabled") {
				return false
			}
			if (key === "notifications.ntfy.server") {
				return "https://ntfy.sh"
			}
			return defaultValue
		})

		mockGetConfiguration.mockReturnValue({ get: mockGet, update })
		showQuickPick.mockResolvedValue({ label: "Enable ntfy notifications" } as any)
		showInputBox
			.mockResolvedValueOnce("kilo-topic")
			.mockResolvedValueOnce("https://ntfy.example.com")
			.mockResolvedValueOnce("token-value")

		const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456)
		await setupNtfy()
		randomSpy.mockRestore()

		expect(showInputBox).toHaveBeenCalledTimes(3)
		const expectedSuffix = (0.123456).toString(36).slice(2, 8)
		expect(showInputBox.mock.calls[0]?.[0]?.value).toBe(`kilo-tester-${expectedSuffix}`)
		expect(update).toHaveBeenCalledWith("notifications.ntfy.enabled", true, "Workspace")
		expect(update).toHaveBeenCalledWith("notifications.ntfy.topic", "kilo-topic", "Workspace")
		expect(update).toHaveBeenCalledWith("notifications.ntfy.server", "https://ntfy.example.com", "Workspace")
		expect(update).toHaveBeenCalledWith("notifications.ntfy.token", "token-value", "Workspace")
		expect(sendNtfyNotification).toHaveBeenCalledWith("Kilo Code", "ntfy notifications are enabled.")
	})
})
