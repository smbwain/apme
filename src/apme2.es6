/**
 * @typedef {{type: <string>, id: <string>}} RelDescription
 */

import asyncMW from 'async-mw';
import {notFoundError, methodNotAllowedError, badRequestError, validationError, jsonErrorHandler} from './apme2/errors';

import {SimpleMemoryCache} from './cache';
import {loadAllRelationships} from './load-rels';
import {ObjectsSyncCache} from './objects-sync-cache';

export {jsonErrorHandler, notFoundError, methodNotAllowedError, validationError};

class Collection {
    async loadFew(ids, context) {
        return await context.cache.mload(this.type, ids, ids => (
            this.cache.mload(ids, ids => (
                this._loadFew(ids, context)
            ))
        ));
    }

    pack(item) {
        const res = {
            id: String(item.id),
            type: this.type,
            attributes: this.options.packAttrs(item)
        };
        if(this.api.path) {
            res.links = {
                self: `${this.api.path}${this.type}/${item.id}`
            }
        }
        for(const relName in this.options.rels) {
            const rel = this.options.rels[relName];
            let relRes;
            if(rel.getList) {
                relRes = {
                    data: rel.getList(item)
                };
            } else if(rel.getOne) {
                relRes = {
                    data: rel.getOne(item)
                };
            } else {
                continue;
            }
            if(this.api.path) {
                relRes.links = {
                    self: `${this.api.path}${this.type}/${item.id}/rels/${relName}`,
                    related: `${this.api.path}${this.type}/${item.id}/${relName}`
                };
            }
            // if(relRes)
            res.relationships = res.relationships || {};
            res.relationships[relName] = relRes;
        }

        return res;
    }

    /**
     * @param {object} item
     * @param {string} relName
     * @returns {RelDescription,array<RelDescription>,null}
     */
    getRel(item, relName) {
        const rel = this.options.rels[relName];
        if(rel.getList) {
            return rel.getList(item);
        } else if(rel.getOne) {
            return rel.getOne(item);
        }
        return null;
    }

    parseSort(sortString) {
        /*if(req.query.sort) {
         query.sort = parseSort(req.query.sort);
         let ok = false;
         if(typeof req.collection.allowSort == 'function') {
         ok = req.collection.allowSort(query.sort);
         }
         // @todo: validate other patterns
         if(!ok) {
         throw badRequestError('Sort is not allowed for collection');
         }
         }*/
    }
}

export class Api {
    expressRouter() {
        return router;
    }
}