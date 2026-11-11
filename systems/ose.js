/**
 * Reference OSE configuration (Item Piles 3.3+ is system-agnostic at runtime;
 * active registration is performed by `ose-foundry-core-gygax75` in
 * `src/module/fvttModuleAPIs.js` via `game.itempiles.API.addSystemIntegration`).
 */
export default {

	"VERSION": "1.0.2",

	// The actor class type is the type of actor that will be used for the default item pile actor that is created on first item drop.
	"ACTOR_CLASS_TYPE": "character",

	// The item class type is the type of item that will be used for the default loot item
	"ITEM_CLASS_LOOT_TYPE": "item",

	// The item class type is the type of item that will be used for the default weapon item
	"ITEM_CLASS_WEAPON_TYPE": "weapon",

	// The item class type is the type of item that will be used for the default equipment item
	"ITEM_CLASS_EQUIPMENT_TYPE": "armor",

	// The item quantity attribute is the path to the attribute on items that denote how many of that item that exists
	"ITEM_QUANTITY_ATTRIBUTE": "system.quantity.value",

	// The item price attribute is the path to the attribute on each item that determine how much it costs
	"ITEM_PRICE_ATTRIBUTE": "system.cost",

	// Item types and the filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, abilities, classes, and races
	"ITEM_FILTERS": [
		{
			"path": "type",
			"filters": "spell,ability,class,race"
		}
	],

	"UNSTACKABLE_ITEM_TYPES": ["weapon", "armor", "container"],

	// Item similarities determines how item piles detect similarities and differences in the system
	"ITEM_SIMILARITIES": ["name", "type", "system.treasure"],

	"CURRENCIES": [
		{
			type: "item",
			name: "Platinum Coins",
			img: "icons/commodities/currency/coins-assorted-mix-platinum.webp",
			abbreviation: "{#}PP",
			data: {
				item: {
					"name": "Platinum Coins",
					"type": "item",
					"img": "icons/commodities/currency/coins-assorted-mix-platinum.webp",
					"system": {
						"quantity": { "value": 1, "max": null },
						"weight": 1,
						"cost": 5,
						"treasure": true
					}
				}
			},
			primary: false,
			exchangeRate: 5
		},
		{
			type: "item",
			name: "OSE.items.gp.long",
			img: "systems/ose/assets/gold.png",
			abbreviation: "{#}GP",
			data: {
				item: {
					"name": "Gold Coins",
					"type": "item",
					"img": "systems/ose/assets/gold.png",
					"system": {
						"quantity": { "value": 1, "max": null },
						// OSE measures encumbrance in coins: one coin weighs 1.
						"weight": 1,
						"cost": 1,
						"treasure": true
					}
				}
			},
			primary: true,
			exchangeRate: 1
		},
		{
			type: "item",
			name: "Electrum Coins",
			img: "icons/commodities/currency/coins-assorted-mix-silver.webp",
			abbreviation: "{#}EP",
			data: {
				item: {
					"name": "Electrum Coins",
					"type": "item",
					"img": "icons/commodities/currency/coins-assorted-mix-silver.webp",
					"system": {
						"quantity": { "value": 1, "max": null },
						"weight": 1,
						"cost": 0.5,
						"treasure": true
					}
				}
			},
			primary: false,
			exchangeRate: 0.5
		},
		{
			type: "item",
			name: "Silver Coins",
			img: "icons/commodities/currency/coins-plain-stack-silver.webp",
			abbreviation: "{#}SP",
			data: {
				item: {
					"name": "Silver Coins",
					"type": "item",
					"img": "icons/commodities/currency/coins-plain-stack-silver.webp",
					"system": {
						"quantity": { "value": 1, "max": null },
						"weight": 1,
						"cost": 0.1,
						"treasure": true
					}
				}
			},
			primary: false,
			exchangeRate: 0.1
		},
		{
			type: "item",
			name: "Copper Coins",
			img: "icons/commodities/currency/coins-assorted-mix-copper.webp",
			abbreviation: "{#}CP",
			data: {
				item: {
					"name": "Copper Coins",
					"type": "item",
					"img": "icons/commodities/currency/coins-assorted-mix-copper.webp",
					"system": {
						"quantity": { "value": 1, "max": null },
						"weight": 1,
						"cost": 0.01,
						"treasure": true
					}
				}
			},
			primary: false,
			exchangeRate: 0.01
		}
	]
}
