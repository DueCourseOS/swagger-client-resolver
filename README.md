# swagger-client-resolver
A helper interface to swagger-client that adds resolution retry, a better http
client and semver-based spec validation.

## Overview

This library was developed for use within a facade API that routes requests to
a number of upstream APIs supported the OpenAPI/Swagger standard. Each upstream
API publishes a `swagger.json` spec that is used by the `swagger-client` module
in the facade API to initialise a valid API client.

This library encapsulates the following functionality:

### ClientResolver

* resolve an upstream Swagger spec, with configurable retry
* validates the upstream spec version (via `semver`)
* creates a `swagger-client` instance from the upstream spec
* replaces the `swagger-client` default http client with `request-promise`
  with better JSON handling

### ServiceCache

* intended for use when the facade API process is started to initialise all
  upstream clients
* manages a collection of services (`ClientResolver` instances)
* pre-load/resolve one or all services

## Usage

See: `demo/index.ts`

```javascript
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

// This configuration is passed to the `ServiceCache` class during
// instantiation, and `ClientResolver` instances are created:
const serviceCache = new ServiceCache(services);
checkCached(serviceCache.resolvers.foo); // false

// `ServiceCache` extends `EventEmitter` so you can attach your own logger:
serviceCache.on('log', console.log);

// Clients can then be bulk-resolved and cached:
serviceCache.preloadAll()
.then(() => checkCached(serviceCache.resolvers.foo)); // true
```
