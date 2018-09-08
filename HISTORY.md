# History

## v1.2.0 2018 September 8
- Removed DocPad v6.82 deprecations
- `testCreate` no longer runs the `init` action, now it only does `clean` and `install`

## v1.1.1 2018 August 20
- Add notice of removal of the `testerClass` property (lowecase `t`) and do not treat it as the new `TesterClass` property (uppercase `T`)

## v1.1.0 2018 August 20
- Eliminated `testerPath` for `TesterClass`
- Eliminated the need for the `pluginname.test.js` file if only defaults were used
    - Instead, you can now replace it with the `docpad-plugintester` executable
- Eliminated the need for the earlier premade custom tester classes (server tester, and render tester)
    - `testGenerate` now runs render tests if `outExpectedPath` exists`
    - Server tester has been removed, [following its deprecation](https://github.com/docpad/docpad/issues/1081)

## v1.0.0 2018 August 20
- Abstracted out from DocPad v6.80.9 and converted to esnext
