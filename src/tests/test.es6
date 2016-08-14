
import {Api, jsonErrorHandler} from '../apme';

import express from 'express';
import request from 'request';
import assert from 'assert';

const TEST_PORT = 23001;

const users = [{
    id: '1',
    name: 'Jack'
}, {
    id: '2',
    name: 'Piter'
}];


function makeRequest(path, opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
        request(`http://127.0.0.1:${TEST_PORT}${path}`, opts, (err, response, body) => {
            if (err) {
                reject(err);
                return;
            }
            if (response.statusCode != 200) {
                err = new Error(`Wrong status code: ${response.statusCode}`);
                err.statusCode = response.statusCode;
                reject(err);
                return;
            }
            resolve(body);
        })
    });
}
describe('apme', () => {

    let server;

    it('should start server', done => {
        const api = new Api();
        api.define('users', {
            getList: () => ({list: users}),
            getOne: id => ({one: users.find(user => user.id == id)})
        });

        const app = express();
        app.use('/api', api.expressRouter(), jsonErrorHandler());
        server = app.listen(TEST_PORT, done);
    });

    it('should get users list', async () => {
        const res = await makeRequest('/api/users');
        assert.deepEqual(JSON.parse(res), {
            data: [{
                id: '1',
                type: 'users',
                attributes: {
                    name: 'Jack'
                }
            }, {
                id: '2',
                type: 'users',
                attributes: {
                    name: 'Piter'
                }
            }]
        });
    });

    it('should get single user', async () => {
        const res = await makeRequest('/api/users/2');
        assert.deepEqual(JSON.parse(res), {
            data: {
                id: '2',
                type: 'users',
                attributes: {
                    name: 'Piter'
                }
            }
        });
    });

    it('shoud close server', done => {
        server.close(done);
    })

});