require('dotenv').config();
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
Shopify.Context.API_VERSION = ApiVersion.October22;
const shop = 'mayven-shop.myshopify.com/';

const client = new Shopify.Clients.Rest(shop, process.env.ADMIN_API_KEY);
//const gqlClient = new Shopify.Clients.Graphql(shop, process.env.ADMIN_API_KEY);

module.exports = client;
