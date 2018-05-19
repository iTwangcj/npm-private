/* =================================
 * 用户管理
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
import { logger, utils } from '../utils';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as request from 'request';
import { streams } from '../lib';
import { PackageApi } from './index';
import { Instance } from '../application';
import { Config } from '../config';

export default Instance(class Registry {

    async syncAndInstall (req: any, res: any) {
        const packageName = req.params.package;
        const versionStrArray = req.rawHeaders.filter(header => header.startsWith('install') && header.includes('@') && header.includes(packageName));
        let version = '';
        if (versionStrArray && versionStrArray.length) {
            version = versionStrArray[0].split('@')[1];
        }

        if (req.method.toUpperCase() === 'GET') {
            if (req.url === '/favicon.ico') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end();
            } else if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`
                Usage:

                    npm install --registry=http://127.0.0.1:3000/

                        or

                    npm config set registry=http://127.0.0.1:3000/
            `);
            } else if (/^\/.+$/.test(req.url)) {
                let result = null;
                try {
                    const packageDB: any = await PackageApi.getPackage(packageName);
                    const getNetworkTarball = async () => { // 获取网络压缩包
                        result = await utils.getPackageJson(packageName);
                        if (result && typeof result === 'object') {
                            let downloadStatus: any = false;
                            // 下载包至磁盘目录(没有指定版本号，默认最新, 否则，下载指定版本号的包)
                            if (!version) {
                                const latestVersion = result['dist-tags'].latest;
                                downloadStatus = await this.downloadPkg(result, latestVersion);
                            } else {
                                downloadStatus = await this.downloadPkg(result, version);
                            }
                            if (downloadStatus) {
                                result = this.replaceRegistry(result);
                                await PackageApi.savePackage(result);
                            }
                        } else {
                            logger.error('Get the package format error.');
                        }
                    };
                    if (!packageDB || !packageDB.data) {
                        await getNetworkTarball();
                    } else {
                        const latestVersion = packageDB.data['dist-tags'].latest;
                        let tgzUrl = packageDB.data.versions[latestVersion].dist.tarball;
                        if (version) {
                            tgzUrl = packageDB.data.versions[version].dist.tarball;
                        }
                        const fileName = path.basename(tgzUrl);
                        const filePath = path.join(__dirname, '../storage', packageName, fileName);
                        if (!fs.existsSync(filePath)) {
                            await getNetworkTarball();
                        } else {
                            result = packageDB.data;
                        }
                    }
                } catch (e) {
                    logger.error(e.message);
                }
                res.json(result);
            }
        }
    }

    /**
     * 安装本地包
     */
    async installLocalPkg (req: any, res: any) {
        const params: any = req.params;
        try {
            const versionStrArray = req.rawHeaders.filter(header => header.startsWith('install') && header.includes('@') && header.includes(params.package));
            let version = '';
            if (versionStrArray && versionStrArray.length) {
                version = versionStrArray[0].split('@')[1];
            }
            logger.info(`package-version: ${version}`);
            const packageDB: any = await PackageApi.getPackage(params.package);
            if (!packageDB || !packageDB.data) {
                const result = await utils.getPackageJson(params.package);
                const latestVersion = result['dist-tags'].latest;
                const tgzUrl = result.versions[latestVersion].dist.tarball;
                const fileName = path.basename(tgzUrl);
                const dirPath = path.join(__dirname, '../storage', params.package);
                fse.ensureDirSync(dirPath);
                const outPath = path.resolve(dirPath, fileName);
                let stream = fs.createWriteStream(outPath);
                request(tgzUrl).pipe(stream).on('close', () => {
                    console.log('文件[' + fileName + ']下载完毕');
                    const stats = fs.statSync(outPath);
                    res.set({
                        'Content-Type'       : 'application/octet-stream',
                        'Content-Disposition': 'attachment; filename=' + fileName,
                        'Content-Length'     : stats.size
                    });
                    fs.createReadStream(outPath).pipe(res);
                });
            } else {
                const latestVersion = packageDB.data['dist-tags'].latest;
                let tgzUrl = packageDB.data.versions[latestVersion].dist.tarball;
                if (version) {
                    tgzUrl = packageDB.data.versions[version].dist.tarball;
                }
                const fileName = path.basename(tgzUrl);
                const filePath = path.join(__dirname, '../storage', packageDB.name, fileName);
                const stats = fs.statSync(filePath);
                res.set({
                    'Content-Type'       : 'application/octet-stream',
                    'Content-Disposition': 'attachment; filename=' + fileName,
                    'Content-Length'     : stats.size
                });
                const stream = this.get_tarball(filePath);
                stream.on('content-length', (v) => {
                    res.header('Content-Length', v);
                });
                stream.on('error', (err) => {
                    logger.error(err);
                    return res.report_error(err);
                });
                stream.pipe(res);
            }
        } catch (e) {
            logger.error(e.message);
        }
    }

    get_tarball (filePath) {
        const stream = streams.ReadTarballStream();
        stream.abort = () => {
            rStream.close();
        };
        const rStream = fs.createReadStream(filePath);
        rStream.on('error', (err) => {
            stream.emit('error', err);
        });
        rStream.on('open', (fd) => {
            fs.fstat(fd, (err, stats) => {
                if (err) return stream.emit('error', err);
                stream.emit('content-length', stats.size);
                stream.emit('open');
                rStream.pipe(stream);
            });
        });
        return stream;
    }

    /**
     * 替换数据源
     */
    replaceRegistry (result) {
        for (const verNum in result.versions) {
            const dist = result.versions[verNum].dist;
            dist.tarball = dist.tarball
            .replace(/^(http|https):\/\/registry.npmjs.org/, Config.serverRegistry)
            .replace(/\/download\//, '/-/');
        }
        return result;
    }

    /**
     * 下载包至磁盘目录
     * @param result
     * @param {string} version
     */
    private downloadPkg (result: any, version: string) {
        return new Promise(resolve => {
            try {
                const tgzUrl = result.versions[version].dist.tarball;
                const fileName = path.basename(tgzUrl);
                const dirPath = path.join(__dirname, '../storage', result.name);
                fse.ensureDirSync(dirPath);
                const outPath = path.resolve(dirPath, fileName);
                const stream = fs.createWriteStream(outPath);
                request(tgzUrl).pipe(stream).on('close', () => {
                    console.log('文件[' + fileName + ']下载完毕');
                    return resolve(true);
                });
            } catch (e) {
                return resolve(false);
            }
        });
    }
});