#!/usr/bin/env node
'use strict';

var foreground = require('foreground-child');
var phl = require('../');
var path = require('path');
var sw = require('spawn-wrap');
var yargs = require('yargs');
var internals = {};

internals.report = function report(args) {
    process.env.PHL_CWD = process.cwd();
    phl.init({
        reporter: args.reporter
    });
    phl.report();
};

if (process.env.PHL_CWD) {
    phl.init();
    phl.wrap();

    var name = require.resolve('../');
    delete require.cache[name];

    sw.runMain();
} else {
    yargs.usage('$0 [command] [options]\n\nrun your tests with the phl bin to instrument them with coverage').command('report', 'run coverage report for .phl_output', function (yargs) {
        yargs.usage('$0 report [options]').option('r', {
            alias: 'reporter',
            describe: 'coverage reporter(s) to use',
            default: 'text'
        }).help('h').alias('h', 'help').example('$0 report --reporter=lcov', 'output an HTML lcov report to ./coverage');
    }).command('check-coverage', 'check whether coverage is within thresholds provided', function (yargs) {
        yargs.usage('$0 check-coverage [options]').option('b', {
            alias: 'branches',
            default: 0,
            description: 'what % of branches must be covered?'
        }).option('f', {
            alias: 'functions',
            default: 0,
            description: 'what % of functions must be covered?'
        }).option('l', {
            alias: 'lines',
            default: 90,
            description: 'what % of lines must be covered?'
        }).option('s', {
            alias: 'statements',
            default: 0,
            description: 'what % of statements must be covered?'
        }).help('h').alias('h', 'help').example('$0 check-coverage --lines 95', "check whether the JSON in phl's output folder meets the thresholds provided");
    }).option('r', {
        alias: 'reporter',
        describe: 'coverage reporter(s) to use',
        default: 'text'
    }).option('s', {
        alias: 'silent',
        default: false,
        type: 'boolean',
        describe: "don't output a report after tests finish running"
    }).help('h').alias('h', 'help').version(require('../package.json').version).example('$0 npm test', 'instrument your tests with coverage').example('$0 report --reporter=text-lcov', 'output lcov report after running your tests').epilog('visit http://git.io/NFRQ7g for list of available reporters');

    if (~yargs.argv._.indexOf('report')) {
        // run a report.
        process.env.PHL_CWD = process.cwd();

        internals.report(yargs.argv);
    } else if (~yargs.argv._.indexOf('check-coverage')) {
        foreground(process.execPath, [require.resolve('istanbul/lib/cli'), 'check-coverage', '--lines=' + yargs.argv.lines, '--functions=' + yargs.argv.functions, '--branches=' + yargs.argv.branches, '--statements=' + yargs.argv.statements, path.resolve(process.cwd(), './.phl_output/*.json')]);
    } else if (yargs.argv._.length) {
        // wrap subprocesses and execute argv[1]
        phl.init();
        phl.cleanup();

        sw([__filename], {
            PHL_CWD: process.cwd()
        });

        foreground(phl.mungeArgs(yargs.argv), function (done) {
            if (!yargs.argv.silent) {
                internals.report(yargs.argv);
            }
            return done();
        });
    } else {
        // I don't have a clue what you're doing.
        yargs.showHelp();
    }
}
