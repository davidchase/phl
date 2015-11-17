const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const rimraf = require('rimraf');
const onExit = require('signal-exit');
const stripBom = require('strip-bom');
const xtend = require("xtend");

const internals = {};
const PHL = {};

internals.defaultOpts = {
    subprocessBin: path.resolve(__dirname, './bin/PHL.js'),
    tempDirectory: './.phl_output',
    cwd: process.env.PHL_CWD || process.cwd(),
    reporter: 'text',
    istanbul: require('istanbul')
};

internals.getPkgConfig = function getPkgConfig() {
    const getConfigObj = require(path.resolve(internals.config.cwd, './package.json')).config || {};
    return getConfigObj.phl;
};

internals.toList = xs => Array.isArray(xs) ? xs : [xs];

internals.createRegexPaths = list => internals.toList(list).map((path) => new RegExp(path));

internals.createInstrumenter = () => new internals.config.istanbul.Instrumenter();

internals.addFile = function addFile(filename) {
    let instrument = true;
    const relFile = path.relative(internals.config.cwd, filename);

    PHL.exclude.forEach(function(exclude) {
        if (exclude.test(filename)) {
            instrument = false;
        }
    });

    PHL.include.forEach(function(include) {
        if (include.test(filename)) {
            instrument = true;
        }
    });

    let content = stripBom(fs.readFileSync(filename, 'utf8'));

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
    require.extensions['.js'] = function(module, filename) {
        const obj = internals.addFile(filename);
        module._compile(obj.content, filename);
    };
};

internals.createOutputDirectory = () => mkdirp.sync(internals.tmpDirectory());

internals.wrapExit = function wrapExit() {
    onExit(function() {
        internals.writeCoverageFile();
    }, {
        alwaysLast: true
    });
};

internals.writeCoverageFile = function writeCoverageFile() {
    let coverage = global.__coverage__;
    if (typeof __coverage__ === 'object') {
        coverage = __coverage__;
    }
    if (!coverage) {
        return;
    }

    fs.writeFileSync(path.resolve(internals.tmpDirectory(), './', process.pid + '.json'), JSON.stringify(coverage), 'utf-8');
};


internals.loadReports = function loadReports() {
    const files = fs.readdirSync(internals.tmpDirectory());

    return files.map(function(f) {
        try {
            return JSON.parse(fs.readFileSync(path.resolve(internals.tmpDirectory(), './', f), 'utf-8'));
        } catch (e) {
            return {};
        }
    });
};

internals.tmpDirectory = () => path.resolve(internals.config.cwd, './', internals.config.tempDirectory);

PHL.init = function init(opts) {
    internals.config = xtend(internals.defaultOpts, opts);
    const phlConfig = internals.getPkgConfig();

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
    next = next || function() {};

    const collector = _collector || new internals.config.istanbul.Collector();
    const reporter = _reporter || new internals.config.istanbul.Reporter();

    internals.loadReports().forEach(function(report) {
        collector.add(report);
    });

    internals.reporterList.forEach(function(porter) {
        reporter.add(porter);
    });

    reporter.write(collector, true, next);
};

module.exports = PHL;