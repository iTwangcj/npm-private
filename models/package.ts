import { Schema } from 'mongoose';
import { BaseModel } from './base';

export const PackageModel = BaseModel('Package', {
    uid: String,    // 用户id
    name: String,   // 包名
    data: { type: Schema.Types.Mixed, default: null },
    cTime: { type: String, default: Date.now },
    uTime: { type: String, default: Date.now }
});