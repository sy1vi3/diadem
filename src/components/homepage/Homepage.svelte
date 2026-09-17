<script lang="ts">
	import { onMount } from "svelte";
	import { Mars, Venus, CircleSmall } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { homepageSchema } from "@/lib/homepage/config";
	import {
		emptyHomepageStats,
		type HomepageSighting,
		type HomepageStats
	} from "@/lib/homepage/types";
	import { m } from "@/lib/paraglide/messages";

	const site = getConfig();
	const config = homepageSchema.parse(site.homepage ?? {});
	let backgroundLayer = $state<HTMLImageElement>();
	let stats = $state<HomepageStats>(emptyHomepageStats());
	let sighting = $state<HomepageSighting | null>(null);
	const counts = $derived([
		{ label: m.home_pokemon_live(), metric: stats.pokemon },
		{ label: m.home_pokestops(), metric: stats.pokestops },
		{ label: m.home_gyms(), metric: stats.gyms }
	]);
	const time = new Intl.DateTimeFormat(site.general.defaultLocale || "en", {
		hour: "numeric",
		minute: "2-digit"
	});
	const number = new Intl.NumberFormat(site.general.defaultLocale || "en");

	onMount(() => {
		const reduced = matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		const scroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				if (backgroundLayer)
					backgroundLayer.style.transform = `translate3d(0, ${reduced.matches ? 0 : -Math.min(Math.max(scrollY, 0) * 0.2, 160)}px, 0)`;
			});
		};
		scroll();
		window.addEventListener("scroll", scroll, { passive: true });
		reduced.addEventListener("change", scroll);

		let stopped = false;
		let fetching = false;
		let lastFetch = 0;
		let request: AbortController | undefined;
		const refresh = async () => {
			if (
				!config.regionId ||
				stopped ||
				document.hidden ||
				fetching ||
				Date.now() - lastFetch < 60000
			)
				return;
			fetching = true;
			lastFetch = Date.now();
			request = new AbortController();
			try {
				const response = await fetch("/api/homepage/stats", {
					signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)])
				});
				if (!response.ok) throw new Error("Statistics unavailable");
				if (!stopped) stats = await response.json();
			} catch {
				if (!stopped)
					for (const metric of Object.values(stats)) {
						metric.stale = metric.value !== null;
						if (!metric.validUntil || metric.validUntil < Date.now()) metric.value = null;
					}
			} finally {
				fetching = false;
			}
		};
		void refresh();
		const interval = setInterval(() => void refresh(), 60000);
		let stream: EventSource | undefined;
		let dismiss: ReturnType<typeof setTimeout> | undefined;
		const connect = () => {
			stream?.close();
			stream = undefined;
			if (stopped || document.hidden || !config.liveSightings || !config.regionId) {
				sighting = null;
				return;
			}
			stream = new EventSource("/api/homepage/live");
			stream.onmessage = (event) => {
				try {
					const data: HomepageSighting = JSON.parse(event.data);
					if (
						!data.id ||
						typeof data.name !== "string" ||
						typeof data.area !== "string" ||
						!Number.isFinite(data.expiresAt) ||
						data.expiresAt <= Date.now()
					)
						return;
					sighting = data;
					clearTimeout(dismiss);
					dismiss = setTimeout(
						() => {
							sighting = null;
						},
						Math.min(8000, data.expiresAt - Date.now())
					);
				} catch {
					/* Ignore malformed events. */
				}
			};
		};
		connect();
		const visible = () => {
			void refresh();
			connect();
		};
		document.addEventListener("visibilitychange", visible);
		return () => {
			stopped = true;
			request?.abort();
			cancelAnimationFrame(frame);
			clearInterval(interval);
			clearTimeout(dismiss);
			stream?.close();
			window.removeEventListener("scroll", scroll);
			reduced.removeEventListener("change", scroll);
			document.removeEventListener("visibilitychange", visible);
		};
	});
</script>

<div
	class="homepage"
	style:--home-bg={config.theme.background}
	style:--home-fg={config.theme.foreground}
	style:--home-muted={config.theme.muted}
	style:--home-button={config.theme.button}
	style:--home-button-text={config.theme.buttonText}
>
	<div class="backdrop" aria-hidden="true">
		{#if config.background.imageUrl}
			<img
				class="background-image"
				bind:this={backgroundLayer}
				src={config.background.imageUrl}
				alt=""
				fetchpriority="high"
				draggable="false"
			/>
		{/if}
		<div class="fade"></div>
	</div>
	<section class="hero" aria-labelledby="home-title">
		<header>
			<nav aria-label={m.home_navigation()}>
				<a href="/coverage">{m.home_coverage()}</a>
				{#if config.tiers.length}<a href="#tiers">{m.home_tiers()}</a>{/if}
				{#if site.discord?.serverLink}<a
						href={site.discord.serverLink}
						target="_blank"
						rel="noopener noreferrer">Discord ↗</a
					>{/if}
			</nav>
		</header>
		<main class="intro">
			<h1 id="home-title">{config.title ?? site.general.mapName}</h1>
			<div class="counts">
				{#each counts as { label, metric }}
					<div>
						<strong>{metric.value === null ? "—" : number.format(metric.value)}</strong><span
							>{label}</span
						>
					</div>
				{/each}
			</div>
			<a class="open-map" href="/map">{m.home_open_map()}<span aria-hidden="true">↗</span></a>
		</main>
		<div class="hero-bottom">
			<div class="sighting-space" aria-live="polite" aria-atomic="true">
				{#if sighting}
					<aside class="sighting">
						{#if sighting.icon}<img src={sighting.icon} alt="" width="52" height="52" />{/if}
						<div class="sighting-details">
							<div class="sighting-heading">
								<b>{sighting.name}</b>
								{#if sighting.gender === 1}<Mars size={14} aria-label={m.pokemon_gender_male()} />
								{:else if sighting.gender === 2}<Venus
										size={14}
										aria-label={m.pokemon_gender_female()}
									/>
								{:else if sighting.gender != null}<CircleSmall
										size={14}
										aria-label={m.pokemon_gender_neutral()}
									/>{/if}
								{#if sighting.iv !== null}<strong>{sighting.iv}%</strong>{/if}
							</div>
							{#if sighting.ivs}<p class="sighting-ivs">{sighting.ivs.join(" / ")}</p>{/if}
							<p>
								{sighting.area} · {m.popup_despawns()}
								<time datetime={new Date(sighting.expiresAt).toISOString()}
									>{time.format(sighting.expiresAt)}</time
								>
							</p>
							<a
								class="sighting-map"
								href={sighting.mapsUrl}
								target="_blank"
								rel="noopener noreferrer">{m.google_maps()} ↗</a
							>
						</div>
						<button
							aria-label={m.home_dismiss_sighting()}
							onclick={() => {
								sighting = null;
							}}>×</button
						>
					</aside>
				{/if}
			</div>
		</div>
	</section>
	{#if config.tiers.length}
		<section id="tiers" class="tiers" aria-labelledby="tiers-title" tabindex="-1">
			<h2 id="tiers-title">{m.home_tiers()}</h2>
			<div class="tier-grid">
				{#each config.tiers as tier}
					<article class="tier">
						<h3>{tier.label}</h3>
						{#if tier.price}<p class="price">{tier.price}</p>{/if}
						<ul>
							{#each tier.benefits as benefit}<li>{benefit}</li>{/each}
						</ul>
						{#if tier.purchaseUrl}<a
								class="purchase"
								href={tier.purchaseUrl}
								target="_blank"
								rel="noopener noreferrer">Ko-fi ↗</a
							>{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}
	{#if config.background.attribution}
		<footer class="attribution">
			{#if config.background.attributionUrl}<a
					href={config.background.attributionUrl}
					target="_blank"
					rel="noopener noreferrer">{config.background.attribution}</a
				>{:else}{config.background.attribution}{/if}
		</footer>
	{/if}
</div>

<style>
	:global(html:has(.homepage)) {
		scroll-behavior: smooth;
	}
	.homepage {
		overflow-wrap: anywhere;
		position: relative;
		isolation: isolate;
		color: var(--home-fg);
		background: var(--home-bg);
		font-family: Inter, sans-serif;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: var(--home-bg);
		pointer-events: none;
	}
	.background-image {
		position: absolute;
		top: -160px;
		left: 0;
		width: 100%;
		height: calc(100% + 320px);
		max-width: none;
		object-fit: cover;
		object-position: center;
		will-change: transform;
		opacity: 0.9;
	}
	.fade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			var(--home-bg) 3%,
			color-mix(in srgb, var(--home-bg) 97%, transparent) 23%,
			color-mix(in srgb, var(--home-bg) 78%, transparent) 47%,
			color-mix(in srgb, var(--home-bg) 22%, transparent) 76%,
			color-mix(in srgb, var(--home-bg) 14%, transparent)
		);
	}
	.hero {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		position: relative;
		padding-bottom: max(2rem, env(safe-area-inset-bottom));
	}
	header {
		padding: max(2.2rem, env(safe-area-inset-top)) 6% 1rem;
	}
	nav {
		display: flex;
		justify-content: flex-end;
		gap: 1.9rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
	}
	a {
		color: inherit;
		text-decoration: none;
	}
	a:hover,
	button:hover {
		filter: brightness(1.15);
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--home-button);
		outline-offset: 5px;
	}
	.intro {
		margin: clamp(3rem, 15vh, 9rem) 8% 3rem;
	}
	h1 {
		font-size: clamp(2.4rem, 4vw, 3.25rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 1.16;
		max-width: 26rem;
		text-wrap: balance;
		margin: 0;
	}
	.counts {
		display: grid;
		grid-template-columns: 1.25fr 1fr 1fr;
		max-width: 27rem;
		gap: 2rem;
		margin: 2.4rem 0 2.1rem;
		font-variant-numeric: tabular-nums;
	}
	.counts strong {
		display: block;
		font-size: 2rem;
		font-weight: 500;
		line-height: 1.15;
		letter-spacing: -0.05em;
		min-width: 4ch;
	}
	.counts span {
		display: block;
		font-size: 0.7rem;
		color: var(--home-muted);
		margin-top: 0.6rem;
	}
	.open-map,
	.purchase {
		display: inline-flex;
		justify-content: space-between;
		align-items: center;
		gap: 2.3rem;
		border-radius: 6px;
		padding: 0.95rem 1.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		background: var(--home-button);
		color: var(--home-button-text);
		min-width: min(11.5rem, 100%);
		max-width: 100%;
	}
	.hero-bottom {
		margin: auto 6% 1rem 8%;
		padding-top: 3rem;
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
		gap: 2rem;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	.sighting-space {
		min-height: 72px;
		min-width: 255px;
	}
	.sighting {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid color-mix(in srgb, var(--home-fg) 18%, transparent);
		background: color-mix(in srgb, var(--home-bg) 94%, transparent);
		border-radius: 8px;
		padding: 0.6rem;
		font-size: 0.75rem;
	}
	.sighting img {
		object-fit: contain;
	}
	.sighting-heading {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.sighting-details {
		min-width: 0;
	}
	.sighting-ivs {
		font-variant-numeric: tabular-nums;
	}
	.sighting-map {
		display: inline-block;
		margin-top: 0.5rem;
		color: var(--home-button);
	}
	.sighting b {
		font-weight: 600;
	}
	.sighting-heading strong {
		color: var(--home-button);
	}
	.sighting p {
		margin: 0.3rem 0 0;
		color: var(--home-muted);
		font-size: 0.7rem;
	}
	.sighting button {
		margin-left: auto;
		align-self: flex-start;
		color: var(--home-muted);
		padding: 0 0.3rem;
		background: none;
		border: 0;
	}
	.attribution {
		position: relative;
		padding: 1.5rem 8% max(1.5rem, env(safe-area-inset-bottom));
		font-size: 0.65rem;
		text-align: right;
		color: var(--home-muted);
	}
	.tiers {
		min-height: 85svh;
		padding: clamp(4rem, 10vh, 8rem) 8%;

		scroll-margin-top: 0;
	}
	h2 {
		font-size: 2rem;
		font-weight: 500;
		letter-spacing: -0.04em;
		margin: 0 0 2.5rem;
	}
	.tier-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
		gap: 2rem;
		max-width: 70rem;
	}
	.tier {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		background: color-mix(in srgb, var(--home-bg) 80%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--home-fg) 20%, transparent);
	}
	h3 {
		font-size: 1.15rem;
		font-weight: 500;
		margin: 0;
	}
	.price {
		font-size: 1.7rem;
		margin: 1rem 0 0;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 2rem;
		color: var(--home-muted);
		font-size: 0.9rem;
		line-height: 1.6;
	}
	li + li {
		margin-top: 0.6rem;
	}
	.purchase {
		margin-top: auto;
		align-self: flex-start;
	}
	@media (max-width: 700px) {
		header {
			padding-left: 7%;
			padding-right: 7%;
		}
		nav {
			font-size: 0.75rem;
			gap: 1.5rem;
		}
		.intro {
			margin: 5rem 7% 2rem;
		}
		h1 {
			font-size: 2.45rem;
			max-width: 20rem;
		}
		.counts {
			grid-template-columns: repeat(auto-fit, minmax(min(100%, 4.5rem), 1fr));
			gap: 1rem;
			margin: 1.8rem 0;
		}
		.counts strong {
			font-size: clamp(1.2rem, 6vw, 1.65rem);
		}
		.fade {
			background: linear-gradient(
				180deg,
				color-mix(in srgb, var(--home-bg) 90%, transparent),
				color-mix(in srgb, var(--home-bg) 96%, transparent) 25%,
				color-mix(in srgb, var(--home-bg) 70%, transparent) 47%,
				color-mix(in srgb, var(--home-bg) 15%, transparent) 80%
			);
		}
		.hero-bottom {
			flex-direction: column-reverse;
			align-items: flex-start;
			margin-left: 7%;
			min-height: 12rem;
		}
		.sighting-space {
			min-width: min(100%, 255px);
			max-width: 100%;
		}
		.tiers {
			padding-left: 7%;
			padding-right: 7%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html:has(.homepage)) {
			scroll-behavior: auto;
		}
		.background-image {
			will-change: auto;
		}
	}
</style>
