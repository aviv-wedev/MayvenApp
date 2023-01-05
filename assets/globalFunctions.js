const axios = require('axios');
const client = require('../assets/client');
const FormData = require('form-data');
const { DataType } = require('@shopify/shopify-api');

async function shopifyFetch(client, path, queryList = []) {
	let allObjects = [];
	let newObject;
	let nextPageQuery = {
		limit: 250,
	};

	for (const query of queryList) {
		nextPageQuery[query.split('=')[0]] = query.split('=')[1];
	}

	let bodyPath = path;
	if (path.includes('/')) {
		bodyPath = path.split('/')[0];
	}

	while (nextPageQuery) {
		const response = await client.get({
			path: path,
			query: nextPageQuery,
		});
		newObject = response.body[bodyPath];
		allObjects.push(...newObject);
		nextPageQuery = response?.pageInfo?.nextPage?.query;
	}

	return allObjects;
}

function getUpsellProperty(item, upsellName) {
	for (const property of item.properties) {
		if (property.name == upsellName) {
			return `${upsellName} ${property.value}`;
		}
	}
}

async function addTag(client, orderId, oldTags, tags) {
	if (oldTags.length > 0) oldTags += ', ';
	let tagsString = oldTags;
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

async function calculateCog(client, item) {
	const inventoryItem = await shopifyFetch(client, 'inventory_items', [`ids=${item.variant.inventory_item_id}`]);
	return parseFloat(item.quantity * inventoryItem[0].cost);
}

async function addAttributes(client, orderId, attributes) {
	const order = {
		id: orderId,
		note_attributes: attributes,
	};

	const body = { order };

	const noteAttributes = await client.put({
		path: `orders/${orderId}`,
		data: body,
		type: DataType.JSON,
	});
}

async function getPaymentIds(client, order) {
	const transactionList = [];

	const transactions = await client.get({
		path: `orders/${order.id}/transactions`,
	});

	for (const transaction of transactions?.body?.transactions) {
		if (transaction.gateway == 'Hyp') {
			transactionList.push(transaction?.receipt?.payment_id);
		}
	}
	return transactionList;
}

async function getCardsInfo(order = '') {
	const data = new FormData();
	const currentDate = new Date().toISOString().split('T')[0].split('-').join('');
	data.append('action', 'exportXLS');
	data.append('from', 'UserPage');
	data.append('dateF', currentDate);
	data.append('dateT', currentDate);
	data.append('Masof', process.env.MASOF);
	data.append('User', process.env.USERNAME);
	data.append('Pass', process.env.PASSWORD);
	console.log(currentDate, process.env.MASOF, process.env.USERNAME, process.env.PASSWORD);

	const config = {
		method: 'POST',
		url: 'https://icom.yaad.net/p/',
		headers: {
			...data.getHeaders(),
		},
		data: data,
	};
	axios(config).then((res) => console.log(JSON.stringify(res.data)));
}

async function submitToZoho(url, body) {
	return await axios.post(url, body);
}

module.exports = {
	shopifyFetch,
	getUpsellProperty,
	addTag,
	calculateCog,
	addAttributes,
	getPaymentIds,
	getCardsInfo,
	submitToZoho,
};
