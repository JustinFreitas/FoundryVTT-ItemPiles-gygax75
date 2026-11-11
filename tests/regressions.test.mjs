import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./loader.mjs", import.meta.url);

// Minimal Foundry V14 environment mocks
function getProperty(obj, key) {
	if (!obj || !key) return undefined;
	return key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

function hasProperty(obj, key) {
	if (!obj || !key) return false;
	let curr = obj;
	for (const part of key.split(".")) {
		if (curr == null || typeof curr !== "object" || !(part in curr)) return false;
		curr = curr[part];
	}
	return true;
}

function setProperty(obj, key, value) {
	const parts = key.split(".");
	let curr = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const p = parts[i];
		if (curr[p] == null || typeof curr[p] !== "object") curr[p] = {};
		curr = curr[p];
	}
	curr[parts[parts.length - 1]] = value;
	return true;
}

function deepClone(val) {
	return val === undefined ? undefined : structuredClone(val);
}

function isEmpty(val) {
	if (val == null) return true;
	if (Array.isArray(val)) return val.length === 0;
	if (typeof val === "object") return Object.keys(val).length === 0;
	return false;
}

function mergeObject(original, other = {}, { inplace = true } = {}) {
	const target = inplace ? original : deepClone(original);
	for (const [k, v] of Object.entries(other ?? {})) {
		if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) {
			mergeObject(target[k], v, { inplace: true });
		} else {
			target[k] = deepClone(v);
		}
	}
	return target;
}

let idCounter = 1;
function randomID() {
	return String(idCounter++).padStart(16, "a");
}

class MockDialogV2 {
	static instances = [];
	static nextConfirmResult = true;

	constructor(options = {}) {
		this.options = options;
		this.rendered = false;
		this.closed = false;
		this._listeners = new Map();
		MockDialogV2.instances.push(this);
	}

	addEventListener(type, listener) {
		if (!this._listeners.has(type)) this._listeners.set(type, []);
		this._listeners.get(type).push(listener);
	}

	async render(options = {}) {
		this.rendered = true;
		this.renderOptions = options;
		return this;
	}

	async close() {
		this.rendered = false;
		this.closed = true;
		return this;
	}

	static async confirm(options = {}) {
		const dlg = new MockDialogV2(options);
		await dlg.render({ force: true });
		return MockDialogV2.nextConfirmResult;
	}

	static async prompt(options = {}) {
		const dlg = new MockDialogV2(options);
		await dlg.render({ force: true });
		return null;
	}
}

class MockItem {
	constructor(data = {}, parent = null) {
		Object.assign(this, deepClone(data));
		this.id = data._id ?? data.id ?? randomID();
		this._id = this.id;
		this.parent = parent;
		this.flags = this.flags ?? {};
	}
	toObject() {
		const copy = deepClone({
			_id: this._id,
			name: this.name,
			type: this.type,
			img: this.img,
			system: this.system,
			flags: this.flags
		});
		return copy;
	}
}

class MockItemCollection extends Array {
	get(id) {
		return this.find(it => it.id === id || it._id === id);
	}
}

class MockActor {
	constructor(data = {}) {
		this.id = data.id ?? randomID();
		this.uuid = `Actor.${this.id}`;
		this.name = data.name ?? "Test Actor";
		this.type = data.type ?? "character";
		this.isOwner = data.isOwner ?? true;
		this.flags = data.flags ?? {};
		this.system = data.system ?? {};
		this.items = new MockItemCollection(
			...(data.items ?? []).map(it => new MockItem(it, this))
		);
		this.updatedItems = [];
		this.deletedItemIds = [];
		this.createdItems = [];
		this.actorUpdates = [];
	}

	async update(changes) {
		this.actorUpdates.push(changes);
		for (const [k, v] of Object.entries(changes)) {
			setProperty(this, k, v);
		}
		return this;
	}

	async updateEmbeddedDocuments(_type, updates) {
		this.updatedItems.push(...updates);
		for (const u of updates) {
			const existing = this.items.get(u._id);
			if (existing) {
				for (const [k, v] of Object.entries(u)) {
					if (k === "_id") continue;
					setProperty(existing, k, v);
				}
			}
		}
		return updates;
	}

	async deleteEmbeddedDocuments(_type, ids) {
		this.deletedItemIds.push(...ids);
		for (const id of ids) {
			const idx = this.items.findIndex(it => it.id === id);
			if (idx > -1) this.items.splice(idx, 1);
		}
		return ids;
	}

	async createEmbeddedDocuments(_type, docs) {
		const created = docs.map(d => {
			const inst = new MockItem(d, this);
			this.items.push(inst);
			return inst;
		});
		this.createdItems.push(...created);
		return created;
	}
}

class MockTokenDocument {}

globalThis.Item = MockItem;
globalThis.Item.implementation = MockItem;
globalThis.Actor = MockActor;
globalThis.TokenDocument = MockTokenDocument;
globalThis.$ = () => {
	const jq = [{}];
	jq.appendTo = () => jq;
	jq.append = () => jq;
	return jq;
};
globalThis.document = { body: { addEventListener() {} }, getElementById: () => ({}) };
globalThis.ui = { windows: {}, notifications: { info() {}, warn() {}, error() {}, notify() {} } };
globalThis.KeyboardManager = { MODIFIER_KEYS: { CONTROL: "Control", ALT: "Alt", SHIFT: "Shift" } };
globalThis.Hooks = {
	on() {},
	once() {},
	call: () => true,
	callAll() {}
};
globalThis.CONST = {
	DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 }
};

const settingsStore = new Map([
	["itemQuantityAttribute", "system.quantity.value"],
	["itemPriceAttribute", "system.cost"],
	["quantityForPriceAttribute", "flags.item-piles.system.quantityForPrice"],
	["itemFilters", [{ path: "type", filters: "spell,ability,class,race" }]],
	["itemSimilarities", ["name", "type", "system.treasure"]],
	["unstackableItemTypes", ["weapon", "armor", "container"]],
	["pileDefaults", {}],
	["tokenFlagDefaults", {}],
	["currencies", [
		{
			type: "item",
			name: "Gold Coins",
			img: "systems/ose/assets/gold.png",
			abbreviation: "{#}GP",
			primary: true,
			exchangeRate: 1,
			data: {
				item: {
					name: "Gold Coins",
					type: "item",
					img: "systems/ose/assets/gold.png",
					system: { quantity: { value: 1, max: null }, weight: 1, cost: 1, treasure: true }
				}
			}
		}
	]],
	["secondaryCurrencies", []],
	["currencyDecimalDigits", 0.00001],
	["debug", false],
	["outputToChat", 0],
	["hideActorHeaderText", false],
	["hideActorHeaderButton", false]
]);

globalThis.CONFIG = {
	Item: {
		dataModels: {
			item: { schema: { getInitialValue: () => ({ quantity: { value: 1 }, cost: 0, weight: 0, treasure: false }) } },
			weapon: { schema: { getInitialValue: () => ({ quantity: { value: 1 }, cost: 0, weight: 0 }) } },
			armor: { schema: { getInitialValue: () => ({ quantity: { value: 1 }, cost: 0, weight: 0 }) } },
			container: { schema: { getInitialValue: () => ({ quantity: { value: 1 }, cost: 0, weight: 0 }) } },
			class: { schema: { getInitialValue: () => ({}) } },
			race: { schema: { getInitialValue: () => ({}) } }
		}
	}
};

globalThis.foundry = {
	utils: {
		getProperty,
		hasProperty,
		setProperty,
		deepClone,
		isEmpty,
		mergeObject,
		diffObject: (orig, other) => {
			const diff = {};
			for (const [k, v] of Object.entries(other ?? {})) {
				if (JSON.stringify(orig?.[k]) !== JSON.stringify(v)) diff[k] = deepClone(v);
			}
			return diff;
		},
		randomID,
		debounce: (fn) => fn,
		fromUuidSync: () => null,
		fromUuid: async () => null,
		escapeHTML: (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))
	},
	applications: {
		api: {
			ApplicationV2: class {},
			DialogV2: MockDialogV2,
			HandlebarsApplicationMixin: (Base) => class extends Base {}
		},
		instances: new Map()
	},
	documents: {
		BaseActor: MockActor,
		BaseItem: MockItem
	},
	canvas: {
		geometry: {
			Ray: class {
				constructor(a, b) {
					this.distance = Math.hypot(b.x - a.x, b.y - a.y);
				}
			}
		},
		layers: {
			TokenLayer: class {}
		}
	},
	helpers: {
		interaction: {
			TooltipManager: {
				implementation: class {
					activateEventListeners() {}
				}
			}
		}
	}
};

globalThis.game = {
	system: { id: "ose", version: "3.3.0", documentTypes: { Item: { templates: {} } } },
	user: { id: "gm1", isGM: true, name: "GM" },
	users: new Map([["u2", { id: "u2", name: "Alice <Fighter>", active: true }]]),
	actors: new Map(),
	modules: new Map(),
	i18n: {
		localize: (k) => k,
		format: (k, data) => `${k}:${JSON.stringify(data)}`
	},
	settings: {
		get: (_mod, key) => settingsStore.get(key)
	},
	keybindings: {
		get: () => []
	},
	keyboard: {
		downKeys: new Set()
	},
	itempiles: {
		API: {
			get ITEM_QUANTITY_ATTRIBUTE() { return settingsStore.get("itemQuantityAttribute"); },
			get ITEM_PRICE_ATTRIBUTE() { return settingsStore.get("itemPriceAttribute"); },
			get QUANTITY_FOR_PRICE_ATTRIBUTE() { return settingsStore.get("quantityForPriceAttribute"); },
			get ITEM_FILTERS() { return settingsStore.get("itemFilters"); },
			get ITEM_SIMILARITIES() { return settingsStore.get("itemSimilarities"); },
			get UNSTACKABLE_ITEM_TYPES() { return settingsStore.get("unstackableItemTypes"); },
			get CURRENCIES() { return settingsStore.get("currencies"); },
			get SECONDARY_CURRENCIES() { return settingsStore.get("secondaryCurrencies"); },
			transferItems: async () => ({}),
			addItems: async () => ({})
		}
	}
};

const { default: Transaction } = await import("../src/helpers/transaction.js");
const PileUtilities = await import("../src/helpers/pile-utilities.js");
const Utilities = await import("../src/helpers/utilities.js");
const { SYSTEMS } = await import("../src/systems.js");
const { default: ItemPileStore } = await import("../src/stores/item-pile-store.js");
const { default: PrivateAPI } = await import("../src/API/private-api.js");
const { default: DropItemDialog } = await import("../src/applications/dialogs/drop-item-dialog/drop-item-dialog.js");

Utilities.refreshItemTypesThatCanStack();

test("Transaction partial removal from unstacked pile row deducts quantity instead of force-deleting stack", async () => {
	const pileActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "pile", canStackItems: "no" } } },
		items: [
			{
				_id: "torchStack000001",
				name: "Torches",
				type: "item",
				system: { quantity: { value: 10 }, cost: 1, weight: 10, treasure: false },
				flags: { "item-piles": { item: { canStack: "no" } } }
			}
		]
	});

	const tx = new Transaction(pileActor);
	await tx.appendItemChanges([{ _id: "torchStack000001", quantity: 3 }], { remove: true });
	const prepared = tx.prepare();

	assert.deepEqual(prepared.itemsToDelete, [], "partial removal must NOT delete the remaining 7 torches");
	assert.equal(prepared.itemsToUpdate.length, 1);
	assert.equal(prepared.itemsToUpdate[0]._id, "torchStack000001");
	assert.equal(prepared.itemsToUpdate[0].system.quantity.value, 7);
	assert.equal(prepared.itemDeltas.length, 1);
	assert.equal(prepared.itemDeltas[0].quantity, -3);
});

test("Transaction partial currency removal with {_id, quantity} plain object deducts coins without force-delete or duplication", async () => {
	const pileActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "pile", canStackItems: "no" } } },
		items: [
			{
				_id: "goldCoins0000001",
				name: "Gold Coins",
				type: "item",
				img: "systems/ose/assets/gold.png",
				system: { quantity: { value: 100 }, cost: 1, weight: 1, treasure: true },
				flags: { "item-piles": { item: { canStack: "no" } } }
			}
		]
	});

	const tx = new Transaction(pileActor);
	await tx.appendItemChanges([{ _id: "goldCoins0000001", quantity: 25 }], { remove: true });
	const prepared = tx.prepare();

	assert.deepEqual(prepared.itemsToDelete, [], "currency item must not be force-deleted when item.id is undefined");
	assert.equal(prepared.itemsToUpdate.length, 1);
	assert.equal(prepared.itemsToUpdate[0].system.quantity.value, 75);
});

test("Transaction discrete row creation preserves canStack='no' and commit() reports full created quantity", async () => {
	const pileActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "pile", canStackItems: "no" } } },
		items: [
			{
				_id: "gpFound000000001",
				name: "GP (Found)",
				type: "item",
				system: { quantity: { value: 30 }, cost: 1, weight: 1, treasure: true }
			}
		]
	});
	foundry.utils.fromUuidSync = (uuid) => (uuid === pileActor.uuid ? pileActor : null);

	const tx = new Transaction(pileActor);
	await tx.appendItemChanges([
		{
			item: {
				name: "GP (Found)",
				type: "item",
				system: { quantity: { value: 50 }, cost: 1, weight: 1, treasure: true },
				flags: { "item-piles": { item: { canStack: "no" } } }
			},
			quantity: 50
		}
	]);
	const result = await tx.commit();

	assert.equal(pileActor.items.length, 2, "second GP (Found) drop creates a discrete second row");
	assert.equal(result.itemDeltas.length, 1);
	assert.equal(result.itemDeltas[0].quantity, 50, "created item delta reports 50 instead of 1");
});

test("ItemPileStore.consolidate merges stackables while protecting containers, weapons, and distinct descriptions", async () => {
	const pileActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "pile", canStackItems: "no" } } },
		items: [
			{ _id: "gpRow10000000000", name: "GP (Found)", type: "item", system: { quantity: { value: 50 }, cost: 1, weight: 1, treasure: true }, flags: { "item-piles": { item: { canStack: "no" } } } },
			{ _id: "gpRow20000000000", name: "GP (Found)", type: "item", system: { quantity: { value: 30 }, cost: 1, weight: 1, treasure: true }, flags: { "item-piles": { item: { canStack: "no" } } } },
			{ _id: "zeroGold00000001", name: "Gold Coins", type: "item", img: "systems/ose/assets/gold.png", system: { quantity: { value: 0 }, cost: 1, weight: 1, treasure: true } },
			{ _id: "twentyGold000001", name: "Gold Coins", type: "item", img: "systems/ose/assets/gold.png", system: { quantity: { value: 20 }, cost: 1, weight: 1, treasure: true } },
			{ _id: "bag1000000000000", name: "Sack", type: "container", system: { quantity: { value: 1 }, cost: 1, weight: 5 } },
			{ _id: "bag2000000000000", name: "Sack", type: "container", system: { quantity: { value: 1 }, cost: 1, weight: 5 } },
			{ _id: "sword10000000000", name: "Sword", type: "weapon", system: { quantity: { value: 1 }, cost: 10, weight: 60 } },
			{ _id: "sword20000000000", name: "Sword", type: "weapon", system: { quantity: { value: 1 }, cost: 10, weight: 60 } },
			{ _id: "pot1000000000000", name: "Potion (Found)", type: "item", system: { quantity: { value: 1 }, cost: 0, weight: 10, description: "Healing" } },
			{ _id: "pot2000000000000", name: "Potion (Found)", type: "item", system: { quantity: { value: 1 }, cost: 0, weight: 10, description: "Poison" } }
		]
	});

	const fakeStore = {
		actor: pileActor,
		allItems: { set() {} },
		populateItems() {},
		refreshItems() {}
	};

	await ItemPileStore.prototype.consolidate.call(fakeStore);

	assert.equal(pileActor.items.get("gpRow10000000000").system.quantity.value, 80);
	assert.equal(pileActor.items.get("gpRow20000000000"), undefined);
	assert.equal(pileActor.items.get("zeroGold00000001").system.quantity.value, 20, "0-qty currency must not inflate to 21");
	assert.ok(pileActor.items.get("bag1000000000000") && pileActor.items.get("bag2000000000000"), "containers must never be merged");
	assert.ok(pileActor.items.get("sword10000000000") && pileActor.items.get("sword20000000000"), "weapons must never be merged");
	assert.ok(pileActor.items.get("pot1000000000000") && pileActor.items.get("pot2000000000000"), "items with distinct descriptions must not be merged");
});

test("PrivateAPI._depositWithdrawItem unpacks { quantity, createNewRow } from DropItemDialog.show and respects cancel", async () => {
	const sourceActor = new MockActor({
		flags: { "item-piles": { data: { enabled: false } } }
	});
	const vaultActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "vault", canStackItems: "yes" } } }
	});

	let transferredPayload = null;
	game.itempiles.API.transferItems = async (_src, _dst, items) => {
		transferredPayload = items;
		return items;
	};

	DropItemDialog.show = async () => null;
	await PrivateAPI._depositWithdrawItem({
		source: sourceActor,
		target: vaultActor,
		itemData: {
			item: { name: "Rations", type: "item", system: { quantity: { value: 7 }, cost: 5, weight: 20 } }
		},
		gridPosition: { x: 2, y: 3 }
	});
	assert.equal(transferredPayload, null, "cancelling DropItemDialog aborts vault deposit");

	DropItemDialog.show = async () => ({ quantity: 4, createNewRow: true });
	await PrivateAPI._depositWithdrawItem({
		source: sourceActor,
		target: vaultActor,
		itemData: {
			item: { name: "Rations", type: "item", system: { quantity: { value: 7 }, cost: 5, weight: 20 } }
		},
		gridPosition: { x: 2, y: 3 }
	});
	assert.ok(Array.isArray(transferredPayload));
	assert.equal(transferredPayload[0].quantity, 4, "quantity must be unwrapped number 4, not object");
	assert.equal(transferredPayload[0].item.system.quantity.value, 4);
	assert.equal(transferredPayload[0].item.flags["item-piles"].item.canStack, "no");
});

test("checkItemType uses DialogV2.confirm with ['ose', 'dialog'] classes and explicit position; updateDocumentAttributes invokes ATTRIBUTE_UPDATE_HANDLER", async () => {
	MockDialogV2.instances.length = 0;
	MockDialogV2.nextConfirmResult = true;

	const pileActor = new MockActor({
		flags: { "item-piles": { data: { enabled: true, type: "pile" } } }
	});
	const spellItem = { name: "Magic Missile", type: "spell", system: {} };

	const res = await PileUtilities.checkItemType(pileActor, spellItem);
	assert.equal(res, spellItem);
	assert.equal(MockDialogV2.instances.length, 1);
	const dlg = MockDialogV2.instances[0];
	assert.deepEqual(dlg.options.classes, ["ose", "dialog"]);
	assert.deepEqual(dlg.options.position, { width: 400, height: "auto" });

	let handlerCalled = false;
	SYSTEMS._currentSystem = {
		...SYSTEMS.DEFAULT_SETTINGS,
		ATTRIBUTE_UPDATE_HANDLER: async (_doc, changes) => {
			handlerCalled = true;
			delete changes["system.derivedGold"];
			changes["system.bankGold"] = 42;
			return changes;
		}
	};
	await PileUtilities.updateDocumentAttributes(pileActor, { "system.derivedGold": 99 });
	assert.equal(handlerCalled, true);
	assert.equal(pileActor.system.bankGold, 42);
	SYSTEMS._currentSystem = false;
});

test("ApplicationV2 header controls register action handlers and resolve app.document fallback", async () => {
	const registeredHooks = new Map();
	globalThis.Hooks.on = (name, fn) => registeredHooks.set(name, fn);
	const { default: registerUIOverrides } = await import("../src/foundry-ui-overrides.js");
	registerUIOverrides();

	const headerHook = registeredHooks.get("getHeaderControlsApplicationV2");
	assert.equal(typeof headerHook, "function");

	const actorDoc = new MockActor({ name: "V2 Sheet Actor" });
	const v2ActorSheet = {
		document: actorDoc,
		options: { actions: {} }
	};
	const actorButtons = [];
	headerHook(v2ActorSheet, actorButtons);

	assert.equal(actorButtons.length, 1);
	assert.equal(actorButtons[0].action, "item-piles-configure-actor");
	assert.equal(typeof v2ActorSheet.options.actions["item-piles-configure-actor"], "function");
});
