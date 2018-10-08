/** Constants */
const BASE_PATH = '/v2/band/';
const GET_POSTS = `${BASE_PATH}posts`;
const GET_COMMENT_WARNINGS = `${BASE_PATH}post/comments`;
const CREATE_COMMENT = `${BASE_PATH}post/comment/create`;
const REMOVE_COMMENT_WARNING = `${BASE_PATH}post/comment/remove`;

/** Load libraries */
const querystring = require('querystring');
const fs = require('fs');
const Utils = require('./Utils');

/** Declare variable */
//Read congif file
let config = require('./config.json');
//Init delay 5 seconds
let delay = 5;

//Loop the run each 1 seconds
setInterval(() => {
	if (delay === 0) { //When delay is zero
		//Set access delay
		delay = config.ACCESS_DELAY;

		//Read posts each band
		config.BAND_KEYS.forEach(band_key => {
			process.stdout.write(`    read: ${band_key}\r`);
			readPosts(band_key);
		});

		//Save config file
		fs.writeFile('./config.json', JSON.stringify(config, null, '\t'), 'utf8', () => {
		});
	} else {
		//Print delay
		process.stdout.write(`    delay: ${--delay}                         \r`);
	}
}, 1000);

function readPosts(band_key) {
	//Request posts (GET)
	Utils.httpGet({
		path: `${GET_POSTS}?${querystring.stringify({
			access_token: config.ACCESS_TOKEN,
			band_key
		})}`
	}, (code, data) => {
		if (code === 1) { //When result_code is '1'
			if (config.VIOLATIONS[band_key] === undefined) {
				config.VIOLATIONS[band_key] = {};
			}
			data.items.forEach(
				item => {
					let post_key = item.post_key;
					let hash = Utils.createHash(item.content);
					if (Utils.containsAny(item.content, config.TAGS)) { //When post contain any tag
						if (
							config.VIOLATIONS[band_key][post_key] !== undefined //Have  warning
							&& config.VIOLATIONS[band_key][post_key].hash !== hash //Edited after warning
						) {
							removeComments(band_key, post_key, () => createComment(band_key, post_key, `${config.COMMENT.THANKS.PREFIX}\n${config.COMMENT.THANKS.CONTENT}`));
						}
					} else {
						if (
							config.VIOLATIONS[band_key][post_key] === undefined //Have never warning
							|| config.VIOLATIONS[band_key][post_key].hash !== hash //Edited after warning
							|| new Date().getTime() - config.VIOLATIONS[band_key][post_key].time >= 3600000 //1 hour passed after the warning
						) {
							//Store violation data
							config.VIOLATIONS[band_key][post_key] = {
								user_key: item.author.user_key,
								time: new Date().getTime(),
								hash,
							};

							//Print violation info
							console.log(`name: ${item.author.name}, post_key: ${post_key}`);
							removeComments(band_key, post_key, () => createComment(band_key, post_key, `${config.COMMENT.WARNING.PREFIX}\n${config.COMMENT.WARNING.CONTENT}`));
						}

					}
				}
			);
		} else {
			console.log(data);
		}
	});
}

function createComment(band_key, post_key, body) {
	//Request comment create (POST)
	Utils.httpGet({
		method: 'POST',
		path: `${CREATE_COMMENT}?${querystring.stringify({
			access_token: config.ACCESS_TOKEN,
			band_key,
			post_key,
			body
		})}`
	}, (code, data) => {
		if (code !== 1) { //When failure
			//Retry request
			createComment(band_key, post_key, body);

			if (code !== 1003) { //Ignore Cool down time restriction
				console.log(data);
			}
		}
	});
}

function removeComment(band_key, post_key, comment_key) {
	//Request comment remove (POST)
	Utils.httpGet({
		method: 'POST',
		path: `${REMOVE_COMMENT_WARNING}?${querystring.stringify({
			access_token: config.ACCESS_TOKEN,
			band_key,
			post_key,
			comment_key
		})}`
	}, (code, data) => {
		if (code !== 1) { //When failure
			//Retry request
			removeComment(band_key, post_key, comment_key);

			if (code !== 1003) { //Ignore Cool down time restriction
				console.log(data);
			}
		}
	});
}

function removeComments(band_key, post_key, callback = null) {
	//Request post comments (GET)
	Utils.httpGet({
		path: `${GET_COMMENT_WARNINGS}?${querystring.stringify({
			access_token: config.ACCESS_TOKEN,
			band_key,
			post_key
		})}`
	}, (code, data) => {
		if (code === 1) { //When success
			data.items.forEach(
				item => {
					if (item.comment_key !== undefined && (
						item.content.indexOf(config.COMMENT.WARNING.PREFIX) === 0 //When comment starts with COMMENT.WARNING.PREFIX
						|| item.content.indexOf(config.COMMENT.THANKS.PREFIX) === 0 //or comment starts with COMMENT.THANKS.PREFIX
					)) {
						removeComment(band_key, post_key, item.comment_key);
					}
				}
			);

			//Run call back
			if (callback !== null) {
				callback();
			}
		} else {
			//Retry request
			removeComments(band_key, post_key, callback);

			if (code !== 1003) { //Ignore Cool down time restriction
				console.log(data);
			}
		}
	});
}
