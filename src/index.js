
import log4js from 'log4js';
import { ensureDirSync } from 'fs-extra';
import { join, resolve, isAbsolute, extname } from 'path';
import chalk from 'chalk';

const isFunction = (src) => typeof src === 'function';
const isUndefined = (src) => typeof src === 'undefined';
const isObject = (src) => typeof src === 'object';

const logLevel = 'INFO';
const maxLogSize = 10485760; // 10MB

const config = {
	logLevel,
	logsDir: resolve('.logs'),
	daemon: false,
	overrideConsole: false,
};

const nativeConsole = {};
const loggers = {};

let appenders = {};
let defaultLogger = null;
let categories = {};
let hasRunInit = false;

const getCategoriesConfig = (appenders, level) => {
	const isLevelObject = isObject(level);
	return Object
		.keys(appenders)
		.reduce((categories, key) => {
			categories[key] = {
				appenders: [key],
				level: (isLevelObject ? level[key] : level) || logLevel,
			};
			return categories;
		}, {})
	;
};

const logSystem = {
	init() {
		try {
			const {
				logsDir,
				daemon,
				logLevel = 'INFO',
				overrideConsole: override,
			} = config;

			if (daemon) { ensureDirSync(logsDir); }

			Object.assign(
				appenders,
				daemon ? {
					default: defaultAppenders.all,
					out: defaultAppenders.out,
					err: defaultAppenders.err,
				} : {
					default: defaultAppenders.con,
				},
			);

			categories = getCategoriesConfig(appenders, logLevel);
			this.reload({ deep: true });

			if ((isUndefined(override) && daemon) || override === true) {
				overrideConsole();
			}

			hasRunInit = true;
		}
		catch (err) {
			console.error(err);
			throw err;
		}
	},

	reload(options = {}) {
		if (options.deep) {
			const ensureFilename = (object) => {
				let name = object.filename;
				if (!name) { return object; }
				if (extname(name) !== 'log') { name += '.log'; }
				object.filename = isAbsolute(name) ? name : join(config.logsDir, name);
			};

			Object.keys(appenders).forEach((appender) => {
				ensureFilename(appender);
				if (appender.appender) { ensureFilename(appender.appender); }
			});
		}

		log4js.configure({ appenders, categories });
	},
};

const createLazyLogger = (category) => {
	let logger = null;
	const cache = {};
	const init = () => {
		hasRunInit || logSystem.init();
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
		type: 'file',
		filename: 'out',
		level: 'INFO',
		maxLogSize,
		backups: 3,
		compress: true,
	},
	err: {
		type: 'logLevelFilter',
		level: 'ERROR',
		appender: {
			type: 'file',
			filename: 'err',
			maxLogSize,
			backups: 3,
			compress: true,
		},
	},
	all: {
		type: 'logLevelFilter',
		level: 'ALL',
		appender: {
			type: 'file',
			filename: 'all',
			maxLogSize,
			backups: 3,
			compress: true,
		},
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

export function setLevel(level = logLevel) {
	const isLevelObject = isObject(level);
	config.logLevel = level;
	Object
		.keys(categories)
		.filter((key) => !isLevelObject || level.hasOwnProperty(key))
		.forEach((key) => {
			const category = categories[key];
			category.level = isLevelObject ? level[key] : level;
		})
	;
	logSystem.reload();
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
		type: 'file',
		filename: 'out',
		maxLogSize,
		backups: 0,
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
			level: logLevel,
		};

		logSystem.reload({ deep: true });
		return log4js.getLogger(category);
	}
	else {
		return getLogger(category);
	}
}

export const logger = defaultLogger = getLogger('out');
export default logger;
