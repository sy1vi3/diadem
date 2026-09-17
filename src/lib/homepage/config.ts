import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const color = z.string().regex(/^#[\da-fA-F]{6}$/);
const httpUrl = z.url().refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL");
const themeSchema = z.object({
	background: color.default("#211e1c"),
	foreground: color.default("#f2eee7"),
	muted: color.default("#b1aaa0"),
	button: color.default("#e6d4b6"),
	buttonText: color.default("#30291e")
});
const backgroundSchema = z.object({
	imageUrl: z
		.string()
		.refine(
			(value) => !value || /^https?:\/\//.test(value) || /^\/(?!\/)/.test(value),
			"Use an HTTP(S) URL or a local absolute path"
		)
		.default(""),
	attribution: z.string().default(""),
	attributionUrl: httpUrl.optional()
});
const tierSchema = z.object({
	id,
	label: z.string().min(1),
	price: z.string().default(""),
	benefits: z.array(z.string().min(1)).default([]),
	purchaseUrl: httpUrl.optional()
});
export const homepageSchema = z
	.object({
		title: z.string().min(1).optional(),
		regionId: id.optional(),
		theme: themeSchema.prefault({}),
		background: backgroundSchema.prefault({}),
		tiers: z.array(tierSchema).default([]),
		liveSightings: z.boolean().default(false),
		coverageAreaIds: z.array(z.number().int().nonnegative()).default([])
	})
	.superRefine((value, ctx) => {
		if (new Set(value.tiers.map((tier) => tier.id)).size !== value.tiers.length) {
			ctx.addIssue({ code: "custom", message: "Tier IDs must be unique", path: ["tiers"] });
		}
	});
export type HomepageConfig = z.output<typeof homepageSchema>;
export type HomepageInput = z.input<typeof homepageSchema>;

export function mergeHomepage(
	base?: HomepageInput,
	override?: HomepageInput
): HomepageConfig | undefined {
	if (!base && !override) return undefined;
	return homepageSchema.parse({
		...base,
		...override,
		theme: { ...base?.theme, ...override?.theme },
		background: { ...base?.background, ...override?.background }
	});
}

export const homepageServerSchema = z
	.object({
		webhookToken: z.string().min(24),
		regions: z
			.array(
				z.object({
					id,
					areaIds: z.array(z.number().int().nonnegative()).min(1),
					pokemonRefreshSeconds: z.number().int().min(60).default(60),
					fortRefreshSeconds: z.number().int().min(60).default(900),
					maxStaleSeconds: z.number().int().min(60).default(86400),
					sightings: z
						.object({
							minIv: z.number().min(0).max(100).default(90),
							species: z.array(z.number().int().positive()).default([]),
							intervalSeconds: z.number().int().min(30).default(40)
						})
						.prefault({})
				})
			)
			.default([])
	})
	.superRefine((value, ctx) => {
		if (new Set(value.regions.map((region) => region.id)).size !== value.regions.length) {
			ctx.addIssue({ code: "custom", message: "Region IDs must be unique", path: ["regions"] });
		}
	});
export type HomepageServerConfig = z.output<typeof homepageServerSchema>;
export type HomepageServerInput = z.input<typeof homepageServerSchema>;

export function validateHomepageRegions(
	homepages: (HomepageInput | undefined)[],
	server?: HomepageServerConfig
) {
	const regions = new Map(server?.regions.map((region) => [region.id, region]));
	for (const homepage of homepages) {
		if (!homepage?.regionId) continue;
		const region = regions.get(homepage.regionId);
		if (!region) throw new Error(`Unknown homepage region: ${homepage.regionId}`);
		// Only public region IDs are serialized; webhook credentials stay in server config.
		homepage.coverageAreaIds = [...region.areaIds];
	}
}
