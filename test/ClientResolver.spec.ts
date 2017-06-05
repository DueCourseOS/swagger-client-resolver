import { assert as t } from 'chai';
import { suite, test } from 'mocha-typescript';
import nock = require('nock');
import ClientResolver, { retryDefaults } from '../src/ClientResolver';
import { IClientResolverConfig } from '../src/types';

suite('ClientResolver', () => {
	let resolverOpts;
	let mocks;

	beforeEach(() => {
		nock.cleanAll();

		mocks = {
			fooService: {
				name: 'foo',
				origin: 'http://foo.com',
				spec: 'http://foo.com/swagger.json',
				version: '^1.x',
				critical: true
			},

			fooSpec: {
				info: {
					title: 'foo',
					version: '1.2.3'
				}
			},

			retryOpts: {
				interval: 10,
				backoff: 1,
				max_tries: 3
			},

			httpOk: () => nock(mocks.fooService.origin)
				.get('/swagger.json')
				.reply(200, mocks.fooSpec)
		};

		resolverOpts = { ...mocks.fooService, retry: mocks.retryOpts };
	});

	test('#constructor should set retry defaults', () => {
		const resolver = new ClientResolver(mocks.fooService);
		t.deepEqual(resolver.opts.retry, retryDefaults);
	});

	test('#constructor should merge retry opts', () => {
		const expected = { ...retryDefaults, ...resolverOpts.retry };
		const resolver = new ClientResolver(resolverOpts);
		t.deepEqual(resolver.opts.retry, expected);
	});

	test('#getClient should first resolve, then return cached', async () => {
		const http = mocks.httpOk();
		const resolver = new ClientResolver(mocks.fooService);
		const client1 = await resolver.getClient();
		t.ok(http.isDone());
		const client2 = await resolver.getClient();
		t.deepEqual(client1, client2);
	});

	test('#isCached should return whether a cached client exists', async () => {
		const http = mocks.httpOk();
		const resolver = new ClientResolver(mocks.fooService);
		t.isFalse(resolver.isCached());
		await resolver.resolve();
		t.isTrue(resolver.isCached());
	});

	test('#resolve should fetch the remote spec', async () => {
		const http = mocks.httpOk();
		const resolver = new ClientResolver(mocks.fooService);
		const client = await resolver.resolve();
		t.deepEqual(client.spec, mocks.fooSpec);
	});

	test('#resolve should retry the fetch', async () => {
		const numFails = resolverOpts.retry.max_tries - 1;
		const http404 = nock(mocks.fooService.origin)
			.get('/swagger.json').times(numFails).reply(404);

		const httpOk = mocks.httpOk();

		const resolver = new ClientResolver(resolverOpts);
		const client = await resolver.resolve();
		t.ok(http404.isDone());
		t.ok(httpOk.isDone());
		t.deepEqual(client.spec, mocks.fooSpec);
	});

	test('#resolve should throw if retries fail', async () => {
		const http404 = nock(mocks.fooService.origin).get('/swagger.json').reply(404);
		const resolver = new ClientResolver(resolverOpts);
		try {
			await resolver.resolve();
		} catch (err) {
			t.match(err.message, /^service resolution timeout.*$/);
		}
	});

	test('#resolve should throw if validation fails', async () => {
		const invalidSpec = {
			...mocks.fooSpec,
			info: {
				title: 'foo',
				version: '2.0.0'
			}
		};

		const httpOk = nock(mocks.fooService.origin)
			.get('/swagger.json')
			.reply(200, invalidSpec);

		const resolver = new ClientResolver(resolverOpts);
		try {
			await resolver.resolve();
		} catch (err) {
			t.match(err.message, /^invalid service spec.*$/);
		}
	});

});
