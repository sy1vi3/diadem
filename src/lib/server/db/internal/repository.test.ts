import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
	origin: undefined as string | undefined,
	raw: undefined as unknown,
	where: vi.fn()
}));
vi.mock("@/lib/services/config/config.server", () => ({ getSiteOrigin: () => mocks.origin }));
vi.mock("@/lib/server/db/internal/index", () => ({
	db: {
		select: () => ({ from: () => ({ where: async () => [{ user: { userSettings: mocks.raw } }] }) })
	}
}));
import { getUserSettings } from "./repository";
beforeEach(() => {
	mocks.origin = undefined;
	mocks.raw = {
		mapPosition: { zoom: 12 },
		sites: {
			"https://north.example": { mapPosition: { zoom: 15 } },
			"https://south.example": { mapPosition: { zoom: 8 } }
		}
	};
});
it("returns only the requested site's settings", async () => {
	mocks.origin = "https://north.example";
	expect(await getUserSettings("user")).toEqual({ mapPosition: { zoom: 15 } });
	mocks.origin = "https://south.example";
	expect(await getUserSettings("user")).toEqual({ mapPosition: { zoom: 8 } });
});
it("does not inherit another region's position for a new site", async () => {
	mocks.origin = "https://new.example";
	expect(await getUserSettings("user")).toBeUndefined();
});
it("preserves legacy base preferences without exposing other sites", async () => {
	expect(await getUserSettings("user")).toEqual({ mapPosition: { zoom: 12 } });
});
it("supports legacy double-encoded JSON", async () => {
	mocks.raw = JSON.stringify(mocks.raw);
	mocks.origin = "https://north.example";
	expect(await getUserSettings("user")).toEqual({ mapPosition: { zoom: 15 } });
});
it("handles a new user's empty settings", async () => {
	mocks.raw = null;
	mocks.origin = "https://north.example";
	expect(await getUserSettings("user")).toBeUndefined();
});
