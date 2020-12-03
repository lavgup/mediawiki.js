const { get, post, put, delete: del } = require('got');
const { CookieJar } = require('tough-cookie');

const MediaWikiJSError = require('./MediaWikiJSError');

class API {
    #mwToken;
    #jar;
    #server;
    #path;

    constructor(options) {
        this.#server = options.server;
        this.#path = options.path;
        this.wikiId = options.wikiId;

        this.#jar = new CookieJar();
        this.#mwToken = '+\\';
    }

    setServer(server,path){
        this.#server = server;
        this.#path = path;
        this.logout();
        return this;
    }

    async #mw(params, csrf, method) {
        if (typeof method !== 'string') throw Error('Critical Error in MW.js Library');
        const payload = {
            responseType: 'json',
            cookieJar: this.#jar
        };

        const payloadType = (method==='post'?'form':'searchParams');
        payload[payloadType] = {
            ...params,
            format: 'json',
            formatversion: 2
        };
        // Add csrf
        if (csrf) payload[payloadType].token = this.#mwToken;

        const { body } = await (method === 'post' ? post : get)(`${this.#server + this.#path}/api.php`, payload);
        if (!body) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', 'Request did not return a body');
        }

        if (body.error) {
            // CSRF Catch
            if (body.error?.code === 'badtoken') {
                let tokenPack = await this.get({
                    action: 'query',
                    meta:'tokens',
                    type: 'csrf'
                });

                if (tokenPack?.query?.tokens?.csrftoken) {
                    this.#mwToken = tokenPack.query.tokens.csrftoken;
                } else {
                    // MW 1.19 support
                    tokenPack = await this.get({
                        action: 'query',
                        prop: 'info',
                        intoken: 'edit',
                        titles: 'F'
                    });
                    this.#mwToken = Object.values(tokenPack.query.pages)[0].edittoken;
                }

                return this.#mw(params, csrf, method);
            }
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }
        return body;
    }

    logout() {
        this.#mwToken = '+\\';
        return this.#jar.removeAllCookiesSync();
    }

    get(params,csrf) {
        return this.#mw(params, csrf, 'get');
    }

    post(params,csrf) {
        return this.#mw(params, csrf, 'post');
    }
}

module.exports = API;
