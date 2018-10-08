/** Constants */
const DEFAULT_OPTION = {
	host: 'openapi.band.us',
	port: '443',
	method: 'GET',
};

/** Load libraries */
const https = require('https');

/**
 * @param options
 * @param callback
 */
function httpGet(options, callback) {
	//Request https GET/POST
	https.get({
		...DEFAULT_OPTION,
		...options
	}, response => {
		let data = '';
		response.on('data', chunk => data += chunk.toString());
		response.on('end', () => {
			let json = JSON.parse(data);
			callback(json.result_code, json.result_data);
		});
	});
}

/**
 * @param {string} haystack
 * @param {string[]} needles
 * @returns {boolean} str contains any needle
 */
function containsAny(haystack, needles) {
	return needles.some(item => {
		return haystack.indexOf(item) > -1;
	});
}

/**
 * @param {string} str
 * @returns {number} hash created by string
 */
function createHash(str) {
	let hash = 0, i, chr;
	if (str.length === 0) {
		return hash;
	}
	for (i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0;
	}
	return hash;
}

module.exports = {
	httpGet,
	containsAny,
	createHash
};
