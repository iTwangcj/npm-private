/* =================================
 * 基类
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
const instanceMap = {};

export const Instance = (Class: any) => {
    if (!instanceMap['__' + Class.name]) {
        instanceMap['__' + Class.name] = new Class();
    }
    return instanceMap['__' + Class.name];
};