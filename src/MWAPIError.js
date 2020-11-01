const messages = {
    CANT_GET_TOKEN: () => 'Failed to get token.',
    FAILED_LOGIN: () => 'Login was unsuccessful.',
    LOADING_CONFIG: error => `Failed to load config: ${error}`,
    MEDIAWIKI_ERROR: error => `Error returned by API: ${error}`,
    NO_CONFIG: () => 'No configuration was provided.'
};

class MWAPIError extends Error {
    constructor(key, ...args) {
        if (messages[key] == null) throw new TypeError(`Error key '${key}' does not exist`);
        const message = messages[key](...args);

        super(message);
        this.code = key;
    }

    get name() {
        return `MediaWikiJSError [${this.code}]`;
    }
}

module.exports = MWAPIError;