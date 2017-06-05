import { isPlainObject, isString } from 'lodash';

export default function isJson(val) {
	if (isPlainObject(val)) {
		return true;
	}
	else if (isString(val)) {
		try {
			JSON.parse(val);
			return true;
		} catch (e) {
			return false;
		}
	}
	return false;
}
