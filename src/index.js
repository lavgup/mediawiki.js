const API = require('./api');
const { readFileSync } = require('fs');
const { CookieJar } = require('tough-cookie');
const MediaWikiJSError = require('./MWAPIError');

class MediaWikiJS {
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
            throw new MediaWikiJSError('NO_CONFIG');
        }

        this.server = options.server;
        this.path = options.path;
        this.botUsername = options.botUsername;
        this.botPassword = options.botPassword;

        this.jar = new CookieJar();
        this.api = new API({ ...options, jar: this.jar });

        this.API_LIMIT = 5000;
    }

    /**
     * Logs in to a wiki bot.
     * @returns Promise<object>
     */
    async login() {
        const initialReq = await this.api.post({
            action: 'query',
            meta: 'tokens',
            type: 'login',
            format: 'json'
        });

        if (initialReq && initialReq.query && initialReq.query.tokens) {
            return this.api.post({
                action: 'login',
                lgname: this.botUsername,
                lgpassword: this.botPassword,
                lgtoken: initialReq.query.tokens.logintoken,
                format: 'json'
            });
        }

        throw new MediaWikiJSError('FAILED_LOGIN');
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
     * @returns string[]
     */
    getList(array, property = 'title') {
        const list = [];
        array.forEach(elem => list.push(elem[property]));

        return list;
    }

    /**
     * Gets pages in a category.
     * @param {string} category The category to get pages of.
     * @param onlyTitles Whether to only list the page titles.
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
     * Get's a CSRF token.
     * @returns {Promise<string>}
     */
    async getToken() {
        const body = await this.api.get({
            action: 'query',
            meta: 'tokens',
            type: 'csrf'
        });

        if (
            !body || !body.query || !body.query.tokens
            || !body.query.tokens.csrftoken || body.query.tokens.csrftoken === '+\\'
        ) throw new Error('CANT_GET_TOKEN');

        return body.query.tokens.csrftoken;
    }

    /**
     * @param {string} title The title of the page to edit.
     * @param {string} summary The summary of the edit.
     * @param {{minor: boolean, text: string}|{minor: boolean, prependtext: string}|{minor: boolean, appendtext: string}} params Mandatory params for the edit.
     * @returns {Promise<object>}
     */
    async doEdit(title, summary, params) {
        const token = await this.getToken();

        return this.api.post({
            action: 'edit',
            bot: '',
            minor: params.minor || '',
            title,
            ...params,
            summary,
            token
        });
    }

    /**
     * Edits the contents of a page.
     * @param {string} title The title of the page to edit.
     * @param {string} content The content of the edit.
     * @param {string} summary The summary of the edit.
     * @param {boolean} minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    edit({ title, content, summary, minor = true }) {
        return this.doEdit(title, summary, { text: content, minor: minor });
    }

    /**
     * Prepends content to a page.
     * @param {string} title The title of the page to edit.
     * @param {string} content The content of the edit.
     * @param {string} summary The summary of the edit.
     * @param {boolean} minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    prepend({ title, content, summary, minor = true }) {
        return this.doEdit(title, summary, { prependtext: content, minor: minor });
    }

    /**
     * Appends content to a page.
     * @param {string} title The title of the page to edit.
     * @param {string} content The content of the edit.
     * @param {string} summary The summary of the edit.
     * @param {boolean} minor Whether to mark the edit as minor.
     * @returns {Promise<object>}
     */
    append({ title, content, summary, minor = true }) {
        return this.doEdit(title, summary, { appendtext: content, minor: minor });
    }

    /**
     * Deletes a page.
     * @param {string} title The title of the page to delete.
     * @param {string} reason The reason for deleting the page.
     * @returns {Promise<object>}
     */
    async delete({ title, reason = '' }) {
        const token = await this.getToken();

        return this.api.post({
            action: 'delete',
            title,
            reason,
            token
        });
    }

    /**
     * Restore revisions of a deleted page.
     * @param {string} title The title of the page to restore.
     * @param {string} reason The reason for restoring this page.
     * @returns {Promise<*>}
     */
    async restore({ title, reason = '' }) {
        const token = await this.getToken();

        return this.api.post({
            action: 'undelete',
            title,
            reason,
            token
        });
    }

    /**
     * Change the protection level of a page.
     * @param {string} title The title of the page to modify the protection level of.
     * @param {{edit: string | undefined, move: string | undefined}} protections The protections to set the page to.
     * @param {string | undefined} expiry The expiry for the protection.
     * @param {string} reason The reason for modifying the page's protection level.
     * @param {boolean} cascade Whether to enable cascading protection.
     * @returns {Promise<object>}
     */
    async protect({ title, protections, expiry, reason, cascade = false }) {
        const token = await this.getToken();

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
            token
        });
    }

    /**
     * Blocks a user.
     * @param {string} user The username of the user to block.
     * @param {string} expiry The expiry of the block.
     * @param {reason} reason The reason for the block.
     * @param {boolean} autoblock Whether to automatically block the last used IP address, and any subsequent IP addresses they try to login from.
     * @param {boolean} reblock Whether to overwrite the existing block, if the user is already blocked.
     * @returns {Promise<object>}
     */
    async block({ user, expiry, reason, autoblock = true, reblock = false }) {
        const token = await this.getToken();

        return this.api.post({
            action: 'block',
            user,
            expiry,
            reason,
            autoblock,
            reblock,
            token
        });
    }

    async unblock({ user, reason }) {
        const token = await this.getToken();

        return this.api.post({
            action: 'unblock',
            user,
            reason,
            token
        });
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
     * @param {string} user The user to email.
     * @param {string} subject The subject of the email.
     * @param {string} content The content of the email.
     * @returns {Promise<object>}
     */
    async email({ user, subject, content }) {
        const token = await this.getToken();
        return this.api.post({
            action: 'emailuser',
            target: user,
            subject,
            content,
            ccme: '',
            token
        });
    }

    /**
     * Get all edits by a user.
     * @param {string} user he users to retrieve contributions for.
     * @param {string} start The start timestamp to return from.
     * @param {string} namespace Only list contributions in these namespaces.
     * @param {boolean} onlyTitles Whether to only list the page titles.
     * @returns {Promise<string[]>}
     */
    async getUserContribs(user, start, namespace = '', onlyTitles = false) {
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
     * @param {string} from The page title to rename.
     * @param {string} to The new page title.
     * @param {string} reason The reason for moving this page.
     * @returns {Promise<object>}
     */
    async move({ from, to, reason }) {
        const token = await this.getToken();
        return this.api.post({
            action: 'move',
            from,
            to,
            bot: '',
            reason,
            token
        });
    }

    /**
     * Gets all images on the wiki.
     * @param start
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
     *
     * @param {string} page The page to get all its images from.
     * @param {boolean} onlyTitles Whether to only list the image titles.
     * @param {object} options
     * @returns {Promise<string[] | object[]>}
     */
    async getImagesFromArticle(page, onlyTitles = false, options = {}) {
        const body = await this.api.get({
			action: 'query',
			prop: 'images',
			titles: page,
            ...options
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

        console.log(body.query.users);
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
     * @param onlyTitles Whether to only list the page titles.
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
     * @param props Which information to get
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
     * Get's the wiki's MediaWiki version.
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
     * @param queryPage
     * @param onlyTitles
     * @returns {Promise<string[] | object[]>}
     */
    async getQueryPage(queryPage, onlyTitles) {
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
     * @param page Title to search.
     * @param onlyTitles Whether to only list the page titles.
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

        console.log(body.query.backlinks);

        if (onlyTitles) return this.getList(body.query.backlinks);
        return body.query.backlinks;
    }
}

module.exports = MediaWikiJS;