import { expect, it, vi } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
const mocks = vi.hoisted(() => {
	const instances: { options: any; api: { signInSocial: ReturnType<typeof vi.fn> } }[] = [];
	return {
		instances,
		create: vi.fn((options) => {
			const instance = {
				options,
				api: {
					signInSocial: vi.fn(async () => ({
						headers: new Headers(),
						response: { url: "https://discord.com/oauth2/authorize", redirect: false }
					}))
				}
			};
			instances.push(instance);
			return instance;
		})
	};
});
vi.mock("better-auth", () => ({ betterAuth: mocks.create }));
vi.mock("better-auth/plugins", () => ({ bearer: () => ({}) }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => ({}) }));
vi.mock("@/lib/server/db/internal", () => ({ db: {} }));
vi.mock("@/lib/server/auth/auth", () => ({ generateUserId: () => "id" }));
vi.mock("@/lib/server/logging", () => ({ getServerLogger: () => ({ warning: vi.fn() }) }));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		auth: {
			enabled: true,
			secret: "test-secret",
			baseUrl: "https://base.example",
			discord: { clientId: "client", clientSecret: "secret" }
		}
	}),
	getSiteOrigins: () => ["https://north.example", "https://south.example"]
}));
import { getAuth, signInWithDiscord } from "./betterAuth";
function event(origin: string) {
	return {
		url: new URL(origin),
		request: new Request(origin),
		cookies: { set: vi.fn() }
	} as unknown as RequestEvent;
}

it("binds each site's auth to its exact callback origin with shared credentials", () => {
	expect(mocks.instances.map(({ options }) => options.baseURL)).toEqual([
		"https://base.example",
		"https://north.example",
		"https://south.example"
	]);
	for (const { options } of mocks.instances) {
		expect(options.secret).toBe("test-secret");
		expect(options.socialProviders.discord.clientId).toBe("client");
		expect(options.trustedOrigins).toContain(options.baseURL);
	}
	expect(getAuth(event("https://north.example"))).not.toBe(getAuth(event("https://south.example")));
	expect(getAuth(event("https://north.example"))).toBe(getAuth(event("https://north.example")));
});
it("rejects unlisted origins without creating an auth instance", () => {
	expect(getAuth(event("https://north.example.evil"))).toBeNull();
	expect(getAuth(event("http://north.example"))).toBeNull();
	expect(mocks.instances).toHaveLength(3);
});
it("uses the matching site auth for login", async () => {
	await signInWithDiscord(event("https://south.example"), {
		callbackURL: "/login/discord/callback",
		errorCallbackURL: "/login/discord/callback?error=1"
	});
	expect(mocks.instances[2].api.signInSocial).toHaveBeenCalledOnce();
	expect(mocks.instances[1].api.signInSocial).not.toHaveBeenCalled();
});
