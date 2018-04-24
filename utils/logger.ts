/* ===================================
 * 日志组件
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * =================================== */
import { dirname, join } from 'path';
import { createLogger } from 'bunyan';
import { existsSync, mkdirSync } from 'fs';
import { Config } from '../config';
import utils from './utils';

/**
 * 递归同步创建目录
 * @param  dirPath 要创建的目录,支持多层级创建
 * @param  mode defaults to 0777
 */
const mkDirsSync = (dirPath: string, mode?: any) => {
	if (existsSync(dirPath)) {
		return true;
	} else {
		if (mkDirsSync(dirname(dirPath), mode)) {
			mkdirSync(dirPath, mode);
			return true;
		}
	}
};

/**
 * 获取日志文件路径
 * @param type
 * @returns {string}
 */
const getPath = (type: string) => {
	const filePath = join(__dirname, '..', Config.logPath, '/', type);
	if (!existsSync(filePath)) {
		mkDirsSync(filePath);
	}
	return join(filePath, Config.logName + '_' + type.toUpperCase() + '_' + utils.formatDate(new Date(), 'yyyy-MM-dd') + '.log');
};

/**
 * 初始化日志配置
 */
export const logger = createLogger({
	name: Config.logName,
	streams: [
		{
			level: 'trace',
			stream: process.stdout
		},
		{
			name: 'daily-info',
			type: 'rotating-file',
			level: 'info',
			path: getPath('info'),
			period: '1d',   // daily rotation
			count: 7        // keep 7 back copies
		},
		{
			name: 'daily-error',
			type: 'rotating-file',
			level: 'error',
			path: getPath('error'),
			period: '1d',   // daily rotation
			count: 7        // keep 7 back copies
		}
	]
});