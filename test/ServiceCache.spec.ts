import { assert as t } from 'chai';
import { suite, test } from 'mocha-typescript';
import nock = require('nock');

import ClientResolver from '../src/ClientResolver';
import ServiceCache from '../src/ServiceCache';
import {
	IClientResolverConfig,
	IClientResolverConfigMap,
	IClientResolverMap
} from '../src/types';

suite('ServiceCache', () => {
	let mocks;

	beforeEach(() => {
		nock.cleanAll();

		mocks = {
			fooService: {
				name: 'foo',
				origin: 'http://foo.com',
				spec: 'http://foo.com/swagger.json',
				version: '^1.x',
				critical: true,
				retry: {
					max_tries: 1
				}
			},

			fooSpec: {
				info: {
					title: 'foo',
					version: '1.2.3'
				}
			},

			httpOk: () => nock(mocks.fooService.origin)
				.get('/swagger.json')
				.reply(200, mocks.fooSpec)
		};
	});

	test('#constructor should build a cache of ClientResolver instances', () => {
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		const cache = new ServiceCache(services);
		const actual: string[] = Object.keys(cache.resolvers);
		const expected: string[] = Object.keys(services);
		t.deepEqual(actual, expected);
		t.ok(cache.resolvers.fooService instanceof ClientResolver);
	});

	test('#getService should throw if unknown resolver', async () => {
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		const cache = new ServiceCache(services);
		try {
			await cache.getService('barService');
		} catch (err) {
			t.equal(err.message, 'unknown service: barService');
		}
	});

	test('#getService should return a ClientResolver instance', async () => {
		const httpOk = mocks.httpOk();
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		const cache = new ServiceCache(services);
		const resolver = await cache.getService('fooService');
		t.ok(resolver instanceof ClientResolver);
	});

	test('#preloadAll should resolve client specs', async () => {
		const httpOk = mocks.httpOk();
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		const cache = new ServiceCache(services);
		await cache.preloadAll();
		t.ok(httpOk.isDone());
	});

	test('#preloadService should throw for critical failure', async () => {
		const http404 = nock(mocks.fooService.origin).get('/swagger.json').reply(404);
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		const cache = new ServiceCache(services);
		t.isTrue(services.fooService.critical);
		try {
			await cache.preloadAll();
		} catch (err) {
			t.match(err.message, /^critical service failure.*$/);
		}
	});

	test('#preloadService should not throw for non-critical failure', async () => {
		const http404 = nock(mocks.fooService.origin).get('/swagger.json').reply(404);
		const services: IClientResolverConfigMap = { fooService: mocks.fooService };
		services.fooService.critical = false;
		const cache = new ServiceCache(services);
		try {
			await cache.preloadAll();
		} catch (err) {
			t.fail('should not throw');
		}
	});

});
