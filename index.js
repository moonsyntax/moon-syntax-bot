const axios = require('axios');

const { Telegraf } = require('telegraf');

const shajs = require('sha.js');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const canvas = new ChartJSNodeCanvas({ width: 1000, height: 1000 });

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

async function getCryptoChart(crypto) {
	const response = await axiosCache(`https://api.coingecko.com/api/v3/coins/${crypto}/market_chart?vs_currency=usd&days=30`);

	const prices = response.prices;

	const dates = prices.map((price) => new Date(price[0]));
	const pricesInUSD = prices.map((price) => price[1]);

	const chartData = {
		type: 'line',
		data: {
			labels: dates,
			datasets: [
				{
					label: `${crypto.toUpperCase()} Price (USD)`,
					data: pricesInUSD,
					borderColor: 'blue',
					fill: false,
				},
			],
		},
	};

	const imageBuffer = await canvas.renderToBuffer(chartData);

	return imageBuffer;
}

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

	const imageBuffer = await getCryptoChart(crypto);

	if (!imageBuffer) {
		replyandlog(ctx, 'Crypto not found');
		return;
	}

	ctx.replyWithPhoto({ source: imageBuffer });
});

bot.launch();
