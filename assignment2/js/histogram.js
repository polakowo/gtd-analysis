function loadHistogram() {

	// Make svg size scalable
	var svgW = $("#histogram")
		.width();
	var svgH = 0.5 * svgW;
	var margin = {
			left: 60,
			top: 20,
			right: 20,
			bottom: 40
		},
		width = svgW - margin.left - margin.right,
		height = svgH - margin.top - margin.bottom;

	// Define key function to maintain consistency between data and DOM
	var key = function(d) {
		return d.time;
	};

	// Setup X
	var xValue = function(d) {
		return d.time;
	};
	var xScale = d3.scaleBand() // Divides range into n bands, perfect for ordinal values
		.domain(d3.range(0, 24))
		.rangeRound([0, width])
		.paddingInner(0.1)
		.paddingOuter(1);
	var xMap = function(d) {
		return xScale(xValue(d));
	};
	var xAxis = d3.axisBottom(xScale)
		.ticks(5)
		.tickSize(10);

	// Setup Y
	var yValue = function(d) {
		return d.probability;
	};
	var yScale = d3.scaleLinear()
		.rangeRound([height, 0])
		.nice();
	var yMap = function(d) {
		return yScale(yValue(d));
	};
	var yAxis = d3.axisLeft(yScale)
		.ticks(5)
		.tickSize(10)
		.tickFormat(d3.format(".0%"));

	// Setup color
	var cScale = d3.scaleSequential()
		.domain([0, 24])
		.interpolator(d3.interpolateRainbow);
	var cMap = function(d) {
		return cScale(d.time);
	};

	// Setup opacity
	var oScale = d3.scaleLinear()
		.range([0, 0.7]);
	var oMap = function(d) {
		return oScale(yValue(d));
	};

	// Setup tooltip
	var tip = d3.tip()
		.attr("class", "d3-tip")
		.direction("ne")
		.html(function(d) {
			return "<span style='color:white'>" + d.total + " out of " + Math.round(d.total / d.probability) + "</span>";
		});

	// Append new svg element to DOM
	// Append g to svg which acts as an area where circles are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#histogram")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH)
		.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.call(tip);

	// Load data and populate histogram in callback (asynchronous call)
	d3.csv("crime_data/crime_time.csv", function(error, data) {
		// Prepare and group data by category
		grouped_data = {};
		data.forEach(function(d, i) {
			d.time = +d.time; // string to number
			d.total = +d.total;
			d.probability = +d.probability;
			var group = data[i].category;
			if (!grouped_data[group]) {
				grouped_data[group] = [];
			}
			grouped_data[group].push({
				time: data[i].time,
				total: data[i].total,
				probability: data[i].probability
			});
		});

		// Set initial data category
		init_category = 'Prostitution';
		dataset = grouped_data[init_category];

		// We must update scale before creating axis
		yScale.domain([0, d3.max(dataset, yValue)]);
		oScale.domain([0, d3.max(dataset, yValue)]);

		// Append x-axis element
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
		// Append text to svg, not axis
		svg.append("text")
			.attr("x", width)
			.attr("y", height + margin.bottom)
			.attr("text-anchor", "end")
			.attr("font-size", "12px")
			.attr("font-style", "italic")
			.text("TIME");

		// Append y-axis element
		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis);
		svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", -margin.left)
			.attr("dy", ".71em")
			.attr("text-anchor", "end")
			.attr("font-size", "12px")
			.attr("font-style", "italic")
			.text("PROBABILITY");

		// // Add the Y gridlines
		var yGridAxis = d3.axisLeft(yScale)
			.ticks(5)
			.tickSize(-width)
			.tickFormat("");
		svg.append("g")
			.attr("class", "y grid")
			.call(yGridAxis);

		// Create and populate bars
		svg.selectAll("rect")
			.data(dataset, key) // capture references to all bars
			.enter() // returns elements that do not yet exist
			.append("rect")
			.attr("width", xScale.bandwidth())
			.attr("x", xMap)
			.attr("fill", cMap)
			.on("mouseover", function(d) {
				// Increase visibility of focus rect
				d3.select(this)
					.attr("opacity", 1);
				tip.show(d);
			})
			.on("mouseout", function(d) {
				// Restore original values
				d3.select(this)
					.attr("opacity", oMap);
				tip.hide(d);
			});

		// Update bars when user changes the dataset (and one time initially)
		function updateBars() {
			yScale.domain([0, d3.max(dataset, yValue)]);
			oScale.domain([0, d3.max(dataset, yValue)]);

			// Apply new yScale on y-axis and y-grid with animation
			svg.selectAll(".y.axis")
				.transition()
				.duration(1000)
				.call(yAxis);
			svg.selectAll(".y.grid")
				.transition()
				.duration(1000)
				.call(yGridAxis);

			svg.selectAll("rect")
				.data(dataset, key)
				.transition()
				.delay(function(d, i) {
					return i / dataset.length * 500;
				})
				.duration(1000)
				.ease(d3.easeCubic)
				.attr("y", yMap)
				.attr("height", function(d) {
					return height - yMap(d);
				})
				.attr("opacity", oMap);
		}

		updateBars();

		// Handle category selection
		d3.select("#dropdownMenuButton")
			.text(init_category);
		d3.select("#category-dropdown")
			.selectAll("a")
			.data(Object.keys(grouped_data).sort())
			.enter()
			.append("button")
			.classed("dropdown-item", true)
			.text(function(d) {
				return d;
			})
			.on("click", function(d) {
				dataset = grouped_data[d];

				updateBars();

				d3.select("#dropdownMenuButton")
					.text(d);
			});
	});
}
