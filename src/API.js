const { get, post, put, delete: del } = require('got');
const MediaWikiJSError = require('./MediaWikiJSError');

class API {
    #mwToken
    constructor(options) {
        this.server = options.server;
        this.path = options.path;
        this.jar = options.jar;
        this.#mwToken = '+\\';
        this.wikiId = options.wikiId;
    }
    async #mw(params, csrf, method){
        if (typeof method !== 'string') throw Error("Critical Error in MW.js Library");
        const payload = {
            responseType: 'json',
            cookieJar: this.jar
        };
        payload[(method==='post'?'json':'searchParams')] = {
            ...params,
            format: 'json'
        };
        // Add csrf
        if (csrf) payload[(method==='post'?'json':'searchParam')].token = this.#mwToken;

        const { body } = await (method==='post'?post:get)(`${this.server + this.path}/api.php`, payload);
        if (!body) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', 'Request did not return a body');
        }

        if (body.error) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }

        if (body?.error?.code === 'badtoken') {
            this.#mwToken = await this.get({action:'query',meta:'tokens',type: 'csrf'});
            // Can be A Recursive Nightmare? It shouldn't be...
            const { backup } = await this.mw(params, csrf, method);
            return backup;
        }
        return body;
    }
    get(params,csrf) {
        return this.#mw(params, csrf, 'get');
    }

    post(params,csrf) {
        return this.#mw(params, csrf, 'post');
    }

    async #discuss(url, params, method) {
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
        return this.#discuss(url, params, post);
    }

    putF(url, params) {
        return this.#discuss(url, params, put);
    }

    deleteF(url, params) {
        return this.#discuss(url, params, del);
    }
}

module.exports = API;
