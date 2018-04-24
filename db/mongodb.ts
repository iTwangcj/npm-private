import * as mongoose from 'mongoose';
import { Config } from '../config';
import { logger } from '../utils';
import { Instance } from '../application';

export default Instance(class Mongodb {

    db: any;

    constructor () {
        if (!this.db) {
            // 初始化mongodb
            const mongodbCfg = Config.mongodb[0];
            const mongodbUrl = mongodbCfg.getUrl();
            // mongoose集群配置
            // let opts = {
            //     db: {native_parser: true},
            //     server: {
            //         poolSize: 5,
            //         auto_reconnect: true,
            //         socketOptions: {keepAlive: 1}
            //     },
            //     replset: {rs_name: mongodbCfg.rsName}
            // };
            this.db = mongoose.createConnection(mongodbUrl/*, opts*/);
            this.db.on('connected', () => {
                logger.info('Mongodb is ready.');
            });
            this.db.on('error', (err: any) => {
                logger.error('Mongodb error ' + err);
                this.db.close();
            });
            this.db.on('disconnected', () => {
                logger.error('DB disconnected.');
                this.db = mongoose.createConnection(mongodbUrl/*, opts*/);
            });
        }
    }
});