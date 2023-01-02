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

module.exports = shopifyFetch;
