import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';
import { Route } from './routes';
import { logger, middleware } from './utils';
import { Config } from './config';
import { statusCat } from './utils/status-cats';
import * as compression from 'compression';

// const auth = Auth(config);

const Error = require('http-errors');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const error_reporting_middleware = (req, res, next) => {
    res.report_error = res.report_error || function (err) {
        if (err.status && err.status >= 400 && err.status < 600) {
            if (!res.headersSent) {
                res.status(err.status);
                next({ error: err.message || 'unknown error' });
            }
        } else {
            logger.error(`unexpected error: ${!err.message}\n${err.stack}`);
            if (!res.status || !res.send) {
                logger.error('this is an error in express.js, please report this');
                res.destroy();
            } else if (!res.headersSent) {
                res.status(500);
                next({ error: 'internal server error' });
            } else {
                // socket should be already closed
            }
        }
    };
    next();
};
app.use(error_reporting_middleware);
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', Config.user_agent);
    next();
});
app.use(statusCat);
app.use(compression());

app.get('/favicon.ico', (req, res, next) => {
    req.url = '/-/static/favicon.png';
    next();
});

// hook for tests only
if (Config.debug) {
    app.get('/-/debug', (req, res, next) => {
        const do_gc = typeof(global.gc) !== 'undefined';
        if (do_gc) global.gc();
        next({
            pid : process.pid,
            main: process.mainModule.filename,
            conf: Config,
            mem : process.memoryUsage(),
            gc  : do_gc
        });
    });
}

// api
Route(app);

if (Config.web && !Config.web.enable) {
    app.get('/', (req, res, next) => {
        next(Error[404]('web interface is disabled in the config file'));
    });
} else {
    // app.use(require('./index-web')(Config, auth, storage));
}

app.get('/*', (req, res, next) => {
    next(Error[404]('file not found'));
});

app.use((err, req, res, next) => {
    if (Object.prototype.toString.call(err) !== '[object Error]') return next(err);
    if (err.code === 'ECONNABORT' && res.statusCode === 304) return next();
    if (typeof(res.report_error) !== 'function') {
        // in case of very early error this middleware may not be loaded before error is generated
        // fixing that
        error_reporting_middleware(req, res, () => {});
    }
    res.report_error(err);
});

app.use(middleware.final);

app.listen(3000);