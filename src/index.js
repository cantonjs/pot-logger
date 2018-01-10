
import log4js from 'log4js';
import { join, resolve, isAbsolute, extname } from 'path';
import chalk from 'chalk';

const isFunction = (src) => typeof src === 'function';
const isObject = (src) => typeof src === 'object';
const isString = (src) => typeof src === 'string';
const noop = () => {};

const defaultCategory = 'out';
const defaultLogLevel = 'INFO';
const defaultFileAppender = {
	type: 'file',
	filename: defaultCategory,
	maxLogSize: 10485760, // 10MB
	backups: 5,
	compress: true,
};

const config = {
	enable: true,
	logLevel: defaultLogLevel,
	logsDir: resolve('.logs'),
	daemon: false,
	overrideConsole: false,
};

const colored = (color = 'dim') => {
	const pattern = '[%c]';
	const validatColor = (color) => {
		if (!isFunction(chalk[color])) {
			throw new Error(`Category with style "${color}" is NOT support.`);
		}
	};

	const getColor = color.split('.').reduce((chalkChaining, color) => {
		validatColor(color);
		return chalkChaining[color];
	}, chalk);
	return getColor(pattern);
};

const createAppender = function createAppender(category, description, daemon) {
	const { type, color, file, ...other } = description;

	if (type) { return description; }

	if (daemon) {
		const categoryPattern = file ? ' ' : ' %c - ';
		return {
			...defaultFileAppender,
			layout: {
				type: 'pattern',
				pattern: `[%d] [%p]${categoryPattern}%m`,
			},
			...other,
			filename: file ? category : defaultCategory,
		};
	}
	else {
		return {
			type: 'console',
			layout: {
				type: 'pattern',
				pattern: `%[%p%] ${colored(color)} %m`,
			},
		};
	}
};

const nativeConsole = {};
const SymbolEnsureLatest = Symbol('EnsureLatest');

const getLevel = (key, level, defaultLevel) =>
	(isObject(level) ? level[key] : level) || defaultLevel
;

const logSystem = (function () {
	let shouldReload = false;
	let shouldUpdateDaemon = false;
	let shouldUpdateAppenders = false;
	let shouldUpdateCategories = false;
	let shouldReloadConfigure = false;
	let shouldReloadEnableStatus = false;
	let enable = config.enable;
	let appenders = {};
	let categories = {};
	const loggers = new Map();

	const getCategories = () => {
		const appenderKeys = Object.keys(appenders);

		const builtInLevelAppenders = [];
		if (appenders['$_all']) { builtInLevelAppenders.push('$_all'); }
		if (appenders['$_err']) { builtInLevelAppenders.push('$_err'); }

		return appenderKeys.reduce((categories, key) => {
			const isCustomKey = !/^[$_]/.test(key);
			const $key = '$' + key;
			if (isCustomKey && appenders[$key]) {
				categories[key] = {
					appenders: [$key, ...builtInLevelAppenders],
					level: 'ALL',
				};
			}
			return categories;
		}, {
			default: {
				appenders: [`$${defaultCategory}`, ...builtInLevelAppenders],
				level: 'ALL',
			},
		});
	};

	const performUpdateAppenders = () => {
		if (!shouldUpdateAppenders) { return; }

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
			let appender = appenders[key];

			// lazy appender
			if (isFunction(appender)) { appenders[key] = appender = appender(); }

			ensureFilename(appender);
			ensureLevelAppender(key);
		});

		shouldUpdateAppenders = false;
	};

	const performUpdateCategories = () => {
		if (!shouldUpdateCategories) { return; }
		categories = getCategories();
		shouldUpdateCategories = false;
	};

	const performUpdateDaemon = () => {
		if (!shouldUpdateDaemon) { return; }
		if (enable) {
			if (config.daemon) {
				Object.assign(appenders, {
					_all: defaultAppenders.all,
					_err: defaultAppenders.err,
					[defaultCategory]: defaultAppenders.out,
				});
			}
			else {
				delete appenders._all;
				delete appenders._err;
				delete appenders.$_all;
				delete appenders.$_err;
				appenders[defaultCategory] = defaultAppenders.con;
			}
		}
		shouldUpdateDaemon = false;
	};

	const performReloadConfigure = () => {
		if (!shouldReloadConfigure) { return; }
		log4js.configure({ appenders, categories });
		shouldReloadConfigure = false;
	};

	const performReloadEnableStatus = () => {
		if (!shouldReloadEnableStatus) { return; }
		enable = config.enable;
		shouldReloadEnableStatus = false;
	};

	return {
		get shouldReload() {
			return shouldReload;
		},
		get appenders() {
			return appenders;
		},
		requestUpdateDaemon() {
			shouldUpdateDaemon = true;
			shouldUpdateAppenders = true;
			shouldUpdateCategories = true;
			shouldReloadConfigure = true;
			shouldReload = true;
		},
		requestUpdateAppenders() {
			shouldUpdateAppenders = true;
			shouldReloadConfigure = true;
			shouldReload = true;
		},
		requestUpdateCategories() {
			shouldUpdateCategories = true;
			shouldReloadConfigure = true;
			shouldReload = true;
		},
		requestReloadConfigure() {
			shouldReloadConfigure = true;
			shouldReload = true;
		},
		requestReloadEnableStatus() {
			shouldUpdateDaemon = true;
			shouldUpdateAppenders = true;
			shouldUpdateCategories = true;
			shouldReloadConfigure = true;
			shouldReloadEnableStatus = true;
			shouldReload = true;
		},
		reload() {
			performReloadEnableStatus();
			performUpdateDaemon();
			performUpdateAppenders();
			performUpdateCategories();
			performReloadConfigure();
			shouldReload = false;
		},
		hasLogger(category) {
			return loggers.has(category);
		},
		getLogger(category = defaultCategory) {
			if (loggers.has(category)) { return loggers.get(category); }

			let origin = null;
			let cache = {};

			const ensureLatest = () => {
				if (this.shouldReload) {
					this.reload();
					cache = {};
				}

				if (!origin) {
					origin = log4js.getLogger(category);
				}

				return origin;
			};

			const reflect = (name) => {
				ensureLatest();
				if (cache[name]) { return cache[name]; }
				return (cache[name] = enable ? origin[name].bind(origin) : noop);
			};

			const logger = {
				[SymbolEnsureLatest]: ensureLatest,
				get trace() { return reflect('trace'); },
				get debug() { return reflect('debug'); },
				get info() { return reflect('info'); },
				get warn() { return reflect('warn'); },
				get error() { return reflect('error'); },
				get fatal() { return reflect('fatal'); },
			};
			loggers.set(category, logger);
			return logger;
		},
	};
}());

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

export function setConfig(maybeKey, maybeVal) {
	const prev = { ...config };

	Object.assign(
		config,
		isObject(maybeKey) ? maybeKey : ({ [maybeKey]: maybeVal }),
	);

	if (prev.enable !== config.enable) {
		logSystem.requestReloadEnableStatus();
	}

	if (prev.daemon !== config.daemon) {
		logSystem.requestUpdateDaemon();
	}

	if (prev.logLevel !== config.logLevel) {
		Object
			.keys(logSystem.appenders)
			.forEach((key) => {
				const $key = '$' + key;
				const levelAppender = logSystem.appenders[$key];
				if (levelAppender) {
					const newLevel = getLevel(key, config.logLevel);
					newLevel && (levelAppender.level = newLevel);
				}
			})
		;
		logSystem.requestReloadConfigure();
	}

	if (prev.logsDir !== config.logsDir) {
		logSystem.requestUpdateAppenders();
	}

	if (prev.overrideConsole && !config.overrideConsole) {
		resetConsole();
	}
	else if (!prev.overrideConsole && config.overrideConsole) {
		overrideConsole();
	}
}

export function overrideConsole(logger = logSystem.getLogger(), filter) {
	logger = logger[SymbolEnsureLatest] ? logger[SymbolEnsureLatest]() : logger;

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

export function getLogger(category) {
	return logSystem.getLogger(category);
}

export function hasLogger(category) {
	return logSystem.hasLogger(category);
}

export function createLogger(category, description) {
	if (logSystem.hasLogger(category)) {
		throw new Error(
			`Failed to create logger: "${category}" has already exists.`
		);
	}

	let appender;

	if (isObject(description)) {
		appender = createAppender(category, description, config.daemon);
	}
	else {
		let color;

		if (isString(description)) { color = description; }

		const ref = {
			category,
			get daemon() {
				return config.daemon;
			},
			get defaultDaemonAppender() {
				return {
					...defaultFileAppender,
				};
			},
			get defaultConsoleAppender() {
				return {
					type: 'console',
					layout: {
						type: 'pattern',
						pattern: `%[%p%] ${colored(color)} %m`,
					},
				};
			},
		};

		appender = () => {
			if (isFunction(description)) {
				return createAppender(category, description(ref), config.daemon);
			}
			else {
				const finalDescription = { color: description };
				return createAppender(category, finalDescription, config.daemon);
			}
		};
	}

	logSystem.appenders[category] = appender;

	logSystem.requestUpdateAppenders();
	logSystem.requestUpdateCategories();
	return logSystem.getLogger(category);
}

export const ensureLogger = function ensureLogger(category, description) {
	return hasLogger(category) ?
		getLogger(category) : createLogger(category, description);
};

export const setLoggers = setConfig;
export const logger = createLogger(defaultCategory, defaultAppenders.con);
export default logger;
