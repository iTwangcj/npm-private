/* =================================
 * 数据仓库管理
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
import { PackageModel } from '../models';
import { logger } from '../utils';
import { Instance } from '../application';

// import { IStorage } from '../types';

export default Instance(class Package {

    async getPackage (name: string) {
        try {
            return await PackageModel.findOne({ name });
        } catch (e) {
            logger.error(e.message);
        }
    }

    /**
     * 模糊匹配包
     * @param {string} packageName
     * @returns {Promise<void>}
     */
    async search (packageName: string) {
        try {
            const packages: any = await PackageModel.find({ name: { $regex: packageName, $options: 'i' } });
            console.log('packages === ', packages);
        } catch (e) {
            logger.error(e.message);
        }
    }

    /**
     * 保存已下载包
     * @param {Object} pkg
     * @returns {Promise<void>}
     */
    async savePackage (pkg: any) {
        try {
            const packageObj: any = {
                uid : '',
                name: pkg.name,
                data: pkg
            };
            const pkgDB = await PackageModel.findOne({ name: pkg.name });
            if (!pkgDB) {
                await PackageModel.create(packageObj);
            } else {
                pkgDB.data = pkg;
                pkgDB.uTime = Date.now();
                pkgDB.save();
            }
            return true;
        } catch (e) {
            logger.error(e.message);
            return false;
        }
    }
});