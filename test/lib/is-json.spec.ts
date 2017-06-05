import { assert as t } from 'chai';
import { suite, test } from 'mocha-typescript';
import isJson from '../../src/lib/is-json';

suite('lib/is-json', () => {

	test('should return true for simple objects and valid strings', () => {
		t.isTrue(isJson({}));
		t.isTrue(isJson(JSON.parse('{}')));
		t.isTrue(isJson(new Object()));
		t.isTrue(isJson(new String('{}'))); // tslint:disable-line
	});

	test('should return false for object-like types', () => {
		const vals = [ [], null ];
		vals.map(i => {
			t.equal(typeof i, 'object');
			t.isFalse(isJson(i));
		});
	});

	test('should pass for stringified json', () => {
		const json = JSON.stringify({});
		t.isTrue(isJson(json));
	});

	test('should fail for invalid json', () => {
		const invalid = 'nope';
		t.isFalse(isJson(invalid));
	});

});
