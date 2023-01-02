require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const verifyRequest = require('./middlewares/shopifyRequest');
const ordersRouter = require('./routes/orders');
require('./assets/errorHandlers');

//AWS health check
app.get('/isalive', (req, res) => {
	res.send('OK');
});

//require('./assets/resetWebhooks');
require('./assets/loadWebhooks');
app.use(verifyRequest);

app.use(require('morgan')('dev'));
app.use(express.json());

app.use('/api/orders', ordersRouter);

app.all('*', (req, res) => {
	res.status(404).send('not found');
});

http.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
