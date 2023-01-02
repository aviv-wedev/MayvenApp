process.on('uncaughtException', (err) => {
	console.log(err);
});

process.on('unhandledException', (err) => {
	console.log(err);
});

process.on('rejectionHandled', (err) => {
	console.log(err);
});
