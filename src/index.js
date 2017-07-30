
import log4js from 'log4js';
import { join, resolve, isAbsolute, extname } from 'path';
import chalk from 'chalk';

const isFunction = (src) => typeof src === 'function';
const isUndefined = (src) => typeof src === 'undefined';
const isObject = (src) => typeof src === 'object';

const defaultLogLevel = 'INFO';
const defaultFileAppender = {
	type: 'file',
	filename: 'out',
	maxLogSize: 10485760, // 10MB
	backups: 5,
	compress: true,
};

const config = {
	logLevel: defaultLogLevel,
	logsDir: resolve('.logs'),
	daemon: false,
	// overrideConsole: false,
};

const nativeConsole = {};
const loggers = {};

let appenders = {};
let defaultLogger = null;
let categories = {};
let hasRunInit = false;

const getLevel = (key, level, defaultLevel) =>
	(isObject(level) ? level[key] : level) || defaultLevel
;

const getCategoriesConfig = (appenders, level) => {
	const appenderKeys = Object.keys(appenders);

	const builtInLevelAppenders = [];
	if (appenders['$_all']) { builtInLevelAppenders.push('$_all'); }
	if (appenders['$_err']) { builtInLevelAppenders.push('$_err'); }

	return appenderKeys.reduce((categories, key) => {
		const isCustomKey = !/^[$_]/.test(key);
		if (isCustomKey && appenders.hasOwnProperty('$' + key)) {
			const $key = '$' + key;
			if (appenders.hasOwnProperty($key)) {
				categories[key] = {
					appenders: [$key, ...builtInLevelAppenders],
					level: 'ALL',
				};
			}
		}
		return categories;
	}, {
		default: {
			appenders: ['$_out', ...builtInLevelAppenders],
			level: 'ALL',
		},
	});
};

const reloadLogSystem = (options = {}) => {
	if (options.deep) {
		const { logsDir, logLevel } = config;
		const appenderKeys = Object.keys(appenders);

		const ensureFilename = (appender) => {
			let name = appender.filename;
			if (!name) { return appender; }
			if (extname(name) !== '.log') { name += '.log'; }
			appender.filename = isAbsolute(name) ? name : join(logsDir, name);
		};

		const ensureLevelAppender = (key) => {
			if (key.charAt(0) === '$') { return; }
			const $key = '$' + key;
			if (appenderKeys.indexOf($key) > -1) { return; }

			appenders[$key] = {
				type: 'logLevelFilter',
				appender: key,
				level: (function () {
					if (key === '_err') { return 'ERROR'; }
					if (key === '_all') { return 'ALL'; }
					return getLevel(key, logLevel, defaultLogLevel);
				}()),
			};
		};

		appenderKeys.forEach((key) => {
			const appender = appenders[key];
			ensureFilename(appender);
			ensureLevelAppender(key);
		});

		categories = getCategoriesConfig(appenders, logLevel);
	}

	log4js.configure({ appenders, categories });
};

const initLogSystem = () => {
	if (hasRunInit) { return; }

	const { daemon } = config;

	Object.assign(
		appenders,
		daemon ? {
			_all: defaultAppenders.all,
			_err: defaultAppenders.err,
			_out: defaultAppenders.out,
		} : {
			_out: defaultAppenders.con,
		},
	);

	reloadLogSystem({ deep: true });

	hasRunInit = true;
};

const createLazyLogger = (category) => {
	let logger = null;
	const cache = {};
	const init = () => {
		hasRunInit || initLogSystem();
		return logger || (logger = log4js.getLogger(category));
	};
	const createReflection = (name) => {
		return cache[name] || (cache[name] = init()[name].bind(logger));
	};
	return (loggers[category] = {
		init,
		get trace() { return createReflection('trace'); },
		get debug() { return createReflection('debug'); },
		get info() { return createReflection('info'); },
		get warn() { return createReflection('warn'); },
		get error() { return createReflection('error'); },
		get fatal() { return createReflection('fatal'); },
	});
};

export const defaultAppenders = {
	out: {
		...defaultFileAppender,
	},
	err: {
		...defaultFileAppender,
		filename: 'err',
	},
	all: {
		...defaultFileAppender,
		filename: 'all',
	},
	con: {
		type: 'console',
		layout: {
			type: 'pattern',
			pattern: '%[%p%] %m',
		},
	},
};

export function initConfig(customConfig) {
	Object.assign(config, customConfig);
	const { daemon, overrideConsole: override } = config;
	if ((isUndefined(override) && daemon) || override) {
		overrideConsole();
	}
}

export function overrideConsole(lazyLogger = defaultLogger, filter) {
	const logger = lazyLogger.init ? lazyLogger.init() : lazyLogger;

	const createReflection = (method) => {
		return (...args) => {
			if (isFunction(filter)) { args = filter(args, method, logger); }
			args.length && Reflect.apply(logger[method], logger, args);
		};
	};

	nativeConsole.trace = console.trace;
	nativeConsole.debug = console.debug;
	nativeConsole.dir = console.dir;
	nativeConsole.info = console.info;
	nativeConsole.log = console.log;
	nativeConsole.warn = console.warn;
	nativeConsole.error = console.error;
	console.trace = createReflection('trace');
	console.debug = createReflection('debug');
	console.dir = createReflection('info');
	console.log = createReflection('info');
	console.warn = createReflection('warn');
	console.error = createReflection('error');
}

export function resetConsole() {
	console.trace = nativeConsole.trace;
	console.debug = nativeConsole.debug;
	console.dir = nativeConsole.dir;
	console.log = nativeConsole.log;
	console.warn = nativeConsole.warn;
	console.error = nativeConsole.error;
}

export function overrideConsoleInRuntime(start, logger, filter) {
	overrideConsole(logger, filter);
	return Promise.resolve(start()).then(() => {
		resetConsole();
		config.overrideConsole && overrideConsole();
	});
}

export function setLevel(level = defaultLogLevel) {
	config.logLevel = level;
	Object
		.keys(appenders)
		.forEach((key) => {
			const $key = '$' + key;
			const levelAppender = appenders[$key];
			if (levelAppender) {
				const newLevel = getLevel(key, level);
				newLevel && (levelAppender.level = newLevel);
			}
		})
	;
	reloadLogSystem();
}

export function getLogger(category) {
	return loggers[category] || createLazyLogger(category);
}

export function createLogger(category, style = 'dim', options) {
	if (loggers[category]) {
		throw new Error(
			`Failed to create logger: "${category}" has already exists.`
		);
	}

	const { daemon, logLevel } = config;

	const getStyledCategoryStr = () => {
		const pattern = '[%c]';
		const validatColor = (style) => {
			if (!isFunction(chalk[style])) {
				throw new Error(`category with style "${style}" is NOT support.`);
			}
		};

		if (Array.isArray(style)) {
			const getStyle = style.reduce((chalkChaining, color) => {
				validatColor(color);
				return chalkChaining[color].bind(chalkChaining);
			}, chalk);
			return getStyle(pattern);
		}
		else {
			validatColor(style);
			return chalk[style](pattern);
		}
	};

	appenders[category] = options || (daemon ? {
		...defaultFileAppender,
	} : {
		type: 'console',
		layout: {
			type: 'pattern',
			pattern: `%[%p%] ${getStyledCategoryStr()} %m`,
		},
	});

	if (hasRunInit) {
		categories[category] = {
			appenders: [category],
			level: logLevel || defaultLogLevel,
		};

		reloadLogSystem({ deep: true });
		return log4js.getLogger(category);
	}
	else {
		return getLogger(category);
	}
}

export const logger = defaultLogger = getLogger('out');
export default logger;
