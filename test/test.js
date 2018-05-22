import { join } from 'path';
import {
	pathExists,
	remove,
	readFile,
	lstat,
	writeFile,
	ensureDir,
	mkdir,
} from 'fs-extra';
import { build, requireSandbox } from './utils';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';
import delay from 'delay';

// import maxListenersExceededWarning from 'max-listeners-exceeded-warning';
// maxListenersExceededWarning();

beforeAll(build);

describe('logger', () => {
	test('should `info()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should `log()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.log(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should `warn()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.warn(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`WARN ${message}`);
	});

	test('should `error()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.error(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`ERROR ${message}`);
	});

	test('should `fatal()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.fatal(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`FATAL ${message}`);
	});

	test('should `debug()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ logLevel: 'DEBUG' });
		logger.debug(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`DEBUG ${message}`);
	});

	test('should `trace()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ logLevel: 'TRACE' });
		logger.trace(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`TRACE ${message}`);
	});

	test('should `all()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ logLevel: 'ALL' });
		logger.all(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`ALL ${message}`);
	});

	test('should `mark()` work', () => {
		const message = 'hello';
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ logLevel: 'ALL' });
		logger.mark(message);
		// console.log('log.mock.calls', log.mock.calls);

		// const arg = log.mock.calls[0][0];
		// expect(stripAnsi(arg)).toBe(`MARK ${message}`);
	});
});

describe('createLogger', () => {
	test('default appender', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category);
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO [${category}] ${message}`);
	});

	test('custom appender object', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, { color: 'red' });
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO [${category}] ${message}`);
	});

	test('log4js appender', () => {
		const category = 'hello';
		const message = 'world';
		const prefix = 'My custom logger -';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, {
			type: 'console',
			layout: {
				type: 'pattern',
				pattern: `${prefix} %m`,
			},
		});
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`${prefix} ${message}`);
	});

	test('custom appender function', () => {
		const category = 'hello';
		const message = 'world';
		const prefix = 'My custom logger -';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, (ref) => {
			expect(ref.category).toBe(category);
			expect(ref.daemon).toBe(false);
			expect(typeof ref.defaultDaemonAppender).toBe('object');
			expect(typeof ref.defaultConsoleAppender).toBe('object');
			return {
				type: 'console',
				layout: {
					type: 'pattern',
					pattern: `${prefix} %m`,
				},
			};
		});
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`${prefix} ${message}`);
	});

	test('colored appender', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, 'red');
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(arg).toBe(
			`${chalk.green('INFO')} ${chalk.red(`[${category}]`)} ${message}`,
		);
	});

	test('dot notation colored appender', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, 'red.bold');
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(arg).toBe(
			`${chalk.green('INFO')} ${chalk.red.bold(`[${category}]`)} ${message}`,
		);
	});

	test('appender with level', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, { level: 'TRACE' });
		logger.trace(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`TRACE [${category}] ${message}`);
	});

	test('appender with maxLevel', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category, { maxLevel: 'ERROR' });
		logger.error(message);
		logger.fatal('fatal');
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`ERROR [${category}] ${message}`);
		expect(log.mock.calls.length).toBe(1);
	});
});

describe('getLogger', () => {
	test('should `getLogger()` work', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger, getLogger } = requireSandbox({ console: { log } });
		createLogger(category);
		const logger = getLogger(category);
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO [${category}] ${message}`);
	});
});

describe('hasLogger', () => {
	test('should `hasLogger()` returns `false` if logger does\'t exist', () => {
		const { hasLogger } = requireSandbox({ console: {} });
		expect(hasLogger('hello')).toBe(false);
	});

	test('should `hasLogger()` returns `true` if logger exists', () => {
		const category = 'hello';
		const { createLogger, hasLogger } = requireSandbox({ console: {} });
		createLogger(category, 'red');
		expect(hasLogger(category)).toBe(true);
	});
});

describe('ensureLogger', () => {
	test('should `ensureLogger()` create logger if it does\'t exist', () => {
		const category = 'hello';
		const log = jest.fn();
		const { ensureLogger, hasLogger } = requireSandbox({ console: { log } });
		expect(hasLogger(category)).toBe(false);
		const ensuredLogger = ensureLogger(category);
		expect(hasLogger(category)).toBe(true);
		expect(typeof ensuredLogger.info).toBe('function');
	});

	test('should `ensureLogger()` returns prev logger if it exists', () => {
		const category = 'hello';
		const { createLogger, ensureLogger } = requireSandbox({ console: {} });
		const logger = createLogger(category);
		const ensuredLogger = ensureLogger(category);
		expect(logger).toBe(ensuredLogger);
	});
});

describe('levels', () => {
	test('default level should be "INFO"', () => {
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.trace('trace');
		logger.debug('debug');
		logger.info('info');
		expect(log.mock.calls.length).toBe(1);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe('INFO info');
	});

	test('should `setConfig({ logLevel })` work', () => {
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ logLevel: 'TRACE' });
		logger.trace('trace');
		logger.debug('debug');
		logger.info('info');
		expect(log.mock.calls.length).toBe(3);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE trace');
		expect(stripAnsi(log.mock.calls[1][0])).toBe('DEBUG debug');
		expect(stripAnsi(log.mock.calls[2][0])).toBe('INFO info');
	});

	test('should lazy run `setConfig({ logLevel })` work', () => {
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		logger.trace('a');
		setConfig({ logLevel: 'TRACE' });
		logger.trace('b');
		expect(log.mock.calls.length).toBe(1);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE b');
	});

	test('should `setConfig({ enable: false })` work', async () => {
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ enable: false });
		logger.info('hello');
		expect(log.mock.calls.length).toBe(0);
		setConfig({ enable: true });
		logger.info('hello');
		expect(log.mock.calls.length).toBe(1);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe('INFO hello');
	});

	test('should work if `logLevel` is `Object`', () => {
		const log = jest.fn();
		const { setConfig, createLogger, logger } = requireSandbox({
			console: { log },
		});
		const alt = createLogger('alt');
		logger.trace('a');
		alt.trace('a');
		setConfig('logLevel', { alt: 'TRACE' });
		logger.trace('b');
		alt.trace('b');
		expect(log.mock.calls.length).toBe(1);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE [alt] b');
	});
});

describe('overrideConsole', () => {
	test('should work by calling `overrideConsole()`', () => {
		const message = 'hello';
		const log = jest.fn();
		const fakeConsole = { log };
		const { overrideConsole } = requireSandbox({ console: fakeConsole });
		overrideConsole();
		fakeConsole.log(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should work by calling `setConfig()`', () => {
		const message = 'hello';
		const log = jest.fn();
		const fakeConsole = { log };
		const { setConfig } = requireSandbox({ console: fakeConsole });
		setConfig({ overrideConsole: true });
		fakeConsole.log(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should `resetConsole()` work', () => {
		const message = 'world';
		const log = jest.fn();
		const fakeConsole = { log };
		const { overrideConsole, resetConsole } = requireSandbox({
			console: fakeConsole,
		});
		overrideConsole();
		fakeConsole.log('hello');
		resetConsole();
		fakeConsole.log(message);
		const arg = log.mock.calls[1][0];
		expect(arg).toBe(message);
	});

	test('should `overrideConsoleInRuntime()` work', async () => {
		const log = jest.fn();
		const fakeConsole = { log };
		const { overrideConsoleInRuntime } = requireSandbox({
			console: fakeConsole,
		});

		fakeConsole.log('a');
		await overrideConsoleInRuntime(async () => {
			await fakeConsole.log('b');
		});
		fakeConsole.log('c');
		expect(log.mock.calls[0][0]).toBe('a');
		expect(stripAnsi(log.mock.calls[1][0])).toBe('INFO b');
		expect(log.mock.calls[2][0]).toBe('c');
	});
});

describe('daemon', () => {
	const logsDir = join(__dirname, 'logs');
	const removeLogsDir = () => remove(logsDir);

	beforeEach(removeLogsDir);
	afterEach(removeLogsDir);

	test('should create `*.log` files', async () => {
		const { setConfig, logger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.info('hello');
		await delay(100);
		const out = await pathExists(join(logsDir, 'out.log'));
		const err = await pathExists(join(logsDir, 'err.log'));
		const all = await pathExists(join(logsDir, 'all.log'));
		expect(out).toBe(true);
		expect(err).toBe(true);
		expect(all).toBe(true);
	});

	test('should not append to `err.log` by calling `info()`', async () => {
		const { setConfig, logger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.info('hello');
		await delay(100);
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[INFO\] out - hello\s*$/.test(out)).toBe(true);
		expect(/\[INFO\] out - hello\s*$/.test(all)).toBe(true);
		expect(/^\s*$/.test(err)).toBe(true);
	});

	test('should append to all `.log` files by calling `error()`', async () => {
		const { setConfig, logger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.error('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[ERROR\] out - hello\s*$/.test(out)).toBe(true);
		expect(/\[ERROR\] out - hello\s*$/.test(err)).toBe(true);
		expect(/\[ERROR\] out - hello\s*$/.test(all)).toBe(true);
	});

	test('should only append to `all.log` by calling `debug()`', async () => {
		const { setConfig, logger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.debug('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/^\s*$/.test(out)).toBe(true);
		expect(/^\s*$/.test(err)).toBe(true);
		expect(/\[DEBUG\] out - hello\s*$/.test(all)).toBe(true);
	});

	test('should `createLogger()` work', async () => {
		const { setConfig, createLogger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		const logger = createLogger('alt');
		logger.error('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[ERROR\] alt - hello\s*$/.test(all)).toBe(true);
		expect(/\[ERROR\] alt - hello\s*$/.test(err)).toBe(true);
		expect(/\[ERROR\] alt - hello\s*$/.test(out)).toBe(true);
	});

	test('should `createLogger()` work when `file: true`', async () => {
		const { setConfig, createLogger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		const logger = createLogger('alt', { file: true });
		logger.error('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const alt = await readFile(join(logsDir, 'alt.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[ERROR\] alt - hello\s*$/.test(all)).toBe(true);
		expect(/\[ERROR\] alt - hello\s*$/.test(err)).toBe(true);
		expect(/\[ERROR\] hello\s*$/.test(alt)).toBe(true);
	});

	test('should set level work', async () => {
		const { setConfig, logger } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.trace('a');
		setConfig('logLevel', 'TRACE');
		logger.trace('b');
		await delay(100);
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		expect(/\[TRACE\] out - b\s*$/.test(out)).toBe(true);
	});

	test('should `overrideConsole()` work', async () => {
		const log = jest.fn();
		const fakeConsole = { log };
		const { setConfig } = requireSandbox({ console: fakeConsole });
		setConfig({ daemon: true, logsDir, overrideConsole: true });
		fakeConsole.log('hello');
		await delay(100);
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		expect(/\[INFO\] out - hello\s*$/.test(out)).toBe(true);
	});

	test('should lazy set daemon work', async () => {
		const { setConfig, logger } = requireSandbox();
		logger.info('hello');
		await delay(100);
		const beforeCall = await pathExists(join(logsDir, 'out.log'));
		expect(beforeCall).toBe(false);
		setConfig({ daemon: true, logsDir });
		logger.info('hello');
		await delay(100);
		const afterCall = await pathExists(join(logsDir, 'out.log'));
		expect(afterCall).toBe(true);
	});

	test('should `setConfig({ enable: false })` work', async () => {
		const log = jest.fn();
		const { setConfig, logger } = requireSandbox({ console: { log } });
		setConfig({ daemon: true, logsDir, enable: false });
		logger.error('hello');
		await delay(100);
		const logsDirExists = await pathExists(logsDir);
		expect(logsDirExists).toBe(false);
		setConfig({ enable: true });
		logger.error('hello');
		await delay(100);
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[ERROR\] out - hello\s*$/.test(all)).toBe(true);
	});
});

describe('flush', () => {
	const logsDir = join(__dirname, 'logs');
	const rotatedFile = join(logsDir, 'backup.log.100');

	beforeEach(async () => {
		await remove(logsDir);
		await mkdir(logsDir);
		await writeFile(rotatedFile, '');
	});
	afterEach(() => remove(logsDir));

	test('should renew all `*.log` files', async () => {
		const { setConfig, logger, flush } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.info('hello');
		await delay(100);
		let out = await lstat(join(logsDir, 'out.log'));
		let all = await lstat(join(logsDir, 'all.log'));
		expect(out.size > 0).toBe(true);
		expect(all.size > 0).toBe(true);
		await flush();
		out = await lstat(join(logsDir, 'out.log'));
		all = await lstat(join(logsDir, 'all.log'));
		expect(out.size).toBe(0);
		expect(all.size).toBe(0);
	});

	test('should remove all rotated files', async () => {
		const { setConfig, logger, flush } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		logger.info('hello');
		await delay(100);
		let rotatedExists = await pathExists(rotatedFile);
		expect(rotatedExists).toBe(true);
		await flush();
		rotatedExists = await pathExists(rotatedFile);
		expect(rotatedExists).toBe(false);
	});

	test('should remove logsDir is `removeDir = true`', async () => {
		const { setConfig, flush } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		let logsDirExists = await pathExists(logsDir);
		expect(logsDirExists).toBe(true);
		await flush({ removeDir: true });
		logsDirExists = await pathExists(logsDir);
		expect(logsDirExists).toBe(false);
	});

	test('should `logsDir` option work', async () => {
		const { setConfig, flush } = requireSandbox();
		setConfig({ daemon: true, logsDir: __dirname });
		const file = 'foo.log.1';
		await ensureDir(logsDir);
		await writeFile(join(logsDir, file), '');
		await flush({ logsDir });
		const exists = await pathExists(join(logsDir, file));
		expect(exists).toBe(false);
	});
});
