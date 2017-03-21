

dataset = generateRandomData();

w = 1000;
h = 500;
var svg = d3.select("#scatter-chart")
	.append("svg")
	.attr("width", w)
	.attr("height", h);

// Padding left, top, right, bottom
var padding = 40;

var clipPath = svg.append("clipPath")
    .attr("id", "chart-area")
    .append("rect")
    .attr("x", padding)
    .attr("y", padding)
    .attr("width", w - padding * 2)
    .attr("height", h - padding * 2);

var circles = svg.append("g")
   .attr("id", "circles")
   .attr("clip-path", "url(#chart-area)") // we could append clip-path attribute to every cicle, but with g its easier
   .selectAll("circle")
   .data(dataset)
   .enter()
   .append("circle");

var xg = svg.append("g")
	.attr("transform", "translate(0," + (h - padding) + ")"); // first argument is x, second y
var yg = svg.append("g")
	.attr("transform", "translate(" + padding + ",0)");

function updateChart() {

	xMax = d3.max(dataset, function(d) {
		return d[0];
	});
	yMax = d3.max(dataset, function(d) {
		return d[1];
	});

	var xScale = d3.scaleLinear()
		.domain([0, xMax])
		.rangeRound([padding, w - padding]);
	var yScale = d3.scaleLinear()
		.domain([0, yMax])
		.rangeRound([h - padding, padding]); // Reverse the scale for y (good for Axis creation, else reversed ticks order)
	var rScale = d3.scaleLinear()
		.domain([0, xMax + yMax])
		.rangeRound([0, 10]);

	circles.data(dataset)
        .transition()
		.duration(1000)
		.ease(d3.easeCubic)
        .on("start", function() {
            d3.select(this)
                .attr("fill", "magenta");
            // we could place this call before transition, but then it may be ignored
        })
		.attr("cx", function(d) {
			return xScale(d[0]);
		})
		.attr("cy", function(d) {
			return yScale(d[1]);
		})
		.attr("r", function(d) {
			return 2 + rScale(d[0] + d[1]);
		})
        .on("end", function() {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("fill", "purple");
        });

	var xAxis = d3.axisBottom(xScale);
	xg.transition()
		.duration(1000)
		.call(xAxis);
	var yAxis = d3.axisLeft(yScale);
	yg.transition()
		.duration(1000)
		.call(yAxis);
}

d3.select("#scatter-chart-randomize").on("click", function() {
	dataset = updateData();

	updateChart();
});

updateChart();
