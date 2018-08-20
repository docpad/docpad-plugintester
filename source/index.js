'use strict'

// Standard
const pathUtil = require('path')
const assert = require('assert')

// External
const extendr = require('extendr')
const joe = require('joe')

// Variables
let pluginPort = 2000 + parseInt(String(Date.now()).substr(-6, 4), 10)

/**
 * @typedef {Object} TesterConfig
 * @description This is configuration used by our tester instance
 * @property {DocPad} [DocPad] the DocPad class, defaults to `require('docpad')`
 * @property {string} [testerName]
 * @property {string} [pluginName]
 * @property {string} [pluginPath]
 * @property {string} [testPath]
 * @property {string} [outExpectedPath]
 * @property {boolean} [removeWhitespace=false]
 * @property {RegExp} [contentRemoveRegex]
 * @property {string} [autoExit='safe']
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
 * @param {Object} [config={}]
 * @param {Object} [docpadConfig={}]
 * @param {Function} next
 */
class PluginTester {
	constructor (config = {}, docpadConfig = {}, next) {
		const tester = this

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
			testerName: `${config.pluginName} plugin`,
			pluginName: null,
			pluginPath: null,
			testPath: null,
			outExpectedPath: null,
			removeWhitespace: false,
			contentRemoveRegex: null,
			autoExit: 'safe'
		}, config)

		// Add paths
		if (!this.config.testPath) {
			this.config.testPath = pathUtil.join(this.config.pluginPath, 'test')
		}
		if (!this.config.outExpectedPath) {
			this.config.outExpectedPath = pathUtil.join(this.config.testPath, 'out-expected')
		}

		// Ensure DocPad
		if (!this.config.DocPad) {
			this.config.DocPad = require('docpad')
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

		// Test API
		joe.describe(this.config.testerName, function (suite, task) {
			tester.describe = tester.suite = suite
			tester.it = tester.test = task
			tester.done = tester.exit = function (next) {
				tester.docpad.action('destroy', next)
			}
			if (next) {
				next(null, tester)
			}
		})
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
		const docpadConfig = this.docpadConfig
		const DocPad = this.testerConfig.DocPad

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

		// Test
		this.config(`load plugin ${tester.config.pluginName}`, function (done) {
			tester.docpad.loadedPlugin(tester.config.pluginName, function (err, loaded) {
				if (err) return done(err)
				assert.ok(loaded)
				done()
			})
		})

		// Chain
		return this
	}

	/**
	 * Test the server
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testServer () {
		// @todo move this cond into its own docpad-servertester class and package
		const tester = this

		// Handle
		this.test('server', function (done) {
			tester.docpad.action('server', function (err) {
				return done(err)
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

		// Test
		this.test('generate', function (done) {
			tester.docpad.action('generate', function (err) {
				return done(err)
			})
		})

		// Chain
		return this
	}

	/**
	 * Test everything
	 * @returns {PluginTester} this
	 * @chainable
	 */
	testEverything () {
		this.testCreate().testLoad().testGenerate().testServer()
		if (this.testCustom) {
			this.testCustom()
		}
		this.finish()
		return this
	}

	/**
	 * Finish
	 * @returns {PluginTester} this
	 * @chainable
	 */
	finish () {
		const tester = this
		if (tester.config.autoExit) {
			this.test('finish up', function (next) {
				tester.exit(next)
			})
		}
		return this
	}

	/**
	 * Run the tester with the specific configuration
	 * @static
	 * @param {TesterConfig} testerConfig
	 * @param {DocPadConfig} docpadConfig
	 * @returns {PluginTester} the created instance
	 */
	static test (testerConfig, docpadConfig) {
		// Resolve plugin path
		testerConfig.pluginPath = pathUtil.resolve(testerConfig.pluginPath)

		// Ensure plugin name
		if (!testerConfig.pluginName) {
			testerConfig.pluginName = pathUtil.basename(testerConfig.pluginPath).replace('docpad-plugin-', '')
		}

		// Ensure tester path
		if (!testerConfig.testerPath) {
			testerConfig.testerPath = pathUtil.join('out', `${testerConfig.pluginName}.tester.js`)
		}

		// Resolve tester path if set
		// and resolve testerClass
		if (testerConfig.testerPath) {
			testerConfig.testerPath = pathUtil.resolve(testerConfig.pluginPath, testerConfig.testerPath)
			testerConfig.testerClass = require(testerConfig.testerPath)
		}
		else if (typeof testerConfig.testerClass === 'string') {
			switch (testerConfig.testerClass.toLowerCase()) {
				case 'plugin':
				case 'plugintester':
				case 'server':
				case 'servertester': // @todo abstract out
					testerConfig.testerClass = PluginTester
					break

				case 'render':
				case 'renderer':
				case 'rendertester':
				case 'renderertester':
					testerConfig.testerClass = require('docpad-rendertester')
					break

				default:
					throw new Error(`Unknown tester class: ${testerConfig.testerClass}`)
			}
		}
		else if (!testerConfig.testerClass) {
			testerConfig.testerClass = PluginTester
		}

		// Create our tester and run its tests
		/* eslint new-cap:0 */
		const tester = new testerConfig.testerClass(testerConfig, docpadConfig, function (err, tester) {
			if (err) throw err
			tester.testEverything()
		})

		// Return the create tester instance
		return tester
	}
}

module.exports = PluginTester
