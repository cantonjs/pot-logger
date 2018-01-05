
import { join } from 'path';
import { pathExists, remove, readFile } from 'fs-extra';
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
			`${chalk.green('INFO')} ${chalk.red(`[${category}]`)} ${message}`
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
			`${chalk.green('INFO')} ${chalk.red.bold(`[${category}]`)} ${message}`
		);
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
		const {
			setConfig,
			createLogger,
			logger,
		} = requireSandbox({ console: { log } });
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
		const {
			overrideConsole, resetConsole,
		} = requireSandbox({ console: fakeConsole });
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
		const {
			overrideConsoleInRuntime
		} = requireSandbox({ console: fakeConsole });

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

	const removeLogsDir = async () => {
		await remove(logsDir);
	};

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
		const { setConfig, createLogger, overrideConsole } = requireSandbox();
		setConfig({ daemon: true, logsDir });
		const logger = createLogger('alt');
		overrideConsole();
		logger.error('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/\[ERROR\] alt - hello\s*$/.test(all)).toBe(true);
		expect(/\[ERROR\] alt - hello\s*$/.test(err)).toBe(true);
		expect(/\[ERROR\] alt - hello\s*$/.test(out)).toBe(true);
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
