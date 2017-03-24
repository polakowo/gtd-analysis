function loadScatterplot() {

	// First we set things not bounded to data

	// Make svg size scalable
	var svgW = $("#scatterplot")
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
		return d.district;
	};

	// Setup X
	var xValue = function(d) {
		return d.prostitution;
	};
	var xScale = d3.scaleLinear()
		.rangeRound([0, width]);
	var xMap = function(d) {
		return xScale(xValue(d));
	};
	var xAxis = d3.axisBottom(xScale)
		.ticks(5)
		.tickSize(10);

	// Setup Y
	var yValue = function(d) {
		return d.vehicleTheft;
	};
	var yScale = d3.scaleLinear()
		.rangeRound([height, 0]);
	var yMap = function(d) {
		return yScale(yValue(d));
	};
	var yAxis = d3.axisLeft(yScale)
		.ticks(5)
		.tickSize(10);

	// Setup radius
	var rScale = d3.scaleSqrt()
		.rangeRound([5, 50]);
	var rMap = function(d) {
		return rScale(d.total);
	};

	// Setup color
	var cScale = d3.scaleOrdinal(d3.schemeCategory10);
	var cMap = function(d) {
		return d3.color(cScale(d.district));
	};

	// Setup tooltip
	var tip = d3.tip()
		.attr("class", "d3-tip")
		.direction("ne")
		.html(function(d) {
			return "<span style='color:" + cMap(d).brighter(0.5) + "'>SF " + d.district + "</span> <span style='color:white'>(" + d.prostitution + ", " + d.vehicleTheft + ")</span>";
		});

	// Append new svg element to DOM
	// Append g to svg which acts as an area where circles are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#scatterplot")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH)
		.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.call(tip);

	// Load both datasets (keep in mind: each fetch is asynchronous, so we need callbacks)
	d3.csv("crime_data/crime_2013.csv", function(error, crime_2013) {
		d3.csv("crime_data/crime_2015.csv", function(error, crime_2015) {

			// Change string (from CSV) into number format
			changeFormat = function(data) {
				data.forEach(function(d) {
					d.prostitution = +d.prostitution;
					d.vehicleTheft = +d.vehicleTheft;
					d.total = +d.total;
				});
			};

			changeFormat(crime_2013);
			changeFormat(crime_2015);

			// Inital dataset
			var dataset = crime_2013;

			// We want the same scale for 2013 and 2015
			min = function(attr) {
				return Math.min(
					d3.min(crime_2013, function(d) {
						return d[attr];
					}),
					d3.min(crime_2015, function(d) {
						return d[attr];
					})
				);
			};
			max = function(attr) {
				return Math.max(
					d3.max(crime_2013, function(d) {
						return d[attr];
					}),
					d3.max(crime_2015, function(d) {
						return d[attr];
					})
				);
			};

			// We must ensure circles don't overlap with axes
			var space = function(minValue, maxValue) {
				return 0.1 * (maxValue - minValue);
			};

			// Update x-scale
			var xMin = min("prostitution");
			var xMax = max("prostitution");
			xScale.domain([xMin - space(xMin, xMax), xMax + space(xMin, xMax)]);

			// Update y-scale
			var yMin = min("vehicleTheft");
			var yMax = max("vehicleTheft");
			yScale.domain([yMin - space(yMin, yMax), yMax + space(yMin, yMax)]);

			// Update radius
			var rMin = min("total");
			var rMax = max("total");
			rScale.domain([rMin, rMax]);

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
				.text("PROSTITUTION");

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
				.text("VEHICLE THEFT");

			// add the X gridlines
			var xGridAxis = d3.axisBottom(xScale)
				.ticks(5)
				.tickSize(-height)
				.tickFormat("");
			svg.append("g")
				.attr("class", "x grid")
				.attr("transform", "translate(0," + height + ")")
				.call(xGridAxis);

			// add the Y gridlines
			var yGridAxis = d3.axisLeft(yScale)
				.ticks(5)
				.tickSize(-width)
				.tickFormat("");
			svg.append("g")
				.attr("class", "y grid")
				.call(yGridAxis);

			// Append circles
			svg.selectAll("circle")
				.data(dataset, key)
				.enter()
				.append("circle")
				.attr("opacity", 0.7)
				.attr("fill", cMap)
				.attr("stroke", function(d) {
					return cMap(d).darker(0.5);
				})
				.on("mouseover", function(d) {
					// Increase visibility of focus circle
					d3.select(this)
						.attr("opacity", 1);
					tip.show(d);
				})
				.on("mouseout", function(d) {
					// Restore original values
					d3.select(this)
						.attr("opacity", 0.7);
					tip.hide(d);
				});

			// Update circles when user changes the dataset
			function updateCircles() {
				// We don't need to update scales here as they are the same for both datasets

				svg.selectAll("circle")
					.data(dataset, key)
					.sort(function(x, y) {
						// Put small circles on top to make them accessible for mouseover event
						return d3.descending(x.total, y.total);
					})
					.transition()
					.delay(function(d, i) {
						return 500 - i / crime_2013.length * 500;
					})
					.duration(1000)
					.ease(d3.easeCubic)
					.attr("r", rMap)
					.attr("cx", xMap)
					.attr("cy", yMap)
					.attr("stroke-width", function(d) {
						return 0.15 * rMap(d);
					});
			}

			updateCircles();

			d3.select("#input-year-2013")
				.on("click", function() {
					dataset = crime_2013;

					updateCircles();
				});
			d3.select("#input-year-2015")
				.on("click", function() {
					dataset = crime_2015;

					updateCircles();
				});
		});
	});
}
