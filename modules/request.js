const shajs = require('sha.js');

const axios = require('axios');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const canvas = new ChartJSNodeCanvas({ width: 2000, height: 1200 });

// save cache
let saveCache = [];

// 5 minutes
const timetottl = 1000 * 60 * 5;

async function axiosCache(url) {
	const hash = shajs('sha256').update(url).digest('hex');

	if (saveCache.find((x) => x.hash === hash)) {
		console.log('Cache', saveCache.length);

		return saveCache.find((x) => x.hash === hash).maindata;
	}

	try {
		const cache = await axios.get(url);

		const maindata = cache.data;

		saveCache.push({ hash, maindata, ttl: Date.now() });

		saveCache = saveCache.filter((x) => x.ttl > Date.now() - timetottl);

		return maindata;
	} catch (error) {
		console.error(error);
	}
}

async function getCryptoData(crypto) {
	try {
		const response = await axiosCache(`https://api.coingecko.com/api/v3/coins/${crypto}`);

		return response;
	} catch (error) {
		console.error(error);
	}
}

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

async function getBitcoinAddressInfo(address) {
	try {
		const response = await axiosCache(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);

		return response;
	} catch (error) {
		console.error(error);
	}
}

module.exports = {
	axiosCache,
	getCryptoData,
	getCryptoChart,
	getBitcoinAddressInfo,
};
