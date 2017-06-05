import { Spec } from 'swagger-schema-official';
import ClientResolver from '../ClientResolver';

export interface ISwaggerClient {
	url: string;
	spec: Spec;
	errors: any[];
	apis: any;
}

export interface IRetryOpts {
	interval?: number;
	backoff?: number;
	max_tries?: number;
	timeout?: number;
}

export interface IServiceConfig {
	name: string;
	origin: string;
	spec: string;
	version: string;
	critical?: boolean;
}

export interface IClientResolverConfig extends IServiceConfig {
	retry?: IRetryOpts;
}

export interface IClientResolverConfigMap {
	[key: string]: IClientResolverConfig;
}

export interface IClientResolverMap {
	[key: string]: ClientResolver;
}
