# mediawiki.js
mediawiki.js is a modern wrapper for the MediaWiki API, heavily inspired by [nodemw](https://github.com/macbre/nodemw). It also supports posting, deleting, undeleting, locking and unlocking posts in Fandom's Discussions.

## Installation
#### With pnpm (recommended)
`pnpm add @sidemen19/mediawiki.js`

#### With npm
`npm install @sidemen19/mediawiki.js`

#### With yarn
`yarn add @sidemen19/mediawiki.js`

## Usage
mediawiki.js uses promises with async/await syntax instead of callbacks, like nodemw does.

### Initiating the client
mediawiki.js requires a configuration object, containing the following things;
* server (e.g. `https://en.wikipedia.org`)
* path: path to `api.php` (e.g. `/w`)
    * this will resolve to `https://en.wikipedia.org/w/api.php`
* botUsername: username for when `login()` is called (optional)
* botPassword: password for when `login()` is called (optional, see Special:BotPasswords for this)

#### Example
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS({
    server: 'https://en.wikipedia.org',
    path: '/w',
    botUsername: 'Username@Bot Username',
    botPassword: '',
    
    // optional for fandom discussion support
    accountUsername: '',
    accountPassword: '',
    wikiId: ''
});
```

#### Config file
mediawiki.js can load the configuration from a config file, as well.
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');
```

### Using methods
All methods are internally documented using JSDoc, so you should just be able to browse through [index.js](src/index.js) to know what you need to know.

#### Examples
##### Getting site statistics
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    const stats = await bot.getSiteStats();

    console.log(stats);
    // => { ... }
})();
```

##### Getting titles of all pages in a category
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    const pages = await bot.getPagesInCategory('Stubs', true);

    console.log(pages);
    // => [ ... ]
})();
```

##### Editing a page
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    // login (needs credentials in the config, of course)
    await bot.login();

    // prepend content (add to start of page)
    await bot.prepend({
        title: 'Project:Sandbox',
        content: "Don't vandalise the sandbox!",
        summary: 'Add notice',
        minor: true
    });

    // append content (add to end of page)
    await bot.append({
        title: 'Project:Sandbox',
        content: '[[Category:Meta]]',
        summary: '+meta cat'
    });

    // replace/create page with content
    await bot.edit({
        title: 'Project:Sandbox',
        content: 'test',
        summary: 'testing!'
    });
})();
```

##### Deleting a page
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    await bot.login();

    await bot.delete({
        title: 'Project:Sandbox',
        reason: 'Testing mediawiki.js!'
    });
})();
```

##### Blocking a user
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    await bot.login();

    await bot.block({
        user: 'Jimmy Wales',
        expiry: '1 hour',
        reason: 'Vandalism :(',
        autoblock: false,
        reblock: true
    });
})();
```

##### Protecting a page
```js
const MediaWikiJS = require('@sidemen19/mediawiki.js');
const bot = new MediaWikiJS('./config.json');

(async () => {
    await bot.login();

    await bot.protect({
        title: 'Project:Rules',
        protections: {
            edit: 'sysop',
            move: 'sysop'
        },
        expiry: 'never',
        reason: 'Special page!',
        cascade: true
    });
})();
```

## Support and questions
Open an issue!

## Contributing
Open a PR! Might be worth opening an issue if it's a major commit, to get the heads up from me.