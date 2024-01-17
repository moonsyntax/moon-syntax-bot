require('dotenv').config();

const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAMBOT);

const { validate } = require('bitcoin-address-validation');

const { axiosCache, getTrendingCrypto, getCryptoChart, getCryptoData, getBitcoinAddressInfo } = require('./modules/request.js');

const { parseCommand, replyandlog } = require('./modules/utils.js');

let coinslist = [];

async function getAllCryptoNames() {
	const coins = await axiosCache('https://api.coingecko.com/api/v3/coins/list');

	for (let i = 0; i < coins.length; i++) {
		const coin = coins[i];

		coinslist.push({
			name: coin.name,
			symbol: coin.symbol,
			id: coin.id,
		});
	}
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

bot.on('message', async (ctx) => {
	const text = ctx.message.text;

	const words = text.split(' ');

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
