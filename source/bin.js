'use strict'

// Ensure that there is a joe reporter available
if (!process.env.JOE_REPORTER && process.argv.join('').indexOf('--joe-reporter') === -1) {
	process.env.JOE_REPORTER = 'console'
}

// Run the tests
module.exports = require('./').test()
