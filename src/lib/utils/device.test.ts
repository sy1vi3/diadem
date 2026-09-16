import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ width: { current: 1200 }, native: false }));
vi.mock("svelte/reactivity/window", () => ({ innerWidth: mocks.width }));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => mocks.native }));
vi.mock("@/lib/services/userSettings.svelte", () => ({ getUserSettings: () => ({}) }));
vi.mock("@/lib/paraglide/messages", () => ({
	clipboard_copied: () => "Copied",
	clipboard_error: () => "Error"
}));
vi.mock("@/lib/ui/toasts.svelte.js", () => ({ openToast: vi.fn() }));
import { backupShareUrl, canNativeShare } from "./device";
afterEach(() => {
	vi.unstubAllGlobals();
	mocks.native = false;
	mocks.width.current = 1200;
});
it("copies desktop links even when the browser supports native sharing", async () => {
	const share = vi.fn();
	const writeText = vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal("navigator", { share, canShare: () => true, clipboard: { writeText } });
	expect(canNativeShare({ url: "https://map.example/gym/1" })).toBe(false);
	backupShareUrl("https://map.example/gym/1");
	expect(writeText).toHaveBeenCalledWith("https://map.example/gym/1");
	expect(share).not.toHaveBeenCalled();
});
it("retains sharing in the mobile layout and native app", () => {
	vi.stubGlobal("navigator", { share: vi.fn(), canShare: () => true });
	mocks.width.current = 390;
	expect(canNativeShare({ url: "https://map.example" })).toBe(true);
	mocks.width.current = 1200;
	mocks.native = true;
	expect(canNativeShare({ url: "https://map.example" })).toBe(true);
});
