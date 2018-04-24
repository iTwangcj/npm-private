/* =================================
 * 用户相关路由
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
import * as express from 'express';
import { RegistryApi } from '../controllers';

const router = express.Router();

const syncAndInstall = async (req, res) => {
    await RegistryApi.syncAndInstall(req, res);
};

const installLocalPkg = async (req, res) => {
    await RegistryApi.installLocalPkg(req, res);
};

/**
 * 不需登录验证
 */
router.get('/:package', syncAndInstall);
router.get('/:package/-/:filename', installLocalPkg);

export const registryRoute = router;