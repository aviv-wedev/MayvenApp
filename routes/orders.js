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

	//extract sku, quantity and upsell properties
	const order = req.body;
	const productsQuantity = {};
	const upsellProperties = [];

	for (const line_item of order.line_items) {
		const realSku = line_item.sku.split('-')[0];
		const skuQuantity = line_item.sku.split('-')[1];
		const variantQuantity = line_item.quantity * parseInt(skuQuantity, 10);

		if (productsQuantity[realSku]) {
			productsQuantity[realSku] += variantQuantity;
		} else {
			productsQuantity[realSku] = variantQuantity;
		}

		if (line_item.properties.length > 0) {
			const upsellProperty = getUpsellProperty(line_item, 'downsale');

			if (upsellProperty && !upsellProperties.find((property) => property == upsellProperty)) {
				upsellProperties.push(upsellProperty);
			}
		}
	}

	//productsQuantity = { sku: quantity, ... }
	console.log(productsQuantity, upsellProperties);

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

			for (const metafield of variantMetafields?.body?.metafields) {
				if (metafield.key == 'inv_label') {
					codeNames.push(`${metafield.value}X${productsQuantity[sku].quantity}`);
				}
			}
			costOfGood += await calculateCog(productsQuantity[sku]);
		}
	}
	costOfGood = costOfGood.toFixed(2);
	console.log(costOfGood, codeNames);

	//get the payment id from the transaction
	const transactionList = [];
	const transactions = await client.get({
		path: `orders/${order.id}/transactions`,
	});

	for (const transaction of transactions?.body?.transactions) {
		if (transaction.gateway == 'Hyp') {
			transactionList.push(transaction?.receipt?.payment_id);
		}
	}
	console.log(transactionList);

	//adds tag to orders that contain upsell products
	if (upsellProperties.length > 0) {
		addTag(client, order.id, upsellProperties);
	}
});

function getUpsellProperty(item, upsellName) {
	for (const property of item.properties) {
		if (property.name == upsellName) {
			return `${upsellName} ${property.value}`;
		}
	}
}

async function addTag(client, orderId, tags) {
	let tagsString = '';
	for (const tag of tags) {
		tagsString += `${tag}, `;
	}
	tagsString = tagsString.slice(0, -2);

	let order = {
		id: orderId,
		tags: tagsString,
	};

	const body = { order };
	const response = await client.put({
		path: `/orders/${orderId}`,
		data: body,
		type: DataType.JSON,
	});
}

async function calculateCog(item) {
	const inventoryItem = await shopifyFetch(client, 'inventory_items', [`ids=${item.variant.inventory_item_id}`]);
	return parseFloat(item.quantity * inventoryItem[0].cost);
}

module.exports = router;
