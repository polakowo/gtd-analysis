function loadHistogram() {

	///////////////////////////////////////////////////////////////////////////
	//////////////////// Set up and initiate svg containers ///////////////////
	///////////////////////////////////////////////////////////////////////////

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

	// Append new svg element to DOM
	// Append g to svg which acts as an area where circles are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#histogram")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH)
		.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Load data and populate histogram in callback (asynchronous call)
	d3.csv("data/histogram.csv", function(error, data) {

		// Define key function to maintain consistency between data and DOM
		var xValue = function(d) {
			return d.time;
		};
		var yValue = function(d) {
			return d.count;
		};

		// Prepare and group data by category
		var grouped_data = {};
		data.forEach(function(d, i) {
			d.time = +d.time; // string to number
			d.count = +d.count;
			var group = d.category;
			if (!grouped_data[group]) {
				grouped_data[group] = [];
			}
			grouped_data[group].push({
				time: d.time,
				count: d.count
			});
		});

		// Set initial data category
		var init_category = 'Prostitution';
		var dataset = grouped_data[init_category];

		///////////////////////////////////////////////////////////////////////////
		////////////////////////////// Setup x-axis ///////////////////////////////
		///////////////////////////////////////////////////////////////////////////

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
			.text("TIME");

		///////////////////////////////////////////////////////////////////////////
		////////////////////////////// Setup y-axis ///////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var yScale = d3.scaleLinear()
			.domain([0, d3.max(dataset, yValue)])
			.rangeRound([height, 0])
			.nice();
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
			.text("NUMBER OF CRIMES");

		// // Add the Y gridlines
		var yGridAxis = d3.axisLeft(yScale)
			.ticks(5)
			.tickSize(-width)
			.tickFormat("");
		svg.append("g")
			.classed("y grid", true)
			.call(yGridAxis);

		function updateYAxis() {
			yScale.domain([0, d3.max(dataset, yValue)]);

			// Apply new yScale on y-axis and y-grid with animation
			svg.selectAll(".y.axis")
				.transition()
				.duration(1000)
				.call(yAxis);
			svg.selectAll(".y.grid")
				.transition()
				.duration(1000)
				.call(yGridAxis);
		}

		///////////////////////////////////////////////////////////////////////////
		/////////////////////////////// Setup color ///////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var cScale = d3.scaleSequential()
			.domain([0, 24])
			.interpolator(d3.interpolateRainbow);
		var cMap = function(d) {
			return cScale(d.time);
		};

		///////////////////////////////////////////////////////////////////////////
		////////////////////////////// Setup opacity //////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var oScale = d3.scaleLinear()
			.domain([0, d3.max(dataset, yValue)])
			.range([0, 0.7]);
		var oMap = function(d) {
			return oScale(yValue(d));
		};

		function updateOpacity() {
			oScale.domain([0, d3.max(dataset, yValue)]);
		}

		///////////////////////////////////////////////////////////////////////////
		//////////////////////////////// Draw bars ////////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		svg.selectAll("rect")
			.data(dataset, xValue) // capture references to all bars
			.enter() // returns elements that do not yet exist
			.append("rect")
			.attr("width", xScale.bandwidth())
			.attr("x", xMap)
			.attr("fill", cMap)
			.on("mouseover", function(d) {
				// Increase visibility of focus rect
				d3.select(this)
					.attr("opacity", 1);
				tip.show({
					count: yValue(d),
					total: d3.sum(dataset, yValue)
				});
			})
			.on("mouseout", function(d) {
				// Restore original values
				d3.select(this)
					.attr("opacity", oMap);
				tip.hide({
					count: yValue(d),
					total: d3.sum(dataset, yValue)
				});
			});

		// Update bars when user changes the dataset (and one time initially)
		function updateBars() {
			svg.selectAll("rect")
				.data(dataset, xValue)
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

		///////////////////////////////////////////////////////////////////////////
		///////////////////////// Set up and call tooltip /////////////////////////
		///////////////////////////////////////////////////////////////////////////

		var tip = d3.tip()
			.attr("class", "d3-tip")
			.direction("ne")
			.html(function(e) {
				return "<span style='color:white'>" + e.count + " out of " + e.total + "</span>";
			});
		svg.call(tip);

		///////////////////////////////////////////////////////////////////////////
		////////////////////// Populate and handle dropdown ///////////////////////
		///////////////////////////////////////////////////////////////////////////

		// Handle category selection
		d3.select("#histogram-category-menu-button")
			.text(init_category);
		d3.select("#histogram-category-dropdown")
			.selectAll("li")
			.data(Object.keys(grouped_data).sort())
			.enter()
			.append("li")
			.append("button")
			.classed("dropdown-item", true)
			.text(function(d) {
				return d;
			})
			.on("click", function(d) {
				dataset = grouped_data[d];

				updateYAxis();
				updateOpacity();
				updateBars();

				d3.select("#histogram-category-menu-button")
					.text(d);
			});
	});
}

loadHistogram();
