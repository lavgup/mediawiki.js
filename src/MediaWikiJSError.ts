const messages: {[key: string]: any} = {
    FAILED_LOGIN: (error: string) => `Login was unsuccessful: ${error}`,
    LOADING_CONFIG: (error: string) => `Failed to load config: ${error}`,
    MEDIAWIKI_ERROR: (error: string) => `Error returned by API: ${error}`,
    NO_CONFIG: () => 'No configuration was provided.'
};

export = class MediaWikiJSError extends Error {
    code: string;

    constructor(key: string, ...args: string[]) {
        if (messages[key] === null) throw new TypeError(`Error - key '${key}' does not exist`);
        const message = messages[key](...args);

        super(message);
        this.code = key;
    }

    get name() {
        return `MediaWikiJSError [${this.code}]`;
    }
}