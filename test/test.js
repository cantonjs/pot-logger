
import { requireSandbox } from './utils';
import stripAnsi from 'strip-ansi';

describe('logger', () => {
	test('should `info()` works', (done) => {
		const message = 'hello';
		const { logger } = requireSandbox({
			console: {
				log(msg) {
					expect(stripAnsi(msg)).toBe(`INFO ${message}`);
					done();
				},
			},
		});
		logger.info(message);
	});
});
