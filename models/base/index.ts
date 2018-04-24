/* =================================
 * 数据结构基类
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
import { Schema } from 'mongoose';
import { db } from '../../db';

export function BaseModel (name: string, options: any) {
    const schema = new Schema(options, {
        id: false,
        versionKey: false
    });
    let firstStr = name.substr(0, 1);
    const lastStr = name.substr(1);
    firstStr = firstStr.toLowerCase();
    name = firstStr + lastStr;
    return db.model(name, schema, name + 'Schema');
}