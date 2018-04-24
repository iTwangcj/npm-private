import { logger } from '../utils';
import { Instance } from '../application';

// import { UpStorage } from './up-storage';

export default Instance(class Storage {

    config: any;
    upLinks: any = {};
    local: any;
    logger: any;

    constructor (config) {
        this.config = config;

        // we support a number of uplinks, but only one local storage
        // Proxy and Local classes should have similar API interfaces
        // this.upLinks = {};
        // for (const p in config.upLinks) {
        //     if (config.upLinks.hasOwnProperty(p)) {
        //         this.upLinks[p] = new UpStorage(config.upLinks[p], config);
        //         this.upLinks[p].upname = p;
        //     }
        // }
        // this.local = LocalStorage(config);
        this.logger = logger.child();
    }
});