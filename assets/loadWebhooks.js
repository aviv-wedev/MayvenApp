require('dotenv').config();
const client = require('./client');
const { DataType } = require('@shopify/shopify-api');
const availableTopics = ['orders/create', 'orders/updated'];
const activeWebhooks = [];

initiateWebhooks();

async function initiateWebhooks() {
	const response = await client.get({
		path: 'webhooks',
		query: {
			limit: 250,
		},
	});

	const webhooks = response.body.webhooks;
	console.log(webhooks);

	for (const topic of availableTopics) {
		const url = `${process.env.WEBHOOK_URL}/api/${topic.split('/')[0]}/${topic.split('/')[1]}`;
		const existingWebhook = webhooks.find((webhook) => webhook.topic == topic && webhook.address == url);

		if (!existingWebhook) {
			try {
				await client.post({
					path: 'webhooks',
					type: DataType.JSON,
					data: {
						webhook: {
							topic: topic,
							address: url,
							format: 'json',
						},
					},
				});
				console.log(`Webhook created for topic: ${topic}`);
				activeWebhooks.push(topic);
			} catch (err) {
				console.log(err);
			}
		} else {
			activeWebhooks.push(topic);
		}
	}

	if (activeWebhooks.length > 0) {
		console.log(`Active webhooks:`);
		for (const activeWebhook of activeWebhooks) {
			console.log(activeWebhook);
		}
	}
}
