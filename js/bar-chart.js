function generateRandomData(number) {
    maxValue = 300;
    ds = [];
    for (var i = 0; i < number; i++) {
        ds.push(Math.round(Math.random() * maxValue));
    }
    return ds;
}

dataset = generateRandomData(20);

w = 1000;
h = 300;
var svg = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

// Scale down data to pixels (padding may be applied here)
var xScale = d3.scaleBand() // Divides range into n bands, perfect for ordinal values
    .domain(d3.range(dataset.length))
    .rangeRound([0, w])
    .paddingInner(0.05)
    .paddingOuter(0.1);
var yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset)])
    .rangeRound([0, h]);

// Append and set general attributes
// Initially we work only on X, and put visualization on Y (bars will fall from sky)
svg.selectAll("rect")
    .data(dataset) // capture references to all bars
    .enter() // returns elements that do not yet exist
    .append("rect")
    .attr("fill", "yellowgreen")
	.attr("width", xScale.bandwidth())
	.attr("x", function(d, i) {
		return xScale(i);
	});

svg.selectAll("text")
    .data(dataset)
    .enter()
    .append("text")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .attr("text-anchor", "middle")
	.attr("x", function(d, i) {
		return xScale(i) + xScale.bandwidth() / 2;
	});

function updateX() {

	xScale.domain(d3.range(dataset.length));

	svg.selectAll("rect")
        .data(dataset) // work on all bars
        .transition()
        .duration(500)
        .attr("width", xScale.bandwidth())
        .attr("x", function(d, i) {
            return xScale(i);
        });

    svg.selectAll("text")
        .data(dataset)
        .transition()
        .duration(500)
        .attr("x", function(d, i) {
            return xScale(i) + xScale.bandwidth() / 2;
        });
}

function updateY() {

    yScale.domain([0, d3.max(dataset)]);

    svg.selectAll("rect")
        .data(dataset)
        .transition()
        .delay(function(d, i) {
            return i / dataset.length * 1000;
        })
        .duration(500)
        .ease(d3.easeCubic)
        .attr("y", function(d) { // change values, but not array length
            return h - yScale(d);
        })
        .attr("height", function(d) {
            return yScale(d);
        })
        .attr("opacity", function(d) {
            return yScale(d) / h;
        });

    svg.selectAll("text")
        .data(dataset)
        .transition()
        .delay(function(d, i) {
            return i / dataset.length * 1000;
        })
        .duration(500)
        .ease(d3.easeCubic)
        .text(function(d) {
            return d;
        })
        .attr("y", function(d) {
            return h - yScale(d) + 20;
        });
}

// We cannot put updateX() here as transitions are asynchronous
updateY(); // here comes visualization of Y

d3.select("#button-random").on("click", function() {
    dataset = generateRandomData(dataset.length);

    updateY();
});

d3.select("#button-add-bar").on("click", function() {
	var maxValue = 300;
    dataset.push(Math.round(Math.random() * maxValue));

    xScale.domain(d3.range(dataset.length));
    yScale.domain([0, d3.max(dataset)]);

    // Change attributes according to values in dataset
    svg.selectAll("rect")
        .data(dataset)
        .enter() // work on added bar only
        .append("rect")
        .attr("x", w) // put outside of svg for nice transition from outside
        .attr("width", xScale.bandwidth())
        .attr("fill", "yellowgreen")
        .attr("y", function(d) { // change values, but not array length
            return h - yScale(d);
        })
        .attr("height", function(d) {
            return yScale(d);
        })
        .attr("opacity", function(d) {
            return yScale(d) / h;
        });

    svg.selectAll("text")
        .data(dataset)
        .enter()
        .append("text")
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("x", w + xScale.bandwidth() / 2)
        .text(function(d) {
            return d;
        })
        .attr("y", function(d) {
            return h - yScale(d) + 20;
        });

	updateX();
});

d3.select("#button-remove-bar").on("click", function() {
	dataset.shift();

    svg.selectAll("rect")
        .data(dataset)
        .exit() // working with those which exits the dataset (analogy to enter)
		.transition()
        .duration(500)
        .attr("x", w)
        .remove();

    svg.selectAll("text")
        .data(dataset)
        .exit()
		.transition()
        .duration(500)
        .attr("x", w + xScale.bandwidth() / 2)
        .remove();

	updateX();
});
