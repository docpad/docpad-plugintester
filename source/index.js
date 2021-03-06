// @ts-nocheck
'use strict'

// Standard
const pathUtil = require('path')

// External
const kava = require('kava')
const { equal, deepEqual } = require('assert-helpers')
const balUtil = require('bal-util')
const { difference } = require('underscore')
const safefs = require('safefs')

// Variables
let pluginPort = 2000 + parseInt(String(Date.now()).substr(-6, 4), 10)
const removeWhitespaceRegex = /\s+/g // remove all whitespace and lines
const trimRegex = /^\s+|\s+$/g // removes start and end whitespace and lines
const removeLineRegex = /\n+/g // removes lines

/**
 * @typedef {Object} TesterConfig
 * @description This is configuration used by our tester instance
 * @property {DocPad} DocPad the DocPad class
 * @property {string} pluginPath the path to the plugin directory
 * @property {string} [testerName] the name of the test suite
 * @property {string} [pluginName] the name of the plugin, without `docpad-plugin-`, e.g. partials
 * @property {BasePlugin} [PluginClass] the preloaded class of the plugin to use, otherwise is loaded automatically
 * @property {string} [testPath] directory path of the test site
 * @property {string} [outExpectedPath] (for the render test) this is directory path of the expected output
 * @property {false|'remove'|'trim'} [whitespace='trim'] if false, no whitespace alterations, if remove, removes all whitespace, if trim, removes whitespace from start and end of lines and removes empty lines
 * @property {RegExp} [contentRemoveRegex] a regex to apply to output comparisons
 * @property {string} [autoExit='safe'] how should the plugin tests shutdown
 */

/**
 * @typedef {TesterConfig} ExtendedTesterConfig
 * @property {DocPad} [DocPad] defaults to `require('docpad')`
 * @property {string} [pluginPath] defaults to `process.cwd()`
 * @property {PluginTester} [TesterClass=PluginTester] the tester class to call `.test()` on
 */

/**
 * @typedef {Object} DocPadConfig
 * @description This is configuration that will be forwarded to DocPad
 * @property {boolean} [global=true]
 * @property {number} [port]
 * @property {number} [logLevel] 7 if debugging, otherwise 5
 * @property {string} [rootPath]
 * @property {string} [outPath]
 * @property {string} [srcPath]
 * @property {Array<string>} [pluginPaths]
 * @property {boolean} [catchExceptions=false]
 * @property {string} [environment]
 */

/**
 * The Plugin Tester class
 * @class
 * @constructor
 * @param {TesterConfig} config
 * @param {DocPadConfig} [docpadConfig]
 */
class PluginTester {
	constructor(config = {}, docpadConfig = {}) {
		/**
		 * The DocPad instance
		 * @private
		 * @type {DocPad}
		 */
		this.docpad = null

		/**
		 * Default plugin config
		 * @type {TesterConfig}
		 */
		this.config = {
			DocPad: null,
			testerName: null,
			pluginName: null,
			pluginPath: null,
			PluginClass: null,
			testPath: null,
			outExpectedPath: null,
			whitespace: 'trim',
			contentRemoveRegex: null,
			autoExit: 'safe',
			...config,
		}

		// Ensure plugin name
		if (!this.config.pluginName) {
			this.config.pluginName = pathUtil
				.basename(this.config.pluginPath)
				.replace('docpad-plugin-', '')
		}

		// Ensure tester name
		if (!this.config.testerName) {
			this.config.testerName = `${this.config.pluginName} plugin`
		}

		// Prepare test paths
		if (!this.config.testPath) {
			this.config.testPath = pathUtil.join(this.config.pluginPath, 'test')
		}
		if (!this.config.outExpectedPath) {
			this.config.outExpectedPath = pathUtil.join(
				this.config.testPath,
				'out-expected'
			)
		}

		/**
		 * Default DocPad config
		 * @type {DocPadConfig}
		 */
		this.docpadConfig = {
			global: true,
			port: ++pluginPort,
			logLevel:
				process.argv.includes('-d') || process.argv.includes('--debug') ? 7 : 5,
			rootPath: null,
			outPath: null,
			srcPath: null,
			pluginPaths: null,
			catchExceptions: false,
			environment: null,
			...docpadConfig,
		}

		// Extend DocPad Configuration
		if (!this.docpadConfig.rootPath) {
			this.docpadConfig.rootPath = this.config.testPath
		}
		if (!this.docpadConfig.outPath) {
			this.docpadConfig.outPath = pathUtil.join(
				this.docpadConfig.rootPath,
				'out'
			)
		}
		if (!this.docpadConfig.srcPath) {
			this.docpadConfig.srcPath = pathUtil.join(
				this.docpadConfig.rootPath,
				'src'
			)
		}
	}

	/**
	 * Get tester Configuration
	 * @return {TesterConfig}
	 */
	getConfig() {
		return this.config
	}

	/**
	 * Get the plugin instance
	 * @return {BasePlugin} the plugin instance
	 */
	getPlugin() {
		return this.docpad.getPlugin(this.getConfig().pluginName)
	}

	/**
	 * Test creating DocPad instance with the plugin
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testInit() {
		// Prepare
		const tester = this
		const { DocPad, pluginPath, pluginName, PluginClass } = this.config

		// Prepare plugin options
		const pluginOpts = {
			pluginPath,
			pluginName,
			PluginClass,
		}

		// Prepare docpad configuration
		const docpadConfig = this.docpadConfig
		docpadConfig.events = docpadConfig.events || {}

		// Create Instance
		this.suite('init', function (suite, test) {
			// create docpad and load the plugin
			test('create', function (done) {
				// Prepare
				docpadConfig.events.loadPlugins = function ({ plugins }) {
					console.log('Adding the plugin with the configuration:', pluginOpts)
					plugins.add(pluginOpts)
				}

				// Create
				console.log('Creating DocPad with the configuration:', docpadConfig)
				tester.docpad = new DocPad(docpadConfig, done)
			})

			// clean up the docpad out directory
			test('clean', function (done) {
				tester.docpad.action('clean', done)
			})

			// install anything on the website that needs to be installed
			test('install', function (done) {
				tester.docpad.action('install', done)
			})
		})

		// Chain
		return this
	}

	/**
	 * Test generation
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testGenerate() {
		// Prepare
		const tester = this
		const {
			outExpectedPath,
			removeWhitespace,
			whitespace,
			contentRemoveRegex,
		} = this.config
		const { outPath } = this.docpadConfig

		// Test
		this.suite('generate', function (suite, test) {
			// action
			test('action', function (done) {
				tester.docpad.action('generate', function (err) {
					return done(err)
				})
			})

			suite('results', function (suite, test, done) {
				safefs.exists(outExpectedPath, function (exists) {
					if (!exists) {
						console.warn(
							`skipping results comparison, as outExpectedPath:[${outExpectedPath}] doesn't exist`
						)
						return done()
					}

					// Get actual results
					balUtil.scanlist(outPath, function (err, outResults) {
						if (err) return done(err)

						// Get expected results
						balUtil.scanlist(outExpectedPath, function (
							err,
							outExpectedResults
						) {
							if (err) return done(err)

							// Prepare
							const outResultsKeys = Object.keys(outResults)
							const outExpectedResultsKeys = Object.keys(outExpectedResults)

							// Check we have the same files
							test('same files', function () {
								const outDifferenceKeysA = difference(
									outExpectedResultsKeys,
									outResultsKeys
								)
								deepEqual(
									outDifferenceKeysA,
									[],
									'The following file(s) should have been generated'
								)
								const outDifferenceKeysB = difference(
									outResultsKeys,
									outExpectedResultsKeys
								)
								deepEqual(
									outDifferenceKeysB,
									[],
									'The following file(s) should not have been generated'
								)
							})

							// Check the contents of those files match
							outResultsKeys.forEach(function (key) {
								test(`same file content for: ${key}`, function () {
									// Fetch file value
									let actual = outResults[key]
									let expected = outExpectedResults[key]
									let message = 'content comparison'

									// Remove all whitespace
									if (whitespace === 'remove' || removeWhitespace) {
										message += ' with whitespace removed'
										actual = actual.replace(removeWhitespaceRegex, '')
										expected = expected.replace(removeWhitespaceRegex, '')
									}

									// Trim whitespace from the start and end of each line, and remove empty lines
									else if (whitespace === 'trim') {
										message += ' with whitespace trimmed'
										actual = actual
											.split('\n')
											.map((i) => i.replace(trimRegex, ''))
											.join('\n')
											.replace(removeLineRegex, '\n')
											.replace(trimRegex, '')
										expected = expected
											.split('\n')
											.map((i) => i.replace(trimRegex, ''))
											.join('\n')
											.replace(removeLineRegex, '\n')
											.replace(trimRegex, '')
									}

									// Content regex
									if (contentRemoveRegex) {
										message += ' with content regex applied'
										actual = actual.replace(contentRemoveRegex, '')
										expected = expected.replace(contentRemoveRegex, '')
									}

									// Compare
									equal(actual, expected, message)
								})
							})
							done() // complete suite results
						}) // scanlist
					}) // scanlist
				}) // exists
			}) // start suite results
		}) // suite generate

		// Chain
		return this
	}

	/**
	 * Test custom
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testCustom() {
		return this
	}

	/**
	 * Test everything
	 * @returns {PluginTester} this
	 * @chainable
	 */
	test() {
		const tester = this
		const { testerName } = this.config

		// Create the test suite for the plugin
		kava.suite(testerName, function (suite, test) {
			tester.suite = suite
			tester.test = test
			// ignore chaining in case custom extension forgot to chain
			tester.testInit()
			tester.testGenerate()
			tester.testCustom()
			tester.finish()
		})
	}

	/**
	 * Finish
	 * @returns {PluginTester} this
	 * @chainable
	 */
	finish() {
		const tester = this
		const { autoExit } = this.config
		if (autoExit) {
			this.test('finish up', function (next) {
				tester.docpad.action('destroy', next)
			})
		}
		return this
	}

	/**
	 * Run the tester with the specific configuration
	 * @static
	 * @param {ExtendedTesterConfig} [testerConfig]
	 * @param {DocPadConfig} [docpadConfig]
	 * @returns {PluginTester} the created instance
	 */
	static test(testerConfig = {}, docpadConfig = {}) {
		// Notify about testerPath deprecation
		if (testerConfig.testerPath) {
			throw new Error(
				'The testerPath property has been removed in favour of the TesterClass property.\n' +
					'The resolution may be as easy as replacing it with:\n' +
					`TesterClass: require('./${testerConfig.testerPath}')\n` +
					'For more details refer to: https://github.com/docpad/docpad-plugintester'
			)
		}
		if (testerConfig.testerClass) {
			console.warn(
				'The testerClass property is no longer required, and will not be used.\n' +
					'For more details refer to: https://github.com/docpad/docpad-plugintester'
			)
			delete testerConfig.testerClass
		}

		// Ensure and resolve pluginPath
		testerConfig.pluginPath = pathUtil.resolve(
			testerConfig.pluginPath || process.cwd()
		)

		// Ensure DocPad class
		if (!testerConfig.DocPad) {
			try {
				// handle npm install cases
				testerConfig.DocPad = require('docpad')
			} catch (err) {
				// handle npm link cases
				testerConfig.DocPad = require(pathUtil.resolve(
					testerConfig.pluginPath,
					'node_modules',
					'docpad'
				))
			}
		}

		// Ensure testerClass
		const TesterClass = testerConfig.TesterClass || this

		// Create our tester and run its tests
		new TesterClass(testerConfig, docpadConfig).test()

		// Return this, so that we can do .test().test().test()
		return this
	}
}

module.exports = PluginTester
