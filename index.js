var labels = true; // show the text labels beside individual boxplots?

function boxPlot(data, {
	id,
	title,
	benchName,
	min= data.reduce((acc, dat) => Math.min(acc, dat[1].reduce((acc, num) => Math.min(acc, num), Infinity
	)), Infinity),
	max = data.reduce((acc, dat) => Math.max(acc, dat[1].reduce((acc, num) => Math.max(acc, num), -Infinity
	)), -Infinity),
	margin = {top: 30, right: 50, bottom: 70, left: 60},
	width = 800 - margin.left - margin.right,
	height = 400 - margin.top - margin.bottom,
	yAxisText = "Execution Time in ms",
	numberOfElementsPerChunk = 0,
	yTickCount = 4
}) {
	var chart = d3.box()
		.whiskers(iqr(1.5))
		.height(height)
		.domain([min, max])
		.showLabels(labels);

	var svg = d3.select('#' + id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.attr("class", "box")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// the x-axis
	var x = d3.scale.ordinal()
		.domain(data.map(d => d[0]))
		.rangeRoundBands([0, width], 0.7, 0.3);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

	// the y-axis
	var y = d3.scale.linear()
		.domain([min, max])
		.range([height + margin.top, 0 + margin.top]);

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left");

	// draw the boxplots
	svg.selectAll(".box")
		.data(data)
		.enter().append("g")
		.attr("transform", function (d) {
			return "translate(" + x(d[0]) + "," + margin.top + ")";
		})
		.call(chart.width(x.rangeBand()));


	// add a title
	svg.append("text")
		.attr("x", (width / 2))
		.attr("y", 0 + (margin.top / 2))
		.attr("text-anchor", "middle")
		.style("font-size", "18px")
		//.style("text-decoration", "underline")
		.text(title);

	// draw y axis
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text") // and text1
		.attr("transform", "rotate(-90)")
		.attr("x", -height / 2)
		.attr("y", -55)
		.attr("dy", ".71em")
		.style("text-anchor", "middle")
		.style("font-size", "16px")
		.text(yAxisText);

	var xAxisOffset = 10;
	var xAxisPosition = height + margin.top + xAxisOffset;
	// draw x axis
	var xxxAxis = svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + xAxisPosition + ")")
		.call(xAxis);
	/*    xxxAxis.selectAll("text")
	 .attr("y", 0)
	 .attr("x", -7)
	 .attr("dy", ".35em")
	 .attr("transform", "rotate(-90)")
	 .style("text-anchor", "end");
	 */
	xxxAxis.append("text")             // text label for the x axis
		.attr("x", (width / 2))
		.attr("y", 20)
		.attr("dy", ".71em")
		.style("text-anchor", "middle")
		.style("font-size", "16px")
		.text(benchName);

	// separator
	if(numberOfElementsPerChunk > 0) {
		function make_x_axis() {
			return d3.svg.axis()
				.scale(x)
				.orient("bottom");
		}

		svg.append("g")
			.attr("class", "separator")
			.attr("transform", `translate(${(x.range()[1] - x.range()[0]) * numberOfElementsPerChunk / 2}, ${xAxisPosition}), scale(${numberOfElementsPerChunk},1)`)
			.call(make_x_axis()
				.tickSize(-(height + xAxisOffset), 0, 0)
				.tickFormat("")
			);
	}

	function make_y_axis() {
		return d3.svg.axis()
			.scale(y)
			.orient("left")
			.ticks(yTickCount)
	}

	// horizontal lines
    svg.append("g")
        .attr("class", "tickLines")
        .call(make_y_axis()
            .tickSize(-width, 0, 0)
            .tickFormat("")
        );
}

// Returns a function to compute the interquartile range.
function iqr(k) {
  return function(d, i) {
    var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
    while (d[++i] < q1 - iqr);
    while (d[--j] > q3 + iqr);
    return [i, j];
  };
}

function copyJson(json) {
	return JSON.parse(JSON.stringify(json));
}

function resetAndBuildInfo(data) {
	let infoParent = document.querySelector('#info');
	infoParent.innerHTML = `<ul>
    <li><b>Browser:</b> ${data.browser}</li>
    <li><b>Runtime:</b> ${data.test.runtime}</li>
    <li><b>Tests:</b> ${data.test.tests} (${data.test.errors}, ${data.test.failed}, ${data.test.skipped})</li>
</ul>`;
}

function resetParent() {
	let chartParent = document.querySelector('#charts');
	chartParent.innerHTML = '';
}

function guidGenerator() {
	var S4 = function() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function createChartParentAndReturnId() {
	let id = 'chart' + guidGenerator();
	var parent = document.createElement('div');
	parent.id = id;
	document.querySelector('#charts').appendChild(parent);

	return id;
}

function preprocessJson(json) {
    json = copyJson(json);
    return json[Object.keys(json)[0]];
}

function getSuiteData(json, suiteNames) {
    var suites = json.suites;
    var aspectRatios = suites
        .filter(suite => _.isEqual(suite.suite.slice(0, suiteNames.length), suiteNames))
        .map(suite => suite.title);
        //.filter(bench => bench.name !== 'Rewriting');

    var data = aspectRatios
        .map(ar => [ar.name, ar.results.slice(-30)]);

    return data;
}


function chartForSuite(benchmarkData, suiteNames) {
    var data = getSuiteData(benchmarkData, suiteNames);

	//_.isEqual(suite.suite.slice(0, suiteNames.length), suiteNames)

    boxPlot(data, {
        id: createChartParentAndReturnId(),
        title: suiteNames.join(' - '),
        benchName: '-',
		min: data.reduce((acc, dat) => Math.min(acc, dat[1].reduce((acc, num) => Math.min(acc, num), Infinity
		)), Infinity),
		max: data.reduce((acc, dat) => Math.max(acc, dat[1].reduce((acc, num) => Math.max(acc, num), -Infinity
		)), -Infinity)
    });
}

function minMaxThenCreateChart() {

}

function AEXPR_CONSTRUCTION_CHART(benchmarkData) {
	let dataDiff = getSuiteData(benchmarkData, ['AExpr Construction', 'Different Object']),
		dataSame = getSuiteData(benchmarkData, ['AExpr Construction', 'Same Object']);

	// medians, etc.
	let tickingDiff = dataDiff.find(dat => dat[0] === 'Ticking');
	let interpretationDiff = dataDiff.find(dat => dat[0] === 'Interpretation');
	let rewritingDiff = dataDiff.find(dat => dat[0] === 'Rewriting');
	let tickingSame = dataSame.find(dat => dat[0] === 'Ticking');
	let interpretationSame = dataSame.find(dat => dat[0] === 'Interpretation');
	let rewritingSame = dataSame.find(dat => dat[0] === 'Rewriting');

	let medianParent = document.getElementById(createChartParentAndReturnId());
	medianParent.innerHTML = `
<p>AExpr Construction (create 1000 aexprs example):</p>
<ul> timing [ms]
  <li>ticking (same object): ${printMedian(tickingSame)}</li>
  <li>interpretation (same object): ${printMedian(interpretationSame)}</li>
  <li>rewriting (same object): ${printMedian(rewritingSame)}</li>
  <li>ticking (different objects): ${printMedian(tickingDiff)}</li>
  <li>interpretation (different objects): ${printMedian(interpretationDiff)}</li>
  <li>rewriting (different objects): ${printMedian(rewritingDiff)}</li>
</ul>
<ul> Relative Slowdown (different Objects vs same Object)
  <li>ticking: ${printRelativeSlowdown(tickingDiff, tickingSame)}</li>
  <li>interpretation: ${printRelativeSlowdown(interpretationDiff, interpretationSame)}</li>
  <li>rewriting: ${printRelativeSlowdown(rewritingDiff, rewritingSame)}</li>
</ul>
<ul> Relative Slowdown (vs ticking)
  <li>interpretation (same object): ${printRelativeSlowdown(interpretationSame, tickingSame)}</li>
  <li>interpretation (different objects): ${printRelativeSlowdown(interpretationDiff, tickingDiff)}</li>
  <li>rewriting (same object): ${printRelativeSlowdown(rewritingSame, tickingSame)}</li>
  <li>rewriting (different objects): ${printRelativeSlowdown(rewritingDiff, tickingDiff)}</li>
</ul>
`;

	// charts:
	dataDiff.forEach(dat => dat[0] += '\n'+'Different Object');
	dataSame.forEach(dat => dat[0] += '\n'+'Same Object');

	function tickingOrRewriting(dat) {
		return dat[0].startsWith('Rewriting') ||dat[0].startsWith('Ticking');
	}
	function interpretation(dat) {
		return !tickingOrRewriting(dat);
	}
	let tickingAndRewritingData = dataDiff.filter(tickingOrRewriting)
		.concat(dataSame.filter(tickingOrRewriting));
	tickingAndRewritingData.sort();
	let interpretationData = dataDiff.filter(interpretation)
		.concat(dataSame.filter(interpretation));
	interpretationData.sort();

	let tickingAndRewritingMin = tickingAndRewritingData.reduce((acc, dat) => Math.min(acc, dat[1].reduce((acc, num) => Math.min(acc, num), Infinity)), Infinity);
	let tickingAndRewritingMax = tickingAndRewritingData.reduce((acc, dat) => Math.max(acc, dat[1].reduce((acc, num) => Math.max(acc, num), -Infinity)), -Infinity);
	let interpretationMin = interpretationData.reduce((acc, dat) => Math.min(acc, dat[1].reduce((acc, num) => Math.min(acc, num), Infinity)), Infinity);
	let interpretationMax = interpretationData.reduce((acc, dat) => Math.max(acc, dat[1].reduce((acc, num) => Math.max(acc, num), -Infinity)), -Infinity);
	const scale = 100;
	tickingAndRewritingMin = Math.min(tickingAndRewritingMin, interpretationMin / scale);
	tickingAndRewritingMax = Math.max(tickingAndRewritingMax, interpretationMax / scale);
	interpretationMin = Math.min(tickingAndRewritingMin * scale, interpretationMin);
	interpretationMax = Math.max(tickingAndRewritingMax * scale, interpretationMax);

	let margin = {top: 30, right: 50, bottom: 70, left: 60},
		width = 600 - margin.left - margin.right,
		height = 400 - margin.top - margin.bottom;
	boxPlot(tickingAndRewritingData, {
		id: createChartParentAndReturnId(),
		title: 'AExpr Construction (create 1000 AExprs)',
		benchName: '-',
		min: 0,//tickingAndRewritingMin,
		max: 10,//tickingAndRewritingMax,
		margin,
		width,
		height,
		numberOfElementsPerChunk: 2
	});

	let margin2 = {top: 30, right: 50, bottom: 70, left: 60},
		width2 = 400 - margin2.left - margin2.right,
		height2 = 400 - margin2.top - margin2.bottom;
	boxPlot(interpretationData, {
		id: createChartParentAndReturnId(),
		title: 'AExpr Construction (create 1000 AExprs)',
		benchName: '-',
		min: 0,//interpretationMin,
		max: 1000,//interpretationMax,
		margin: margin2,
		width: width2,
		height: height2,
		numberOfElementsPerChunk: 2
	});
}

function ratioWithConfidenceIntervals(a, b) {

	const sampleSize = 30;
	function randomSample(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	function getMedianOfRandomSample(arr) {
		var randomValues = [];
		for(let i = 0; i < sampleSize; i++) {
			randomValues.push(randomSample(arr));
		}
		return d3.median(randomValues);
	}

	function getRatioFromRandomSample(arr1, arr2) {
		return getMedianOfRandomSample(arr1) / getMedianOfRandomSample(arr2);
	}

	const medianRatios = [];
	for(let i = 0; i < 10000; i++) {
		medianRatios.push(getRatioFromRandomSample(a, b));
	}

	medianRatios.sort();
	return {
		ratio: d3.median(a) / d3.median(b),
		lowerBound: d3.quantile(medianRatios, 0.025),
		upperBound: d3.quantile(medianRatios, 0.975)
	}
}

function printMedian(benchData) {
	const exactMedian = d3.median(benchData[1]);
	return exactMedian.toFixed(2);
}

function printRelativeSlowdown(benchData, referenceData) {
	const digits = 2,
		info = ratioWithConfidenceIntervals(benchData[1], referenceData[1]);
	return `${info.ratio.toFixed(digits)} [${info.lowerBound.toFixed(digits)} - ${info.upperBound.toFixed(digits)}]`;
}

function AEXPR_UPDATE_CHART(benchmarkData) {
	benchmarkData = copyJson(benchmarkData);

	let data = getSuiteData(benchmarkData, ['Maintain Aspect Ratio']);
	let baseline = data.find(dat => dat[0] === 'Baseline');
	let baselineMedian = d3.median(baseline[1]);

	// calculate medians and confidence intervals
	let tickingData = data.find(dat => dat[0] === 'Ticking');
	let interpretationData = data.find(dat => dat[0] === 'Interpretation');
	let rewritingData = data.find(dat => dat[0] === 'Rewriting');

	// show medians and confidence intervals
	let medianParent = document.getElementById(createChartParentAndReturnId());
	medianParent.innerHTML = `
<p>AExpr update (maintain aspectRatio example):</p>
<ul> timing [ms]
  <li>baseline: ${printMedian(baseline)}</li>
  <li>ticking: ${printMedian(tickingData)}</li>
  <li>interpretation: ${printMedian(interpretationData)}</li>
  <li>rewriting: ${printMedian(rewritingData)}</li>
</ul>
<ul> Relative Slowdown (vs baseline)
  <li>ticking: ${printRelativeSlowdown(tickingData, baseline)}</li>
  <li>interpretation: ${printRelativeSlowdown(interpretationData, baseline)}</li>
  <li>rewriting: ${printRelativeSlowdown(rewritingData, baseline)}</li>
</ul>
`;

	// normalize data
	data.forEach(dat => {
		dat[1] = dat[1].map(val => val / baselineMedian);
	});

	boxPlot(data, {
		id: createChartParentAndReturnId(),
		title: 'AExpr Update (Normalized to baseline)',
		benchName: 'Implementation Strategy',
		yAxisText: 'Normalized Execution Time (Baseline = 1.0)'
	});
}

function INTERPRETATION_VS_REWRITING(benchmarkData) {
	benchmarkData = copyJson(benchmarkData);

	let rewritingData = getSuiteData(benchmarkData, ['AExpr and Callback Count (Rewriting)']);
	let interpretationData = getSuiteData(benchmarkData, ['AExpr and Callback Count (Interpretation)']);


	// show medians and confidence intervals
	let medianParent = document.getElementById(createChartParentAndReturnId());
	medianParent.innerHTML = `
<p>Rewriting vs Interpretation (varying #aexpr, 10 callbacks each):</p>
 <table>
  <tr>
    <th>Size</th>
    <th colspan="2">timing [ms]</th>
    <th>relative slowdown</th>
  </tr>
  <tr>
    <th></th>
    <th>rewriting</th>
    <th>interpretation</th>
    <th>rewriting vs interpretation</th>
  </tr>
${rewritingData.map(rewritingDat => {
		let name = rewritingDat[0];
		let interpretationDat = interpretationData.find(dat => dat[0] === name);

		return `<tr>
    <td>${name}</td>
    <td>${printMedian(rewritingDat)}</td>
    <td>${printMedian(interpretationDat)}</td>
    <td>${printRelativeSlowdown(rewritingDat, interpretationDat)}</td>
  </tr>`;
	}).join('')}
</table>
`;

	// normalize data
	let data = [];
	interpretationData.forEach(interpretationDat => {
		let name = interpretationDat[0];
		let median = d3.median(interpretationDat[1]);
		let rewritingDat = rewritingData.find(dat => dat[0] === name);

		interpretationDat[0] += 'interpret';
		interpretationDat[1] = interpretationDat[1].map(val => val / median);
		rewritingDat[0] += 'rewrite';
		rewritingDat[1] = rewritingDat[1].map(val => val / median);

		data.push(interpretationDat, rewritingDat);
	});

	boxPlot(data.slice(-2*6), {
		id: createChartParentAndReturnId(),
		title: 'Rewriting vs Interpretation (Normalized to Interpretation)',
		benchName: 'Benchmark Size / Implementation Strategy',
		yAxisText: 'Normalized Execution Time (Interpretation = 1.0)',
		min:0,
		max:3,
		numberOfElementsPerChunk: 2
	});
}

function REWRITING_IMPACT(benchmarkData) {
	benchmarkData = copyJson(benchmarkData);

	let data = getSuiteData(benchmarkData, ['Rewriting Transformation Impact']),
		baselineDat = data.find(dat => dat[0] === 'Baseline'),
		rewritingDat = data.find(dat => dat[0] === 'Rewriting'),
		baselineMedian = d3.median(baselineDat[1]);

	// show medians and confidence intervals
	let medianParent = document.getElementById(createChartParentAndReturnId());
	medianParent.innerHTML = `
<p>Rewriting Transformation Impact (sorting a 10000 element array using quicksort)</p>
<ul> timing [ms]
  <li>Baseline: ${printMedian(baselineDat)}</li>
  <li>Rewriting: ${printMedian(rewritingDat)}</li>
Slowdown (Rewriting vs Baseline): ${printRelativeSlowdown(rewritingDat, baselineDat)}
</ul>
`;

	// normalize data
	data.forEach(dat => {
		dat[1] = dat[1].map(val => val / baselineMedian);
	});

	boxPlot(data, {
		id: createChartParentAndReturnId(),
		title: 'Rewriting Impact',
		benchName: 'Implementation Strategy',
		yAxisText: 'Normalized Execution Time (Baseline = 1.0)'
	});
}

function withIgnoreErrors(cb) {
    try {
        cb();
    } catch (e) {
        console.error(e);
    }
}

function doChartsFromJson(json) {
	resetParent();

    var benchmarkData = preprocessJson(json);

    resetAndBuildInfo(benchmarkData);

	withIgnoreErrors(() => {
		INTERPRETATION_VS_REWRITING(benchmarkData);
		chartForSuite(benchmarkData, ['AExpr and Callback Count (Rewriting)']);
		chartForSuite(benchmarkData, ['AExpr and Callback Count (Interpretation)']);
	});
	withIgnoreErrors(() => {
		REWRITING_IMPACT(benchmarkData);
		chartForSuite(benchmarkData, ['Rewriting Transformation Impact']);
	});
    withIgnoreErrors(() => {
        AEXPR_CONSTRUCTION_CHART(benchmarkData);
        chartForSuite(benchmarkData, ['AExpr Construction', 'Different Object']);
        chartForSuite(benchmarkData, ['AExpr Construction', 'Same Object']);
    });
    withIgnoreErrors(() => {
        AEXPR_UPDATE_CHART(benchmarkData);
        chartForSuite(benchmarkData, ['Maintain Aspect Ratio']);
    });
    chartForSuite(benchmarkData, ['Partially Rewritten']);
    chartForSuite(benchmarkData, ['Partially Wrapped']);
}

/*
 * HISTORY
 */
function createHistory(label = 'unknown history') {
	let history = document.createElement('div');
	history.innerHTML = label;
	document.body.insertBefore(history, document.getElementById('info'));
	history.classList.add('history');
	history.classList.add('clearfix');

	return history;
}

function createHistoryBox(tooltip = 'bench', parent) {
	let historyBox = document.createElement('div');
	historyBox.classList.add('tooltip');
	historyBox.setAttribute("data-tooltip", tooltip);
	parent.insertBefore(historyBox, parent.firstChild);

	return historyBox;
}

function initializeHistoryBox(historyBox) {
    return (error, json) => {
        // update the square visually to reflect the fact that it is ready
        if(!error) {
            historyBox.classList.add('loaded');
            historyBox.onclick = () => doChartsFromJson(json);
        } else {
            historyBox.classList.add('failed');
        }
    };
}

d3.json("benchmarks/latest.json", doChartsFromJson);

// Benchmarks for paper: Active Expressions as basic Building Block for Reactive Mechanisms
function paperBenchmark(label, directory) {
	let history = createHistory(label);
	function historyBoxFor(fileName) {
		let filePath = `benchmarks/paper_aeabbbfrm/${directory}/${fileName}`;
		let historyBox = createHistoryBox(fileName, history);

		d3.json(filePath, initializeHistoryBox(historyBox));
	}

	for(let i = 1; i <= 100; i++) {
		historyBoxFor(`run${i}.json`);
	}
	historyBoxFor('result.json');
}

function paperOverviewBenchmark() {
	let history = createHistory('Paper Benchmark (Overview)');
	let filePath = `benchmarks/paper_aeabbbfrm/overview.json`;
	let historyBox = createHistoryBox('overview.json', history);

	d3.json(filePath, initializeHistoryBox(historyBox));
}

paperOverviewBenchmark();
paperBenchmark('AExpr Construction', 'construction');
paperBenchmark('AExpr Update', 'update');
paperBenchmark('Rewriting Impact', 'rewriting_impact');
paperBenchmark('Rewriting vs Interpretation', 'rewriting_vs_interpretation');

// Travis Build History
fetch('benchmarks/results')
	.then(resp => resp.text())
	.then(t => {
		let history = createHistory('Travis Builds');
		let files = t.match(/[^\r\n]+/g);
		files.forEach(file => {
			let historyBox = createHistoryBox(file, history);

			d3.json('benchmarks/history/' + file, initializeHistoryBox(historyBox));
		});
	});
