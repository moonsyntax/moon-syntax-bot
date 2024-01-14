const axios = require('axios');
const { Telegraf } = require('telegraf');
var shajs = require('sha.js');

const bot = new Telegraf('6763816126:AAH3VQtQiNRhok62bld_7SZoPFY-WDelbXQ');

let saveCache = [];

function parseCommand(text) {
	const items = text.split(' ');
	return items.map((x) => x.trim());
}

function replyandlog(ctx, text) {
	console.log(text);
	return ctx.reply(text);
}

async function axiosCache(url) {
	const hash = shajs('sha256').update(url).digest('hex');

	if (saveCache.find((x) => x.hash === hash)) {
		console.log('Cache', saveCache.length);

		return saveCache.find((x) => x.hash === hash).maindata;
	}

	const cache = await axios.get(url);

	const maindata = cache.data;

	saveCache.push({ hash, maindata });

	saveCache = saveCache.slice(-1000);

	return maindata;
}

const getCryptoPrice = async (crypto) => {
	try {
		const response = await axiosCache(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);

		return response[crypto].usd;
	} catch (error) {
		console.error(error);
	}
};

bot.start((ctx) => ctx.reply('Welcome!'));

bot.command('price', async (ctx) => {
	const crypto = parseCommand(ctx.message.text)[1];

	if (!crypto) {
		replyandlog(ctx, 'Please specify a crypto');
		return;
	}

	const price = await getCryptoPrice(crypto);

	if (!price) {
		replyandlog(ctx, 'Sorry, could not get price');
		return;
	}

	replyandlog(ctx, `The price of ${crypto} is ${price} USD`);
});

bot.launch();
