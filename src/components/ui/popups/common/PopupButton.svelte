<script lang="ts">
	import Button, { type ButtonProps } from "@/components/ui/input/Button.svelte";
	import { Circle, CircleCheck } from "lucide-svelte";
	import type { LucideIcon } from "@/lib/types/lucide";
	import { ContextMenu } from "bits-ui";
	import { fly } from "svelte/transition";
	import type { PopupActionDropdown } from "@/lib/ui/popupActions";

	let {
		Icon,
		label,
		active = $bindable(false),
		IconActive,
		labelActive,
		actions = [],
		...rest
	}: {
		Icon: LucideIcon;
		label: string;
		active?: boolean;
		IconActive?: LucideIcon;
		labelActive?: string;
		actions?: PopupActionDropdown[];
	} & ButtonProps = $props();

	let CurrentIcon = $derived(active && IconActive ? IconActive : Icon);
	let currentLabel = $derived(active && labelActive ? labelActive : label);
</script>

{#snippet iconButton(triggerProps: Record<string, unknown> = {})}
	<Button
		variant="secondary"
		{...triggerProps}
		{...rest}
		size="icon"
		title={currentLabel}
		aria-label={currentLabel}
	>
		<CurrentIcon class="size-4" />
	</Button>
{/snippet}

{#if actions.length}
	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				{@render iconButton(props)}
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content
			class="border-border w-64 border bg-card shadow-popover outline-hidden rounded-lg px-1 py-1.5"
			forceMount
		>
			{#snippet child({ wrapperProps, props, open })}
				{#if open}
					<div {...wrapperProps}>
						<div {...props} transition:fly={{ y: 6, duration: 90 }}>
							{#each actions as action}
								{@const ActionIcon = action.Icon}
								<ContextMenu.Item
									class="data-highlighted:bg-muted cursor-pointer rounded-md px-3 h-9 flex font-medium text-sm items-center gap-2"
									onSelect={action.onclick}
								>
									<ActionIcon class="size-3.5" />
									{action.label}

									{#if action.getActive}
										{#if action.getActive()}
											<CircleCheck class="size-3.5 ml-auto" />
										{:else}
											<Circle class="size-3.5 ml-auto text-muted-foreground" />
										{/if}
									{/if}
								</ContextMenu.Item>
							{/each}
						</div>
					</div>
				{/if}
			{/snippet}
		</ContextMenu.Content>
	</ContextMenu.Root>
{:else}
	{@render iconButton()}
{/if}
