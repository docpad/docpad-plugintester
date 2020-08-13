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

function resolve(paths = [], extensions = []) {
	for (const p of paths) if (!p) return ''
	const path = pathUtil.resolve(...paths)
	if (path && exists(path)) return path
	for (const extension of extensions) {
		const p = path + '.' + extension
		if (exists(p)) return p
	}
	return ''
}

function json(path) {
	return JSON.parse(fsUtil.readFileSync(path, 'utf8'))
}

function loader() {
	const pkgPath = resolve([cwd, 'package.json'])
	if (!pkgPath)
		throw new Error(
			`${cwd} does not seem to be a valid plugin, it has no package.json file`
		)

	// use cli args if provided
	const pkg = json(pkgPath)
	const dir = getarg('directory')
	let directory = resolve([cwd, dir])
	let entry = getarg('entry') || pkg.main
	entry = entry.replace(pathUtil.extname(entry), '')
	if (dir) entry = entry.replace(dir + pathUtil.sep, '')

	// doesn't have editions, so use cwd as the directory
	if (!pkg.editions) {
		if (!directory) directory = cwd
	}
	// has editions, but none were provided, so detect which one to use
	else if (!directory) {
		const ed = getarg('edition')
		const edition = ed
			? /* manual */ pkg.editions.find((e) => (e.directory = ed))
			: /* auto */ editions.determineEdition(pkg.editions, {
					versions: process.versions,
			  })
		directory = edition.directory
		entry = edition.entry.replace(pathUtil.extname(edition.entry), '')
	}

	// discover code files
	const main = resolve([directory, entry], ['js', 'cjs', 'mjs'])
	const test = resolve([directory, 'test'], ['js', 'cjs', 'mjs'])
	const tester = resolve([directory, 'tester'], ['js', 'cjs', 'mjs'])

	// custom test runner
	if (test) {
		console.log('Custom Plugin Test Runner:', test)
		return require(test)
	}

	// our test runner
	if (!main) {
		console.dir([directory, entry])
		throw new Error(`Unable to resolve the main entry`)
	}
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
