'use strict';

var Schema = require('./_lib/schema');
var path = require('path');

var schema = new Schema().validate('type object').object(function (r, o) {
	r('fio', 'type object').object(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]);
	});
	r('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	r('family', [ 'type array', 'min_length 2', { each: [ 'type object' ] } ]).array(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	});
	r('education', [ 'type array', 'min_length 2', 'not empty', { each: [ 'type string', 'min_length 3', 'max_length 20' ] } ]).array(function (r, o) {
		r('name', 'type string');
		r('type', 'type string');
		o('classes').array();
	});
});

exports['simple usage'] = {
	'yaml-full': function (test) {
		test.deepEqual(schema, Schema.load(path.join(__dirname, 'for-parser-tests/simple/schema-full.yml')));
		test.done();
	},

	'yaml-short': function (test) {
		test.deepEqual(schema, Schema.load(path.join(__dirname, 'for-parser-tests/simple/schema-short.yml')));
		test.done();
	}
};

var schemaArray = new Schema().optional().validate('type object').array(function (r, o) {
	r('fio', 'type object').object(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]);
	});
	r('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	r('family', [ 'type array', 'min_length 2', { each: [ 'type object' ] } ]).optional().array(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	});
	r('education', [ 'type array', 'min_length 2', 'not empty', { each: [ 'type string', 'min_length 3', 'max_length 20' ] } ]).array(function (r, o) {
		r('name', 'type string');
		r('type', 'type string');
		o('classes').array();
	});
});

exports['array yaml'] = {
	'yaml-full': function (test) {
		test.deepEqual(schemaArray, Schema.load(path.join(__dirname, 'for-parser-tests/array/schema-full.yml')));
		test.done();
	},

	'yaml-short': function (test) {
		test.deepEqual(schemaArray, Schema.load(path.join(__dirname, 'for-parser-tests/array/schema-short.yml'), 'blablabla'));
		test.done();
	}
};

var schemaArrayStrict = new Schema().optional().strict().validate('type object').array(function (r, o) {
	r('fio', 'type object').strict().object(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]);
	});
	r('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	r('family', [ 'type array', 'min_length 2', { each: [ 'type object' ] } ]).strict().optional().array(function (r, o) {
		r('first_name',  [ 'type string', 'min_length 3', 'max_length 20' ]);
		r('last_name',   [ 'type string', 'min_length 3', 'max_length 20' ]);
		o('middle_name', [ 'type string', 'min_length 3', 'max_length 20' ]).strict();
		o('age', [ 'type number', 'max_value 100', 'min_value 16' ]);
	});
	r('education', [ 'type array', 'min_length 2', 'not empty', { each: [ 'type string', 'min_length 3', 'max_length 20' ] } ]).strict().array(function (r, o) {
		r('name', 'type string');
		r('type', 'type string');
		o('classes').array();
	});
});

exports['strict option'] = {
	'yaml-full': function (test) {
		test.deepEqual(schemaArrayStrict, Schema.load(path.join(__dirname, 'for-parser-tests/strict/schema-full.yml')));
		test.done();
	},

	'yaml-short': function (test) {
		test.deepEqual(schemaArrayStrict, Schema.load(path.join(__dirname, 'for-parser-tests/strict/schema-short.yml')));
		test.done();
	}
};

exports['check invalid'] = {
	'yaml-full': function (test) {
		test.throws(function () {
			Schema.load(path.join(__dirname, 'for-parser-tests/invalid/schema-full.yml'));
		});
		test.done();
	},

	'yaml-short': function (test) {
		test.throws(function () {
			Schema.load(path.join(__dirname, 'for-parser-tests/invalid/schema-short.yml'));
		});
		test.done();
	}
};
