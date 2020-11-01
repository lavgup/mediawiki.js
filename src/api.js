const { get, post } = require('got');
const MediaWikiJSError = require('./MWAPIError');

class API {
    constructor(options) {
        this.server = options.server;
        this.path = options.path;
        this.jar = options.jar;
    }

    async get(params) {
        const { body } = await get(`${this.server}/${this.path}api.php`, {
            searchParams: {
                ...params,
                format: 'json'
            },
            responseType: 'json',
            cookieJar: this.jar
        });

        if (!body) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', 'Request did not return a body');
        }

        if (body.error) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }

        return body;
    }

    async post(params) {
        const { body } = await post(`${this.server}/${this.path}api.php`, {
            form: {
                ...params,
                format: 'json'
            },
            responseType: 'json',
            cookieJar: this.jar
        });

        if (!body) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', 'Request did not return a body');
        }

        if (body.error) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }

        return body;
    }
}

module.exports = API;