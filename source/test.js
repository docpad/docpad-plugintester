'use strict'

const kava = require('kava')

kava.suite('plugintester', function (suite, test) {
	test('require', function () {
		require('./')
	})
})
