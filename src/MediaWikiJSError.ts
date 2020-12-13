import { Errors, ErrorsList } from './types';

const messages: Errors = {
    FAILED_LOGIN: (error: string) => `Login was unsuccessful: ${error}`,
    LOADING_CONFIG: (error: string) => `Failed to load config: ${error}`,
    MEDIAWIKI_ERROR: (error: string) => `Error returned by API: ${error}`,
    NO_CONFIG: 'No configuration was provided.',
    NO_CREDENTIALS: 'Insufficient credentials were provided. Expected username and password.'
};

export default class MediaWikiJSError extends Error {
    code: string;

    constructor(key: ErrorsList, ...args: unknown[]) {
        if (messages[key] === null) throw new TypeError(`Error - key '${key}' does not exist`);
        const message = args?.length
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ? messages[key](...args)
            : messages[key];

        super(message);
        this.code = key;
    }

    get name(): string {
        return `MediaWikiJSError [${this.code}]`;
    }
}