import { logger } from '../utils';
import * as path from 'path';

const Error = require('http-errors');
// const fs_storage = require('./local-fs');

import * as fs_storage from './local-fs';

const Path_Wrapper = (function () {
    // a wrapper adding paths to fs_storage methods
    function Wrapper (path) {
        const self = Object.create(Wrapper.prototype);
        self.path = path;
        return self;
    }

    for (const i in fs_storage) {
        if (fs_storage.hasOwnProperty(i)) {
            Wrapper.prototype[i] = wrapper(i);
        }
    }

    function wrapper (method) {
        return function (/*...*/) {
            const args = Array.prototype.slice.apply(arguments);
            args[0] = path.join(this.path, args[0] || '');
            return fs_storage[method].apply(null, args);
        };
    }

    return Wrapper;
})();

export class LocalStorage {

    config: any;
    logger: any;

    constructor (config) {
        this.config = config;
        this.logger = logger.child({ sub: 'fs' });
    }

    _internal_error (err, file, message) {
        this.logger.error({ err: err, file: file }, message + ' @{file}: @{!err.message}');
        return Error[500]();
    }

    add_package (name, info) {
        // const storage = this.storage(name);
        // if (!storage) return Error[404]('this package cannot be added');
		//
        // storage.create_json(info_file, get_boilerplate(name), function (err) {
        //     if (err && err.code === 'EEXISTS') {
        //         return Error[409]('this package is already present');
        //     }
		//
        //     var latest = info['dist-tags'].latest;
        //     if (latest && info.versions[latest]) {
        //         Search.add(info.versions[latest]);
        //     }
        //     callback();
        // });
    }

    storage (packageName) {
        let _path = this.config.get_package_spec(packageName).storage;
        if (_path == null) _path = this.config.storage;
        if (_path == null || _path === false) {
            this.logger.debug({ name: packageName }, 'this package has no storage defined: @{name}');
            return null;
        }
        return Path_Wrapper(path.join(path.resolve(path.dirname(this.config.self_path), _path), packageName));
    }
}