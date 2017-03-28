function loadScatterplot() {

	///////////////////////////////////////////////////////////////////////////
	//////////////////// Set up and initiate svg containers ///////////////////
	///////////////////////////////////////////////////////////////////////////

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

	// We must ensure circles don't overlap with axes
	var space = function(minValue, maxValue) {
		return 0.1 * (maxValue - minValue);
	};

	// Append new svg element to DOM
	// Append g to svg which acts as an area where circles are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#scatterplot")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH)
		.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	///////////////////////////////////////////////////////////////////////////
	/////////////////////////////// Load crime data ///////////////////////////
	///////////////////////////////////////////////////////////////////////////

	// Load both datasets (keep in mind: each fetch is asynchronous, so we need callbacks)
	d3.csv("data/scatter_2003.csv", function(error, crime_2003) {
		d3.csv("data/scatter_2015.csv", function(error, crime_2015) {

			// Define key function to maintain consistency between data and DOM
			var key = function(d) {
				return d.district;
			};
			var xValue = function(d) {
				return d.prostitution;
			};
			var yValue = function(d) {
				return d.vehicleTheft;
			};

			// We want the same scale for 2003 and 2015
			min = function(attr) {
				return Math.min(
					d3.min(crime_2003, function(d) {
						return d[attr];
					}),
					d3.min(crime_2015, function(d) {
						return d[attr];
					})
				);
			};
			max = function(attr) {
				return Math.max(
					d3.max(crime_2003, function(d) {
						return d[attr];
					}),
					d3.max(crime_2015, function(d) {
						return d[attr];
					})
				);
			};

			// Change string (from CSV) into number format
			changeFormat = function(data) {
				data.forEach(function(d) {
					d.prostitution = +xValue(d);
					d.vehicleTheft = +yValue(d);
					d.total = +d.total;
				});
			};

			changeFormat(crime_2003);
			changeFormat(crime_2015);

			// Inital dataset
			var dataset = crime_2003;

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Setup x-axis ///////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var xMin = min("prostitution");
			var xMax = max("prostitution");
			var xScale = d3.scaleLinear()
				.domain([xMin - space(xMin, xMax), xMax + space(xMin, xMax)])
				.rangeRound([0, width]);
			var xMap = function(d) {
				return xScale(xValue(d));
			};
			var xAxis = d3.axisBottom(xScale)
				.ticks(5)
				.tickSize(10);

			// Append x-axis element
			svg.append("g")
				.classed("x axis", true)
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);
			// Append text to svg, not axis
			svg.append("text")
				.classed("axis-label", true)
				.attr("x", width)
				.attr("y", height + margin.bottom)
				.text("PROSTITUTION");

			// add the X gridlines
			var xGridAxis = d3.axisBottom(xScale)
				.ticks(5)
				.tickSize(-height)
				.tickFormat("");
			svg.append("g")
				.classed("x grid", true)
				.attr("transform", "translate(0," + height + ")")
				.call(xGridAxis);

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Setup y-axis ///////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var yMin = min("vehicleTheft");
			var yMax = max("vehicleTheft");
			var yScale = d3.scaleLinear()
				.domain([yMin - space(yMin, yMax), yMax + space(yMin, yMax)])
				.rangeRound([height, 0]);
			var yMap = function(d) {
				return yScale(yValue(d));
			};
			var yAxis = d3.axisLeft(yScale)
				.ticks(5)
				.tickSize(10);

			// Append y-axis element
			svg.append("g")
				.classed("y axis", true)
				.call(yAxis);
			svg.append("text")
				.classed("axis-label", true)
				.attr("transform", "rotate(-90)")
				.attr("y", -margin.left)
				.attr("dy", ".71em")
				.text("VEHICLE THEFT");

			// add the Y gridlines
			var yGridAxis = d3.axisLeft(yScale)
				.ticks(5)
				.tickSize(-width)
				.tickFormat("");
			svg.append("g")
				.classed("y grid", true)
				.call(yGridAxis);

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Setup radius ///////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var rMin = min("total");
			var rMax = max("total");
			var rScale = d3.scaleSqrt()
				.domain([rMin, rMax])
				.rangeRound([5, 50]);
			var rMap = function(d) {
				return rScale(d.total);
			};

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Setup color ////////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var cScale = d3.scaleOrdinal(d3.schemeCategory10);
			var cMap = function(d) {
				return d3.color(cScale(d.district));
			};

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Draw circles ///////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			svg.selectAll("circle")
				.data(dataset, key)
				.enter()
				.append("circle")
				.attr("fill", cMap)
				.attr("stroke", function(d) {
					return cMap(d).darker(0.5);
				})
				.attr("opacity", 0.7)
				.on("mouseover", function(d) {
					d3.select(this)
						.attr("opacity", 1);
					tip.show(d);
				})
				.on("mouseout", function(d) {
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
						return 500 - i / crime_2003.length * 500;
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

			///////////////////////////////////////////////////////////////////////////
			///////////////////////// Set up and call tooltip /////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var tip = d3.tip()
				.attr("class", "d3-tip")
				.direction("ne")
				.html(function(e) {
					return "<span style='color:" + cMap(e).brighter(0.5) + "'>SF " + e.district + "</span><br><br><span style='color:white'>(" + e.prostitution + ", " + e.vehicleTheft + ")</span>";
				});
			svg.call(tip);

			///////////////////////////////////////////////////////////////////////////
			////////////////////////// Register button events /////////////////////////
			///////////////////////////////////////////////////////////////////////////

			d3.select("#input-year-2003")
				.on("click", function() {
					dataset = crime_2003;

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

loadScatterplot();
