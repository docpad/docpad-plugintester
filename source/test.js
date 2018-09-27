'use strict'

const joe = require('joe')

joe.suite('plugintester', function (suite, test) {
	test('require', function () {
		require('./')
	})
})
