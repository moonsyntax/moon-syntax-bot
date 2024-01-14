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

const getCryptoChart = async (crypto) => {
	try {
		const response = await axiosCache(`https://api.coingecko.com/api/v3/coins/${crypto}/market_chart?vs_currency=usd&days=3`);

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

	const { current_price, ath, atl } = market_data;

	replyandlog(
		ctx,
		`${name} (${symbol}) \n\nPrice:\n${current_price.usd} USD\n${current_price.btc} BTC \n\nATH : ${ath.usd} USD \nATL : ${atl.usd} USD\n`
	);
});

bot.command('chart', async (ctx) => {
	const crypto = parseCommand(ctx.message.text)[1];

	if (!crypto) {
		replyandlog(ctx, 'Please specify a crypto');
		return;
	}

	const data = await getCryptoChart(crypto);

	if (!data) {
		replyandlog(ctx, 'Crypto not found');
		return;
	}

	const { prices } = data;

	const chart = `https://chart.googleapis.com/chart?chs=400x400&cht=lc&chco=FF0000&chds=a&chxt=x,y&chxr=1,0,${Math.max(
		...prices.map((x) => x[1])
	)}&chd=t:${prices.map((x) => x[1]).join(',')}`;

	console.log(chart);

	ctx.replyWithPhoto({ url: chart });
});

bot.launch();
