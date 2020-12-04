const API = require('./API');
const { readFileSync } = require('fs');
const MediaWikiJSError = require('./MediaWikiJSError');

/**
 * A MediaWikiJS object.
 * @param {object} options The configuration options.
 * @param {string} options.server The server of the wiki.
 * @param {string} options.path The path to the api.php file.
 * @param {string} [options.botUsername] The bot's bot username, obtained from Special:BotPasswords.
 * @param {string} [options.botPassword] The bot's bot password, obtained from Special:BotPasswords.
 */
class MediaWikiJS {
    #server;
    #path;

    constructor(options) {
        if (typeof options === 'string') {
            let configFile,
                configParsed;

            try {
                configFile = readFileSync(options, 'utf-8');
                configParsed = JSON.parse(configFile);
            } catch (e) {
                throw new MediaWikiJSError('LOADING_CONFIG', e.message);
            }

            if (typeof configParsed === 'object') {
                options = configParsed;
            }
        }

        if (!options) {
            options = {};
        }

        this.api = new API(options);

        // Expose API_LIMIT publicly
        this.API_LIMIT = 5000;

        this.cacheSite = {};
        this.cacheUser = {};

        // Auto detect siteInfo
        if (typeof options.server !== 'undefined' && typeof options.path !== 'undefined')
            this.getSiteInfo('general').then(data => this.cacheSite = data.general);

        // Auto login function
        if (options.botUsername && options.botPassword)
            try {
                this.login(options.botUsername, options.botPassword);
            } catch (err) {
                console.log(err);
            }
        else
            this.whoAmI()
                .then(data => this.cacheUser = data);
    }

    /**
     * Logs in to a wiki bot.
     * @param {string} username The bot username of the account to log in to.
     * @param {string} password The bot password of the account to log in to.
     * @returns {Promise<object>} The successful login object.
     */
    async login(username, password) {
        const queryToken = await this.api.get({
            action: 'query',
            meta: 'tokens',
            type: 'login'
        });

        const loginObj = lgtoken => {
            const out = {
                action: 'login',
                lgname: username,
                lgpassword: password
            };
            if (lgtoken) out.lgtoken = lgtoken;
            return out;
        };
        // Initial attempt
        let actionLogin = await this.api.post(loginObj(queryToken?.query?.tokens?.logintoken));

        // Support for MW 1.19
        if (actionLogin?.login?.result === 'NeedToken') {
            actionLogin = await this.api.post(loginObj(actionLogin?.login?.token));
        }

        // Successful login
        if (actionLogin?.login?.result === 'Success') {
            this.cacheUser = await this.whoAmI();
            return actionLogin;
        }

        // Reason throwing
        if (actionLogin?.login?.result) {
            throw new MediaWikiJSError('FAILED_LOGIN', actionLogin?.login?.result);
        }

        // Unspecified throwing
        throw new MediaWikiJSError('FAILED_LOGIN', 'Unspecified error! Dumping:', JSON.stringify(actionLogin));
    }

    /**
     * Logs out of a wiki bot.
     * API removes cookies and resets mwToken.
     */
    async logout() {
        this.api.logout();
        this.cacheUser = await this.whoAmI();
    }

    /**
     * Sets the server.
     * @param {string} server The server of the wiki, with the HTTP/HTTPS protocol.
     * @param {string} script The path to the api.php file.
     * @returns {MediaWikiJS}
     */
    async setServer(server, script) {
        this.api.setServer(server, script);
        this.cache = {};
        this.cacheSite = (await this.getSiteInfo('general')).general;
        return this;
    }

    /**
     * @param {object} object The object to get the first item of.
     * @returns {object[]}
     */
    getFirstItem(object) {
        const key = Object.keys(object).shift();
        return object[key];
    }

    /**
     * Gets only the page titles of a list and formats it into an array.
     * @param {object[]} array The array to get a list from.
     * @param {string} property The property of the page title in each object.
     * @returns {string[]} The list of all titles.
     */
    getList(array, property = 'title') {
        const list = [];
        array.forEach(elem => list.push(elem[property]));

        return list;
    }

    /**
     * Gets pages in a category.
     * @param {string} category The category to get pages of.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[] | object[]>}
     */
    async getPagesInCategory(category, onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            list: 'categorymembers',
            cmtitle: category,
            cmlimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.categorymembers);
        return body.query.categorymembers;
    }

    /**
     * @param {string} title The title of the page to get categories from.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     *
     * @returns {Promise<object[] | string[]>}
     */
    async getArticleCategories(title, onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            prop: 'categories',
            cllimit: this.API_LIMIT,
            titles: title
        });

        const page = this.getFirstItem(body.query.pages);

        if (onlyTitles) return this.getList(page.categories);
        return page.categories;
    }

    /**
     * @param {string} keyword The keyword for the search.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[] | object[]>}
     */
    async search(keyword, onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            list: 'search',
            srsearch: keyword,
            srprop: 'timestamp',
            srlimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.search);
        return body.query.search;
    }

    /**
     * Main wrapper for editing pages.
     * @param {Object} params Mandatory params for the edit.
     * @returns {Promise<object>}
     */
    async doEdit(params) {
        return this.api.post({
            action: 'edit',
            bot: '',
            minor: params.minor || '',
            ...params,
        },true);
    }

    /**
     * Edits the contents of a page.
     * @param {Object} options The options for the edit.
     * @param {string} options.title The title of the page to edit.
     * @param {string} options.content The content of the edit.
     * @param {string} options.summary The summary of the edit.
     * @param {boolean} options.minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    edit({ title, content, summary, minor = true }) {
        return this.doEdit({ title: title, text: content, summary: summary, minor: minor });
    }

    /**
     * Appends content to a page.
     * @param {Object} options The options for the edit.
     * @param {string} options.title The title of the page to edit.
     * @param {string} options.content The content of the edit.
     * @param {string} options.summary The summary of the edit.
     * @param {boolean} options.minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    prepend({ title, content, summary, minor = true }) {
        return this.doEdit({ title: title, prependtext: content, summary: summary, minor: minor });
    }

    /**
     * Appends content to a page.
     * @param {Object} options The options for the edit.
     * @param {string} options.title The title of the page to edit.
     * @param {string} options.content The content of the edit.
     * @param {string} options.summary The summary of the edit.
     * @param {boolean} options.minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    append({ title, content, summary, minor = true }) {
        return this.doEdit({ title: title, appendtext: content, summary: summary, minor: minor });
    }

    /**
     * Undoes a revision.
     * @param {Object} options The options for the undo.
     * @param {string} options.title The title of the page of which revision to undo.
     * @param {string} options.revision The revision to undo.
     * @param {string} options.summary The summary of the edit.
     */
    undo({ title, revision, summary }) {
        return this.doEdit({ title: title, undo: revision, summary: summary });
    }

    /**
     * Deletes a page.
     * @param {Object} options The options for the deletion.
     * @param {string} options.title The title of the page to delete.
     * @param {string} options.reason The reason for deleting the page.
     * @returns {Promise<object>}
     */
    async delete({ title, reason = '' }) {
        return this.api.post({
            action: 'delete',
            title,
            reason,
        },true);
    }

    /**
     * Restore revisions of a deleted page.
     * @param {Object} options The options for the deletion.
     * @param {string} options.title The title of the page to restore.
     * @param {string} options.reason The reason for restoring this page.
     * @returns {Promise<*>}
     */
    async restore({ title, reason = '' }) {
        return this.api.post({
            action: 'undelete',
            title,
            reason,
        },true);
    }

    /**
     * Change the protection level of a page.
     * @param {Object} options The options for the protection.
     * @param {string} options.title The title of the page to modify the protection level of.
     * @param {{edit: string | undefined, move: string | undefined}} options.protections The protections to set the page to.
     * @param {string | undefined} options.expiry The expiry for the protection.
     * @param {string} options.reason The reason for modifying the page's protection level.
     * @param {boolean} options.cascade Whether to enable cascading protection.
     * @returns {Promise<object>}
     */
    async protect({ title, protections, expiry, reason, cascade = false }) {
        const formattedProtections = [];
        for (const [key, val] of Object.entries(protections)) {
            formattedProtections.push(`${key}=${val}`);
        }

        return this.api.post({
            action: 'protect',
            title,
            protections: formattedProtections.join('|'),
            expiry,
            reason,
            cascade,
        },true);
    }

    /**
     * Blocks a user.
     * @param {Object} options The options for the block.
     * @param {string} options.user The username of the user to block.
     * @param {string} options.expiry The expiry of the block.
     * @param {string} options.reason The reason for the block.
     * @param {boolean} options.autoblock Whether to automatically block the last used IP address, and any subsequent IP addresses they try to login from.
     * @param {boolean} options.reblock Whether to overwrite the existing block, if the user is already blocked.
     * @returns {Promise<object>}
     */
    async block({ user, expiry, reason, autoblock = true, reblock = false }) {
        return this.api.post({
            action: 'block',
            user,
            expiry,
            reason,
            autoblock,
            reblock,
        },true);
    }

    /**
     * Unblocks a user.
     * @param {string} user The username of the user to unblock.
     * @param {string} reason The reason for the unblock.
     * @returns {Promise<object>}
     */
    async unblock(user, reason ) {

        return this.api.post({
            action: 'unblock',
            user,
            reason,
        },true);
    }

    /**
     * Purges the cache of a list of pages.
     * @param {string[] | string} titles The title(s) of the pages to delete.
     * @returns {Promise<object>}
     */
    purge(titles) {
        const params = { action: 'purge' };

        if (typeof titles === 'string' && titles.startsWith('Category:')) {
            params.generator = 'categorymembers';
            params.gcmtitle = titles;
        } else {
            if (!Array.isArray(titles)) titles = [titles];
            if (typeof titles[0] === 'number') params.pageids = titles.join( '|' );
            else params.titles = titles.join( '|' );
        }

        return this.api.post(params);
    }

    /**
     * Sends an email to a user.
     * @param {Object} options The options for the email.
     * @param {string} options.user The user to email.
     * @param {string} options.subject The subject of the email.
     * @param {string} options.content The content of the email.
     * @returns {Promise<object>}
     */
    async email({ user, subject, content }) {
        return this.api.post({
            action: 'emailuser',
            target: user,
            subject,
            content,
            ccme: '',
        },true);
    }

    /**
     * Get all edits by a user.
     * @param {string} options The options for the request.
     * @param {string} options.user The users to retrieve contributions for.
     * @param {string} options.start The start timestamp to return from.
     * @param {string} options.namespace Only list contributions in these namespaces.
     * @param {boolean} options.onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[]>}
     */
    async getUserContribs({ user, start, namespace = '', onlyTitles = false }) {
        const body = await this.api.get({
            action: 'query',
			list: 'usercontribs',
			ucuser: user,
			ucstart: start,
			uclimit: this.API_LIMIT,
			ucnamespace: namespace
        });

        if (onlyTitles) this.getList(body.query.usercontribs);
        return body.query.usercontribs;
    }

    /**
     * Creates a new account.
     * @param {string} username
     * @param {string} password
     * @returns {Promise<object>}
     */
    async createAccount(username, password) {
        const body = await this.api.get({
            action: 'query',
            meta: 'tokens',
            type: 'createaccount'
        });

        return this.api.post({
            action: 'createaccount',
            createreturnurl: `${this.api.server}/`,
            createtoken: body.tokens.createaccounttoken,
            username: username,
            password: password,
            retype: password
        });
    }

    /**
     * Moves a page.
     * @param {Object} options The options for the move.
     * @param {string} options.from The page title to rename.
     * @param {string} options.to The new page title.
     * @param {string} options.reason The reason for moving this page.
     * @returns {Promise<object>}
     */
    async move({ from, to, reason }) {
        return this.api.post({
            action: 'move',
            from,
            to,
            bot: '',
            reason,
        },true);
    }

    /**
     * Gets all images on the wiki.
     * @param {string} start The image title to start enumerating from.
     * @param {boolean} onlyTitles Whether to only list the image titles.
     * @returns {Promise<string[] | object[]>}
     */
    async getImages(start, onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            list: 'allimages',
            aifrom: start,
            ailimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.allimages);
        return body.query.allimages;
    }

    /**
     * Gets all images from an article.
     * @param {object} options The options for the request.
     * @param {string} options.page The page to get all its images from.
     * @param {boolean} options.onlyTitles Whether to only list the image titles.
     * @param {object} options.otherOptions Any other options for the request.
     * @returns {Promise<string[] | object[]>}
     */
    async getImagesFromArticle({ page, onlyTitles = false, otherOptions = {} }) {
        const body = await this.api.get({
            action: 'query',
            prop: 'images',
            titles: page,
            ...otherOptions
        });

        const article = this.getFirstItem(body.query.pages);

        if (onlyTitles) return this.getList(article.images);
        return article.images;
    }

    /**
     * Find all pages that use the given image title.
     * @param {string} fileName Title to search
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[]>}
     */
    async getImageUsage(fileName, onlyTitles = false) {
        const body = await this.api.get({
           action: 'query',
            list: 'imageusage',
            iutitle: fileName,
            iulimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.imageusage);
        return body.query.imageusage;
    }

    /**
     * Get information about the current user.
     * @returns {Promise<object>}
     */
    async whoAmI() {
        const body = await this.api.get({
            action: 'query',
            meta: 'userinfo',
            uiprop: 'groups|rights|ratelimits|editcount|realname|email'
        });

        return body.query.userinfo;
    }

    /**
     * Gets information about a given user.
     * @param {string} username
     * @returns {Promise<object>}
     */
    whoIs(username) {
        return this.whoAre([username]);
    }

    /**
     * Gets information about multiple users.
     * @param {string[]} usernames
     * @returns {Promise<object[]>}
     */
    async whoAre(usernames) {
        const body = await this.api.get({
            action: 'query',
            list: 'users',
            ususers: usernames.join( '|' ),
            usprop: 'blockinfo|groups|implicitgroups|rights|editcount|registration|emailable|gender'
        });

        return body.query.users;
    }

    /**
     * Expands all templates within wikitext.
     * @param {string} text
     * @param {string} title
     * @returns {Promise<string>}
     */
    async expandTemplates(text, title) {
        const body = await this.api.get({
            action: 'expandtemplates',
            text,
            title,
            prop: 'parsetree'
        });

        return body.expandtemplates.parsetree;
    }

    /**
     * Parses content and returns parser output.
     * @param {string} text Text to parse.
     * @param {string} title Title of page the text belongs to.
     * @returns {Promise<string>}
     */
    async parse(text, title) {
        const body = await this.api.get({
            action: 'parse',
            text,
            title,
            contentmodel: 'wikitext',
            disablelimitreport: true
        });

        return body.parse.text;
    }

    /**
     * Enumerate recent changes.
     * @param {string} start The timestamp to start enumerating from.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[] | object[]>}
     */
    async getRecentChanges(start = '', onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            list: 'recentchanges',
            rcprop: 'title|timestamp|comments|user|flags|sizes',
            rcstart: start,
            rclimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.recentchanges);
        return body.query.recentchanges;
    }

    /**
     * Return general information about the site.
     * @param {string[] | string} props Which information to get
     * @returns {Promise<object>}
     */
    async getSiteInfo(props) {
        if (typeof props === 'string') props = [props];

        const body = await this.api.get({
            action: 'query',
            meta: 'siteinfo',
            siprop: props.join('|')
        });

        return body.query;
    }

    /**
     * Returns site statistics.
     * @returns {Promise<object>}
     */
    getSiteStats() {
        return this.getSiteInfo('statistics');
    }

    /**
     * Gets the wiki's MediaWiki version.
     * @returns {Promise<string>}
     */
    async getMwVersion() {
        const siteInfo = await this.getSiteInfo('general');
        let version;

        version = siteInfo && siteInfo.general && siteInfo.general.generator;
        [version] = version.match(/[\d.]+/);

        return version;
    }

    /**
     * Returns a list of all pages from a query page.
     * @param {string} queryPage
     * @param {boolean} onlyTitles
     * @returns {Promise<string[] | object[]>}
     */
    async getQueryPage(queryPage, onlyTitles = false) {
        const body = await this.api.get({
            action: 'query',
            list: 'querypage',
            qppage: queryPage,
            qplimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.querypage.results);
        return body.query.querypage.results;
    }

    /**
     * Returns all external URLs from the given page.
     * @param {string} page The page to get its external URLs from.
     * @returns {Promise<string[]>}
     */
    async getExternalLinks(page) {
        const body = await this.api.get({
            action: 'query',
            prop: 'extlinks',
            titles: page,
            ellimit: this.API_LIMIT
        });

        return this.getList(this.getFirstItem(body.query.pages).extlinks, '*');
    }

    /**
     * Find all pages that link to the given page.
     * @param {string} page Title to search.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[] | object[]>}
     */
    async getBackLinks(page, onlyTitles) {
        const body = await this.api.get({
            action: 'query',
			list: 'backlinks',
			blnamespace: 0,
			bltitle: page,
			bllimit: this.API_LIMIT
        });

        if (onlyTitles) return this.getList(body.query.backlinks);
        return body.query.backlinks;
    }
}

module.exports = MediaWikiJS;