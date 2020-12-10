import { Payload, ResObject } from './types';
const { get, post } = require('got');
const { CookieJar } = require('tough-cookie');

const MediaWikiJSError = require('./MediaWikiJSError');

export = class API {
    private mwToken: string;
    private readonly jar: typeof CookieJar;
    server: string;
    path: string;

    constructor(options: { server: string; path: string; wikiId: any; }) {
        this.server = options.server;
        this.path = options.path;

        this.jar = new CookieJar();
        this.mwToken = '+\\';
    }

    setServer(server: string, path: string){
        this.server = server;
        this.path = path;
        this.logout();
        return this;
    }

    private async mw(params: object, csrf: string | undefined, method: 'GET' | 'POST'): Promise<ResObject> {
        const payload: Payload = {
            responseType: 'json',
            cookieJar: this.jar
        };

        const payloadType = (method === 'POST' ? 'form' : 'searchParams');
        payload[payloadType] = {
            ...params,
            format: 'json',
            formatversion: 2
        };

        // Add csrf
        if (csrf) payload[payloadType].token = this.mwToken;

        const { body } = await (method === 'POST' ? post : get)(`${this.server + this.path}/api.php`, payload);

        if (!body) {
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', 'Request did not return a body');
        }

        if (body.error) {
            // CSRF Catch
            if (body.error?.code === 'badtoken') {
                let tokenPack: ResObject = await this.get({
                    action: 'query',
                    meta:'tokens',
                    type: 'csrf'
                });

                if (tokenPack?.query?.tokens?.csrftoken) {
                    this.mwToken = tokenPack.query.tokens.csrftoken;
                } else {
                    // MW 1.19 support
                    tokenPack = await this.get({
                        action: 'query',
                        prop: 'info',
                        intoken: 'edit',
                        titles: 'F'
                    });
                    // @ts-ignore
                    this.mwToken = Object.values(tokenPack.query.pages)[0].edittoken;
                }

                return this.mw(params, csrf, method);
            }
            throw new MediaWikiJSError('MEDIAWIKI_ERROR', body.error.info);
        }

        return body;
    }

    logout() {
        this.mwToken = '+\\';
        return this.jar.removeAllCookiesSync();
    }

    get(params: object, csrf?: string) {
        return this.mw(params, csrf, 'GET');
    }

    post(params: object, csrf?: string) {
        return this.mw(params, csrf, 'POST');
    }
}