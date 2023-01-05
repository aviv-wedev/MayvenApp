require('dotenv').config();
const express = require('express');
const router = express.Router();
const client = require('../assets/client');
const {
	shopifyFetch,
	getUpsellProperty,
	addTag,
	calculateCog,
	addAttributes,
	getPaymentIds,
	getCardsInfo,
	submitToZoho,
} = require('../assets/globalFunctions');

router.post('/create', async (req, res) => {
	//reply 200 to shopify
	res.status(200).send();

	//extract sku, quantity and upsell properties
	const order = req.body;
	const productsQuantity = {};
	const upsellProperties = [];

	try {
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
		const codeNames = [];
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
				costOfGood += await calculateCog(client, productsQuantity[sku]);
			}
		}
		costOfGood = costOfGood.toFixed(2);

		//adds tag to orders that contain upsell products
		if (upsellProperties.length > 0) {
			addTag(client, order.id, order.tags, upsellProperties);
		}

		//update order
		const oldAttributes = order.note_attributes;
		const newAttributes = [
			{
				name: 'customer_order_note',
				value: codeNames.join('+'),
			},
			{
				name: 'cost_of_good',
				value: `${costOfGood}`,
			},
		];

		await addAttributes(client, order.id, [...oldAttributes, ...newAttributes]);

		//send to zoho
		order.customer_order_note = codeNames.join('+');
		order.cog = costOfGood;

		const zohoRes = await submitToZoho('https://data.mayven.co.il/api-calls/mayaven-shopify-test-orders.php', order);
	} catch (err) {
		addTag(client, order.id, order.tags, ['Creation Process Failed']);
	}
});

router.post('/updated', async (req, res) => {
	//reply 200 to shopify
	res.status(200).send();
	const order = req.body;
	try {
		//get active order's metafields and add them to order object
		const response = await client.get({
			path: `orders/${order.id}/metafields`,
		});

		const orderMetafields = response?.body?.metafields;
		if (!orderMetafields || orderMetafields?.length == 0) return;

		const activeMetafields = [];
		for (const meta of orderMetafields) {
			activeMetafields.push({ key: meta.key, value: meta.value });
		}
		order.metafields = activeMetafields;

		//get creation attributes and add them to order object
		let cog, codeNames;

		for (const attribute of order.note_attributes) {
			if (attribute.name == 'customer_order_note') {
				codeNames = attribute.value;
			}
			if (attribute.name == 'cost_of_good') {
				cog = attribute.value;
			}
		}

		if (cog && codeNames) {
			order.customer_order_note = codeNames;
			order.cog = cog;
		} else {
			//if order doesn't contain at least on of the creation attributes
			addTag(client, order.id, order.tags, ['Outdated Order']);
		}

		const zohoRes = await submitToZoho('https://data.mayven.co.il/api-calls/mayaven-shopify-test-orders.php', order);
	} catch (err) {
		addTag(client, order.id, order.tags, ['Update Process Failed']);
	}
});

module.exports = router;
