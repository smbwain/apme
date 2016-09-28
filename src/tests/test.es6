import 'source-map-support/register';

import {Api, jsonErrorHandler} from '../apme2/api';

import express from 'express';
import bodyParser from 'body-parser';
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
            loadList: () => (users),
            loadOne: id => (users.find(user => user.id == id)),
            updateOne: ({id, ...rest}) => {
                const index = users.findIndex(user => user.id == id);
                if(index == -1) {
                    return null;
                }
                users[index] = {
                    ...users[index],
                    ...rest
                };
                return users[index];
            },
            createOne: data => {
                users.push(data);
                return data;
            }
        });

        const app = express();
        app.use(bodyParser.json({
            type: req => {
                const contentType = req.get('content-type');
                return contentType == 'application/vnd.api+json' || contentType == 'application/json';
            }
        }));
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

    it('should update user', async() => {
        const res = await makeRequest('/api/users/2', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        lastName: 'Watson'
                    }
                }
            })
        });
        assert.deepEqual(JSON.parse(res), {
            data: {
                id: '2',
                type: 'users',
                attributes: {
                    name: 'Piter',
                    lastName: 'Watson'
                }
            }
        });
    });

    it('should create user', async() => {
        const res = await makeRequest('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify({
                data: {
                    id: '7',
                    attributes: {
                        name: 'Joan'
                    }
                }
            })
        });
        assert.deepEqual(JSON.parse(res), {
            data: {
                id: '7',
                type: 'users',
                attributes: {
                    name: 'Joan'
                }
            }
        });
    });

    it('shoud close server', done => {
        server.close(done);
    })

});