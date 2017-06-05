import nock = require('nock');
import ClientResolver from '../src/ClientResolver';
import ServiceCache from '../src/ServiceCache';
import { IClientResolverConfigMap } from '../src/types';

const services: IClientResolverConfigMap = {
	foo: {
		name: 'foo',
		origin: 'http://foo.upstream:3000',
		spec: 'http://foo.upstream:3000/swagger.json',
		version: '^1.x',
		critical: true
	}
};

// mock http calls
nock(services.foo.origin).get('/swagger.json').reply(200, {
	info: {
		title: 'foo',
		version: '1.2.3'
	}
});

const checkCached = (resolver: ClientResolver) => {
	// tslint:disable-next-line
	console.log(`isCached? ${resolver.isCached()}`);
};

// Service config is passed to the `ServiceCache` class during
// instantiation, and `ClientResolver` instances are created for each:
const serviceCache = new ServiceCache(services);
checkCached(serviceCache.resolvers.foo); // false

// `ServiceCache` extends `EventEmitter` so you can attach your own logger:
serviceCache.on('log', console.log);

// Clients can then be bulk-resolved and cached:
serviceCache.preloadAll()
.then(() => checkCached(serviceCache.resolvers.foo)); // true
