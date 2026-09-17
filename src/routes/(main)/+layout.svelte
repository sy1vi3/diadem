<script lang="ts">
	import { page } from "$app/state";
	import { getConfig } from "@/lib/services/config/config";
	import { isNative } from "@/lib/native/runtime";
	let { children } = $props();
	const homepage = $derived(
		!isNative() && getConfig().general.customHome && page.url.pathname === "/"
	);
</script>

{#if homepage}
	{@render children()}
{:else}
	{#await import("@/components/map/MapLayout.svelte") then { default: MapLayout }}
		<MapLayout {children} />
	{/await}
{/if}
