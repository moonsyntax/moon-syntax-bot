let coinslist = [];

const { axiosCache } = require('./request.js');

async function precheck(crypto) {
	if (coinslist.length === 0) {
		const datax = await axiosCache('https://api.coingecko.com/api/v3/coins/list');

		datax.forEach((element) => {
			coinslist.push({
				id: element.id,
				symbol: element.symbol,
				name: element.name,
			});
		});

		console.log('coinslist updated');
	}

	const coin = coinslist.find(
		(element) => element.name.toLowerCase() === crypto.toLowerCase() || element.symbol.toLowerCase() === crypto.toLowerCase()
	);

	if (coin) {
		return coin.id;
	} else {
		return false;
	}
}

async function getMentionedCrypto(text) {
	const words = text.split(' ');

	for (let i = 0; i < words.length; i++) {
		const word = words[i];

		const coin = await precheck(word);

		if (coin) {
			console.log('getMentionedCrypto: ' + coin);
			return coin;
		}
	}

	return false;
}

module.exports = {
	precheck,
	getMentionedCrypto,
};
