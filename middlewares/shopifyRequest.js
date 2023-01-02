require('dotenv').config();
const { verifyWebhook } = require('verify-shopify-webhook');

async function verifyShopifyRequestMiddleware(req,res,next){
    try{
        const shopName = req.headers['x-shopify-shop-domain'].split('.')[0];
        if(req.path.startsWith('/api/orders')){
            const result = await verifyWebhook(req, process.env.SECRET_KEY);
            if (!result?.verified) {
              throw new Error(`An unverified shopify request was received`);
            }
            req.body = req._body = result.body;
        }
        next();
    }catch(err) {
        console.log(err);
        res.status(500).send("Unverified request");
    }
}

module.exports = verifyShopifyRequestMiddleware;
