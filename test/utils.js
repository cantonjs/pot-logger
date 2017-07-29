
import { resolve } from 'path';
import { readFileSync } from 'fs-extra';
import SandboxedModule from 'sandboxed-module';
import { transformFileSync } from 'babel-core';
import { parse } from 'json5';

const babelOptions = parse(readFileSync(resolve('.babelrc'), 'utf8'));
transformFileSync(resolve('src/index.js'), babelOptions);

export function requireSandbox(globals) {
	return SandboxedModule.require('../lib', { globals });
}
