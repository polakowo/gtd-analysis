function loadTempHist() {

	////////////////////////////////////////
	////////// SVG and containers //////////
	////////////////////////////////////////

	var svgW = $("#temphist")
		.width();
	var svgH = 0.5 * svgW;
	var margin = {
			left: 100,
			top: 100,
			right: 100,
			bottom: 100
		},
		width = svgW - margin.left - margin.right,
		height = svgH - margin.top - margin.bottom;
	var padding = 15;

	// Append new svg element to DOM
	// Append g to svg which acts as an area where bars are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#temphist")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH);
	svg.append("rect")
		.attr("class", "svg-bg");
	var clip = svg.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		////////////////////////////////////
		////////// Histogram data //////////
		////////////////////////////////////

	// Load data and populate histogram in callback (asynchronous call)
	d3.csv("data/temphist.csv", function(error, data) {

		// Convert strings to numbers
		data.forEach(function(d, i) {
			d.year = +d.year;
			d.nattacks = +d.nattacks;
			d.nkilled = +d.nkilled;
			d.nwounded = +d.nwounded;
			d.nkilledter = +d.nkilledter;
			d.nwoundedter = +d.nwoundedter;
		});

		var groupedData = d3.nest()
			.key(function(d) {
				return d.category;
			})
			.key(function(d) {
				return d.subcategory;
			})
			.object(data);

		// Label data
		var metrics = {
			"Attacks": "nattacks",
			"Killed": "nkilled",
			"Wounded": "nwounded",
			"Terrorists Killed": "nkilledter",
			"Terrorists Wounded": "nwoundedter"
		};

		// Set initial data
		var focusCategory = "World";
		var focusSubcategory = "All Regions";
		var focusMetric = "Attacks";
		var focusDataset;

		function updateDataset() {
			focusDataset = groupedData[focusCategory][focusSubcategory];
		}

		updateDataset();

		////////////////////////////
		////////// X Axis //////////
		////////////////////////////

		// Define key function to maintain consistency between data and DOM
		var getX = function(d) {
			return d.year;
		};

		var xMin = d3.min(data, getX);
		var xMax = d3.max(data, getX);
		var xRange = d3.range(xMin, xMax + 1); // Max always +1

		var xScale = d3.scaleBand() // Divides range into n bands, perfect for ordinal values
			.domain(d3.range(xMin, xMax + 1))
			.rangeRound([0, width])
			.paddingOuter(1);
		var xMap = function(d) {
			return xScale(getX(d));
		};
		var xAxis = d3.axisBottom(xScale)
			.tickValues(xScale.domain().filter(function(d, i) {
				return i % 5 === 0;
			})) // reduce ordinal ticks (always manually)
			.tickSize(10);

		// Append x-axis element
		clip.append("g")
			.classed("x axis", true)
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);
		// Append text to svg, not axis
		svg.append("text")
			.classed("x axis-label", true)
			.attr("transform", "translate(" + svgW / 2 + "," + (svgH - padding) + ")")
			.text("Year");

			////////////////////////////
			////////// Y Axis //////////
			////////////////////////////

		var getY = function(d) {
			return d[metrics[focusMetric]];
		};

		var yMin = d3.min(focusDataset, getY);
		var yMax = d3.max(focusDataset, getY);
		var yScale = d3.scaleLinear()
			.domain([yMin, yMax])
			.rangeRound([height, 0])
			.nice();
		var yMap = function(d) {
			return yScale(getY(d));
		};
		var yAxis = d3.axisLeft(yScale)
			.ticks(5)
			.tickSize(10);

		// Append y-axis element
		clip.append("g")
			.classed("y axis", true)
			.call(yAxis);
		svg.append("text")
			.classed("y axis-label", true)
			.attr("transform", "translate(" + padding + "," + svgH / 2 + ")rotate(-90)")
			.attr("dy", ".71em")
			.text("Attacks");

		// // Add the Y gridlines
		var yGridAxis = d3.axisLeft(yScale)
			.ticks(5)
			.tickSize(-width)
			.tickFormat("");
		clip.append("g")
			.classed("y grid", true)
			.call(yGridAxis);

		function updateYAxis() {
			yMin = d3.min(focusDataset, getY);
			yMax = d3.max(focusDataset, getY);
			yScale.domain([yMin, yMax]);

			// Apply new yScale with animation
			clip.selectAll(".y.axis")
				.transition()
					.duration(1000)
					.call(yAxis);
			clip.selectAll(".y.grid")
				.transition()
					.duration(1000)
					.call(yGridAxis);
		}

		///////////////////////////////
		////////// Bar color //////////
		///////////////////////////////

		var customColours = ["#D3D3D3", "#084485"];
		var cScale = d3.scaleSequential()
			.interpolator(d3.interpolateRgbBasis(customColours));
		var cMap = function(d) {
			return d3.color(cScale(getY(d)));
		};

		function updateColor() {
			cScale.domain([yMin, yMax]);
		}

		updateColor();

		///////////////////////////////
		////////// Draw bars //////////
		///////////////////////////////

		// Update bars when user changes the dataset
		function updateBars() {

			// EXIT old elements not present in new data.
			clip.selectAll("rect")
				.data(focusDataset, getX)
				.exit()
				.transition()
					.duration(1000)
					.attr("y", function() {
						return yScale(yMin);
					})
					.attr("height", 0)
					.remove();

			// ENTER new elements present in new data.
			clip.selectAll("rect")
				.data(focusDataset, getX) // capture references to all bars
				.enter() // returns elements that do not yet exist
				.append("rect")
				.attr("width", xScale.bandwidth())
				.attr("x", xMap)
				.attr("opacity", 0.7)
				.on("mouseover", function(d) {
					// Increase visibility of focus rect
					d3.select(this)
						.attr("opacity", 1);
					tip.show(d);
				})
				.on("mouseout", function(d) {
					// Restore original values
					d3.select(this)
						.attr("opacity", 0.7);
					tip.hide(d);
				})
				.attr("y", function() {
					return yScale(yMin);
				})
				.attr("height", 0);

			// UPDATE elements present in new data.
			clip.selectAll("rect")
				.data(focusDataset, getX)
				.transition()
					.duration(1000)
					.attr("y", yMap)
					.attr("height", function(d) {
						return height - yMap(d);
					})
					.attr("fill", cMap);
		}

		updateBars();

		/////////////////////////////
		////////// Tooltip //////////
		/////////////////////////////

		var tip = d3.tip()
			.attr("class", "d3-tip")
			.direction("ne")
			.html(function(d) {
				var total = d3.sum(focusDataset, getY);
				return getX(d) + "<br><hr style='border-color:grey'>" + focusMetric + ": " + (getY(d) / total * 100).toFixed(2) + "%";
			});
		svg.call(tip);

		///////////////////////////
		////////// Title //////////
		///////////////////////////

		// Append title
		var title = svg.append("text")
			.classed("title", true)
			.attr("x", svgW / 2)
			.attr("y", margin.top / 2); // We'll set the title later from dropdown

		function setTitle() {
			title.selectAll("*").remove();

			var tmp = document.createElement("text");
			tmp.innerHTML = "Temporal Development of <tspan style='font-style: italic;'>" + focusCategory + ": " + focusSubcategory + "</tspan>";
			var nodes = Array.prototype.slice.call(tmp.childNodes);
			nodes.forEach(function(node) {
	    		title.append("tspan")
	        		.attr("style", node.getAttribute && node.getAttribute("style"))
	        		.text(node.textContent);
			});
		}

		setTitle();

		////////////////////////////
		////////// Update //////////
		////////////////////////////

		function updateAll() {
			updateDataset();

			updateYAxis();
			updateColor();
			updateBars();

			setTitle();
		}

		//////////////////////////////////////////
		////////// Subcategory dropdown //////////
		//////////////////////////////////////////

		// Options first cuz they're needed by category dropdown

		// Method which turns array of values into options for dropdown
		function toOptionsFormat(list, optgroup) {
			var options = [];
			for (var i = 0; i < list.length; i++) {
				options.push({
					value: list[i],
					name: list[i],
					class: optgroup
				});
			}
			return options;
		}

		// Initialize dropdown using selectize.js
		var $select2 = $('#temphist-select-subcategory').selectize({
			options: toOptionsFormat(Object.keys(groupedData[focusCategory]).sort(), focusCategory),
			optgroups: [{
				value: focusCategory,
				label: focusCategory
			}],
			optgroupField: 'class',
			labelField: 'name',
			searchField: ['name'],
			onChange: function(t) {
				if (t && t != focusSubcategory) {
					focusSubcategory = t;

					updateAll();
				}
			}
		});
		var selectize2 = $select2[0].selectize;
		selectize2.setValue(focusSubcategory);

		///////////////////////////////////////
		////////// Category dropdown //////////
		///////////////////////////////////////

		// Initialize dropdown using selectize.js
		var $select1 = $('#temphist-select-category').selectize({
			options: toOptionsFormat(["World", "Region", "Country"], "Area")
				.concat(toOptionsFormat(["Weapon Type", "Attack Type", "Target Type"], "Type"))
				.concat(toOptionsFormat(["Terrorist Group"], "Group")),
			optgroups: [{
				value: "Area",
				label: "Area"
			}, {
				value: "Type",
				label: "Type"
			}, {
				value: "Group",
				label: "Group"
			}],
			optgroupField: 'class',
			labelField: 'name',
			searchField: ['name'],
			onChange: function(t) {
				if (t && t != focusCategory) {
					focusCategory = t;

					selectize2.clear();
					selectize2.clearOptions();
					selectize2.clearOptionGroups();

					selectize2.addOptionGroup(focusCategory, {
						value: focusCategory,
						label: focusCategory
					});
					var subcategories = Object.keys(groupedData[focusCategory]).sort();
					selectize2.load(function(callback) {
						callback(toOptionsFormat(subcategories, focusCategory));
					});
					focusSubcategory = subcategories[0];
					selectize2.setValue(focusSubcategory);

					updateAll();
				}
			}
		});
		var selectize1 = $select1[0].selectize;
		selectize1.setValue(focusCategory);

		/////////////////////////////////////
		////////// Metric dropdown //////////
		/////////////////////////////////////

		var $select3 = $('#temphist-select-metric').selectize({
			options: toOptionsFormat(Object.keys(metrics).sort(), "Metric"),
			optgroups: [{
				value: "Metric",
				label: "Metric"
			}],
			optgroupField: 'class',
			labelField: 'name',
			searchField: ['name'],
			onChange: function(t) {
				if (t && t != focusMetric) {
					focusMetric = t;

					updateAll();

					svg.select(".y.axis-label")
						.text(focusMetric);
				}

			}
		});
		var selectize3 = $select3[0].selectize;
		selectize3.setValue(focusMetric);
	});
}

loadTempHist();
