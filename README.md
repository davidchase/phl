# phl

> **This is a slimmer es6 version and fork of [nyc](https://github.com/bcoe/nyc)**

Supporting currently Mac OSX only at the time, if you want better support use [nyc](https://github.com/bcoe/nyc).


```shell
phl npm test
```

a code coverage tool built on [istanbul](https://www.npmjs.com/package/istanbul)
that works for applications that spawn subprocesses.

## Why?

Because the place i work needed some features that nyc currently does not provide... simple as that.

## Instrumenting Your Code

Simply run your tests with `phl`, and it will collect coverage information for
each process and store it in `phl_output`.

```shell
phl npm test
```

you can pass a list of Istanbul reporters that you'd like to run:

```shell
phl --reporter=lcov --reporter=text-lcov npm test
```

If you're so inclined, you can simply add phl to the test stanza in your package.json:

```json
{
  "script": {
    "test": "phl tap ./test/*.js"
  }
}
```

## Checking Coverage

phl exposes istanbul's check-coverage tool. After running your tests with phl,
simply run:

```shell
phl check-coverage --lines 95 --functions 95 --branches 95
```

This feature makes it easy to fail your tests if coverage drops below a given threshold.

## Running Reports

Once you've run your tests with phl, simply run:

```bash
phl report
```

To view your coverage report:

```shell
--------------------|-----------|-----------|-----------|-----------|
File                |   % Stmts |% Branches |   % Funcs |   % Lines |
--------------------|-----------|-----------|-----------|-----------|
   ./               |     85.96 |        50 |        75 |     92.31 |
      index.js      |     85.96 |        50 |        75 |     92.31 |
   ./test/          |     98.08 |        50 |        95 |     98.04 |
      phl-test.js   |     98.08 |        50 |        95 |     98.04 |
   ./test/fixtures/ |       100 |       100 |       100 |       100 |
      sigint.js     |       100 |       100 |       100 |       100 |
      sigterm.js    |       100 |       100 |       100 |       100 |
--------------------|-----------|-----------|-----------|-----------|
All files           |     91.89 |        50 |     86.11 |     95.24 |
--------------------|-----------|-----------|-----------|-----------|
```

you can use any reporters that are supported by istanbul:

```bash
phl report --reporter=lcov
```

## Including and Excluding Files

By default phl does not instrument files in `node_modules`, or `test`
for coverage. You can override this setting in your package.json, by
adding the following configuration:

```js
{"config": {
  "phl": {
    "exclude": [
      "node_modules/"
    ]
  }
}}
```

If you need coverage for files/directories inside `node_modules`  you can include them
like so:

```js
{"config": {
  "phl": {
    "include": [
      "node_modules/utils"
    ]
  }
}}
```

For a better illustration the following:

```js
{"config": {
  "phl": {
    "exclude": [
      "node_modules/"
    ],
    "include": [
      "node_modules/utils"
    ]
  }
}}
```

excludes all files inside of `node_modules` directory other than the utils directory

