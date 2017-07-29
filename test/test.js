
import { requireSandbox } from './utils';
import stripAnsi from 'strip-ansi';

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

describe('log level', () => {
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
