/* ===================================
 * 工具类
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * =================================== */
import * as fs from 'fs';
import * as path from 'path';
import * as parseUrl from 'url';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
import { Config } from '../config';
import * as assert from 'assert';
import * as URL from 'url';
import * as semver from 'semver';
import { Instance } from '../application';
import * as request from 'request';

export default Instance(class Utils {

    server_id: any;
    proxy: any;
    timeout: number = 30 * 1000; // 30s
    userAgent: string = 'Sinopia/' + '0.0.1';

    constructor () {

        // unique identifier of self server (or a cluster), used to avoid loops
        if (!this.server_id) {
            this.server_id = crypto.pseudoRandomBytes(6).toString('hex');
        }
        // loading these from ENV if aren't in config
        ['http_proxy', 'https_proxy', 'no_proxy'].forEach(((v) => {
            if (!(v in this)) {
                this[v] = process.env[v] || process.env[v.toUpperCase()];
            }
        }));
    }

    /**
     * 获取文件夹下面的所有的文件(包括子文件夹)
     * @param {String} dir
     * @param {String} extName
     * @returns {Array}
     *
     * Example:
     *  const filePaths = this.getAllFiles(path.join(__dirname, '..'), '.ts');
     */
    getAllFiles (dir: string, extName?: string) {
        let AllFiles = [];
        const iteration = (dirPath) => {
            const files = fs.readdirSync(dirPath);
            files.forEach(p => {
                if ('node_modules' !== p && p.charAt(0) !== '.') {
                    const filePath = path.join(dirPath, p);
                    if (fs.statSync(filePath).isDirectory()) {
                        iteration(filePath);
                    } else {
                        const _extName = path.extname(p);
                        if (extName && _extName === extName) {
                            AllFiles.push(path.join(dirPath, p));
                        }
                        if (!extName) {
                            AllFiles.push(path.join(dirPath, p));
                        }
                    }
                }
            });
        };
        iteration(dir);
        return AllFiles;
    }

    /**
     * 将当前时间换成时间格式字符串
     * @param time 时间戳
     * @param {string} format 格式
     * @returns {string}
     */
    formatDate (time: any, format: string = 'yyyy-MM-dd hh:mm:ss') {
        if (typeof time === 'string') time = Number(time);
        const date = new Date(time);
        const dateObj = {
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds(),
            'q+': Math.floor((date.getMonth() + 3) / 3),
            'S+': date.getMilliseconds()
        };
        if (/(y+)/i.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (const k in dateObj) {
            if (dateObj.hasOwnProperty(k) && new RegExp('(' + k + ')').test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? dateObj[k] : ('00' + dateObj[k]).substr(('' + dateObj[k]).length));
            }
        }
        return format;
    }

    /**
     * 获取/下载包
     * @param url
     * @return Promise
     * https://registry.npmjs.org/concat-stream/-/concat-stream-1.6.2.tgz
     */
    getPackageJson (url) {
        url = Config.npmRegistry + '/' + url;
        return new Promise((resolve, reject) => {
            request(url, (error, response, body) => {
                if (error) {
                    console.log('request error: ' + error.message);
                    return reject(error);
                }
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error(e.message, 'statusCode: ' + response.statusCode);
                }
                return resolve(body);
            });
        });
    }

    is_object (obj) {
        return typeof(obj) === 'object' && obj !== null && !Array.isArray(obj);
    }

    validate_package (name) {
        name = name.split('/', 2);
        if (name.length === 1) {
            // normal package
            return this.validate_name(name[0]);
        } else {
            // scoped package
            return name[0][0] === '@'
                && this.validate_name(name[0].slice(1))
                && this.validate_name(name[1]);
        }
    }

    validate_name (name) {
        if (typeof(name) !== 'string') return false;
        name = name.toLowerCase();

        // all URL-safe characters and "@" for issue #75
        if (!name.match(/^[-a-zA-Z0-9_.!~*'()@]+$/)
            || name.charAt(0) === '.' // ".bin", etc.
            || name.charAt(0) === '-' // "-" is reserved by couchdb
            || name === 'node_modules'
            || name === '__proto__'
            || name === 'package.json'
            || name === 'favicon.ico'
        ) {
            return false;
        } else {
            return true;
        }
    }

    validate_metadata (object, name) {
        assert(this.is_object(object), 'not a json object');
        assert.equal(object.name, name);

        if (!this.is_object(object['dist-tags'])) {
            object['dist-tags'] = {};
        }

        if (!this.is_object(object['versions'])) {
            object['versions'] = {};
        }

        return object;
    }

    filter_tarball_urls (pkg, req) {
        const filter = (_url) => {
            if (!req.headers.host) return _url;
            const filename = URL.parse(_url).pathname.replace(/^.*\//, '');
            let result: any;
            if (Config.url_prefix !== null) {
                result = Config.url_prefix.replace(/\/$/, '');
            } else {
                result = req.protocol + '://' + req.headers.host;
            }
            return result + '/' + pkg.name.replace(/\//g, '%2f') + '/-/' + filename;
        };

        for (const version in pkg.versions) {
            const dist = pkg.versions[version].dist;
            if (dist != null && dist.tarball != null) {
                dist.tarball = filter(dist.tarball);
            }
        }
        return pkg;
    }

    get_version (object, version) {
        if (object.versions[version] != null) return object.versions[version];
        try {
            version = semver.parse(version, true);
            for (const k in object.versions) {
                if (version.compare(semver.parse(k, true)) === 0) {
                    return object.versions[k];
                }
            }
        } catch (err) {
            return undefined;
        }
    }
});