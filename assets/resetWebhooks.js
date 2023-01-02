const client = require('./client');
const { DataType } = require('@shopify/shopify-api');

initiateWebhooks();

async function initiateWebhooks() {
	const response = await client.get({
		path: 'webhooks',
		query: {
			limit: 250,
		},
	});

	const webhooks = response.body.webhooks;

	for (const webhook1 of webhooks) {
		try {
			const res = await client.delete({
				path: `webhooks/${webhook1.id}`,
				type: DataType.JSON,
				data: {
					webhook: {
						id: webhook1.id,
					},
				},
			});
			console.log(`deleted: ${webhook1.address}`);
		} catch (err) {
			console.log(err);
		}
	}
}
