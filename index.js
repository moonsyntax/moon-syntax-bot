require('dotenv').config();

const axios = require('axios');

const { Telegraf } = require('telegraf');

const shajs = require('sha.js');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const canvas = new ChartJSNodeCanvas({ width: 2000, height: 1200 });

const bot = new Telegraf(process.env.TELEGRAMBOT);

const { validate, getAddressInfo } = require('bitcoin-address-validation');
const { configDotenv } = require('dotenv');

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

async function getCryptoChart(crypto, days = 7) {
	const response = await axiosCache(`https://api.coingecko.com/api/v3/coins/${crypto}/market_chart?vs_currency=usd&days=${days}`);

	const prices = response.prices;

	const dates = prices.map((price) => {
		const date = new Date(price[0]);
		return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
	});

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

async function getTrendingCrypto() {
	try {
		const response = await axiosCache('https://api.coingecko.com/api/v3/search/trending');

		const coins = response.coins;

		const trending = coins.map((coin) => {
			const { item } = coin;

			const { name, symbol, market_cap_rank, thumb } = item;

			return `${name} (${symbol})`;
		});

		return trending.join('\n');
	} catch (error) {
		console.error(error);
	}
}

let coinslist = [];

async function getAllCryptoNames() {
	const response = await axiosCache('https://api.coingecko.com/api/v3/coins/list');

	const coins = response;

	coinslist = coins.map((coin) => {
		const { id } = coin;

		return `${id}`;
	});
}

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
	const days = parseCommand(ctx.message.text)[2] || 7;

	if (!crypto) {
		replyandlog(ctx, 'Please specify a crypto');
		return;
	}

	const imageBuffer = await getCryptoChart(crypto, days);

	if (!imageBuffer) {
		replyandlog(ctx, 'Crypto not found');
		return;
	}

	ctx.replyWithPhoto({ source: imageBuffer });
});

bot.command('trending', async (ctx) => {
	const trending = await getTrendingCrypto();

	if (!trending) {
		replyandlog(ctx, 'Crypto not found');
		return;
	}

	replyandlog(ctx, trending);
});

async function getBitcoinAddressInfo(address) {
	try {
		const response = await axios.get(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);

		const data = response.data;

		return data;
	} catch (error) {
		console.error(error);
	}
}

bot.on('message', async (ctx) => {
	const text = ctx.message.text;

	const words = text.split(' ');

	console.log(words);

	const addresses = words.filter((word) => validate(word));

	if (addresses.length > 0) {
		const address = addresses[0];

		const info = await getBitcoinAddressInfo(address);

		const { balance, final_balance, total_received, total_sent } = info;

		const balanceInBTC = balance / 100000000;

		const final_balanceInBTC = final_balance / 100000000;

		const total_receivedInBTC = total_received / 100000000;

		const total_sentInBTC = total_sent / 100000000;

		replyandlog(
			ctx,
			`Address: ${address}\n\nBalance: ${balanceInBTC} BTC\nFinal Balance: ${final_balanceInBTC} BTC\nTotal Received: ${total_receivedInBTC} BTC\nTotal Sent: ${total_sentInBTC} BTC`
		);
	}

	const cryptos = words.filter((word) => coinslist.includes(word.toLowerCase()));

	if (cryptos.length > 0) {
		const crypto = cryptos[0];

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
	}
});

try {
	getAllCryptoNames();
	bot.launch();
} catch (error) {
	console.log(error);
}
