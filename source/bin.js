// @ts-nocheck
/* eslint no-sync:0 */
'use strict'

const fsUtil = require('fs')
const pathUtil = require('path')
const getarg = require('get-cli-arg').default
const editions = require('editions')
const cwd = process.cwd()

function exists(path) {
	return path && fsUtil.existsSync(path)
}

function resolve(...paths) {
	for (const p of paths) if (!p) return ''
	const path = pathUtil.resolve(...paths)
	return path && exists(path) ? path : ''
}

function json(path) {
	return JSON.parse(fsUtil.readFileSync(path, 'utf8'))
}

function loader() {
	const pkgPath = resolve(cwd, 'package.json')
	if (!pkgPath)
		throw new Error(
			`${cwd} does not seem to be a valid plugin, it has no package.json file`
		)

	// use cli arg if provided
	const pkg = json(pkgPath)
	let directory = resolve(cwd, getarg('edition') || getarg('directory'))
	let entry = pkg.main

	// doesn't have editions, so use cwd as the directory
	if (!pkg.editions) {
		if (!directory) directory = cwd
	}
	// has editions, but none were provided, so detect which one to use
	else if (!directory) {
		const edition = editions.determineEdition(pkg.editions, {
			versions: process.versions,
		})
		directory = edition.directory
		entry = edition.entry
	}

	// discover code files
	const main = resolve(directory, entry)
	const test = resolve(directory, 'test' + pathUtil.extname(entry))
	const tester = resolve(directory, 'tester' + pathUtil.extname(entry))

	// custom test runner
	if (test) {
		console.log('Custom Plugin Test Runner:', test)
		return require(test)
	}

	// our test runner
	console.log('Plugin:', main)
	const PluginClass = require(main)

	// custom tester class
	if (tester) {
		console.log('Custom Plugin Tester Class:', tester)
		return require(tester).test({ PluginClass })
	}

	// Standard
	const standard = pathUtil.join(__dirname, 'index.js')
	console.log('Standard Plugin Test & Tester Class:', standard)
	return require(standard).test({ PluginClass })
}

module.exports = loader()
