<script>
	import { getContext } from "svelte";
	import { ApplicationShell } from "#runtime/svelte/component/application";
	import * as Utilities from "../../../helpers/utilities.js";
	import * as PileUtilities from "../../../helpers/pile-utilities.js";
	import { localize } from "#runtime/util/i18n";
	import SliderInput from "../../components/SliderInput.svelte";

	const { application } = getContext('#external');

	export let item;
	export let elementRoot;
	export let target = false;

	const unlimitedQuantity = application.options?.unlimitedQuantity ?? false;

	let form;

	const itemQuantity = Utilities.getItemQuantity(item);
	let quantity = itemQuantity > 0 ? itemQuantity : 1;
	const sliderQuantity = itemQuantity + (application.options?.quantityAdjustment ?? 0);
	const canItemStack = PileUtilities.canItemStack(item, target);

	let createNewRow = true;

	function requestSubmit() {
		form.requestSubmit();
	}

	function submit() {
		application.options.resolve({ quantity: Number(quantity) || 1, createNewRow });
		application.close();
	}

</script>

<svelte:options accessors={true}/>

<ApplicationShell bind:elementRoot>
	<form autocomplete="off" bind:this={form} class="item-piles-flexcol" on:submit|once|preventDefault={submit}
	      style="padding:0.5rem;">

		<h3 style="text-align: center;">
			{localize(`ITEM-PILES.Applications.${application.options.localizationTitle}.Header`, {
				item_name: item.name
			})}
		</h3>

		{#if target}

			<p class="item-piles-text-center">
				{localize(`ITEM-PILES.Applications.${application.options.localizationTitle}.Content`, {
					target_name: target.name
				})}
			</p>

		{/if}

		{#if (itemQuantity > 1 || unlimitedQuantity)}

			<div class="form-group item-piles-text-center" style="margin-bottom: 0.5rem;">
				<label style="font-weight: 500;">{localize(`ITEM-PILES.Applications.${application.options.localizationTitle}.${unlimitedQuantity ? "ContentInfiniteQuantity" : "ContentMultipleQuantity"}`, {
					target_name: target?.name ?? "",
					quantity: itemQuantity,
					itemName: item.name
				})}</label>
			</div>
			<div class="form-group" style="display: flex; align-items: center; width: 100%; gap: 1rem; margin: 0.5rem 0;">
				{#if unlimitedQuantity}
					<input class="item-piles-quantity-input" style="width: 100%; text-align: center; font-size: 1.1rem; height: 34px;" type="number" min="1" bind:value={quantity}/>
				{:else}
					<input style="flex: 1; height: 26px; margin: 0; cursor: pointer;" bind:value={quantity} max={sliderQuantity} min={1} step={1} type="range"/>
					<input class="item-piles-quantity-input" style="flex: 0 0 75px; text-align: center; font-size: 1.1rem; font-weight: bold; height: 34px; margin: 0; border: 1px solid rgba(0,0,0,0.3); border-radius: 4px;" max={sliderQuantity} min={1} required step={1} type="number" bind:value={quantity}/>
				{/if}
			</div>
		{:else}
			<div class="form-group" style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 0.5rem 0;">
				<input class="item-piles-quantity-input" style="flex: 0 0 100px; text-align: center; font-size: 1.1rem; font-weight: bold; height: 34px; margin: 0; border: 1px solid rgba(0,0,0,0.3); border-radius: 4px;" min={1} required step={1} type="number" bind:value={quantity}/>
			</div>
		{/if}

		{#if target}
			<div class="form-group" style="margin-top: 0.75rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--item-piles-border-color, rgba(0,0,0,0.15)); padding-top: 0.5rem;">
				<label style="margin: 0; cursor: pointer; flex: 1;" for="create-new-row-toggle">
					<span style="font-weight: bold;">Create as new row</span>
					<p style="font-size: 0.85em; opacity: 0.8; margin: 0;">Keep separate in inventory (unchecked merges into existing row).</p>
				</label>
				<input id="create-new-row-toggle" type="checkbox" bind:checked={createNewRow} style="margin-left: 0.5rem; transform: scale(1.2);"/>
			</div>
		{/if}

		<footer class="sheet-footer item-piles-flexrow" style="margin-top: 1rem;">
			{#if target}
				<button type="button" on:click|once={submit}>
					<i class="fas fa-download"></i>
					{localize(`ITEM-PILES.Applications.${application.options.localizationTitle}.Submit`)}
				</button>
			{:else}
				<button type="button" on:click|once={submit}>
					<i class="fas fa-box"></i>
					{localize(`ITEM-PILES.Applications.${application.options.localizationTitle}.SubmitNoTarget`)}
				</button>
			{/if}
			<button on:click={() => { application.close() }} type="button">
				<i class="fas fa-times"></i>
				{localize("Cancel")}
			</button>
		</footer>

	</form>
</ApplicationShell>
