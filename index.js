"use strict";

var _ = require('lodash');
var iterate = require('./lib/iterate');
var extend = require('./lib/extend');

/**
 * @callback verifyCallback
 * @param {?Error} error
 * @param {Boolean} isValid
 * @param {?Schema.ValidationResultError} validationError
 * */

/**
 * @callback verifierDone
 * @param {?Error|Boolean|Schema.ValidationError|Schema.ValidationResultError} error - for interrupt of validation stream (plain true), or value validation error, or Error of logic
 * */

/**
 * @callback validator
 * @param {array} validations - validations of this schema
 * @returns {validation}
 * */

/**
 * @callback verifierCallback
 * @param {*} value
 * @param {userValidationDone} done
 * */

/**
 * @callback validation
 * @param {*} value
 * @param {Object} options
 * @param {userValidationDone} done
 * */

/**
 * @callback userValidationDone
 * @param {?Error|Schema.ValidationError|Boolean} err
 * @param {?Boolean} isValid=true
 * @param {?Schema.ValidationError}
 * */

/**
 * Create instance of Schema
 *
 * @constructor
 * @this {Schema}
 * @class Schema
 * @param {string} [name] - register name
 * @property {Boolean} isRequired=true
 * @property {?Boolean} isArray=false
 * @property {?Object} fields=undefined
 * @property {?Array} validations=[]
 * @returns {Schema}
 */
function Schema (name) {
	if (!(this instanceof Schema)) {
		return new Schema(name);
	}

	if (name != null) {
		Schema.register(name, this);
	}

	this.isRequired = true;
	//this.isArray = false;
	//this.fields = undefined;
	//this.validations = [];
}

Schema.prototype = {

	/**
	 * attach this object to schema
	 *
	 * @method
	 * @param {!Schema|string} schema - attach destination object.
	 * @param {!String} name - field name for attach.
	 * @this {Schema}
	 * @throws {TypeError} If schema isn't Schema type
	 * @throws {TypeError} If name empty or isn't String type
	 * @throws {Error} If schema already has the same key name
	 * @returns {Schema} @this
	 */
	attachTo: function (schema, name) {
		if (_.isString(schema)) {
			schema = Schema.get(schema);
		}

		if (!(schema instanceof Schema)) {
			throw new TypeError('schema node must be instance of Schema');
		}

		if (!name || !_.isString(name)) {
			throw new TypeError('invalid scheme field name, must be non-empty string, "' + name + '" ' + Object.prototype.toString.call(name) + ' given');
		}

		return schema._attach(this, name);
	},


	/**
	 * @private
	 * @method
	 * @this {Schema}
	 * @param {!Schema} schema - attach destination object.
	 * @param {!String} name - field name for attach.
	 * @throws {Error} If schema already has the same key name
	 * @returns {Schema} @this
	 */
	_attach: function (schema, name) {
		if (!this.fields) {
			this.fields = {};
		} else if (_.has(this.fields, name)) {
			throw new Error('duplicate key "' + name + '"');
		}

		this.fields[name] = schema;

		return schema;
	},

	/**
	 * set validate options. can be called several times
	 *
	 * @method
	 * @this {Schema}
	 * @param {!*} validations - validation options.
	 * @returns {Schema} @this
	 */
	validate: function (validations) {
		if (!validations) {
			return this;
		}

		if (!this.validations) {
			this.validations = [];
		}

		var that = this;
		_.isArray(validations) || (validations = [validations]);
		_.each(validations, function (validation) {
			that.validations.push(validation);
		});

		return this;
	},

	/**
	 * set nested fields builder
	 *
	 * @method
	 * @this {Schema}
	 * @param {!Function|Schema|String} builderOrSchema - builder function, has two functions in arguments [required, options].
	 * @throws {TypeError} If nested is not a function if specified
	 * @returns {Schema} @this
	 */
	object: function (builderOrSchema) {
		if (this.fields) {
			throw new Error('object already defined');
		}

		if (_.isString(builderOrSchema)) {
			builderOrSchema = Schema.get(builderOrSchema);
		}

		if (builderOrSchema instanceof Schema) {
			return this._similar(builderOrSchema);
		}

		if (!_.isFunction(builderOrSchema)) {
			throw new TypeError('nested builder must be function');
		}

		builderOrSchema.call(this, this.required.bind(this), this.optional.bind(this));

		return this;
	},

	/**
	 * set nested fields builder with type array
	 *
	 * @method
	 * @this {Schema}
	 * @param {?Function|Schema|Boolean} [builderOrSchema] - builder function, has two functions in arguments [required, options].
	 * @throws {TypeError} If nested is not a function if specified
	 * @returns {Schema} @this
	 */
	array: function (builderOrSchema) {
		if (_.isFunction(builderOrSchema) || builderOrSchema instanceof Schema) {
			this.object(builderOrSchema);
		}

		this.isArray = builderOrSchema == null ? true : Boolean(builderOrSchema);

		return this;
	},

	/**
	 * add new nested schema by construct
	 *
	 * @method
	 * @this {Schema}
	 * @param {!String} name - field name.
	 * @returns {Schema}
	 */
	field: function (name) {
		return new Schema().attachTo(this, name);
	},

	/**
	 * clone this schema
	 *
	 * @method
	 * @this {Schema}
	 * @returns {Schema} new object (clone)
	 */
	clone: function () {
		var clone = new Schema()._similar(this);

		if (this.isArray != null) {
			clone.isArray = this.isArray;
		}

		return clone;
	},

	/**
	 * clone schema to this schema object
	 *
	 * @private
	 * @method
	 * @this {Schema}
	 * @returns {Schema} new object (clone)
	 */
	_similar: function (schema) {
		var that = this;

		_.each(schema.fields, function (fieldSchema, name) {
			fieldSchema.clone().attachTo(that, name);
		});

		if (schema.validations != null) {
			this.validations = _.cloneDeep(schema.validations);
		}

		if (schema.isRequired != null) {
			this.isRequired = schema.isRequired;
		}

		return this;
	},

	/**
	 * clone schema to this schema object
	 *
	 * @private
	 * @method
	 * @this {Schema}
	 * @param {function} validator
	 * @param {Object} options
	 * @returns {Schema} this object
	 */
	_compile: function (validator, options) {
		_.each(this.fields, function (fieldSchema) {
			fieldSchema._compile(validator, options);
		});

		var validations = validator(_.cloneDeep(this.validations), options);
		if (validations != null) {
			if (_.isFunction(validations)) {
				validations = [validations];
			}

			if (!_.isArray(validations)) {
				throw new Error('invalid validation rule type after user-validator mapping');
			}

			this.validations = validations;
		}

		return this;
	},

	/**
	 * verify value. compare schema with some object.
	 *
	 * @method
	 * @this {Schema}
	 * @param {*} value - value for check.
	 * @param {?Object} [options] - validation options, default is plain object.
	 * @param {?validator} [options.validator] - custom validation mapper
	 * @param {verifyCallback} done - done-callback.
	 * */
	verify: function (value, options, done) {
		if (_.isFunction(options)) {
			var opt = done;
			done = options;
			options = opt;
			opt = null;
		}

		Schema.verify(this, value, done, options);
	},

	/**
	 * compile the verifier
	 *
	 * @method
	 * @this {Schema}
	 * @param {!validator} validator - custom validation mapper
	 * @param {?Object} [options] - validation options, default is plain object.
	 * @returns {verifierCallback}
	 * */
	compile: function (validator, options) {
		options || (options = {});
		var schema = this.clone()._compile(validator, options);

		return function (value, done) {
			return schema.verify(value, done);
		};
	},

	/**
	 * add new required nested schema by construct
	 *
	 * @method
	 * @this {Schema}
	 * @param {?String} [name] - field name.
	 * @param {?*} [validation] - validation options.
	 * @returns {Schema}
	 */
	required: function (name, validation) {
		if (!arguments.length || (name == null && validation == null)) {
			this.isRequired = true;
			return this;
		}

		return this.field(name).validate(validation);
	},

	/**
	 * add new optional nested schema by construct
	 *
	 * @method
	 * @this {Schema}
	 * @param {?String} [name] - field name.
	 * @param {?*} [validation] - validation options.
	 * @returns {Schema}
	 */
	optional: function (name, validation) {
		if (!arguments.length || (name == null && validation == null)) {
			this.isRequired = false;
			return this;
		}

		var schema = this.field(name).validate(validation);
		schema.isRequired = false;
		return schema;
	}
};


/**
 * verify value. compare schema with some object.
 *
 * @static
 * @method
 * @param {!Schema} schema for validate.
 * @param {*} value - value for check.
 * @param {!verifyCallback} done - done-callback.
 * @param {?Object} [options] - validation options, default is plain object.
 * @param {validator} [options.validator] - custom validation mapper
 * @param {Boolean} [options.ignoreExcess] - ignore excess fields
 */
Schema.verify = function (schema, value, done, options) {
	options || (options = {});

	if (!(schema instanceof Schema)) {
		throw new TypeError('schema must be instance of Schema');
	}

	if (!_.isFunction(done)) {
		throw new TypeError('schema verify callback must be function, ' + (typeof done) + ' given');
	}

	Schema.verifier.verifySchema(schema, value, options, function (err) {
		err = err === true ? null : err;

		if (err instanceof Schema.ValidationResultError) {
			done(null, false, err);
			return;
		}

		if (err) {
			done(err, false, null);
			return;
		}

		done(null, true, null);
	});
};

/**
 * @namespace
 * @static
 * */
Schema.verifier = {
	/**
	 * verify object
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	verifySchema: function (schema, value, options, done) {
		var that = this;

		iterate.array([
			this.checkRequired,
			this.checkIsArray,
			this.checkValidations,
			this.checkObject
		], function (method, _2, done) {
			method.call(that, schema, value, options, done);
		}, done);
	},

	/**
	 * check isRequired flag with value
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkRequired: function (schema, value, options, done) {
		if (value !== undefined) {
			done();
			return;
		}

		if (schema.isRequired) {
			done(new Schema.ValidationResultError('required', true, value, null/*, schema.path*/));
			return;
		}

		done(true);
	},


	/**
	 * check self validation of value
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkValidations: function (schema, value, options, done) {
		this.validationCall(schema, schema.validations, value, options, done);
	},

	/**
	 * check validation of value
	 *
	 * @method
	 * @param {Schema} schema
	 * @param {?Array} validations.
	 * @param {*} value
	 * @param {Object} options
	 * @param {verifierDone} done - done-callback
	 */
	validationCall: function (schema, validations, value, options, done) {
		if (_.isEmpty(validations)) {
			done();
			return;
		}

		if (options.validator) {
			validations = options.validator(validations, options);
			if (_.isFunction(validations)) {
				validations = [validations];
			}

			if (!_.isArray(validations)) {
				done(new Error('invalid validation rule type after user-validator mapping'));
				return;
			}
		}

		iterate.array(validations, function (validation, index, done) {
 			validation(value, function (err, isValid, validationError) {
				if (err) {
					if (err instanceof Schema.ValidationError) {
						err = new Schema.ValidationResultError(err.ruleName, err.ruleParams, value, err.arrayItemIndex/*, schema.path*/);
					}
					done(err);
					return;
				}

				if (isValid == null || isValid) {
					done();
					return;
				}

				validationError || (validationError = {});
				done(new Schema.ValidationResultError(validationError.ruleName, validationError.ruleParams, value, null/*, schema.path*/));
			});
		}, done);
	},

	/**
	 * verify inner object
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkObject: function (schema, value, options, done) {
		var that = this;

		if (!schema.isArray) {
			this.validateFields(schema, value, options, done);
			return;
		}

		iterate.array(value, function (value, index, done) {
			that.validateFields(schema, value, options, done);
		}, done);
	},

	/**
	 * check is array flag
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkIsArray: function (schema, value, options, done) {
		if (Boolean(schema.isArray) === _.isArray(value)) {
			done();
			return;
		}

		done(new Schema.ValidationResultError('type', schema.isArray ? 'array' : 'object', value, null/*, schema.path*/));
	},

	/**
	 * verify inner fields
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	validateFields: function (schema, value, options, done) {
		var that = this;
		iterate.array([
			this.checkFieldsExists,
			this.checkExcessFields,
			this.checkNestedFields
		], function (method, _2, done) {
			method.call(that, schema, value, options, done);
		}, done);
	},

	/**
	 * check nested fields
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkNestedFields: function (schema, value, options, done) {
		var that = this;
		iterate.object(schema.fields, function (fieldSchema, name, done) {
			that.verifySchema(fieldSchema, value[name], options, done);
		}, done);
	},

	/**
	 * check exists of fields and correct data type
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkFieldsExists: function (schema, value, options, done) {
		if (!schema.fields) {
			done(true);
			return;
		}

		if (_.isObject(value)) {
			done();
			return;
		}

		done(new Schema.ValidationResultError('type', 'object', value, null/*, schema.path*/));
	},

	/**
	 * find the excess fields, that not defined
	 *
	 * @method
	 * @param {Schema} schema for validate.
	 * @param {*} value - value for check
	 * @param {Object} options - validation options
	 * @param {verifierDone} done - done-callback
	 */
	checkExcessFields: function (schema, value, options, done) {
		if (options.ignoreExcess) {
			done();
			return;
		}

		var hasExcessFields = _.any(value, function (v, k) {
			return !_.has(schema.fields, k);
		});

		if (!hasExcessFields) {
			done();
			return;
		}

		done(new Schema.ValidationResultError('available_fields', _.keys(schema.fields), value, null/*, schema.path*/));
	}
};

var register = {};

/**
 * Schema register
 *
 * @static
 * @param {!String} name - name for register.
 * @param {!Schema} schema - schema for register
 * @throws {TypeError} If invalid name type
 * @throws {TypeError} If schema name type
 * @throws {ReferenceError} If schema was already registered
 * @returns {Schema}
 */
Schema.register = function (name, schema) {
	if (!_.isString(name)) {
		throw new TypeError('invalid name type, must be string');
	}

	if (!(schema instanceof Schema)) {
		throw new TypeError('invalid schema type, must be instance of Schema');
	}

	if (register.hasOwnProperty(name)) {
		throw new ReferenceError('schema "' + name + '" was already registered');
	}

	register[name] = schema;
	return schema;
};

/**
 * get registered schema
 *
 * @static
 * @param {String} name - name for register.
 * @param {?Boolean} [strict=true] - strict mode (throw ReferenceError)
 * @throws {TypeError} If invalid name type
 * @throws {ReferenceError} If schema was not registered before
 * @returns {Schema}
 */
Schema.get = function (name, strict) {
	if (!_.isString(name)) {
		throw new TypeError('invalid name type, must be string');
	}

	if ((strict == null || strict) && !register.hasOwnProperty(name)) {
		throw new ReferenceError('schema "' + name + '" was not registered');
	}

	return register[name];
};

/**
 * Create instance of Schema.ValidationError. Error object for info about miss value
 *
 * @constructor
 * @static
 * @extends Error
 * @this {Schema.ValidationError}
 * @class Schema.ValidationError
 * @param {string} ruleName - rule name, that failed
 * @param {*} ruleParams - params of rule, that failed
 * @param {?Number} [arrayItemIndex=null] - index of array, default null
 * @property {String} type
 * @property {String} name
 * @property {?Number} arrayItemIndex
 * @property {String} ruleName
 * @property {*} ruleParams
 * @returns {Schema.ValidationError}
 */
Schema.ValidationError = function ValidationError (ruleName, ruleParams, arrayItemIndex) {
	if (!(this instanceof Schema.ValidationError)) {
		return new Schema.ValidationError(ruleName, ruleParams, arrayItemIndex);
	}

	if (!ruleName || !_.isString(ruleName)) {
		throw new TypeError('invalid ruleName, must be non-empty string');
	}

	ruleName || (ruleName = 'unknown');
	this.ruleName = ruleName;
	this.ruleParams = ruleParams;
	this.arrayItemIndex = arrayItemIndex;
	this.type = this.name = 'ValidationError';
	Error.call(this);

	return this;
};
extend(Schema.ValidationError, Error);

/**
 * Create instance of Schema.ValidationError. Error object for info about miss value
 *
 * @constructor
 * @static
 * @extends Schema.ValidationError
 * @this {Schema.ValidationResultError}
 * @class Schema.ValidationResultError
 * @param {String} ruleName - rule name, that failed
 * @param {?*} ruleParams - params of rule, that failed
 * @param {*} value - value, that failed
 * @param {?Number} [arrayItemIndex=null] - index of array, default null
 * @param {?Array} [path] -  schema path
 * @property {String} type
 * @property {String} name
 * @property {String} ruleName
 * @property {?Number} arrayItemIndex
 * @property {*} ruleParams
 * @property {*} value
 * @property {?Array} path
 * @returns {Schema.ValidationResultError}
 */
Schema.ValidationResultError = function ValidationResultError (ruleName, ruleParams, value, arrayItemIndex, path) {
	if (!(this instanceof Schema.ValidationResultError)) {
		return new Schema.ValidationResultError(ruleName, ruleParams, value, arrayItemIndex, path);
	}

	path       = _.clone(path || []);
	value      = _.cloneDeep(value);
	ruleParams = _.cloneDeep(ruleParams);

	Schema.ValidationError.call(this, ruleName, ruleParams);
	this.name = 'ValidationResultError';
	this.type = this.name;
	this.value = value;
	this.arrayItemIndex = _.isNumber(arrayItemIndex) ? arrayItemIndex : null;
	this.path = path;

	return this;
};
extend(Schema.ValidationResultError, Schema.ValidationError);

module.exports = Schema;
