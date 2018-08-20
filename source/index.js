'use strict'

// Standard
const pathUtil = require('path')
const assert = require('assert')

// External
const extendr = require('extendr')
const joe = require('joe')
const { equal, deepEqual } = require('assert-helpers')
const balUtil = require('bal-util')
const { difference } = require('underscore')
const safefs = require('safefs')

// Variables
let pluginPort = 2000 + parseInt(String(Date.now()).substr(-6, 4), 10)

/**
 * @typedef {Object} TesterConfig
 * @description This is configuration used by our tester instance
 * @property {DocPad} DocPad the DocPad class
 * @property {string} pluginPath the path to the plugin
 * @property {string} [testerName] the name of the test suite
 * @property {string} [pluginName] the name of the plugin, without `docpad-plugin-`, e.g. partials
 * @property {string} [testPath] directory path of the test site
 * @property {string} [outExpectedPath] (for the render test) this is directory path of the expected output
 * @property {boolean} [removeWhitespace=false] whether or not to trim whitespace from output comparisons
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
 * @property {boolean} [enableUnlistedPlugins=true]
 * @property {Object<string, boolean>} [enabledPlugins]
 * @property {boolean} [skipUnsupportedPlugins=false]
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
	constructor (config = {}, docpadConfig = {}) {
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
		this.config = extendr.deep({
			DocPad: null,
			testerName: null,
			pluginName: null,
			pluginPath: null,
			testPath: null,
			outExpectedPath: null,
			removeWhitespace: false,
			contentRemoveRegex: null,
			autoExit: 'safe'
		}, config)

		// Ensure plugin name
		if (!this.config.pluginName) {
			this.config.pluginName = pathUtil.basename(this.config.pluginPath).replace('docpad-plugin-', '')
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
			this.config.outExpectedPath = pathUtil.join(this.config.testPath, 'out-expected')
		}

		/**
		 * Default DocPad config
		 * @type {DocPadConfig}
		 */
		this.docpadConfig = extendr.deep({
			global: true,
			port: ++pluginPort,
			logLevel: process.argv.indexOf('-d') !== -1 ? 7 : 5,
			rootPath: null,
			outPath: null,
			srcPath: null,
			pluginPaths: null,
			enableUnlistedPlugins: true,
			enabledPlugins: null,
			skipUnsupportedPlugins: false,
			catchExceptions: false,
			environment: null
		}, docpadConfig)

		// Extend DocPad Configuration
		if (!this.docpadConfig.rootPath) {
			this.docpadConfig.rootPath = this.config.testPath
		}
		if (!this.docpadConfig.outPath) {
			this.docpadConfig.outPath = pathUtil.join(this.docpadConfig.rootPath, 'out')
		}
		if (!this.docpadConfig.srcPath) {
			this.docpadConfig.srcPath = pathUtil.join(this.docpadConfig.rootPath, 'src')
		}
		if (!this.docpadConfig.pluginPaths) {
			this.docpadConfig.pluginPaths = [this.config.pluginPath]
		}
		if (!this.docpadConfig.enabledPlugins) {
			const defaultEnabledPlugins = {}
			defaultEnabledPlugins[this.config.pluginName] = true
			this.docpadConfig.enabledPlugins = defaultEnabledPlugins
		}
	}

	/**
	 * Get tester Configuration
	 * @return {TesterConfig}
	 */
	getConfig () {
		return this.config
	}

	/**
	 * Get the plugin instance
	 * @return {BasePlugin} the plugin instance
	 */
	getPlugin () {
		return this.docpad.getPlugin(
			this.getConfig().pluginName
		)
	}

	/**
	 * Test creating DocPad instance with the plugin
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testCreate () {
		// Prepare
		const tester = this
		const { DocPad } = this.config
		const docpadConfig = this.docpadConfig

		// Create Instance
		this.test('create', function (done) {
			tester.docpad = new DocPad(docpadConfig, function (err, docpad) {
				if (err) return done(err)
				tester.docpad = docpad

				// init docpad in case the plugin is starting from scratch
				tester.docpad.action('init', function (err) {
					if (err && err.message !== tester.docpad.getLocale().skeletonExists) {
						// care about the error providing it isn't the skeleton exists error
						return done(err)
					}

					// clean up the docpad out directory
					tester.docpad.action('clean', function (err) {
						if (err) return done(err)

						// install anything on the website that needs to be installed
						tester.docpad.action('install', done)
					})
				})
			})
		})

		// Chain
		return this
	}

	/**
	 * Test loading the plugin
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testLoad () {
		// Prepare
		const tester = this
		const { pluginName } = this.config

		// Test
		this.test(`load plugin ${pluginName}`, function (done) {
			tester.docpad.loadedPlugin(pluginName, function (err, loaded) {
				if (err) return done(err)
				assert.ok(loaded)
				done()
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
	testGenerate () {
		// Prepare
		const tester = this
		const { outExpectedPath, removeWhitespace, contentRemoveRegex } = this.config
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
						console.log(`skipping results comparison, as outExpectedPath:[${outExpectedPath}] doesn't exist`)
						return done()
					}

					// Get actual results
					balUtil.scanlist(outPath, function (err, outResults) {
						if (err) return done(err)

						// Get expected results
						balUtil.scanlist(outExpectedPath, function (err, outExpectedResults) {
							if (err) return done(err)

							// Prepare
							const outResultsKeys = Object.keys(outResults)
							const outExpectedResultsKeys = Object.keys(outExpectedResults)

							// Check we have the same files
							test('same files', function () {
								const outDifferenceKeysA = difference(outExpectedResultsKeys, outResultsKeys)
								deepEqual(outDifferenceKeysA, [], 'The following file(s) should have been generated')
								const outDifferenceKeysB = difference(outResultsKeys, outExpectedResultsKeys)
								deepEqual(outDifferenceKeysB, [], 'The following file(s) should not have been generated')
							})

							// Check the contents of those files match
							outResultsKeys.forEach(function (key) {
								test(`same file content for: ${key}`, function () {
									// Fetch file value
									let actual = outResults[key]
									let expected = outExpectedResults[key]

									// Remove empty lines
									if (removeWhitespace === true) {
										const replaceLinesRegex = /\s+/g
										actual = actual.replace(replaceLinesRegex, '')
										expected = expected.replace(replaceLinesRegex, '')
									}

									// Content regex
									if (contentRemoveRegex) {
										actual = actual.replace(contentRemoveRegex, '')
										expected = expected.replace(contentRemoveRegex, '')
									}

									// Compare
									equal(actual, expected)
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
	testCustom () {
		return this
	}

	/**
	 * Test everything
	 * @returns {PluginTester} this
	 * @chainable
	 */
	test () {
		const tester = this
		const { testerName } = this.config
		joe.suite(testerName, function (suite, test) {
			tester.suite = suite
			tester.test = test
			tester.testCreate().testLoad().testGenerate().testCustom().finish()
		})
	}

	/**
	 * Finish
	 * @returns {PluginTester} this
	 * @chainable
	 */
	finish () {
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
	static test (testerConfig = {}, docpadConfig = {}) {
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
			console.log(
				'The testerClass property is no longer required, and will not be used.\n' +
				'For more details refer to: https://github.com/docpad/docpad-plugintester'
			)
			delete testerConfig.testerClass
		}

		// Ensure and resolve pluginPath
		testerConfig.pluginPath = pathUtil.resolve(testerConfig.pluginPath || process.cwd())

		// Ensure DocPad class
		if (!testerConfig.DocPad) {
			try {
				// handle npm install cases
				testerConfig.DocPad = require('docpad')
			}
			catch (err) {
				// handle npm link cases
				testerConfig.DocPad = require(
					pathUtil.resolve(testerConfig.pluginPath, 'node_modules', 'docpad')
				)
			}
		}

		// Ensure testerClass
		const TesterClass = testerConfig.TesterClass || PluginTester

		// Create our tester and run its tests
		new TesterClass(testerConfig, docpadConfig).test()

		// Return this, so that we can do .test().test().test()
		return this
	}
}

module.exports = PluginTester
