
import { join } from 'path';
import { pathExists, remove, readFile } from 'fs-extra';
import { build, requireSandbox } from './utils';
import stripAnsi from 'strip-ansi';
import delay from 'delay';

beforeAll(build);

describe('logger', () => {
	test('should `info()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should `warn()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.warn(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`WARN ${message}`);
	});

	test('should `error()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.error(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`ERROR ${message}`);
	});

	test('should `fatal()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { logger } = requireSandbox({ console: { log } });
		logger.fatal(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`FATAL ${message}`);
	});

	test('should `debug()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { initConfig, logger } = requireSandbox({ console: { log } });
		initConfig({ logLevel: 'DEBUG' });
		logger.debug(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`DEBUG ${message}`);
	});

	test('should `trace()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const { initConfig, logger } = requireSandbox({ console: { log } });
		initConfig({ logLevel: 'TRACE' });
		logger.trace(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`TRACE ${message}`);
	});
});

describe('createLogger', () => {
	test('should `createLogger()` works', () => {
		const category = 'hello';
		const message = 'world';
		const log = jest.fn();
		const { createLogger } = requireSandbox({ console: { log } });
		const logger = createLogger(category);
		logger.info(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO [${category}] ${message}`);
	});
});

describe('getLogger', () => {
	test('should `getLogger()` works', () => {
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

	test('should `initConfig({ logLevel })` works', () => {
		const log = jest.fn();
		const { initConfig, logger } = requireSandbox({ console: { log } });
		initConfig({ logLevel: 'TRACE' });
		logger.trace('trace');
		logger.debug('debug');
		logger.info('info');
		expect(log.mock.calls.length).toBe(3);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE trace');
		expect(stripAnsi(log.mock.calls[1][0])).toBe('DEBUG debug');
		expect(stripAnsi(log.mock.calls[2][0])).toBe('INFO info');
	});

	test('should `setLevel(string)` works', () => {
		const log = jest.fn();
		const {
			setLevel,
			createLogger,
			logger,
		} = requireSandbox({ console: { log } });
		const alt = createLogger('alt');
		logger.trace('a');
		alt.trace('a');
		setLevel('TRACE');
		logger.trace('b');
		alt.trace('b');
		expect(log.mock.calls.length).toBe(2);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE b');
		expect(stripAnsi(log.mock.calls[1][0])).toBe('TRACE [alt] b');
	});

	test('should `setLevel(object)` works', () => {
		const log = jest.fn();
		const {
			setLevel,
			createLogger,
			logger,
		} = requireSandbox({ console: { log } });
		const alt = createLogger('alt');
		logger.trace('a');
		alt.trace('a');
		setLevel({ alt: 'TRACE' });
		logger.trace('b');
		alt.trace('b');
		expect(log.mock.calls.length).toBe(1);
		expect(stripAnsi(log.mock.calls[0][0])).toBe('TRACE [alt] b');
	});
});

describe('overrideConsole', () => {
	test('should `overrideConsole()` works', () => {
		const message = 'hello';
		const log = jest.fn();
		const fakeConsole = { log };
		const { overrideConsole } = requireSandbox({ console: fakeConsole });
		overrideConsole();
		fakeConsole.log(message);
		const arg = log.mock.calls[0][0];
		expect(stripAnsi(arg)).toBe(`INFO ${message}`);
	});

	test('should `resetConsole()` works', () => {
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

	test('should `overrideConsoleInRuntime()` works', async () => {
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
		const { initConfig, logger } = requireSandbox();
		initConfig({ daemon: true, logsDir, });
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
		const { initConfig, logger } = requireSandbox();
		initConfig({ daemon: true, logsDir });
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
		const { initConfig, logger } = requireSandbox();
		initConfig({ daemon: true, logsDir });
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
		const { initConfig, logger } = requireSandbox();
		initConfig({ daemon: true, logsDir });
		logger.debug('hello');
		await delay(100);
		const err = await readFile(join(logsDir, 'err.log'), 'utf-8');
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		const all = await readFile(join(logsDir, 'all.log'), 'utf-8');
		expect(/^\s*$/.test(out)).toBe(true);
		expect(/^\s*$/.test(err)).toBe(true);
		expect(/\[DEBUG\] out - hello\s*$/.test(all)).toBe(true);
	});

	test('should `createLogger()` works', async () => {
		const { initConfig, createLogger, overrideConsole } = requireSandbox();
		initConfig({ daemon: true, logsDir });
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

	test('should `setLevel()` works', async () => {
		const { initConfig, logger, setLevel } = requireSandbox();
		initConfig({ daemon: true, logsDir });
		logger.trace('a');
		setLevel('TRACE');
		logger.trace('b');
		await delay(100);
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		expect(/\[TRACE\] out - b\s*$/.test(out)).toBe(true);
	});

	test('should `overrideConsole()` works', async () => {
		const log = jest.fn();
		const fakeConsole = { log };
		const { initConfig } = requireSandbox({ console: fakeConsole });
		initConfig({ daemon: true, logsDir, overrideConsole: true });
		fakeConsole.log('hello');
		await delay(100);
		const out = await readFile(join(logsDir, 'out.log'), 'utf-8');
		expect(/\[INFO\] out - hello\s*$/.test(out)).toBe(true);
	});
});
