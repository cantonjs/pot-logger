# pot-logger

[![Build Status](https://travis-ci.org/cantonjs/pot-logger.svg?branch=master)](https://travis-ci.org/cantonjs/pot-logger)
[![CircleCI](https://circleci.com/gh/cantonjs/pot-logger.svg?style=shield)](https://circleci.com/gh/cantonjs/pot-logger)
[![Dependencies](https://david-dm.org/cantonjs/pot-logger.svg)](https://david-dm.org/cantonjs/pot-logger)
[![License](https://img.shields.io/badge/license-MIT_License-blue.svg?style=flat)](https://github.com/cantonjs/pot-logger/blob/master/LICENSE.md)

A powerful log system for node.js, with zero configuration. Built on top of [log4js](https://github.com/log4js-node/log4js-node)

![screenshot](./screenshots/screenshot.png)

## Table of Contents

<!-- TOC -->

* [Table of Contents](#table-of-contents)
* [Features](#features)
* [Getting Started](#getting-started)
* [Daemon](#daemon)
* [Installation](#installation)
* [API](#api)
  * [logger](#logger)
  * [createLogger(category[, appenderDescription])](#createloggercategory-appenderdescription)
  * [hasLogger(category)](#hasloggercategory)
  * [getLogger(category)](#getloggercategory)
  * [ensureLogger(category[, appenderDescription])](#ensureloggercategory-appenderdescription)
  * [setConfig(keyOrConfig[, value])](#setconfigkeyorconfig-value)
  * [flush([options])](#flushoptions)
  * [overrideConsole([logger])](#overrideconsolelogger)
  * [resetConsole()](#resetconsole)
  * [overrideConsoleInRuntime(startRun[, logger])](#overrideconsoleinruntimestartrun-logger)
* [Creating Custom Logger](#creating-custom-logger)
* [Default Appenders](#default-appenders)
  * [defaultDaemonAppender](#defaultdaemonappender)
  * [defaultConsoleAppender](#defaultconsoleappender)
* [Related Projects](#related-projects)
* [License](#license)

<!-- /TOC -->

## Features

* Easy to get started with zero configuration
* Log files with configurable log rolling based on file size or date
* Different log levels
* Different log categories
* Easy to create custom logger
* All [log4js appenders](https://nomiddlename.github.io/log4js-node/appenders.html) are supported
* Replace native console (disabled by default)

## Getting Started

**logger**

```js
import logger from "pot-logger";
logger.info("pot-logger");
```

![logger](./screenshots/logger.png)

**createLogger with custom color**

```js
import { createLogger } from "pot-logger";
const foodLogger = createLogger("food", "yellow");
foodLogger.info("虾饺");
```

![createLogger with custom color](./screenshots/create-logger-1.png)

All [chalk.js colors](https://github.com/chalk/chalk) are available. You can even use dot-notation to define colors. i.e. `red.bold`.

**createLogger with custom appender**

```js
import { createLogger } from "pot-logger";
const appender = {
  type: "console",
  layout: { type: "pattern", pattern: "\n 🦄 %m 🦄 \n" }
};
const unicornLogger = createLogger("unicorn", appender);
unicornLogger.info("Agnes");
```

![createLogger with custom appender](./screenshots/create-logger-2.png)

All [log4js appenders](https://nomiddlename.github.io/log4js-node/appenders.html) are available.

## Daemon

By default, logger messages will finaly output by calling `console.log` to terminal, but if `daemon` mode enabled, logger messages will write to `*.log` files.

By default, there are three logs files:

* `out.log`: Default log file. Only valid log level messages will write to this file.
* `err.log`: All `ERROR` or `FATAL` log level messages will write to this file.
* `all.log`: All log level messages will write to this file.

To enable `daemon` mode, call `setConfig('daemon', true)`.

## Installation

```bash
npm i pot-logger
```

## API

#### logger

Default logger. A logger is a little bit like `console`, it has these methods:

* `all` (grey)
* `trace` (blue)
* `debug` (cyan)
* `info` (green) [alias `log`]
* `warn` (yellow)
* `error` (red)
* `fatal` (magenta)
* `mark` (grey)

###### Ways to import `logger` module

```js
import { logger } from "pot-logger";
import logger from "pot-logger"; /* or */
var logger = require("pot-logger").logger; /* or */
var logger = require("pot-logger").default; /* or */
```

---

#### createLogger(category[, appenderDescription])

Create a custom logger.

###### Arguments

1.  `category` (String): Logger category.
2.  `appenderDescription` (String|Object|Function): Please see [creating-custom-logger](#creating-custom-logger) for detail.

###### Returns

Returns a new `logger`.

###### Example

```js
import { createLogger } from "pot-logger";
const logger = createLogger("test", ref => {
  return ref.daemon ? ref.defaultDaemonAppender : ref.defaultConsoleAppender;
});
```

---

#### hasLogger(category)

Returns a boolean indicating whether a logger with the specified category exists or not.

###### Arguments

1.  `category` (String): Logger category.

###### Returns

Returns `true` or `false`.

---

#### getLogger(category)

Get logger by category. If not found, it would return the default logger.

###### Arguments

1.  `category` (String): Logger category.

###### Returns

Returns a `logger`.

---

#### ensureLogger(category[, appenderDescription])

Get logger by category. If not found, create one.

###### Arguments

1.  `category` (String): Logger category.
2.  `appenderDescription` (String|Object|Function): Please see [creating-custom-logger](#creating-custom-logger) for detail.

###### Returns

Returns a `logger`.

---

#### setConfig(keyOrConfig[, value])

    Alias: `setLoggers`

Initialize configure.

###### Arguments

1.  `keyOrConfig` (String|Object): Config key or config k/v object.
2.  `value` (Any): Only work if the first argument is a `String`.

##### Props

* enable (Boolean)
* daemon (Boolean)
* logLevel (String|Object)
* logsDir (String)
* overrideConsole (Boolean)

##### Props.enable

If `enable` is `false`, no log messages would show, and nothing would write to log files. Defaults to `true`.

###### Example

```js
setConfig("enable", false);
```

##### Props.daemon

If `daemon` is `true`, loggers will use `*.log` files instead of `console`. Defaults to `false`.

###### Example

```js
setConfig("daemon", true);
```

##### Props.logLevel

Defining custom log levels. You could set all categories by passing a level string. Or you could to set some individual categories by passing a key/value object. Defaults to "INFO".

Valid levels: `ALL` < `TRACE` < `DEBUG` < `INFO` < `WARN` < `ERROR` < `FATAL` < `MARK` < `OFF`.

###### Example

**Apply to all categories:**

```js
setConfig("logLevel", "DEBUG");
```

**Apply to individual category:**

```js
setConfig("logLevel", { myLogger: "DEBUG" });
```

##### Props.logDir

Defining log files dir. By default, log files will work only when `daemon` mode enabled. Defaults to `${cwd}/.logs/`.

###### Example

```js
setConfig("logsDir", "/my/logs/path/");
```

##### Props.overrideConsole

Override native `console` to `logger`. Defaults to `false`.

###### Example

```js
setConfig("overrideConsole", true);
```

---

#### flush([options])

Flush log files.

###### Arguments

1.  `options` (Object)

* `removeDir` (Boolean): Remove whole directory. Defaults to `false`
* `logsDir` (String): Customize logs directory. Defaults to `config.logsDir`
* `mode` (Number): File mode (permission and sticky bits) when renewing log file. Defaults to `0o666` (readable and writable)

###### Returns

Returns a `promise`.

---

#### overrideConsole([logger])

Override native `console`. Notice that `console.log()` will be equal with `logger.info()`.

###### Arguments

1.  `logger` (Object): Defining a logger to override `console`.

---

#### resetConsole()

Reset `console` to the native one. Only work after `overrideConsole()` run.

---

#### overrideConsoleInRuntime(startRun[, logger])

Override native `console` in `startRun` function runtime.

###### Arguments

1.  `startRun` (Function): Defining an async function to start to override native `console`. When this function ends, `console` will reset to the native one.
2.  `logger` (Object): Defining a logger to override `console`.

###### Example

```js
import { overrideConsoleInRuntime } from "pot-logger";

(async function() {
  console.log("native"); /* => native */

  await overrideConsoleInRuntime(async () => {
    console.log("not native"); /* => INFO not native */
  });

  console.log("native again"); /* => native again */
})();
```

---

## Creating Custom Logger

You could create a custom logger by calling `createLogger(category, appenderDescription)` or `ensureLogger(category, appenderDescription)`. The `appenderDescription` argument is the description of appender.

**If `appenderDescription` is an \<Object\>, these options are available:**

* `color` (String) [optional]: The category text color. Support all [chalk.js](https://github.com/chalk/chalk) colors. Support dot notation (i.e. `red.bold`). Only work for non-daemon (terminal) mode.
* `level` (String) [optional]: Custom log level.
* `maxLevel` (String) [optional]: Custom max log level.
* `file` (Boolean) [optional]: Use new log file or not. If `true`, the log file name will be the category name. Defaults to `false`. Only work for daemon mode.
* `maxLogSize` (Integer) [optional]: The maximum size (in bytes) for the log file. If not specified, then no log rolling will happen. Only work for daemon mode.
* `backups` (Integer) [optional]: The number of old log files to keep during log rolling. Defaults to 5. Only work for daemon mode.
* `compress` (Boolean) [optional] - Compress the backup files during rolling (backup files will have .gz extension). Defaults to `true`. Only work for daemon mode.

###### Example

```js
import { createLogger } from "pot-logger";
const logger = createLogger("test", {
  color: "yellow",
  file: true
});
```

**If `appenderDescription` is a \<String\>, it's short for `{ color: <string\> }`.**

**If `appenderDescription` is a \<Function\>, there's an argument object which includes:**

* `category` (String)
* `daemon` (Boolean)
* [defaultDaemonAppender](#defaultdaemonappender) (Object)
* [defaultConsoleAppender](#defaultconsoleappender) (Object)

###### Example

```js
import { createLogger } from "pot-logger";
const logger = createLogger("test", ref => {
  return ref.daemon ? ref.defaultDaemonAppender : ref.defaultConsoleAppender;
});
```

**What't more, you could also pass [log4js](https://nomiddlename.github.io/log4js-node/appenders.html) appender configure to `appenderDescription`.**

## Default Appenders

#### defaultDaemonAppender

```js
{
  type: 'file',
  filename: defaultCategory,
  maxLogSize: 10485760, // 10MB
  backups: 5,
  compress: true,
}
```

#### defaultConsoleAppender

```js
{
  type: 'console',
  layout: {
    type: 'pattern',
    pattern: '%[%p%] %m',
  },
}
```

## Related Projects

* [log4js-node](https://github.com/nomiddlename/log4js-node)
* [chalk](https://github.com/chalk/chalk)

## License

MIT
