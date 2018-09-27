/* eslint no-sync:0 */
'use strict'

const fsUtil = require('fs')
const pathUtil = require('path')
const cwd = process.cwd()

function exists (path) {
	return path && fsUtil.existsSync(path)
}

// Prepare
function load (edition = null) {
	// Test
	const testPath = edition && pathUtil.join(cwd, edition, 'test')
	if (exists(testPath)) {
		console.log('Loading custom DocPad Plugin tests via', testPath)
		return require(testPath)
	}

	// Plugin
	const pluginClassPath = (edition && pathUtil.join(cwd, edition, 'index')) || cwd
	const PluginClass = exists(pluginClassPath) ? require(pluginClassPath) : null

	// Tester
	const testerPath = edition && pathUtil.join(cwd, edition, 'tester')
	if (exists(testerPath)) {
		console.log('Loading custom DocPad Plugin tests via', testerPath)
		return require(testerPath).test({ PluginClass })
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
