# Changelog

## 0.0.0-pre.5 - 2025-09-24

- Use reforge.com endpoints

## 0.0.0-pre.4 - 2025-09-18

- rename apiKey to sdkKey
- change version header

## 0.0.0-pre.3 - 2025-09-05

- Remove deprecated methods and fix typing on public replacements

## 0.0.0-pre.0 - 2025-08-03

- Reforge rebrand

# @prefab-cloud/prefab-cloud-js

All releases below were released as part of the
[@prefab-cloud/prefab-cloud-js](https://github.com/prefab-cloud/prefab-cloud-js) package.

## @prefab-cloud/prefab-cloud-js 0.4.5 - 2025-05-22

- Extra error handling for loader and telemetry uploader

## @prefab-cloud/prefab-cloud-js 0.4.4 - 2025-04-10

- Silently handle Telemetry AbortErrors (#70)

## @prefab-cloud/prefab-cloud-js 0.4.3 - 2025-03-12

- Use tsup for better ESM/CJS compatibility

## @prefab-cloud/prefab-cloud-js 0.4.2 - 2024-09-12

- Allow reading bootstrapped data on `window` (#67)

## @prefab-cloud/prefab-cloud-js 0.4.1 - 2024-08-27

- Failover to waistband if belt and suspenders are down (#66)

## @prefab-cloud/prefab-cloud-js 0.4.0 - 2024-08-21

- Support v2 evaluation endpoint / global delivery (#63)

## @prefab-cloud/prefab-cloud-js 0.3.5 - 2024-08-20

- Handle non-Latin1 characters in Base64 encoding (#65)

## @prefab-cloud/prefab-cloud-js 0.3.4 - 2024-07-18

- Fixes error when uploading eval telemetry for stringList values

## @prefab-cloud/prefab-cloud-js 0.3.3 - 2024-07-17

- Reduces volume of internal logging done by telemetry uploader

## @prefab-cloud/prefab-cloud-js 0.3.2 - 2024-07-16

- Adds validation console errors for Context object

## @prefab-cloud/prefab-cloud-js 0.3.1 - 2024-07-10

- Adds collectContextMode option to control context telemetry
- Tries to flush telemetry when browser window closes
- Improves prefix for internal logger names

## @prefab-cloud/prefab-cloud-js 0.3.0 - 2024-06-04

- collectEvaluationSummaries is now opt-out (#51)

## @prefab-cloud/prefab-cloud-js 0.2.6 - 2024-05-31

- Fix JSON parsing regression (#50)

## @prefab-cloud/prefab-cloud-js 0.2.5 - 2024-05-31

- Add support for durations (#49)

## @prefab-cloud/prefab-cloud-js 0.2.4 - 2024-05-03

- Add support for JSON config values

## @prefab-cloud/prefab-cloud-js 0.2.3 - 2024-01-24

- Add bundled/minified version

## @prefab-cloud/prefab-cloud-js 0.2.2 - 2024-01-17

- Updates to errors and warnings

## @prefab-cloud/prefab-cloud-js 0.2.1 - 2024-01-11

- Fix default endpoint for telemetry

## @prefab-cloud/prefab-cloud-js 0.2.0 - 2023-12-12

- Remove Identity (#38)
- Add `updateContext` (#39)

## @prefab-cloud/prefab-cloud-js 0.1.19 - 2023-12-11

- Accept a client version string so React client can identify correctly

## @prefab-cloud/prefab-cloud-js 0.1.18 - 2023-10-31

- Start reporting known loggers telemetry

## @prefab-cloud/prefab-cloud-js 0.1.16 - 2023-10-23

- Start reporting evaluation telemetry when keys are actually used

## @prefab-cloud/prefab-cloud-js 0.1.15 - 2023-09-20

- Add support for a `afterEvaluationCallback` callback for forwarding evaluation events to analytics
  tools, etc.

## @prefab-cloud/prefab-cloud-js 0.1.14 - 2023-07-11

- Call stopPolling() when calling poll() (#25)

## @prefab-cloud/prefab-cloud-js 0.1.13 - 2023-07-11

- Fix bug with poll canceling (#23)

## @prefab-cloud/prefab-cloud-js 0.1.12 - 2023-07-11

- Reset polling on init (#21)

## @prefab-cloud/prefab-cloud-js 0.1.11 - 2023-07-03

- Support polling via `reforge.poll({frequencyInMs})` (#16)

## @prefab-cloud/prefab-cloud-js 0.1.10 - 2023-06-27

- Properly consider root logger (#11)

## @prefab-cloud/prefab-cloud-js 0.1.9 - 2023-06-27

- Add `shouldLog` for dynamic log levels (#10)

## @prefab-cloud/prefab-cloud-js [0.1.8] - 2023-05-01

- Version bump for NPM

## @prefab-cloud/prefab-cloud-js [0.1.7] - 2023-05-01

- Support `Context` and deprecate `Identity`

## @prefab-cloud/prefab-cloud-js [0.1.6] - 2023-04-28

- Version bump for NPM

## @prefab-cloud/prefab-cloud-js [0.1.5] - 2023-03-16

- Export cleanup

## @prefab-cloud/prefab-cloud-js [0.1.4] - 2023-03-16

- No default export

## @prefab-cloud/prefab-cloud-js [0.1.3] - 2022-09-29

- Simpler API endpoint URL for eval (#6)

## @prefab-cloud/prefab-cloud-js [0.1.2] - 2022-08-18

- Fix types for published package

## @prefab-cloud/prefab-cloud-js [0.1.1] - 2022-08-18

- Allow specifying a timeout for `fetch` (#5)
- Simplify `setConfig` (#3)
- Add types (#2)

## @prefab-cloud/prefab-cloud-js [0.1.0] - 2022-08-12

- First working commit (#1)
