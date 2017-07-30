
import { resolve } from 'path';
import { readFileSync, outputFileSync } from 'fs-extra';
import SandboxedModule from 'sandboxed-module';
import { transformFileSync } from 'babel-core';
import { parse } from 'json5';

export function build() {
	const babelOptions = parse(readFileSync(resolve('.babelrc'), 'utf8'));
	const { code } = transformFileSync(resolve('src/index.js'), babelOptions);
	outputFileSync(resolve('lib/index.js'), code, 'utf8');
}

export function requireSandbox(globals) {
	return SandboxedModule.require(resolve('lib/index.js'), { globals });
}
