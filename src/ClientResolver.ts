import EventEmitter = require('events');
import _ = require('lodash');
import Promise = require('bluebird');
import retry = require('bluebird-retry');
import rp = require('request-promise');
import semver = require('semver');
import swagger = require('swagger-client');

import isJson from './lib/is-json';
import {
	IClientResolverConfig,
	IRetryOpts,
	IServiceConfig,
	ISwaggerClient
} from './types';

export const retryDefaults: IRetryOpts = {
	interval: 1000,
	backoff: 2,
	max_tries: 5,
	timeout: 60 * 1000
};

const swaggerOpts = {
	// because swagger-client's http lib sucks
	http: /* istanbul ignore next */ (req: any) => {
		if (isJson(req.body)) {
			req.json = true;
			req.resolveWithFullResponse = true;
		}
		return rp(req);
	}
};

export default class ClientResolver extends EventEmitter {

	public opts: IClientResolverConfig;
	private cachedClient: ISwaggerClient;

	constructor(opts: IClientResolverConfig) {
		super();
		this.opts = _.merge({ retry: retryDefaults }, opts);
	}

	public getClient(): Promise<ISwaggerClient> {
		return Promise.resolve(this.cachedClient || this.resolve());
	}

	public isCached(): boolean {
		return !!this.cachedClient;
	}

	public resolve(): Promise<ISwaggerClient> {
		const retryable = () => {
			return swagger(this.opts.spec, swaggerOpts)
			.then((client: ISwaggerClient) => this.cachedClient = client)
			.catch(err => {
				this.log(`service resolution failed: ${this.opts.origin} (retrying)`);
				throw err;
			});
		};

		return retry(retryable, this.opts.retry)
		.tap(() => this.log(`resolved service: ${this.opts.origin}`))
		.catch(err => {
			const msg = `service resolution timeout: ${this.opts.origin}`;
			this.log(msg);
			throw new Error(msg);
		})
		.tap(client => {
			if (this.validateSpec(client) === false) {
				const msg = `invalid service spec: ${this.opts.origin}`;
				this.log(msg);
				throw new Error(msg);
			}
		});
	}

	private validateSpec(client: ISwaggerClient): boolean {
		const version = client.spec.info.version;
		const range = this.opts.version;
		const valid = semver.satisfies(version, range);
		this.log(`validated service: ${this.opts.origin} (version: ${version}, range: ${range})`);
		return valid;
	}

	private log(...args: any[]): void {
		this.emit.apply(this, ['log', ...args]);
	}
}
