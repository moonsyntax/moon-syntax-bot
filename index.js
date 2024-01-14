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

const getCryptoData = async (crypto) => {
	try {
		const response = await axiosCache(`https://api.coingecko.com/api/v3/coins/${crypto}`);

		return response;
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

	const data = await getCryptoData(crypto);

	if (!data) {
		replyandlog(ctx, 'Crypto not found');
		return;
	}

	const { name, symbol, market_data } = data;

	const { current_price } = market_data;

	replyandlog(ctx, `${name} (${symbol}) \nPrice: ${current_price.usd} USD\nPrice: ${current_price.btc} BTC`);
});

bot.launch();
