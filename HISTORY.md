# History

## v1.7.2 2020 August 13

-   Better manual edition/directory loading (compounded by v1.7.0)

## v1.7.1 2020 August 13

-   Fix manual edition/directory loading (compounded by v1.7.0)

## v1.7.0 2020 August 13

-   Correctly load and test editioned plugins
-   Output what we actually load, so awareness and debugging is much easier
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v1.6.2 2020 August 5

-   required docpad v6.83.1 to make use of the following bugfix
    -   ensures test plugin is loaded prior to `docpadReady` event and whatnot
-   support `--debug` along with `-d`
-   `testCreate` and `testLoad` are now merged into a new `testInit`

## v1.6.1 2020 August 5

-   fixed `Error: Cannot find module 'assert-helpers'` (regression since v1.4.0)

## v1.6.0 2020 August 5

-   new `whitespace` param, which now defaults to `trim`, which will trim all whitespace from the start and end of each line, and will remove whitespace only lines
-   the old `removeWhitespace` param is now ported to `whitespace="remove"`

## v1.5.0 2020 August 5

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Minimum required node version changed from `node: >=0.10` to `node: >=10` to keep up with mandatory ecosystem changes

## v1.3.3 2018 October 1

-   The create test is now a suite of tests, so that its workings are illuminated

## v1.3.2 2018 October 1

-   Fix `ReferenceError: Symbol is not defined` on legacy node versions

## v1.3.1 2018 September 28

-   More reliable test detection

## v1.3.0 2018 September 28

-   Properly enable support for custom plugin testers
    -   `PluginTester.test` now works for inherited classes
    -   `PluginTester::test` now defaults the joe-reporter, rather than having it done in the `docpad-plugintester` executable
-   Support testing specific editions via `docpad-plugintester edition=name`

## v1.2.1 2018 September 8

-   Updated [base files](https://github.com/bevry/base) and [editions](https://github.com/bevry/editions) using [boundation](https://github.com/bevry/boundation)

## v1.2.0 2018 September 8

-   Removed DocPad v6.82 deprecations
-   `testCreate` no longer runs the `init` action, now it only does `clean` and `install`

## v1.1.1 2018 August 20

-   Add notice of removal of the `testerClass` property (lowecase `t`) and do not treat it as the new `TesterClass` property (uppercase `T`)

## v1.1.0 2018 August 20

-   Eliminated `testerPath` for `TesterClass`
-   Eliminated the need for the `pluginname.test.js` file if only defaults were used
    -   Instead, you can now replace it with the `docpad-plugintester` executable
-   Eliminated the need for the earlier premade custom tester classes (server tester, and render tester)
    -   `testGenerate` now runs render tests if `outExpectedPath` exists`
    -   Server tester has been removed, [following its deprecation](https://github.com/docpad/docpad/issues/1081)

## v1.0.0 2018 August 20

-   Abstracted out from DocPad v6.80.9 and converted to esnext
