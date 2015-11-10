'use strict';

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var rimraf = require('rimraf');
var onExit = require('signal-exit');
var stripBom = require('strip-bom');
var xtend = require("xtend");

var internals = {};
var PHL = {};

internals.defaultOpts = {
    subprocessBin: path.resolve(__dirname, './bin/PHL.js'),
    tempDirectory: './.phl_output',
    cwd: process.env.PHL_CWD || process.cwd(),
    reporter: 'text',
    istanbul: require('istanbul')
};

internals.getPkgConfig = function getPkgConfig() {
    var getConfigObj = require(path.resolve(internals.config.cwd, './package.json')).config || {};
    return getConfigObj.phl;
};

internals.toList = function (xs) {
    return Array.isArray(xs) ? xs : [xs];
};

internals.createRegexPaths = function (list) {
    return internals.toList(list).map(function (path) {
        return new RegExp(path);
    });
};

internals.createInstrumenter = function () {
    return new internals.config.istanbul.Instrumenter();
};

internals.addFile = function addFile(filename) {
    var instrument = true;
    var relFile = path.relative(internals.config.cwd, filename);

    PHL.exclude.forEach(function (exclude) {
        if (exclude.test(filename)) {
            instrument = false;
        }
    });

    PHL.include.forEach(function (include) {
        if (include.test(filename)) {
            instrument = true;
        }
    });

    var content = stripBom(fs.readFileSync(filename, 'utf8'));

    if (instrument) {
        content = internals.instrumenter.instrumentSync(content, './' + relFile);
    }

    return {
        instrument: instrument,
        content: content,
        relFile: relFile
    };
};

internals.wrapRequire = function wrapRequire() {
    require.extensions['.js'] = function (module, filename) {
        var obj = internals.addFile(filename);
        module._compile(obj.content, filename);
    };
};

internals.createOutputDirectory = function () {
    return mkdirp.sync(internals.tmpDirectory());
};

internals.wrapExit = function wrapExit() {
    onExit(function () {
        internals.writeCoverageFile();
    }, {
        alwaysLast: true
    });
};

internals.writeCoverageFile = function writeCoverageFile() {
    var coverage = global.__coverage__;
    if ((typeof __coverage__ === 'undefined' ? 'undefined' : _typeof(__coverage__)) === 'object') {
        coverage = __coverage__;
    }
    if (!coverage) {
        return;
    }

    fs.writeFileSync(path.resolve(internals.tmpDirectory(), './', process.pid + '.json'), JSON.stringify(coverage), 'utf-8');
};

internals.loadReports = function loadReports() {
    var files = fs.readdirSync(internals.tmpDirectory());

    return files.map(function (f) {
        try {
            return JSON.parse(fs.readFileSync(path.resolve(internals.tmpDirectory(), './', f), 'utf-8'));
        } catch (e) {
            return {};
        }
    });
};

internals.tmpDirectory = function () {
    return path.resolve(internals.config.cwd, './', internals.config.tempDirectory);
};

PHL.init = function init(opts) {
    internals.config = xtend(internals.defaultOpts, opts);
    var phlConfig = internals.getPkgConfig();

    internals.reporterList = internals.toList(internals.config.reporter);

    internals.exclude = phlConfig.exclude || ['node_modules/', 'test/', 'test.js'];
    internals.include = phlConfig.include || [];

    PHL.exclude = internals.createRegexPaths(internals.exclude);
    PHL.include = internals.createRegexPaths(internals.include);

    internals.instrumenter = internals.createInstrumenter();
    internals.createOutputDirectory();
};

PHL.cleanup = function cleanup() {
    if (!process.env.PHL_CWD) {
        rimraf.sync(internals.tmpDirectory());
    }
};

PHL.wrap = function wrap() {
    internals.wrapRequire();
    internals.wrapExit();
};

PHL.report = function report(next, _collector, _reporter) {
    next = next || function () {};

    var collector = _collector || new internals.config.istanbul.Collector();
    var reporter = _reporter || new internals.config.istanbul.Reporter();

    internals.loadReports().forEach(function (report) {
        collector.add(report);
    });

    internals.reporterList.forEach(function (porter) {
        reporter.add(porter);
    });

    reporter.write(collector, true, next);
};

PHL.mungeArgs = function (yargv) {
    var argv = process.argv.slice(1);
    return argv.slice(argv.indexOf(yargv._[0]));
};

module.exports = PHL;
