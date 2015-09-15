var async = require('async');

var benchmark = function(name) {
	this.name = name;
	this.data = {};

	// speichert die einzelnen Testfunktionen
	this.data.tests = [];
};

/**
 * Fügt eine neue Testfunktion hinzu.
 * 
 * @param name	String	der Name des Tests
 * @param fn	Function	wird aufgerufen, um den Test durchzuführen
 *							fn(callback)
 * @return this
 */
benchmark.prototype.add = function(name, fn) {
	this.data.tests.push({name: name, run: fn});
	return this;
};

/**
 * Führt jeden hinterlegten Test einmalig aus.
 *
 * @param callback	Function	wird aufgerufen, wenn alle Tests einmalig ausgeführt wurden
 *								callback(err, result)
 */
benchmark.prototype.test = function(callback) {
	var results = [];

	// gehe durch jeden Test
	async.eachSeries(this.data.tests, function(test, next) {
		var result = {startedAt: -1, endedAt: -1, duration: -1, name: test.name};
		result.startedAt = Date.now();

		// führe Test aus
		test.run(function(err) {
			if (err) return next(err);

			// speichere Ergebnis
			result.endedAt = Date.now();
			result.duration = result.endedAt - result.startedAt;
			results.push(result);
			next();
		});
	}, function(err) {
		if (err) return callback(err);

		callback(false, results);
	});
};

/**
 * Führt den Test aus.
 *
 * @param cycles	Integer	die Anzahl der Runden
 * @param callback	Function	wird aufgerufen, wenn alle Tests durchgeführt wurden, oder ein Fehler aufgetreten ist
 * 								callback(err, results)
 */
benchmark.prototype.run = function(cycles, callback) {
	var round = 0;
	var results = [];

	async.whilst(function() {return round < cycles;}, function(next) {
		++round;

		// Beginne, Zeit zu stoppen
		var time = Date.now();

		// führe Tests aus
		this.test(function(err, result) {
			if (err) return next(err);

			results.push(result);
			next();
		});
	}.bind(this), function(err) {
		if (err) return callback(err);

		callback(false, new benchmark.Result(results));
	}.bind(this));
};

/**
 * Ein Testergebnis.
 */
benchmark.Result = function(results) {
	this.results = results;

	// ermittle die Anzahl der Cycles
	this.cycles = this.results.length;

	// ermittle die Gesamtdauer
	this.startedAt = this.results[0][0].startedAt;
	this.endedAt = this.results[this.results.length-1][this.results[this.results.length-1].length-1].endedAt;
	this.duration = this.endedAt - this.startedAt;

	// ermittle die Durchschnittsdauer
	this.averageDuration = this.duration / this.cycles;

	// ermittle die Durchschnittsdauer der einzelnen Tests
	this.tests = {};
	for (var i = 0; i < this.results[0].length; ++i) {
		var name = this.results[0][i].name;
		var total = 0;
		var durations = [];
		var shortest = -1;
		var longest = -1;
		for (var j = 0; j < this.results.length; ++j) {
			var duration = this.results[j][i].duration;
			total += duration;
			durations.push(duration);

			if (shortest < 0 || shortest > duration) shortest = duration;
			if (longest < 0 || longest < duration) longest = duration;
		}

		this.tests[name] = {
			cycles: this.cycles,
			duration: total,
			average: total/this.cycles,
			durations: durations,
			shortest: shortest,
			longest: longest
		};
	};
};

/**
 * Stellt die Benchmarking-Ergebnisse dar.
 */
benchmark.Result.prototype.toString = function() {
	var text = '';

	// gebe eine grobe Übersicht
	text += 'Finished '+this.cycles+' Testcycles within '+this.duration+'ms.\n';
	text += '-------\n';

	// gebe Ergebnisse der einzelnen Tests aus
	tests = this.tests;
	//tests.sort(function(t1, t2) {return t1.average - t2.average;});
	for (var name in tests) {
		var test = tests[name];

		text += name+' took ~'+test.average+'ms (between '+test.shortest+'ms and '+test.longest+'ms)\n';
	}

	return text;
}

module.exports = benchmark;