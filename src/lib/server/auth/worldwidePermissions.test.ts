import { Features } from "@/lib/utils/features";
import { beforeEach, expect, it, vi } from "vitest";
import type { Permissions } from "@/lib/services/config/configTypes";
import type { User } from "@/lib/server/db/internal/schema";
const mocks = vi.hoisted(() => ({ rules: [] as Permissions[], guild: vi.fn() }));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ permissions: mocks.rules })
}));
vi.mock("@/lib/server/auth/discordDetails", () => ({ getGuildMemberInfo: mocks.guild }));
vi.mock("@/lib/server/api/kojiApi", () => ({
	fetchKojiGeofences: async () =>
		["North", "South"].map((name) => ({
			properties: { name },
			geometry: { type: "Polygon", coordinates: [] }
		}))
}));
vi.mock("@/lib/utils/logger", () => ({ getLogger: () => ({ warning: vi.fn(), error: vi.fn() }) }));
import { updatePermissions } from "./permissions";
const user = { id: "test-user" } as User;
beforeEach(() => {
	mocks.guild.mockReset();
	mocks.rules = [
		{
			guildId: "north-server",
			roleId: "north-role",
			areas: ["North"],
			features: [Features.POKEMON_ALL]
		},
		{
			guildId: "south-server",
			roleId: "south-role",
			areas: ["South"],
			features: [Features.POKEMON_ALL]
		},
		{ guildId: "north-server", roleId: "global-role", features: [Features.ALL] }
	];
});
it("combines worldwide visibility with existing feature grants across guilds", async () => {
	mocks.rules.unshift({
		guildId: "south-server",
		roleId: "worldwide",
		features: [Features.MAP_DATA_EVERYWHERE]
	});
	mocks.guild.mockImplementation(async (guild: string) => ({
		roles: guild === "north-server" ? ["north-role"] : ["worldwide"]
	}));
	const perms = await updatePermissions(user, "token", fetch);
	expect(perms.everywhere).toContain(Features.POKEMON);
	expect(perms.everywhere).toContain(Features.POKEMON_PVP);
	expect(perms.everywhere).not.toContain(Features.SCOUT);
	expect(perms.everywhere).not.toContain(Features.RAID);
});
