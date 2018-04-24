import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import { streams } from '../lib';

const FSError = (code) => {
    const err: any = Error(code);
    err.code = code;
    return err;
};

let fsExt;
try {
    fsExt = require('fs-ext');
} catch (e) {
    fsExt = {
        flock    : (...args) => {
            args[args.length - 1]();
        },
        flockSync: (...args) => {
            return new Promise((resolve, reject) => {
                try {
                    const result = args[args.length - 1]();
                    return resolve(result);
                } catch (err) {
                    return reject(err);
                }
            });
        }
    };
}

const tempFile = (str) => {
    return str + '.tmp' + String(Math.random()).substr(2);
};

const renameTmp = (src, dst) => {
    if (process.platform !== 'win32') {
        return fs.renameSync(src, dst);
    }

    // windows can't remove opened file,
    // but it seem to be able to rename it
    const tmp = tempFile(dst);
    try {
        fs.renameSync(dst, tmp);
    } catch (err) {
        try {
            fs.renameSync(src, dst);
        } catch (sErr) {
            if (sErr) fs.unlinkSync(src);
        }
        return err;
    }
};

export const write = (dest, data) => {
    const safe_write = () => {
        const tmpName = tempFile(dest);
        fs.writeFileSync(tmpName, data);
    };
    try {
        safe_write();
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            fse.ensureDirSync(path.dirname(dest));
            safe_write();
        }
        return err;
    }
};

export const write_stream = (name) => {
    const stream = streams.UploadTarballStream();

    let _ended = 0;
    stream.on('end', function () {
        _ended = 1;
    });

    const exists = fs.existsSync(name);
    if (exists) return stream.emit('error', FSError('EEXISTS'));

    const tmpName = name + '.tmp-' + String(Math.random()).replace(/^0\./, '');
    const file: any = fs.createWriteStream(tmpName);
    let opened = false;
    stream.pipe(file);

    stream.done = () => {
        const onEnd = () => {
            file.on('close', () => {
                const err = renameTmp(tmpName, name);
                if (err) {
                    stream.emit('error', err);
                } else {
                    stream.emit('success');
                }
            });
            file.destroySoon();
        };

        if (_ended) {
            onEnd();
        } else {
            stream.on('end', onEnd);
        }
    };
    stream.abort = () => {
        if (opened) {
            opened = false;
            file.on('close', () => {
                fs.unlinkSync(tmpName);
            });
        }
        file.destroySoon();
    };
    file.on('open', () => {
        opened = true;
        // re-emitting open because it's handled in storage.js
        stream.emit('open');
    });
    file.on('error', (err) => {
        stream.emit('error', err);
    });
    return stream;
};

export const read_stream = (name) => {
    const stream = streams.ReadTarballStream();
    stream.abort = () => {
        rStream.close();
    };
    const rStream = fs.createReadStream(name);
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
};

export const create = (name, contents) => {
    const exists = fs.existsSync(name);
    if (exists) return FSError('EEXISTS');
    return write(name, contents);
};

export const update = (name, contents) => {
    const exists = fs.existsSync(name);
    if (!exists) return FSError('ENOENT');
    return write(name, contents);
};

export const read = async (name: string, encoding: string = null) => {
    return new Promise((resolve, reject) => {
        try {
            return resolve(fs.readFileSync(name, { encoding: encoding }));
        } catch (err) {
            return reject(err);
        }
    });
};

export const read_json = async (name) => {
    try {
        const result = await read(name, 'utf8');
        return { data: JSON.parse(result.toString()) };
    } catch (err) {
        return { err };
    }
};

// open and flock with exponential backoff
const open_flock = (name, opMod, flMod, tries, backOff, cb) => {
    fs.open(name, opMod, (err, fd) => {
        if (err) return cb(err, fd);

        fsExt.flock(fd, flMod, (err) => {
            if (err) {
                if (!tries) {
                    fs.close(fd, () => {
                        cb(err);
                    });
                } else {
                    fs.close(fd, () => {
                        setTimeout(() => {
                            open_flock(name, opMod, flMod, tries - 1, backOff * 2, cb);
                        }, backOff);
                    });
                }
            } else {
                cb(null, fd);
            }
        });
    });
};

// this function neither unlocks file nor closes it
// it'll have to be done manually later
export const lock_and_read = (name, _callback) => {
    open_flock(name, 'r', 'exnb', 4, 10, (err, fd) => {
        function callback (err, fd, buffer?) {
            if (err && fd) {
                fs.close(fd, (_) => {
                    _callback(err);
                });
            } else {
                _callback.apply(null, arguments);
            }
        }

        if (err) return callback(err, fd);

        fs.fstat(fd, (err, st) => {
            if (err) return callback(err, fd);

            const buffer = new Buffer(st.size);
            const onRead = (err, bytesRead, buffer) => {
                if (err) return callback(err, fd);
                if (bytesRead != st.size) return callback(Error('st.size != bytesRead'), fd);

                callback(null, fd, buffer);
            };
            if (st.size === 0) return onRead(null, 0, buffer);
            fs.read(fd, buffer, 0, st.size, null, onRead);
        });
    });
};

export const create_json = () => {

};

export const update_json = () => {

};

export const write_json = () => {

};

export const unlinkSync = fs.unlinkSync;
export const rmdirSync = fs.rmdirSync;