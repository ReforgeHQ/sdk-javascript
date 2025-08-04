# Changelog

## 0.4.5 - 2025-05-22

- Extra error handling for loader and telemetry uploader

## 0.4.4 - 2025-04-10

- Silently handle Telemetry AbortErrors (#70)

## 0.4.3 - 2025-03-12

- Use tsup for better ESM/CJS compatibility

## 0.4.2 - 2024-09-12

- Allow reading bootstrapped data on `window` (#67)

## 0.4.1 - 2024-08-27

- Failover to waistband if belt and suspenders are down (#66)

## 0.4.0 - 2024-08-21

- Support v2 evaluation endpoint / global delivery (#63)

## 0.3.5 - 2024-08-20

- Handle non-Latin1 characters in Base64 encoding (#65)

## 0.3.4 - 2024-07-18

- Fixes error when uploading eval telemetry for stringList values

## 0.3.3 - 2024-07-17

- Reduces volume of internal logging done by telemetry uploader

## 0.3.2 - 2024-07-16

- Adds validation console errors for Context object

## 0.3.1 - 2024-07-10

- Adds collectContextMode option to control context telemetry
- Tries to flush telemetry when browser window closes
- Improves prefix for internal logger names

## 0.3.0 - 2024-06-04

- collectEvaluationSummaries is now opt-out (#51)

## 0.2.6 - 2024-05-31

- Fix JSON parsing regression (#50)

## 0.2.5 - 2024-05-31

- Add support for durations (#49)

## 0.2.4 - 2024-05-03

- Add support for JSON config values

## 0.2.3 - 2024-01-24

- Add bundled/minified version

## 0.2.2 - 2024-01-17

- Updates to errors and warnings

## 0.2.1 - 2024-01-11

- Fix default endpoint for telemetry

## 0.2.0 - 2023-12-12

- Remove Identity (#38)
- Add `updateContext` (#39)

## 0.1.19 - 2023-12-11

- Accept a client version string so React client can identify correctly

## 0.1.18 - 2023-10-31

- Start reporting known loggers telemetry

## 0.1.16 - 2023-10-23

- Start reporting evaluation telemetry when keys are actually used

## 0.1.15 - 2023-09-20

- Add support for a `afterEvaluationCallback` callback for forwarding evaluation events to analytics
  tools, etc.

## 0.1.14 - 2023-07-11

- Call stopPolling() when calling poll() (#25)

## 0.1.13 - 2023-07-11

- Fix bug with poll canceling (#23)

## 0.1.12 - 2023-07-11

- Reset polling on init (#21)

## 0.1.11 - 2023-07-03

- Support polling via `reforge.poll({frequencyInMs})` (#16)

## 0.1.10 - 2023-06-27

- Properly consider root logger (#11)

## 0.1.9 - 2023-06-27

- Add `shouldLog` for dynamic log levels (#10)

## [0.1.8] - 2023-05-01

- Version bump for NPM

## [0.1.7] - 2023-05-01

- Support `Context` and deprecate `Identity`

## [0.1.6] - 2023-04-28

- Version bump for NPM

## [0.1.5] - 2023-03-16

- Export cleanup

## [0.1.4] - 2023-03-16

- No default export

## [0.1.3] - 2022-09-29

- Simpler API endpoint URL for eval (#6)

## [0.1.2] - 2022-08-18

- Fix types for published package

## [0.1.1] - 2022-08-18

- Allow specifying a timeout for `fetch` (#5)
- Simplify `setConfig` (#3)
- Add types (#2)

## [0.1.0] - 2022-08-12

- First working commit (#1)
