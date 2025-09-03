# @reforge-com/javascript

A client for [Reforge]

## Installation

`npm install @reforge-com/javascript` or `yarn add @reforge-com/javascript`

If you'd prefer to use the standalone `<script>` tag approach, we recommend using
[jsDelivr][jsDelivr] for a minified/bundled version.

## Usage in your app

Initialize reforge with your api key and a `Context` for the current user/visitor/device/request:

```javascript
import { reforge, Context } from "@reforge-com/javascript";

const options = {
  apiKey: "1234",
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
  apiKey: "1234",
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

## Client API

| property        | example                                | purpose                                                                                      |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `isEnabled`     | `reforge.isEnabled("new-logo")`        | returns a boolean (default `false`) if a feature is enabled based on the current context     |
| `get`           | `reforge.get('retry-count')`           | returns the value of a flag or config evaluated in the current context                       |
| `getDuration`   | `reforge.getDuration('http.timeout')`  | returns a duration object `{seconds: number, ms: number}`                                    |
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

If you've configured a level value for `loggerName` (or a parent in the dot-notation hierarchy like
"my.corp.widgets") then that value will be used for comparison against the `desiredLevel`. If no
configured level is found in the hierarchy for `loggerName` then the provided `defaultLevel` will be
compared against `desiredLevel`.

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

If no log level value is configured in Reforge for "my.corp.widgets.modal" or higher in the
hierarchy, then the `console.info` will not happen. If the value is configured and is INFO or more
verbose, the `console.info` will happen.

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

[Reforge]: https://www.prefab.cloud/
[jsDelivr]: https://www.jsdelivr.com/package/npm/@reforge-com/javascript
