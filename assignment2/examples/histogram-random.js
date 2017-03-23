// DO NOT FORGET PUTTING var BEFORE DECLARING VARIABLE, ELSE GLOBAL!!!

function loadHistogram() {
	var maxValue = 300;
	function generateRandomData(number) {
	    var ds = [];
		for (var i = 0; i < number; i++) {
			ds.push({
	            key: i,
	            value: Math.round(Math.random() * maxValue)
	        });
		}
	    return ds;
	}

	var numberOfBars = 20;
	var dataset = generateRandomData(numberOfBars);

	var w = 800;
	var h = 300;
	var svg = d3.select("#histogram")
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
	    .domain([0, d3.max(dataset, function(d) {
	        return d.value;
	    })])
	    .rangeRound([0, h]);

	var key = function(d) { // key function to bind data
	    return d.key;
	};

	// Append and set general attributes
	// Initially we work only on X, and put visualization on Y (bars will fall from sky)
	svg.selectAll("rect")
	    .data(dataset, key) // capture references to all bars
	    .enter() // returns elements that do not yet exist
	    .append("rect")
	    .attr("fill", "orange")
	    .attr("width", xScale.bandwidth())
	    .attr("x", function(d, i) {
	        return xScale(i);
	    });

	svg.selectAll("text")
	    .data(dataset, key)
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
	        .data(dataset, key) // work on all bars
	        .transition()
			.duration(500)
	        .attr("width", xScale.bandwidth())
	        .attr("x", function(d, i) {
	            return xScale(i);
	        });

	    svg.selectAll("text")
	        .data(dataset, key)
	        .transition()
			.duration(500)
	        .attr("x", function(d, i) {
	            return xScale(i) + xScale.bandwidth() / 2;
	        });
	}

	function updateY() {

	    yScale.domain([0, d3.max(dataset, function(d) {
	        return d.value;
	    })]);

	    svg.selectAll("rect")
	        .data(dataset, key)
	        .transition()
	        .delay(function(d, i) {
	            return i / dataset.length * 500;
	        })
	        .duration(500)
	        .ease(d3.easeCubic)
	        .attr("y", function(d) { // change values, but not array length
	            return h - yScale(d.value);
	        })
	        .attr("height", function(d) {
	            return yScale(d.value);
	        });

	    svg.selectAll("text")
	        .data(dataset, key)
	        .transition()
	        .delay(function(d, i) {
	            return i / dataset.length * 500;
	        })
	        .duration(500)
	        .ease(d3.easeCubic)
	        .text(function(d) {
	            return d.value;
	        })
	        .attr("y", function(d) {
	            return h - yScale(d.value) + 20;
	        });
	}

	// We cannot put updateX() here as transitions are asynchronous
	updateY(); // here comes visualization of Y

	d3.select("#histogram-randomize").on("click", function() {
		for (var i = 0; i < dataset.length; i++) {
			dataset[i].value = Math.round(Math.random() * maxValue);
		}

	    updateY();
	});

	d3.select("#histogram-add").on("click", function() {
	    var maxValue = 300;
	    dataset.push({
	        key: d3.max(dataset, function(d) {
	            return d.key;
	        }) + 1,
	        value: Math.round(Math.random() * maxValue)
	    });

	    xScale.domain(d3.range(dataset.length));
	    yScale.domain([0, d3.max(dataset, function(d) {
	        return d.value;
	    })]);

	    // Change attributes according to values in dataset
	    svg.selectAll("rect")
	        .data(dataset, key)
	        .enter() // work on added bar only
	        .append("rect")
	        .attr("x", w) // put outside of svg for nice transition from outside
	        .attr("width", xScale.bandwidth())
	        .attr("fill", "orange")
	        .attr("y", function(d) { // change values, but not array length
	            return h - yScale(d.value);
	        })
	        .attr("height", function(d) {
	            return yScale(d.value);
	        });

	    svg.selectAll("text")
	        .data(dataset, key)
	        .enter()
	        .append("text")
	        .attr("font-family", "sans-serif")
	        .attr("font-size", "10px")
	        .attr("font-weight", "bold")
	        .attr("fill", "white")
	        .attr("text-anchor", "middle")
	        .attr("x", w + xScale.bandwidth() / 2)
	        .text(function(d) {
	            return d.value;
	        })
	        .attr("y", function(d) {
	            return h - yScale(d.value) + 20;
	        });

	    updateX();
	});

	d3.select("#histogram-remove").on("click", function() {
	    dataset.shift();

	    svg.selectAll("rect")
	        .data(dataset, key)
	        .exit() // working with those which exits the dataset (analogy to enter)
	        .transition()
	        .duration(500)
	        .attr("x", -xScale.bandwidth())
	        .remove();

	    svg.selectAll("text")
	        .data(dataset, key)
	        .exit()
	        .transition()
	        .duration(500)
	        .attr("x", -xScale.bandwidth() + xScale.bandwidth() / 2)
	        .remove();

	    updateX();
	});
}
