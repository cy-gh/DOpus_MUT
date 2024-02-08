// @ts-check
/* eslint quotes: ['error', 'single'] */
/* eslint-disable no-inner-declarations */
/* global Enumerator DOpus Script ActiveXObject */
///<reference path="./_DOpusDefinitions.d.ts" />

/**
 * MUT: Mini Unit Tests
 *
 * @description
 * JScript hates tiny puppies, so this class can fix some of that via Unit Tests.
 *
 * I am a huge fan of unit tests, and trying to get away from pure JScript development to TS transpiling,
 * as I originally intended but since I have to maintain some gigantic scripts until I can rewrite them,
 * I had to have a bit more help, so this little helper.
 *
 * MUT follows the industry standard process:
 *
 * * initialization via `var mut = new MUT({...})`
 * * an optional `mut.setup()` callback before every test
 * * multiple tests added via `mut.addTest(...)`
 * * an optional `mut.teardown()` callback after every test
 * * `mut.run()` to execute all tests
 *
 * @param {{name: string, abortOnErrors?: boolean, autoFlush?: boolean, skipSuccess?: boolean, cbOut?: function}} options
 * can have the following keys:
 * * `name`: test suite name
 * * `abortOnErrors`: aborts as soon as any assertion fails
 * * `autoFlush`: flushes the messages after each assertion
 * * `skipSuccess`: success messages are not output or added to buffer
 * * `cbOut`: callback function for custom assertion handling (assertion failures cannot be supressed!)
 *
 * the `cbOut`callback receives 2 parameters:
 * * `msg`: string
 * * `status`: boolean
 * where status is true for assertion success, false for failure and undefined for plain messages (e.g. for internal messages)
 *
 * see below for example
 *
 * *Note:* `.flush()` method is effective only within `.addTest()` methods, not outside
 *
 * @example
 * ```javascript
    var mut = new MUT({
        name: 'Sample',
        abortOnErrors: true,
        autoFlush: true
    });
    mut.setSetup(function() {
        // DOpus.output('set up test environment');
    });
    mut.setTeardown(function() {
        // DOpus.output('teardown test environment');
    });
    mut.addTest('assertEquals() calls', function () {
        mut.assertEquals(0, 0, 'assertEquals number');
    });
    mut.addTest('assertNotEquals() calls', function () {
        mut.assertNotEquals(undefined, null, 'assertNotEquals undefined');
    })
    mut.addTest('assertTypeofEquals', function () {
        mut.assertTypeofEquals(true, 'boolean', 'assertTypeofEquals boolean');
        });
    });
    mut.addTest('assertTypeofNotEquals', function() {
        mut.assertTypeofNotEquals(function () { }, 'boolean', 'assertTypeofNotEquals function');
    });
    mut.run();
 * ```
 *
 *
 * if you want to collect the messages first so you can filter them out with own logic
 * set both autoFlush & skipSuccess to FALSE, and pass a null function as callback
 * and do NOT call flush in any of the addTest() methods
 * @example
 * ```javascript
    var mut2 = new MUT({
        name: 'custom collect',
        abortOnErrors: true,
        autoFlush: false,
        skipSuccess: false,
        cbOut: function () { }
    });
    mut2.addTest('my test', function () {
        mut2.assertEquals(1, 1, 'my msg');
    });
    mut2.run();
    DOpus.output('mut2 messages:\n' + JSON.stringify(mut2.getMessages(), null, 4));
 * ```
 *
 * example for custom callback:
 *
 * @example
 * ```javascript
    var mut3 = new MUT({
        name: 'cbex',
        abortOnErrors: true,
        autoFlush: true,
        cbOut: function(msg, status) {
            DOpus.output((msg !== undefined ? 'msg prefix: ' + msg : '') + (status !== undefined ? ', status: ' + status : ''));
        }
    });
 * ```
 *
 *
 * @requires sprintf because f..k me if I cannot have at least one nice thing!
 * @copyright
 * see {@link https://hexmen.com/js/sprintf.js} and {@link https://hexmen.com/blog/2007/03/14/printf-sprintf/}.
 * You should use the version supplied with this script if you do not want to adjust it to JScript yourself.
 *
 *
 *
 * I may or may not add some .assertXYZ syntactic sugar methods in the future, e.g. .assertNotUndefined()...
 *
 * **DISCLAIMER: I do not accept any liability, responsibility, whateverbility, you are on your own!**
 *
 * @license Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
 * @copyright © 2024 cuneytyilmaz.com
 *
 * **Future version of this script will be hosted at my github: {@link https://github.com/cy-gh/}**
 *
 *
 */
function MUT(options) {
    if (typeof options !== 'object') {
        throw new Error('parameters must be passed as an object');
    }
    this.getOutLine = function (/** @type {string} */ msg, /** @type {boolean} */ status) {
        // non-fancy
        // return 'status: ' + status + ', message: ' + msg;
        // fancy
        return sprintf('<b><font color="%s">%s</font></b>', (status === true ? '#33ff00' : status === false ? '#ff6666' : '#cccccc'), msg||'');
    };
    this.stdOut = function (/** @type {string} */ msg, /** @type {boolean} */ status) {
        DOpus.output(this.getOutLine(msg, status));
    };
    this.name           = (typeof options.name === 'string' ? options.name : 'mut');
    this.prefix         = this.name ? this.name + ': ' : '';
    this.abortOnErrors  = typeof options.abortOnErrors === 'boolean' ? options.abortOnErrors : true;
    this.autoFlush      = typeof options.autoFlush === 'boolean' ? options.autoFlush : true;
    this.skipSuccess    = typeof options.skipSuccess === 'boolean' ? options.skipSuccess : true;
    this.$out           = typeof options.cbOut === 'function' ? options.cbOut : this.stdOut;

    this.tests          = [];
    this.setup          = null;
    this.teardown       = null;
    this.messages       = [];
}

MUT.prototype = {
    collectOrOutputOrAbort: function (/** @type {string} */ msg, /** @type {boolean} */ status) {
        if (this.skipSuccess) return;
        if (this.autoFlush) {
            this.$out(this.prefix + msg, status);
        } else {
            this.messages.push({ 'status': status, 'msg': this.prefix + msg });
        }
        if (status === false && this.abortOnErrors) {
            if (!this.autoFlush) this.flush();
            throw new Error(msg);
        }
    },
    fail: function (/** @type {string} */ msg) {
        if (!this.autoFlush) this.flush();
        throw new Error(msg + '\n');
    },
    getMessages: function () {
        return this.messages;
    },
    flush: function () {
        var out = '';
        if (this.messages.length) {
            out += '\n';
            for (var i = 0; i < this.messages.length; i++) {
                var item = this.messages[i];
                out += this.getOutLine(item.msg, item.status) + '\n';
            }
            this.$out(out, true);
        }
        this.messages = [];
    },
    addTest: function(/** @type {string} */ name, /** @type {function} */ fnTester) {
        this.tests.push({ name: name, tester: fnTester });
    },

    setSetup: function(/** @type {function} */ fnSetup) {
        this.setup = fnSetup;
    },

    setTeardown: function(/** @type {function} */ fnTeardown) {
        this.teardown = fnTeardown;
    },

    assertEquals: function (/** @type {any} */ act, /** @type {any} */ exp, /** @type {string} */ msg) {
        var _status = act === exp;
        var _msg = sprintf('%s%s %s - act=%s, exp=%s', (msg ? msg + ' -- ' : ''), 'assertEquals', (_status ? 'ok' : 'err'), act, exp);
        this.collectOrOutputOrAbort(_msg, _status);
    },
    assertNotEquals: function (/** @type {any} */ act, /** @type {any} */ exp, /** @type {string} */ msg) {
        var _status = act !== exp;
        var _msg = sprintf('%s%s %s - act=%s, exp!=%s', (msg ? msg + ' -- ' : ''), 'assertNotEquals', (_status ? 'ok' : 'err'), act, exp);
        this.collectOrOutputOrAbort(_msg, _status);
    },
    assertTypeofEquals: function (/** @type {any} */ act, /** @type {string} */ exp, /** @type {string} */ msg) {
        var _status = typeof act === exp;
        var _msg = sprintf('%s%s %s - act=%s, exp=%s', (msg ? msg + ' -- ' : ''), 'assertTypeofEquals', (_status ? 'ok' : 'err'), typeof act, exp);
        this.collectOrOutputOrAbort(_msg, _status);
    },
    assertTypeofNotEquals: function (/** @type {any} */ act, /** @type {string} */ exp, /** @type {string} */ msg) {
        var _status = typeof act !== exp;
        var _msg = sprintf('%s%s %s - act=%s, exp!=%s', (msg ? msg + ' -- ' : ''), 'assertTypeofNotEquals', (_status ? 'ok' : 'err'), typeof act, exp);
        this.collectOrOutputOrAbort(_msg, _status);
    },

    run: function() {
        var test, i;
        this.$out('Suite: ' + this.name);
        for (i = 0; i < this.tests.length; i++) {
            test = this.tests[i];
            if (this.setup) this.setup();
            this.$out('Running: ' + test.name);
            try {
                test.tester.apply(this);
                this.$out('Test passed');
            } catch (e) {
                this.$out('Test failed: ' + e.message);
            }
            if (this.teardown) this.teardown();
            this.$out();
        }
    }
};


//
//
// SAMPLE TESTS
//
//
var mut = new MUT({
    name: 'Sample',
    abortOnErrors: true,
    autoFlush: true
});
mut.setSetup(function() {
    // DOpus.output('set up test environment');
});
mut.setTeardown(function() {
    // DOpus.output('teardown test environment');
});
mut.addTest('assertEquals() calls', function () {
    mut.assertEquals(undefined,                         undefined,                      'assertEquals undefined');
    mut.assertEquals(null,                              null,                           'assertEquals null');
    mut.assertEquals(0,                                 0,                              'assertEquals number');
    mut.assertEquals(true,                              true,                           'assertEquals boolean');
    mut.assertEquals([].length,                         [].length,                      'assertEquals null array lengths');
    mut.assertEquals(JSON.stringify({}),                JSON.stringify({}),             'assertEquals null object stringfied');
    mut.assertEquals(new Date(2024, 0, 1).getTime(),    new Date(2024, 0, 1).getTime(), 'assertEquals Date');
    mut.assertEquals(new RegExp(/ab+c/).toString(),     new RegExp(/ab+c/).toString(),  'assertEquals RegExp');
});
mut.addTest('assertNotEquals() calls', function () {
    mut.assertNotEquals(undefined,                      null,                           'assertNotEquals undefined');
    mut.assertNotEquals(null,                           undefined,                      'assertNotEquals null');
    mut.assertNotEquals(NaN,                            NaN,                            'assertNotEquals NaN'); // NaNs in JS are never equal
    mut.assertNotEquals(NaN,                            Infinity,                       'assertNotEquals NaN');
    mut.assertNotEquals(0,                              1,                              'assertNotEquals number');
    mut.assertNotEquals(true,                           false,                          'assertNotEquals boolean');
    mut.assertNotEquals('Hello',                        'World',                        'assertNotEquals string');
    mut.assertNotEquals([],                             [],                             'assertNotEquals null array');
    mut.assertNotEquals({},                             {},                             'assertNotEquals null object');
    mut.assertNotEquals([],                             [1],                            'assertNotEquals null array');
    mut.assertNotEquals({},                             { a: 1 },                       'assertNotEquals null object');
    mut.assertNotEquals(new Date(2024, 1, 2).getTime(), new Date(2024, 3, 4).getTime(), 'assertNotEquals Date');
    mut.assertNotEquals(new RegExp(/ab+c/).toString(),  new RegExp(/ab+c/i).toString(), 'assertNotEquals RegExp');
});
mut.addTest('assertTypeofEquals', function () {
    mut.assertTypeofEquals(undefined,                   'undefined',                    'assertTypeofEquals undefined');
    mut.assertTypeofEquals(null,                        'object',                       'assertTypeofEquals null');
    mut.assertTypeofEquals(NaN,                         'number',                       'assertTypeofEquals NaN');
    mut.assertTypeofEquals(Infinity,                    'number',                       'assertTypeofEquals NaN');
    mut.assertTypeofEquals(0,                           'number',                       'assertTypeofEquals number');
    mut.assertTypeofEquals(true,                        'boolean',                      'assertTypeofEquals boolean');
    mut.assertTypeofEquals('Hello',                     'string',                       'assertTypeofEquals string');
    mut.assertTypeofEquals([],                          'object',                       'assertTypeofEquals null array');
    mut.assertTypeofEquals({},                          'object',                       'assertTypeofEquals null object');
    mut.assertTypeofEquals(function() {},               'function',                     'assertTypeofEquals function');
});
mut.addTest('assertTypeofNotEquals', function() {
    mut.assertTypeofNotEquals(function () { }, 'boolean', 'assertTypeofNotEquals function');
    // mut.flush();
});

mut.addTest('Manual flush', function() {
    mut.autoFlush = false;
    mut.assertEquals(1, 1, 'number comparison');
    mut.assertNotEquals('Hello', 'hello', 'case-sensitive comparison');
    mut.assertTypeofEquals([], 'object', 'typeof array');
    // mut.flush();
});

mut.run();

// if you want to collect the messages first so you can filter them out with own logic
// set both autoFlush & skipSuccess to FALSE, and pass a null function as callback
// and do NOT call flush in any of the addTest() methods
// e.g.
var mut2 = new MUT({
    name: 'custom collect',
    abortOnErrors: true,
    autoFlush: false,
    skipSuccess: false,
    cbOut: function () { }
});
mut2.addTest('my test', function () {
    mut2.assertEquals(1, 1, 'my msg');
});
mut2.run();
DOpus.output('mut2 messages:\n' + JSON.stringify(mut2.getMessages(), null, 4));

// sprintf - copied from my other scripts
// sprintf - BEGIN
// https://hexmen.com/blog/2007/03/14/printf-sprintf/
{
    // from https://hexmen.com/js/sprintf.js
    /**
     * JavaScript printf/sprintf functions.
     *
     * This code is unrestricted: you are free to use it however you like.
     *
     * The functions should work as expected, performing left or right alignment,
     * truncating strings, outputting numbers with a required precision etc.
     *
     * For complex cases these functions follow the Perl implementations of
     * (s)printf, allowing arguments to be passed out-of-order, and to set
     * precision and output-length from other argument
     *
     * See http://perldoc.perl.org/functions/sprintf.html for more information.
     *
     * Implemented flags:
     *
     * - zero or space-padding (default: space)
     *     sprintf("%4d", 3) ->  "   3"
     *     sprintf("%04d", 3) -> "0003"
     *
     * - left and right-alignment (default: right)
     *     sprintf("%3s", "a") ->  "  a"
     *     sprintf("%-3s", "b") -> "b  "
     *
     * - out of order arguments (good for templates & message formats)
     *     sprintf("Estimate: %2$d units total: %1$.2f total", total, quantity)
     *
     * - binary, octal and hex prefixes (default: none)
     *     sprintf("%b", 13) ->    "1101"
     *     sprintf("%#b", 13) ->   "0b1101"
     *     sprintf("%#06x", 13) -> "0x000d"
     *
     * - positive number prefix (default: none)
     *     sprintf("%d", 3) -> "3"
     *     sprintf("%+d", 3) -> "+3"
     *     sprintf("% d", 3) -> " 3"
     *
     * - min/max width (with truncation); e.g. "%9.3s" and "%-9.3s"
     *     sprintf("%5s", "catfish") ->    "catfish"
     *     sprintf("%.5s", "catfish") ->   "catfi"
     *     sprintf("%5.3s", "catfish") ->  "  cat"
     *     sprintf("%-5.3s", "catfish") -> "cat  "
     *
     * - precision (see note below); e.g. "%.2f"
     *     sprintf("%.3f", 2.1) ->     "2.100"
     *     sprintf("%.3e", 2.1) ->     "2.100e+0"
     *     sprintf("%.3g", 2.1) ->     "2.10"
     *     sprintf("%.3p", 2.1) ->     "2.1"
     *     sprintf("%.3p", '2.100') -> "2.10"
     *
     * Deviations from perl spec:
     * - %n suppresses an argument
     * - %p and %P act like %g, but without over-claiming accuracy:
     *   Compare:
     *     sprintf("%.3g", "2.1") -> "2.10"
     *     sprintf("%.3p", "2.1") -> "2.1"
     *
     * @version 2011.09.23
     * @author Ash Searle
     */
    function sprintf() {
        function pad(str, len, chr, leftJustify) {
            var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str;

        }

        function justify(value, prefix, leftJustify, minWidth, zeroPad) {
            var diff = minWidth - value.length;
            if (diff > 0) {
                if (leftJustify || !zeroPad) {
                    value = pad(value, minWidth, ' ', leftJustify);
                } else {
                    value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
                }
            }
            return value;
        }

        var a = arguments, i = 0, format = a[i++];
        return format.replace(sprintf.regex, function (substring, valueIndex, flags, minWidth, _, precision, type) {
            if (substring == '%%') return '%';

            // parse flags
            var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false;
            for (var j = 0; flags && j < flags.length; j++) {
                switch (flags.charAt(j)) {
                case ' ': positivePrefix = ' '; break;
                case '+': positivePrefix = '+'; break;
                case '-': leftJustify = true; break;
                case '0': zeroPad = true; break;
                case '#': prefixBaseX = true; break;
                }
            }

            // parameters may be null, undefined, empty-string or real valued
            // we want to ignore null, undefined and empty-string values

            if (!minWidth) {
                minWidth = 0;
            } else if (minWidth == '*') {
                minWidth = +a[i++];
            } else if (minWidth.charAt(0) == '*') {
                minWidth = +a[minWidth.slice(1, -1)];
            } else {
                minWidth = +minWidth;
            }

            // Note: undocumented perl feature:
            if (minWidth < 0) {
                minWidth = -minWidth;
                leftJustify = true;
            }

            if (!isFinite(minWidth)) {
                throw new Error('sprintf (minimum-)width must be finite');
            }

            if (precision && precision.charAt(0) == '*') {
                precision = +a[(precision == '*') ? i++ : precision.slice(1, -1)];
                if (precision < 0) {
                    precision = null;
                }
            }

            if (precision == null) {
                precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void (0);
            } else {
                precision = +precision;
            }

            // grab value using valueIndex if required?
            var value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];
            var prefix, base;

            switch (type) {
            case 'c': value = String.fromCharCode(+value);
                // eslint-disable-next-line no-fallthrough
            case 's': {
            // If you'd rather treat nulls as empty-strings, uncomment next line:
            // if (value == null) return '';

                value = String(value);
                if (precision != null) {
                    value = value.slice(0, precision);
                }
                prefix = '';
                break;
            }
            case 'b': base = 2; break;
            case 'o': base = 8; break;
            case 'u': base = 10; break;
            case 'x': case 'X': base = 16; break;
            case 'i':
            case 'd': {
                var number = parseInt(value, 10);
                if (isNaN(number)) {
                    return '';
                }
                prefix = number < 0 ? '-' : positivePrefix;
                value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                break;
            }
            case 'e': case 'E':
            case 'f': case 'F':
            case 'g': case 'G':
            case 'p': case 'P':
            {
            // eslint-disable-next-line no-redeclare
                var number = +value;
                if (isNaN(number)) {
                    return '';
                }
                prefix = number < 0 ? '-' : positivePrefix;
                var method;
                if ('p' != type.toLowerCase()) {
                    method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                } else {
                // Count significant-figures, taking special-care of zeroes ('0' vs '0.00' etc.)
                    var sf = String(value).replace(/[eE].*|[^\d]/g, '');
                    var sf2 = (number ? sf.replace(/^0+/, '') : sf).length;
                    precision = precision ? Math.min(precision, sf2) : precision;
                    method = (!precision || precision <= sf2) ? 'toPrecision' : 'toExponential';
                }
                var number_str = Math.abs(number)[method](precision);
                // number_str = thousandSeparation ? thousand_separate(number_str): number_str;
                value = prefix + number_str;
                break;
            }
            case 'n': return '';
            default: return substring;
            }

            if (base) {
                // cast to non-negative integer:
                // eslint-disable-next-line no-redeclare
                var number = value >>> 0;
                prefix = prefixBaseX && base != 10 && number && ['0b', '0', '0x'][base >> 3] || '';
                value = prefix + pad(number.toString(base), precision || 0, '0', false);
            }
            var justified = justify(value, prefix, leftJustify, minWidth, zeroPad);
            return ('EFGPX'.indexOf(type) > -1) ? justified.toUpperCase() : justified;
        });
    }
    sprintf.regex = /%%|%(\d+\$)?([-+#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegpEGP])/g;
}
// sprintf - END
