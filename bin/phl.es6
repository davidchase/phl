#!/usr/bin/env node

const path = require('path');
const foreground = require('foreground-child');
const wrap = require('spawn-wrap');
const program = require('commander');
const phl = require('../');
const pkg = require('../package.json');
const internals = {};

internals.report = function report(args) {
    args = args || {};
    if (args.silent) {
        return;
    }
    process.env.PHL_CWD = process.cwd();
    phl.init({
        reporter: args.reporter || 'text'
    });
    phl.report();
};

internals.istanbulCheckCoverage = function istanbulCheckCoverage(options) {
    foreground(process.execPath, [require.resolve('istanbul/lib/cli'),
        'check-coverage',
        '--lines=' + options.lines,
        '--functions=' + options.functions,
        '--branches=' + options.branches,
        '--statements=' + options.statements,
        path.resolve(process.cwd(), './.phl_output/*.json')
    ]);
};

program
    .version(pkg.version)
    .usage('[cmd | options] <dirs....>');

program
    .command('report')
    .option('-r, --reporter <reporter>', 'specify report to use, default:text')
    .option('-s, --silent', 'dont output any coverage')
    .description('run coverage report for .phl_output')
    .action(internals.report);

program
    .command('check-coverage')
    .description('check whether coverage is within thresholds provided')
    .option('-l, --lines <lines>', 'what n of lines must be covered?')
    .option('-b, --branches <branches>', 'what n of branches must be covered?')
    .option('-f, --functions <functions>', 'what n of functions must be covered?')
    .option('-s, --statements <statements>', 'what n of statements must be covered?')
    .action(internals.istanbulCheckCoverage);


program
    .arguments('[dir...]')
    .action(function(dirs) {
        if (process.env.PHL_CWD) {
            phl.init();
            phl.wrap();
            const name = require.resolve('../');
            delete require.cache[name];

            return wrap.runMain();
        }
        phl.init();
        phl.cleanup();

        wrap([__filename], {
            PHL_CWD: process.cwd()
        });

        foreground(dirs, function(done) {
            internals.report(program.args);
            return done();
        });

    });


program.parse(process.argv);