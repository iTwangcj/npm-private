/* ===================================
 * 路由管理
 * Created by Wangcj on 2018/09/18.
 * Copyright 2018, Inc.
 * =================================== */
import { registryRoute } from './registry';
import { middleware, utils } from '../utils';
import { storage } from '../lib';

const Error = require('http-errors');

export const Route = (app: any/*, auth: any*/) => {

    // const can = Middleware.allow(auth);

    // 允许跨域
    app.all('*', (req: any, res: any, next: any) => {
        let AllowHeaders = 'Content-Type, Content-Length, Authorization, Accept, Content-Disposition, X-Requested-With, X_Requested_With';
        const requestHeaders = req.headers['access-control-request-headers'];
        if (requestHeaders) {
            AllowHeaders += ',' + requestHeaders;
        }
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', AllowHeaders);
        res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE');
        res.header('Access-Control-Expose-Headers', 'Access-Control-Allow-Headers, Access-Control-Allow-Methods, Access-Control-Allow-Origin, Cache-Control, Connection, Content-Length, Content-Type, Date, Expires, Vary, X-Powered-By');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200); // 让options请求快速返回
        } else {
            next();
        }
    });

    // validate all of these params as a package name
    // this might be too harsh, so ask if it causes trouble
    app.param('package', middleware.validate_package);
    app.param('filename', middleware.validate_name);
    app.param('tag', middleware.validate_name);
    app.param('version', middleware.validate_name);
    app.param('revision', middleware.validate_name);

    // these can't be safely put into express url for some reason
    app.param('_rev', middleware.match(/^-rev$/));
    app.param('org_couchdb_user', middleware.match(/^org\.couchdb\.user:/));
    app.param('anything', middleware.match(/.*/));

    // app.use(auth.basic_middleware());
    // app.use(auth.bearer_middleware());
    // app.use(expressJson5({ strict: false, limit: config.max_body_size || '10mb' }));
    // app.use(Middleware.anti_loop(config));

    // encode / in a scoped package name to be matched as a single parameter in routes
    app.use((req, res, next) => {
        if (req.url.indexOf('@') != -1) {
            // e.g.: /@org/pkg/1.2.3 -> /@org%2Fpkg/1.2.3, /@org%2Fpkg/1.2.3 -> /@org%2Fpkg/1.2.3
            req.url = req.url.replace(/^(\/@[^\/%]+)\/(?!$)/, '$1%2F');
        }
        next();
    });

    // for 'npm whoami'
    app.get('/whoami', function (req, res, next) {
        if (req.headers.referer === 'whoami') {
            next({ username: req.remote_user.name });
        } else {
            next('route');
        }
    });
    app.get('/-/whoami', function (req, res, next) {
        next({ username: req.remote_user.name });
    });

    // anonymous user
    // app.get('/:package/:version?', /*can('access'),*/  (req, res, next) => {
    //     storage.get_package(req.params.package, { req: req }, (err, info) => {
    //         if (err) return next(err);
    //         info = utils.filter_tarball_urls(info, req);
	//
    //         let version = req.params.version;
    //         if (!version) return next(info);
	//
    //         let t = utils.get_version(info, version);
    //         if (t != null) return next(t);
	//
    //         if (info['dist-tags'] != null) {
    //             if (info['dist-tags'][version] != null) {
    //                 version = info['dist-tags'][version];
    //                 t = utils.get_version(info, version);
    //                 if (t != null) return next(t);
    //             }
    //         }
	//
    //         return next(Error[404]('version not found: ' + req.params.version));
    //     });
    // });

    app.use('/', registryRoute);
};