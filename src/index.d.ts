/**
 * A MediaWikiJS object.
 * @param options - The configuration options.
 * @param options.server - The server of the wiki.
 * @param options.path - The path to the api.php file.
 * @param [options.botUsername] - The bot's bot username, obtained from Special:BotPasswords.
 * @param [options.botPassword] - The bot's bot password, obtained from Special:BotPasswords.
 * @param [options.accountUsername] - The bot's account username, used for Fandom discussion support.
 * @param [options.accountPassword] - The bot's account password, used for Fandom discussion support.
 * @param [options.wikiId] - The wiki's ID, used for Fandom discussion support.
 */
declare class MediaWikiJS {
    constructor(options: {
        server: string;
        path: string;
        botUsername?: string;
        botPassword?: string;
        accountUsername?: string;
        accountPassword?: string;
        wikiId?: string;
    });
    /**
     * Logs in to a wiki bot.
     * @returns The successful login object.
     */
    login(): Promise<object>;
    /**
     * Logs out of a wiki bot, by removing all cookies.
     */
    logout(): void;
    /**
     * @param object - The object to get the first item of.
     */
    getFirstItem(object: any): object[];
    /**
     * Gets only the page titles of a list and formats it into an array.
     * @param array - The array to get a list from.
     * @param property - The property of the page title in each object.
     * @returns The list of all titles.
     */
    getList(array: object[], property?: string): string[];
    /**
     * Gets pages in a category.
     * @param category - The category to get pages of.
     * @param onlyTitles - Whether to only list the page titles.
     */
    getPagesInCategory(category: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * @param title - The title of the page to get categories from.
     * @param onlyTitles - Whether to only list the page titles.
     */
    getArticleCategories(title: string, onlyTitles: boolean): Promise<object[] | string[]>;
    /**
     * @param keyword - The keyword for the search.
     * @param onlyTitles - Whether to only list the page titles.
     */
    search(keyword: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * Get's a CSRF token.
     */
    getToken(): Promise<string>;
    /**
     * Main wrapper for editing pages.
     * @param params - Mandatory params for the edit.
     */
    doEdit(params: any): Promise<object>;
    /**
     * Edits the contents of a page.
     * @param options - The options for the edit.
     * @param options.title - The title of the page to edit.
     * @param options.content - The content of the edit.
     * @param options.summary - The summary of the edit.
     * @param options.minor - Whether to mark the edit as minor.
     */
    edit(options: {
        title: string;
        content: string;
        summary: string;
        minor: boolean;
    }): Promise<object>;
    /**
     * Appends content to a page.
     * @param options - The options for the edit.
     * @param options.title - The title of the page to edit.
     * @param options.content - The content of the edit.
     * @param options.summary - The summary of the edit.
     * @param options.minor - Whether to mark the edit as minor.
     */
    prepend(options: {
        title: string;
        content: string;
        summary: string;
        minor: boolean;
    }): Promise<object>;
    /**
     * Appends content to a page.
     * @param options - The options for the edit.
     * @param options.title - The title of the page to edit.
     * @param options.content - The content of the edit.
     * @param options.summary - The summary of the edit.
     * @param options.minor - Whether to mark the edit as minor.
     */
    append(options: {
        title: string;
        content: string;
        summary: string;
        minor: boolean;
    }): Promise<object>;
    /**
     * Undoes a revision.
     * @param options - The options for the undo.
     * @param options.title - The title of the page of which revision to undo.
     * @param options.revision - The revision to undo.
     * @param options.summary - The summary of the edit.
     */
    undo(options: {
        title: string;
        revision: string;
        summary: string;
    }): void;
    /**
     * Deletes a page.
     * @param options - The options for the deletion.
     * @param options.title - The title of the page to delete.
     * @param options.reason - The reason for deleting the page.
     */
    delete(options: {
        title: string;
        reason: string;
    }): Promise<object>;
    /**
     * Restore revisions of a deleted page.
     * @param options - The options for the deletion.
     * @param options.title - The title of the page to restore.
     * @param options.reason - The reason for restoring this page.
     */
    restore(options: {
        title: string;
        reason: string;
    }): Promise<any>;
    /**
     * Change the protection level of a page.
     * @param options - The options for the protection.
     * @param options.title - The title of the page to modify the protection level of.
     * @param options.protections - The protections to set the page to.
     * @param options.expiry - The expiry for the protection.
     * @param options.reason - The reason for modifying the page's protection level.
     * @param options.cascade - Whether to enable cascading protection.
     */
    protect(options: {
        title: string;
        protections: any;
        expiry: string | undefined;
        reason: string;
        cascade: boolean;
    }): Promise<object>;
    /**
     * Blocks a user.
     * @param options - The options for the block.
     * @param options.user - The username of the user to block.
     * @param options.expiry - The expiry of the block.
     * @param options.reason - The reason for the block.
     * @param options.autoblock - Whether to automatically block the last used IP address, and any subsequent IP addresses they try to login from.
     * @param options.reblock - Whether to overwrite the existing block, if the user is already blocked.
     */
    block(options: {
        user: string;
        expiry: string;
        reason: string;
        autoblock: boolean;
        reblock: boolean;
    }): Promise<object>;
    /**
     * Unblocks a user.
     * @param user - The username of the user to unblock.
     * @param reason - The reason for the unblock.
     */
    unblock(user: string, reason: string): Promise<object>;
    /**
     * Purges the cache of a list of pages.
     * @param titles - The title(s) of the pages to delete.
     */
    purge(titles: string[] | string): Promise<object>;
    /**
     * Sends an email to a user.
     * @param options - The options for the email.
     * @param options.user - The user to email.
     * @param options.subject - The subject of the email.
     * @param options.content - The content of the email.
     */
    email(options: {
        user: string;
        subject: string;
        content: string;
    }): Promise<object>;
    /**
     * Get all edits by a user.
     * @param options - The options for the request.
     * @param options.user - The users to retrieve contributions for.
     * @param options.start - The start timestamp to return from.
     * @param options.namespace - Only list contributions in these namespaces.
     * @param options.onlyTitles - Whether to only list the page titles.
     */
    getUserContribs(options: {
        user: string;
        start: string;
        namespace: string;
        onlyTitles: boolean;
    }): Promise<string[]>;
    /**
     * Creates a new account.
     */
    createAccount(username: string, password: string): Promise<object>;
    /**
     * Moves a page.
     * @param options - The options for the move.
     * @param options.from - The page title to rename.
     * @param options.to - The new page title.
     * @param options.reason - The reason for moving this page.
     */
    move(options: {
        from: string;
        to: string;
        reason: string;
    }): Promise<object>;
    /**
     * Gets all images on the wiki.
     * @param start - The image title to start enumerating from.
     * @param onlyTitles - Whether to only list the image titles.
     */
    getImages(start: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * Gets all images from an article.
     * @param options - The options for the request.
     * @param options.page - The page to get all its images from.
     * @param options.onlyTitles - Whether to only list the image titles.
     * @param options.otherOptions - Any other options for the request.
     */
    getImagesFromArticle(options: {
        page: string;
        onlyTitles: boolean;
        otherOptions: any;
    }): Promise<string[] | object[]>;
    /**
     * Find all pages that use the given image title.
     * @param fileName - Title to search
     * @param onlyTitles - Whether to only list the page titles.
     */
    getImageUsage(fileName: string, onlyTitles: boolean): Promise<string[]>;
    /**
     * Get information about the current user.
     */
    whoAmI(): Promise<object>;
    /**
     * Gets information about a given user.
     */
    whoIs(username: string): Promise<object>;
    /**
     * Gets information about multiple users.
     */
    whoAre(usernames: string[]): Promise<object[]>;
    /**
     * Expands all templates within wikitext.
     */
    expandTemplates(text: string, title: string): Promise<string>;
    /**
     * Parses content and returns parser output.
     * @param text - Text to parse.
     * @param title - Title of page the text belongs to.
     */
    parse(text: string, title: string): Promise<string>;
    /**
     * Enumerate recent changes.
     * @param start - The timestamp to start enumerating from.
     * @param onlyTitles - Whether to only list the page titles.
     */
    getRecentChanges(start: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * Return general information about the site.
     * @param props - Which information to get
     */
    getSiteInfo(props: string[] | string): Promise<object>;
    /**
     * Returns site statistics.
     */
    getSiteStats(): Promise<object>;
    /**
     * Gets the wiki's MediaWiki version.
     */
    getMwVersion(): Promise<string>;
    /**
     * Returns a list of all pages from a query page.
     */
    getQueryPage(queryPage: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * Returns all external URLs from the given page.
     * @param page - The page to get its external URLs from.
     */
    getExternalLinks(page: string): Promise<string[]>;
    /**
     * Find all pages that link to the given page.
     * @param page - Title to search.
     * @param onlyTitles - Whether to only list the page titles.
     */
    getBackLinks(page: string, onlyTitles: boolean): Promise<string[] | object[]>;
    /**
     * Gets Fandom cookies.
     */
    getFandomCookies(): Promise<object>;
    /**
     * Posts to Fandom discussions.
     * @param options - The options for the post.
     * @param options.title - The title of the post.
     * @param options.content - The content of the post.
     * @param options.category - The category to post in.
     */
    post(options: {
        title: string;
        content: string;
        category: string;
    }): Promise<object>;
    /**
     * Deletes a post on Fandom discussions.
     * @param id - The ID of the post to delete.
     */
    deletePost(id: string | number): Promise<object>;
    /**
     * Undeletes a post on Fandom discussions.
     * @param id - The ID of the post to undelete.
     */
    undeletePost(id: string | number): Promise<object>;
    /**
     * Locks a post on Fandom discussions.
     * @param id - The ID of the post to lock.
     */
    lockPost(id: string | number): Promise<object>;
    /**
     * Unlocks a post on Fandom discussions.
     * @param id - The ID of the post to unlock.
     */
    unlockPost(id: string | number): Promise<object>;
}

