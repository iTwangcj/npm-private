/* =================================
 * 压缩包读取流
 * Created by Wangcj on 2018/04/20.
 * Copyright 2018, Inc.
 * ================================= */
import { Stream } from 'stream';
import { Instance } from '../application';

function add_abstract_method (self, name) {
    self._called_methods = self._called_methods || {};
    self.__defineGetter__(name, function () {
        return function () {
            self._called_methods[name] = true;
        };
    });
    self.__defineSetter__(name, function (fn) {
        delete self[name];
        self[name] = fn;
        if (self._called_methods && self._called_methods[name]) {
            delete self._called_methods[name];
            self[name]();
        }
    });
}

export default Instance(class Streams extends Stream {

    ReadTarballStream () {
        const stream = new Streams.PassThrough();
        // called when data is not needed anymore
        add_abstract_method(stream, 'abort');
        return stream;
    }

    UploadTarballStream () {
        const stream = new Streams.PassThrough();
        // called when user closes connection before upload finishes
        add_abstract_method(stream, 'abort');

        // called when upload finishes successfully
        add_abstract_method(stream, 'done');
        return stream;
    }

});