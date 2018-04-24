import { logger } from '../utils';
import * as URL from 'url';
import { parse_interval } from '../config';
import { Instance } from '../application';

export default Instance(class UpStorage {

    config: any;
    failed_requests: number;
    userAgent: string;
    ca: any;
    logger: any;
    server_id: string;
    url: any;
    proxy: any;
    maxAge: any;
    timeout: any;
    max_fails: any;
    fail_timeout: any;

    constructor (config, mainConfig) {
        this.config = config;
        this.failed_requests = 0;
        this.userAgent = mainConfig.user_agent;
        this.ca = config.ca;
        this.logger = logger.child({ sub: 'out' });
        this.server_id = mainConfig.server_id;
        this.url = URL.parse(this.config.url);

        this.setupProxy(this.url.hostname, config, mainConfig, this.url.protocol === 'https:');

        this.config.url = this.config.url.replace(/\/$/, '');
        if (Number(this.config.timeout) >= 1000) {
            this.logger.warn(['Too big timeout value: ' + this.config.timeout,
                'We changed time format to nginx-like one',
                '(see http://wiki.nginx.org/ConfigNotation)',
                'so please update your config accordingly'].join('\n'));
        }

        // a bunch of different configurable timers
        this.maxAge = parse_interval(this.config_get('maxage', '2m'));
        this.timeout = parse_interval(this.config_get('timeout', '30s'));
        this.max_fails = Number(this.config_get('max_fails', 2));
        this.fail_timeout = parse_interval(this.config_get('fail_timeout', '5m'));
    }

    /**
     * just a helper (`config[key] || default` doesn't work because of zeroes)
     * @param key
     * @param def
     */
    config_get (key, def) {
        return this.config[key] != null ? this.config[key] : def;
    }

    setupProxy (hostname, config, mainConfig, isHTTPS) {
        let no_proxy;
        const proxy_key = isHTTPS ? 'https_proxy' : 'http_proxy';

        // get http_proxy and no_proxy configs
        if (proxy_key in config) {
            this.proxy = config[proxy_key];
        } else if (proxy_key in mainConfig) {
            this.proxy = mainConfig[proxy_key];
        }
        if ('no_proxy' in config) {
            no_proxy = config.no_proxy;
        } else if ('no_proxy' in mainConfig) {
            no_proxy = mainConfig.no_proxy;
        }

        // use wget-like algorithm to determine if proxy shouldn't be used
        if (hostname[0] !== '.') hostname = '.' + hostname;
        if (typeof(no_proxy) === 'string' && no_proxy.length) {
            no_proxy = no_proxy.split(',');
        }
        if (Array.isArray(no_proxy)) {
            for (let i = 0; i < no_proxy.length; i++) {
                let no_proxy_item = no_proxy[i];
                if (no_proxy_item[0] !== '.') no_proxy_item = '.' + no_proxy_item;
                if (hostname.lastIndexOf(no_proxy_item) === hostname.length - no_proxy_item.length) {
                    if (this.proxy) {
                        this.logger.debug({ url: this.url.href, rule: no_proxy_item }, 'not using proxy for @{url}, excluded by @{rule} rule');
                        this.proxy = false;
                    }
                    break;
                }
            }
        }

        // if it's non-string (i.e. "false"), don't use it
        if (typeof(this.proxy) !== 'string') {
            delete this.proxy;
        } else {
            this.logger.debug({ url: this.url.href, proxy: this.proxy }, 'using proxy @{proxy} for @{url}');
        }
    }
});