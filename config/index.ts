/* ===================================
 * 配置文件
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * =================================== */
import { resolve } from 'path';
import * as crypto from 'crypto';

const env = process.env.NODE_ENV || 'dev';
const BasePath = resolve(__dirname, '..');
const Config = require(`./environment.${env}`).environment;

if (!Config.user_agent) Config.user_agent = 'npm-private/' + '0.0.1';
if (!Config.secret) {
    Config.secret = crypto.pseudoRandomBytes(32).toString('hex');
}

Config.debug = false;
if (!Config.https) Config.https = { enable: false };

const parse_interval_table = {
    '': 1000,
    ms: 1,
    s : 1000,
    m : 60 * 1000,
    h : 60 * 60 * 1000,
    d : 86400000,
    w : 7 * 86400000,
    M : 30 * 86400000,
    y : 365 * 86400000
};
const parse_interval = (interval) => {
    if (typeof(interval) === 'number') return interval * 1000;

    let result = 0;
    let last_suffix = Infinity;
    interval.split(/\s+/).forEach((x) => {
        if (!x) return;
        const m = x.match(/^((0|[1-9][0-9]*)(\.[0-9]+)?)(ms|s|m|h|d|w|M|y|)$/);
        if (!m
            || parse_interval_table[m[4]] >= last_suffix
            || (m[4] === '' && last_suffix !== Infinity)) {
            throw Error('invalid interval: ' + interval);
        }
        last_suffix = parse_interval_table[m[4]];
        result += Number(m[1]) * parse_interval_table[m[4]];
    });
    return result;
};

export {
    Config,
    BasePath,
    parse_interval
};