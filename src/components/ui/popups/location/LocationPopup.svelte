<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { LocationData } from "$lib/types/mapObjectData/location";
	import * as m from "$lib/paraglide/messages";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconGym, getIconPokestop, getIconStation } from "$lib/services/uicons.svelte";
	import { copyToClipboard, hasClipboardWrite } from "$lib/utils/device";
	import { formatDistance } from "$lib/utils/numberFormat";
	import { CircleDot, Clipboard, MapPin } from "@lucide/svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import { isSupportedFeature } from "$lib/services/supportedFeatures";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import { formattedCoordinates } from "$lib/features/location.svelte";

	export { image, titleDetails, headerDetails, overview, main };

	export function getPopupPropsLocation(d: MapData): MapObjectPopupProps {
		const data = d as LocationData;
		return {
			type: data.isCurrentLocation ? m.my_location() : m.location(),
			title: data.address || formattedCoordinates(data),
			image,
			titleDetails,
			headerDetails,
			overview,
			main
		};
	}
</script>

{#snippet image()}
	<div
		class="flex size-13 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground -mr-2"
	>
		<MapPin class="size-5.5" />
	</div>
{/snippet}

{#snippet titleDetails(d: MapData)}
	{@const data = d as LocationData}
	{#if hasClipboardWrite()}
		<button
			class="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
			aria-label={data.address ? m.copy_address() : m.copy_coordinates()}
			title={data.address ? m.copy_address() : m.copy_coordinates()}
			onclick={() => copyToClipboard(data.address || formattedCoordinates(data))}
		>
			<Clipboard class="size-4" />
		</button>
	{/if}
{/snippet}

{#snippet headerDetails(d: MapData)}
	{@const data = d as LocationData}
	{#if data.address}
		<button
			class="inline-flex items-center gap-2 rounded text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
			disabled={!hasClipboardWrite()}
			aria-label={m.copy_coordinates()}
			title={m.copy_coordinates()}
			onclick={() => copyToClipboard(formattedCoordinates(data))}
		>
			<MapPin class="size-3.5 shrink-0" />
			{formattedCoordinates(data)}
			{#if hasClipboardWrite()}<Clipboard class="size-3.5 shrink-0" />{/if}
		</button>
	{:else if isSupportedFeature("geocoding")}
		{#if data.isAddressLoading}
			<div class="h-4 w-48 max-w-full animate-pulse rounded bg-accent-highlight"></div>
		{:else}
			<p class="text-xs text-muted-foreground">{m.address_unavailable()}</p>
		{/if}
	{/if}
{/snippet}

{#snippet countCard(single: string, plural: string, value: number, loading: boolean)}
	<BasicMainCard>
		<p class="font-semibold text-2xl">
			{#if loading}
				<span class="block h-8 w-8 animate-pulse rounded bg-accent-highlight"></span>
			{:else}
				{value}
			{/if}
		</p>
		<p class="text-lg text-muted-foreground">
			{#if value === 1}
				{single}
			{:else}
				{plural}
			{/if}
		</p>
	</BasicMainCard>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as LocationData}
	{#each data.nearby as nearby (nearby.mapId)}
		<div class="flex min-w-48 max-w-64 items-center gap-5 rounded-lg border bg-accent px-4 py-3">
			{#if nearby.type === MapObjectType.GYM || nearby.type === MapObjectType.POKESTOP}
				<FortImage
					class="size-14! py-0!"
					alt={nearby.name ??
						(nearby.type === MapObjectType.GYM ? m.pogo_gym() : m.pogo_pokestop())}
					fortUrl={nearby.url}
					fortIcon={nearby.type === MapObjectType.GYM
						? getIconGym(nearby)
						: getIconPokestop(nearby)}
					fortName={nearby.name}
					fortDescription={nearby.description}
				/>
			{:else}
				<ImagePopup class="size-10 shrink-0" src={getIconStation(nearby)} alt={m.pogo_station()} />
			{/if}
			<div class="min-w-0">
				<p class="text-muted-foreground">
					{#if nearby.type === MapObjectType.POKESTOP}
						{m.pogo_pokestop()}
					{:else if nearby.type === MapObjectType.GYM}
						{m.pogo_gym()}
					{:else if nearby.type === MapObjectType.STATION}
						{m.pogo_station()}
					{/if}
					· {formatDistance(Math.round(nearby.distance))}
				</p>
				<p class="font-semibold text-xl line-clamp-2">
					{#if nearby.name}
						{nearby.name}
					{:else}
						{#if nearby.type === MapObjectType.POKESTOP}
							{m.unknown_pokestop()}
						{:else if nearby.type === MapObjectType.GYM}
							{m.unknown_gym()}
						{:else if nearby.type === MapObjectType.STATION}
							{m.pogo_station()}
						{/if}
					{/if}
				</p>
			</div>
		</div>
	{/each}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as LocationData}

	{#if data.nearbyPermissions.length > 0}
		<TitledMainSection Icon={CircleDot} title={m.in_range()}>
			<div class="grid! grid-cols-2 gap-3">
				{#if data.nearbyPermissions.includes(MapObjectType.SPAWNPOINT)}
					{@render countCard(
						m.pogo_spawnpoint(),
						m.spawnpoints(),
						data.spawnpoints,
						data.isNearbyLoading
					)}
				{/if}
				{#if data.nearbyPermissions.includes(MapObjectType.GYM)}
					{@render countCard(
						m.pogo_gym(),
						m.pogo_gyms(),
						data.nearby.filter((nearby) => nearby.type === MapObjectType.GYM).length,
						data.isNearbyLoading
					)}
				{/if}
				{#if data.nearbyPermissions.includes(MapObjectType.POKESTOP)}
					{@render countCard(
						m.pogo_pokestop(),
						m.pogo_pokestops(),
						data.nearby.filter((nearby) => nearby.type === MapObjectType.POKESTOP).length,
						data.isNearbyLoading
					)}
				{/if}
				{#if data.nearbyPermissions.includes(MapObjectType.STATION)}
					{@render countCard(
						m.pogo_station(),
						m.pogo_stations(),
						data.nearby.filter((nearby) => nearby.type === MapObjectType.STATION).length,
						data.isNearbyLoading
					)}
				{/if}
			</div>
		</TitledMainSection>
	{/if}
{/snippet}
