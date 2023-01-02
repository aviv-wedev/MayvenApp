require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { DataType } = require('@shopify/shopify-api');
const client = require('../assets/client');
const shopifyFetch = require('../assets/shopifyFetch');

router.post('/create', async (req, res) => {
	//reply 200 to shopify
	res.status(200).send();

	//extract sku and quantity
	const order = req.body;
	const productsQuantity = {};

	for (const line_item of order.line_items) {
		const realSku = line_item.sku.split('-')[0];
		const skuQuantity = line_item.sku.split('-')[1];
		const variantQuantity = line_item.quantity * parseInt(skuQuantity, 10);

		if (productsQuantity[realSku]) {
			productsQuantity[realSku] += variantQuantity;
		} else {
			productsQuantity[realSku] = variantQuantity;
		}
	}

	//productsQuantity = { sku: quantity, ... }
	console.log(productsQuantity);

	//find the inventory product by SKU
	const allProducts = await shopifyFetch(client, 'products');

	for (const product of allProducts) {
		for (const variant of product.variants) {
			if (productsQuantity[variant.sku]) {
				productsQuantity[variant.sku] = {
					quantity: productsQuantity[variant.sku],
					product: product,
					variant: variant,
				};
			}
		}
	}

	//productsQuantity = { sku: { quantity: number, product: object, variant: object }, ... }

	//get CostOfGood and CodeNames
	let costOfGood = 0;
	let codeNames = [];
	for (const sku in productsQuantity) {
		if (typeof productsQuantity[sku] == 'object') {
			const variantMetafields = await client.get({
				path: `products/${productsQuantity[sku].product.id}/metafields`,
			});

			for (const metafield of variantMetafields.body.metafields) {
				if (metafield.key == 'inv_label') {
					codeNames.push(`${metafield.value}X${productsQuantity[sku].quantity}`);
				}
			}
			costOfGood += await calculateCog(productsQuantity[sku]);
		}
	}
	costOfGood = costOfGood.toFixed(2);
	console.log(costOfGood, codeNames);
});

async function calculateCog(item) {
	const inventoryItem = await shopifyFetch(client, 'inventory_items', [`ids=${item.variant.inventory_item_id}`]);
	return parseFloat(item.quantity * inventoryItem[0].cost);
}

module.exports = router;
