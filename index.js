var labels = true; // show the text labels beside individual boxplots?

var margin = {top: 30, right: 50, bottom: 70, left: 50};
var  width = 800 - margin.left - margin.right;
var height = 400 - margin.top - margin.bottom;
	
function boxPlot(data, { id, title, benchName }) {

	var max = data.reduce((acc, dat) => Math.max(acc, dat[1].reduce((acc, num) => Math.max(acc, num), -Infinity
	)), -Infinity);
	var min = data.reduce((acc, dat) => Math.min(acc, dat[1].reduce((acc, num) => Math.min(acc, num), Infinity
	)), Infinity);

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
		.domain( data.map(function(d) { console.log(d); return d[0] } ) )
		.rangeRoundBands([0 , width], 0.7, 0.3);

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
		.attr("transform", function(d) { return "translate(" +  x(d[0])  + "," + margin.top + ")"; } )
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
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.style("font-size", "16px")
		.text("Runtime in ms");

	// draw x axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height  + margin.top + 10) + ")")
		.call(xAxis)
		.append("text")             // text label for the x axis
		.attr("x", (width / 2) )
		.attr("y",  10 )
		.attr("dy", ".71em")
		.style("text-anchor", "middle")
		.style("font-size", "16px")
		.text(benchName);
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

function createChartParentWithId(id) {
	var parent = document.createElement('div');
	parent.id = id;
	document.querySelector('#charts').appendChild(parent);
}

function preprocessJson(json) {
    json = copyJson(json);
    return json[Object.keys(json)[0]];
}

function guidGenerator() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function getSuiteData(json, suiteNames) {
    var suites = json.suites;
    var aspectRatios = suites
        .filter(suite => _.isEqual(suite.suite.slice(0, suiteNames.length), suiteNames))
        .map(suite => suite.title)
        //.filter(bench => bench.name !== 'Rewriting');

    var data = aspectRatios
        .map(ar => [ar.name, ar.results.slice(-30)]);

    return data;
}


function chartForSuite(benchmarkData, suiteNames) {
    var data = getSuiteData(benchmarkData, suiteNames);

    let chartId = 'chart' + guidGenerator();
    createChartParentWithId(chartId);
    boxPlot(data, {
        id: chartId,
        title: suiteNames.join(' - '),
        benchName: '-'
    });
}

function doChartsFromJson(json) {
	resetParent();

    var benchmarkData = preprocessJson(json);

    resetAndBuildInfo(benchmarkData);

    chartForSuite(benchmarkData, ['Maintain Aspect Ratio']);
    chartForSuite(benchmarkData, ['Partially Rewritten']);
    chartForSuite(benchmarkData, ['Partially Wrapped']);
    chartForSuite(benchmarkData, ['AExpr Construction', 'Different Object']);
    chartForSuite(benchmarkData, ['AExpr Construction', 'Same Object']);
    chartForSuite(benchmarkData, ['Rewriting Transformation Impact']);
}

d3.json("benchmarks/latest.json", doChartsFromJson);


/*
 * HISTORY
 */
let history = document.getElementById('history');

fetch('benchmarks/results')
	.then(resp => resp.text())
	.then(t => {
		let files = t.match(/[^\r\n]+/g);
		files.forEach(file => {
			let historyBox = document.createElement('div');
			historyBox.classList.add('tooltip');
			historyBox.setAttribute("data-tooltip", file);
			history.insertBefore(historyBox, history.firstChild);

			d3.json('benchmarks/history/' + file, json => {
				// update the square visially to reflect the fact that it is ready
				historyBox.classList.add('loaded');
				historyBox.onclick = () => doChartsFromJson(json);
			});
		});
	});
