const { get, post, put, delete: del } = require('got');
const MediaWikiJSError = require('./MediaWikiJSError');

class API {
    constructor(options) {
        this.server = options.server;
        this.path = options.path;
        this.jar = options.jar;

        this.wikiId = options.wikiId;
    }

    async get(params) {
        const { body } = await get(`${this.server + this.path}/api.php`, {
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
        const { body } = await post(`${this.server + this.path}/api.php`, {
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

    async send(url, params, method) {
        const { body } = await method(url, {
            ...params,
            cookieJar: this.jar
        });

        if (body && body.error) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }

        try {
            return JSON.parse(body);
        } catch (err) {
            return body;
        }
    }

    postF(url, params) {
        return this.send(url, params, post);
    }

    put(url, params) {
        return this.send(url, params, put);
    }

    delete(url, params) {
        return this.send(url, params, del);
    }
}

module.exports = API;
