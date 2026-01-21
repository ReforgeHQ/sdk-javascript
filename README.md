# @reforge-com/javascript

A client for [Reforge]

## Installation

`npm install @reforge-com/javascript` or `yarn add @reforge-com/javascript`

If you'd prefer to use the standalone `<script>` tag approach, we recommend using
[jsDelivr][jsDelivr] for a minified/bundled version.

## Usage in your app

Initialize reforge with your sdk key and a `Context` for the current user/visitor/device/request:

```javascript
import { reforge, Context } from "@reforge-com/javascript";

const options = {
  sdkKey: "1234",
  context: new Context({
    user: {
      email: "test@example.com",
    },
    device: { mobile: true },
  }),
};
await reforge.init(options);
```

<details>
<summary>Initialization with Context with the <code>&lt;script&gt; tag</code></summary>

```javascript
// `reforge` is available globally on the window object
// `Context` is available globally as `window.reforgeNamespace.Context`
const options = {
  sdkKey: "1234",
  context: new reforgeNamespace.Context({
    user: {
      email: "test@example.com",
    },
    device: { mobile: true },
  }),
};

reforge.init(options).then(() => {
  console.log(options);
  console.log("test-flag is " + reforge.get("test-flag"));

  console.log("ex1-copywrite " + reforge.get("ex1-copywrite"));
  $(".copywrite").text(reforge.get("ex1-copywrite"));
});
```

</details>

Now you can use `reforge`'s config and feature flag evaluation, e.g.

```javascript
if (reforge.isEnabled('cool-feature') {
  // ...
}

setTimeout(ping, reforge.get('ping-delay'));
```

## Prefetching

To avoid a request waterfall, you can start fetching the configuration early in your app's
lifecycle, before the React SDK or `reforge.init()` is called.

```javascript
import { prefetchReforgeConfig, Context } from "@reforge-com/javascript/prefetch";

prefetchReforgeConfig({
  sdkKey: "1234",
  context: new Context({
    user: {
      email: "test@example.com",
    },
  }),
});
```

This lightweight import (~3KB) is ideal for early loading. When you later call `reforge.init()`, it
will automatically use the prefetched promise if available.

## Client API

| property        | example                                | purpose                                                                                      |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `isEnabled`     | `reforge.isEnabled("new-logo")`        | returns a boolean (default `false`) if a feature is enabled based on the current context     |
| `get`           | `reforge.get('retry-count')`           | returns the value of a flag or config evaluated in the current context                       |
| `getDuration`   | `reforge.getDuration('http.timeout')`  | returns a duration object `{seconds: number, ms: number}`                                    |
| `getLogLevel`   | `reforge.getLogLevel("my.app.logger")` | returns a `LogLevel` enum value for the specified logger name                                |
| `logger`        | `reforge.logger.info("message")`       | log messages with dynamic log level control (see below for all methods)                      |
| `loaded`        | `if (reforge.loaded) { ... }`          | a boolean indicating whether reforge content has loaded                                      |
| `shouldLog`     | `if (reforge.shouldLog(...)) {`        | returns a boolean indicating whether the proposed log level is valid for the current context |
| `poll`          | `reforge.poll({frequencyInMs})`        | starts polling every `frequencyInMs` ms.                                                     |
| `stopPolling`   | `reforge.stopPolling()`                | stops the polling process                                                                    |
| `context`       | `reforge.context`                      | get the current context (after `init()`).                                                    |
| `updateContext` | `reforge.updateContext(newContext)`    | update the context and refetch. Pass `false` as a second argument to skip refetching         |
| `extract`       | `reforge.extract()`                    | returns the current config as a plain object of key, config value pairs                      |
| `hydrate`       | `reforge.hydrate(configurationObject)` | sets the current config based on a plain object of key, config value pairs                   |

## `shouldLog()`

`shouldLog` allows you to implement dynamic logging. It takes the following properties:

| property       | type   | example               | case-sensitive |
| -------------- | ------ | --------------------- | -------------- |
| `loggerName`   | string | my.corp.widgets.modal | Yes            |
| `desiredLevel` | string | INFO                  | No             |
| `defaultLevel` | string | ERROR                 | No             |

If you've configured a level value for the exact `loggerName` (as `log-level.{loggerName}`), that
value will be used for comparison against the `desiredLevel`. If no configured level is found for
the exact `loggerName`, then the provided `defaultLevel` will be compared against `desiredLevel`.

**Note:** `shouldLog` does NOT traverse the logger name hierarchy. It only checks for an exact match
of `log-level.{loggerName}`.

If `desiredLevel` is greater than or equal to the comparison severity, then `shouldLog` returns
true. If the `desiredLevel` is less than the comparison severity, then `shouldLog` will return
false.

Example usage:

```javascript
const desiredLevel = "info";
const defaultLevel = "error";
const loggerName = "my.corp.widgets.modal";

if (shouldLog({ loggerName, desiredLevel, defaultLevel })) {
  console.info("...");
}
```

If no log level value is configured in Reforge for the exact key
`"log-level.my.corp.widgets.modal"`, then the `defaultLevel` ("ERROR") will be used and the
`console.info` will not happen. If the value is configured for that exact key and is INFO or more
verbose, the `console.info` will happen.

## `getLogLevel()`

`getLogLevel` provides a simpler way to get log levels for dynamic logging. It returns a `LogLevel`
enum value from a configured key.

### Configuration

You can optionally specify a custom logger key during initialization (default is
`"log-levels.default"`):

```javascript
await reforge.init({
  sdkKey: "1234",
  context: new Context({
    /* ... */
  }),
  loggerKey: "my.custom.log.config", // optional, defaults to "log-levels.default"
});
```

### Usage

```javascript
import { reforge, LogLevel } from "@reforge-com/javascript";

const loggerName = "my.app.widgets.modal";
const level = reforge.getLogLevel(loggerName);

// level is a LogLevel enum value
if (level === LogLevel.DEBUG || level === LogLevel.TRACE) {
  console.debug("Debug information...");
}
```

### How it works

When you call `getLogLevel(loggerName)`, the method:

1. Looks up the configured logger key (default: `"log-levels.default"`)
2. Returns the appropriate `LogLevel` enum value (TRACE, DEBUG, INFO, WARN, ERROR, or FATAL)
3. Returns `LogLevel.DEBUG` as the default if no configuration is found

**Note:** The `loggerName` parameter is currently only used for potential telemetry/logging
purposes. All loggers share the same configured log level from the logger key. For per-logger log
levels, use `shouldLog()` with individual `log-level.{loggerName}` configs.

## `logger` - Simple Logging Methods

The `reforge.logger` object provides convenient methods for logging at different levels. These
methods automatically check the configured log level and only output to the console when
appropriate.

### Available Methods

```javascript
import { reforge } from "@reforge-com/javascript";

// Configure the log level
await reforge.init({
  sdkKey: "1234",
  context: new Context({
    /* ... */
  }),
  loggerKey: "log-levels.default", // optional
});

reforge.hydrate({ "log-levels.default": "INFO" });

// Use the logger methods
reforge.logger.trace("Trace message"); // Will not log (below INFO)
reforge.logger.debug("Debug message"); // Will not log (below INFO)
reforge.logger.info("Info message"); // Will log
reforge.logger.warn("Warning message"); // Will log
reforge.logger.error("Error message"); // Will log
reforge.logger.fatal("Fatal message"); // Will log
```

### How it Works

Each logger method:

1. Checks the configured log level from the logger key (default: `"log-levels.default"`)
2. Compares the message level against the configured level
3. Only outputs to the console if the level is enabled

**Console Method Mapping:**

- `trace()` and `debug()` → `console.debug()`
- `info()` → `console.info()`
- `warn()` → `console.warn()`
- `error()` and `fatal()` → `console.error()`

### Example

```javascript
import { reforge, Context } from "@reforge-com/javascript";

await reforge.init({
  sdkKey: "your-key",
  context: new Context({ user: { id: "123" } }),
});

// Set log level to WARN
reforge.hydrate({ "log-levels.default": "WARN" });

reforge.logger.debug("Debug details"); // Not logged
reforge.logger.info("Process started"); // Not logged
reforge.logger.warn("Low disk space"); // Logged to console
reforge.logger.error("Failed to save"); // Logged to console
```

### LogLevel enum values

- `LogLevel.TRACE` (1) - Most verbose
- `LogLevel.DEBUG` (2)
- `LogLevel.INFO` (3)
- `LogLevel.WARN` (5)
- `LogLevel.ERROR` (6)
- `LogLevel.FATAL` (9) - Least verbose

### Comparing LogLevel values

Since `LogLevel` is a string enum, you can't use `<=` directly. Use the provided helper functions:

```javascript
import { reforge, LogLevel, shouldLogAtLevel, getLogLevelSeverity } from "@reforge-com/javascript";

const configuredLevel = reforge.getLogLevel("my.app.logger");

// Option 1: Use shouldLogAtLevel helper (recommended)
if (shouldLogAtLevel(configuredLevel, LogLevel.DEBUG)) {
  console.debug("Debug message");
}

// Option 2: Compare severity values
if (getLogLevelSeverity(configuredLevel) <= getLogLevelSeverity(LogLevel.INFO)) {
  console.info("Info message");
}
```

### Example integration

```javascript
import { reforge, LogLevel, shouldLogAtLevel } from "@reforge-com/javascript";

class Logger {
  constructor(name) {
    this.name = name;
  }

  debug(message) {
    const level = reforge.getLogLevel(this.name);
    if (shouldLogAtLevel(level, LogLevel.DEBUG)) {
      console.debug(`[${this.name}] ${message}`);
    }
  }

  info(message) {
    const level = reforge.getLogLevel(this.name);
    if (shouldLogAtLevel(level, LogLevel.INFO)) {
      console.info(`[${this.name}] ${message}`);
    }
  }

  error(message) {
    const level = reforge.getLogLevel(this.name);
    if (shouldLogAtLevel(level, LogLevel.ERROR)) {
      console.error(`[${this.name}] ${message}`);
    }
  }
}

// Usage
const logger = new Logger("my.app.components.modal");
logger.debug("Modal opened"); // Only logs if DEBUG level is enabled for this logger
logger.info("User action completed"); // Only logs if INFO level or more verbose is enabled
logger.error("Failed to save"); // Logs for ERROR level or more verbose
```

## `poll()`

After `reforge.init()`, you can start polling. Polling uses the context you defined in `init` by
default. You can update the context for future polling by setting it on the `reforge` object.

```javascript
// some time after init
reforge.poll({frequencyInMs: 300000})

// we're now polling with the context used from `init`

// later, perhaps after a visitor logs in and now you have the context of their current user
reforge.context = new Context({...reforge.context, user: { email: user.email, key: user.trackingId })

// future polling will use the new context
```

## Usage in your test suite

In your test suite, you probably want to skip the `reforge.init` altogether and instead use
`reforge.setConfig` to set up your test state.

```javascript
it("shows the turbo button when the feature is enabled", () => {
  reforge.setConfig({
    turbo: true,
    defaultMediaCount: 3,
  });

  const rendered = new MyComponent().render();

  expect(rendered).toMatch(/Enable Turbo/);
  expect(rendered).toMatch(/Media Count: 3/);
});
```

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and
create. Any contributions you make are **greatly appreciated**. For detailed contributing
guidelines, please see [CONTRIBUTING.md](CONTRIBUTING.md)

[Reforge]: https://www.reforge.com/
[jsDelivr]: https://www.jsdelivr.com/package/npm/@reforge-com/javascript
