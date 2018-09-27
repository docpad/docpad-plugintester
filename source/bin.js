/* eslint no-sync:0 */
'use strict'

const pathUtil = require('path')
const cwd = process.cwd()

// Prepare
function load (edition = null) {
	// Test
	const testPath = edition && pathUtil.join(cwd, edition, 'test')
	if (testPath) {
		try {
			console.log('Loading custom DocPad Plugin tests via', testPath)
			return require(testPath)
		}
		catch (err) { }
	}

	// Plugin
	const pluginClassPath = (edition && pathUtil.join(cwd, edition, 'index')) || cwd
	let PluginClass = null
	try {
		PluginClass = require(pluginClassPath)
	}
	catch (err) { }

	// Tester
	const testerPath = edition && pathUtil.join(cwd, edition, 'tester')
	if (testerPath) {
		try {
			console.log('Loading custom DocPad Plugin tests via', testerPath)
			return require(testerPath).test({ PluginClass })
		}
		catch (err) { }
	}

	// Standard
	console.log('Loading standard DocPad Plugin tests via', __dirname)
	module.exports = require('./').test({ PluginClass })
}

// Fetch the edition
let edition = null
for (const value of process.argv) {
	const v = value.replace(/^--edition=/, '')
	if (v !== value) {
		edition = v
		break
	}
}

// Run
load(edition)
