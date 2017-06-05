import EventEmitter = require('events');
import * as Promise from 'bluebird';
import { mapValues } from 'lodash';
import rp = require('request-promise');
import swagger = require('swagger-client');

import ClientResolver from './ClientResolver';
import {
	IClientResolverConfig,
	IClientResolverConfigMap,
	IClientResolverMap,
	ISwaggerClient
} from './types';

export default class ServiceCache extends EventEmitter {

	public resolvers: IClientResolverMap;

	constructor(services: IClientResolverConfigMap) {
		super();
		this.resolvers = mapValues(services, (cfg: IClientResolverConfig) => {
			return new ClientResolver(cfg);
		});
	}

	public getService(name: string): Promise<ClientResolver> {
		return Promise.attempt(() => {
			const resolver: ClientResolver = this.resolvers[name];
			if (!resolver) {
				throw new Error(`unknown service: ${name}`);
			}
			return this.preloadService(resolver);
		});
	}

	public preloadAll(): Promise<ServiceCache> {
		const ops = mapValues(this.resolvers, this.preloadService.bind(this));
		return Promise.props(ops).then(() => this);
	}

	public preloadService(resolver: ClientResolver): Promise<ClientResolver> {
		return resolver.resolve()
		.then(() => resolver)
		.catch(err => {
			if (resolver.opts.critical === true) {
				const msg = `critical service failure: ${resolver.opts.origin}`;
				this.log(msg);
				throw new Error(msg);
			}
			else {
				this.log(`non-critical service failure: ${resolver.opts.origin}`);
				return resolver;
			}
		});
	}

	private log(...args: any[]): void {
		this.emit.apply(this, ['log', ...args]);
	}

}
