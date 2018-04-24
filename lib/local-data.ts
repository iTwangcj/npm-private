import * as path from 'path';
import * as fs from 'fs';
import { BasePath, Config } from '../config';
import { Instance } from '../application';

export default Instance(class LocalData {

    data: any;

    constructor () {
        const dbPath = path.resolve(BasePath, 'storage', '.npm-db.json');
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({}), { encoding: 'utf8' });
            this.data = {};
        } else {
            this.data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        }
    }

    get_package () {
        console.log('this.data == ', this.data);
    }
});