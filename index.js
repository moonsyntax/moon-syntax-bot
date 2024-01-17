require('dotenv').config();

const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAMBOT);

const { validate } = require('bitcoin-address-validation');

const { getCryptoChart, getCryptoData, getBitcoinAddressInfo } = require('./modules/request.js');

const { precheck, getMentionedCrypto } = require('./modules/utils.js');

bot.start((ctx) => ctx.reply('Welcome'));

bot.on('message', async (ctx) => {
	const words = ctx.message.text.split(' ').map((x) => x.trim());

	const crypto = await getMentionedCrypto(ctx.message.text);

	if (words.includes('price') && crypto) {
		const data = await getCryptoData(crypto);

		const { name, symbol, market_data } = data;

		const { current_price, ath, atl } = market_data;

		ctx.reply(
			`${name} (${symbol}) \n\nPrice:\n${current_price.usd} USD\n${current_price.btc} BTC \n\nATH : ${ath.usd} USD \nATL : ${atl.usd} USD\n`
		);
	}

	if (words.includes('chart') && crypto) {
		const imageBuffer = await getCryptoChart(crypto, words[2]);

		if (imageBuffer) {
			ctx.replyWithPhoto({ source: imageBuffer });
		}
	}

	// Check if the message contains a bitcoin address
	words.forEach(async (word) => {
		if (validate(word)) {
			const data = await getBitcoinAddressInfo(word);

			const { address, balance, total_sent, total_received } = data;

			ctx.reply(
				`Address: ${address}\nBalance: ${balance} BTC\nTotal Sent: ${total_sent} BTC\nTotal Received: ${total_received} BTC`
			);
		}
	});
});

try {
	bot.launch();
} catch (error) {
	console.log(error);
}
