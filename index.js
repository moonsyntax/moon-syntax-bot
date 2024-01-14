const axios = require('axios');
const { Telegraf } = require('telegraf');
const bot = new Telegraf('6763816126:AAH3VQtQiNRhok62bld_7SZoPFY-WDelbXQ');

function parseCommand(text) {
	return text.split(' ');
}

const getCryptoPrice = async (crypto) => {
	try {
		const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
		return response.data[crypto].usd;
	} catch (error) {
		console.error(error);
	}
};

bot.start((ctx) => ctx.reply('Welcome!'));

bot.command('price', async (ctx) => {
	const crypto = parseCommand(ctx.message.text)[1];

	if (!crypto) {
		return ctx.reply('Please specify a crypto');
	}

	const price = await getCryptoPrice(crypto);

	if (!price) {
		return ctx.reply('Crypto not found');
	}

	return ctx.reply(`The current price of ${crypto} is $${price}`);
});

bot.launch();
