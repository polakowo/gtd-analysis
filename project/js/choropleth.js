function loadChoropleth() {

	////////////////////////////////////////
	////////// SVG and containers //////////
	////////////////////////////////////////

	var svgW = $("#choropleth")
		.width();
	var svgH = 0.8 * svgW;
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
	// Append g to svg which acts as an area where circles are drawn
	// We need g to be subset of svg to make a bit space for x and y axis
	var svg = d3.select("#choropleth")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH);
	svg.append("rect")
		.attr("class", "svg-bg");
	var clip = svg.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Else our map will extend our working area "g" of svg
	clip.append("clipPath")
		.attr("id", "choropleth-area")
		.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", width)
		.attr("height", height);

	/////////////////////////////////////
	////////// Choropleth data //////////
	/////////////////////////////////////

	d3.csv("data/choropleth.csv", function(error, data) {

		// Convert strings to numbers
		data.forEach(function(d, i) {
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
		var focusCategory = "All Types";
		var focusSubcategory = "All Types";
		var focusMetric = "Attacks";
		var focusDataset;
		var focusDatasetById;

		function updateDataset() {
			focusDataset = groupedData[focusCategory][focusSubcategory];

			// We want to get country properties by country id
			focusDatasetById = d3.nest()
				.key(function(d) {
					return d.id;
				})
				.object(focusDataset);
		}

		updateDataset();

		var getMetric = function(d) {
			return d[metrics[focusMetric]];
		};

		var metricMin = function() {
			return 0;
		};
		var metricMax = function() {
			var max = d3.max(focusDataset, getMetric);
			return max > 0 ? max: 1; // Scale must be [0, >0]
		};
		var metricSum = function() {
			return d3.sum(focusDataset, getMetric);
		};

		// Jump to country with max metric
		function idWithMaxMetric() {
			var maxMetric = metricMax();
			for (var i = 0; i < focusDataset.length; i++) {
				var d = focusDataset[i];
				if (getMetric(d) == maxMetric) {
					return d.id;
				}
			}
		}

		/////////////////////////////////
		////////// Color scale //////////
		/////////////////////////////////

		var defs = svg.append("defs");

		var customColours = ["#D3D3D3", "#fff0b1", "#ee7777", "#e7264c", "#7e3141", "#1b1336"];

		//Calculate the gradient
		defs.append("linearGradient")
			.attr("id", "gradient-rainbow-colors")
			.attr("x1", "0%").attr("y1", "0%")
			.attr("x2", "100%").attr("y2", "0%")
			.selectAll("stop")
			.data(customColours)
			.enter().append("stop")
			.attr("offset", function(d, i) {
				return i / (customColours.length - 1);
			})
			.attr("stop-color", function(d) {
				return d;
			});

		var cScale = d3.scaleLinear()
			.range(customColours)
			.interpolate(d3.interpolateHcl);
		var cMap = function(d) {
			return d3.color(cScale(getMetric(d)));
		};

		var colourRange;

		function updateColourRange() {
			colourRange = d3.range(0, metricMax(), metricMax() / (customColours.length - 1));
			colourRange.push(metricMax());
			cScale.domain(colourRange);
		}

		updateColourRange();

		////////////////////////////
		////////// Legend //////////
		////////////////////////////

		var legendWidth = width * 0.6,
			legendHeight = 10;

		//Color Legend container
		var legendsvg = svg.append("g")
			.attr("class", "legendWrapper")
			.attr("transform", "translate(" + svgW / 2 + "," + (svgH - 3 * padding) + ")");

		//Draw the Rectangle
		legendsvg.append("rect")
			.attr("class", "legendRect")
			.attr("x", -legendWidth / 2)
			.attr("y", 10)
			.attr("width", legendWidth)
			.attr("height", legendHeight)
			.attr("fill", "url(#gradient-rainbow-colors)");

		//Append title
		legendsvg.append("text")
			.attr("class", "legendTitle")
			.attr("x", 0)
			.attr("y", -2)
			.attr("text-anchor", "middle")
			.text(focusMetric);

		//Set scale for x-axis
		var xScale = d3.scaleLinear()
			.range([0, legendWidth]);

		//Define x-axis
		var xAxis = d3.axisBottom(xScale)
			.ticks(5);

		// Else numbers will float far to right outside of our working area when updated
		svg.append("clipPath")
			.attr("id", "choropleth-axis-area")
			.append("rect")
			.attr("x", -20)
			.attr("y", -20)
			.attr("width", legendWidth + 20)
			.attr("height", 40);

		//Set up X axis
		var gX = legendsvg.append("g")
			.attr("class", "x axis") //Assign "axis" class
			.attr("clip-path", "url(#choropleth-axis-area)")
			.attr("transform", "translate(" + (-legendWidth / 2) + "," + (10 + legendHeight) + ")");

		function updateGradientScale() {
			xScale.domain([0, metricMax()]);
			gX.transition()
				.duration(1000)
				.call(xAxis);
			legendsvg.select(".legendTitle")
				.text(focusMetric);
		}

		updateGradientScale();

		////////////////////////////////////
		////////// Countries data //////////
		////////////////////////////////////

		d3.json("geodata/countries.json", function(error, countries) {

			var alpha32 = {};

			countries.forEach(function(d, i) {
				alpha32[d["alpha-3"]] = d["alpha-2"];
			});

			///////////////////////////////
			////////// Geography //////////
			///////////////////////////////

			d3.json("geodata/countries.geo.json", function(error, world) {

				var radius = height / 2;

				var projection = d3.geoOrthographic()
					.scale(radius)
					.translate([width / 2, height / 2])
					.clipAngle(90)
					.precision(0.3)
					.rotate([-10.270439728514663, -51.07731335885641, 0]);

				var path = d3.geoPath()
					.projection(projection);

				function pathById(id) {
					for (var i = 0; i < world.features.length; i++) {
						if (world.features[i].id == id) {
							return world.features[i];
						}
					}
				}

				////////////////////////////
				////////// Sphere //////////
				////////////////////////////

				clip.append("path")
					.datum({
						type: "Sphere"
					})
					.attr("clip-path", "url(#choropleth-area)")
					.attr("class", "sphere")
					.attr("d", path);

				///////////////////////////////
				////////// Graticule //////////
				///////////////////////////////

				var graticule = d3.geoGraticule();

				clip.append("path")
					.datum(graticule)
					.attr("clip-path", "url(#choropleth-area)")
					.attr("class", "graticule")
					.attr("d", path);

				//////////////////////////
				////////// Land //////////
				//////////////////////////

				clip.selectAll("path.land")
					.data(world.features)
					.enter()
					.append("path")
					.attr("clip-path", "url(#choropleth-area)")
					.attr("class", "land")
					.attr("d", path)
					.attr("opacity", 0.7)
					.on("click", rotateGlobe)
					.on("dblclick", zoomGlobe)
					.on("mouseover", function(p) {
						if (!mouseDown) {
							d3.select(this).attr("opacity", 1);
							tip.show(p);
						}
					})
					.on("mouseout", function(p) {
						if (!mouseDown) {
							d3.select(this).attr("opacity", 0.7);
							tip.hide(p);
						}
					});

				function updateLand() {
					clip.selectAll("path.land")
						.data(world.features)
						.transition("colorland")
						.duration(1000)
						.attr("fill", function(p) {
							// get data value
							if (focusDatasetById.hasOwnProperty(p.id)) {
								return cMap(focusDatasetById[p.id][0]);
							} else {
								return cScale(metricMin());
							}
						});
				}

				updateLand();

				////////////////////////////////
				////////// Drag globe //////////
				////////////////////////////////

				var sens = function() {
					return projection.scale() > radius ? 0.05 : 0.2;
				};

				function dragSubject() {
					var r = projection.rotate();
					return {
						x: r[0] / sens(),
						y: -r[1] / sens()
					};
				}

				var mouseDown = false;

				var dragGlobe = d3.drag()
					.subject(dragSubject)
					.on("start", function() {
						d3.select(this).attr("opacity", 0.7);
						mouseDown = true;
						tip.hide();
					})
					.on("drag", function() {
						projection.rotate([d3.event.x * sens(), -d3.event.y * sens()]); // Update projection
						clip.selectAll("path").attr("d", path); // Update paths
					})
					.on("end", function() {
						mouseDown = false;
					});

				// Apply to land and water
				clip.selectAll("path")
					.call(dragGlobe);

				//////////////////////////////////
				////////// Rotate globe //////////
				//////////////////////////////////

				function rotateGlobe(d) {
					var r;
					if (d) {
						var countryXY = d3.geoCentroid(d);
						r = d3.interpolate(projection.rotate(), [-countryXY[0], -countryXY[1], 0]);
					} else {
						r = d3.interpolate(projection.rotate(), [0, 0, 0]);
					}

					(function transition() {
						clip.transition("rotation")
							.duration(1000)
							.tween("rotate", function() {
								return function(t) {
									projection.rotate(r(t));
									clip.selectAll("path").attr("d", path);
								};
							});
					})();
				}

				rotateGlobe(pathById(idWithMaxMetric()), false);

				////////////////////////////////
				////////// Zoom globe //////////
				////////////////////////////////

				var zoomFactor = 2;
				function zoomGlobe() {

					(function zoom() {
						clip.transition("zoom")
							.duration(1000)
							.tween("transform", function() {
								var targetScale = projection.scale() > radius ? radius : zoomFactor * radius;
								var zoomer = d3.interpolate(projection.scale(), targetScale);
								return function(t) {
									projection.scale(zoomer(t));
									clip.selectAll("path").attr("d", path);
								};
							});
					})();
				}

				////////////////////////////////
				////////// Spin globe //////////
				////////////////////////////////

				var time = Date.now();
				var rotate = projection.rotate();
				var velocity = [-0.005, -0.005, 0];

				function spinGlobe() {
					d3.timer(function() {
						// get current time
						var dt = Date.now() - time;
						// get the new position from modified projection function
						projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt, rotate[2] + velocity[2] * dt]);

						// update cities position = redraw
						clip.selectAll("path").attr("d", path);
					});
				}

				/////////////////////////////
				////////// Tooltip //////////
				/////////////////////////////

				var tip = d3.tip()
					.attr("class", "d3-tip")
					.direction("ne")
					.html(function(p) {
						if (alpha32.hasOwnProperty(p.id)) {
							var countryHtml = "<span class='flag-icon flag-icon-" + alpha32[p.id].toLowerCase() + " flag-icon-squared'></span><br><br>" + p.properties.name + "<br><hr style='border-color:grey'>";
							if (focusDatasetById.hasOwnProperty(p.id)) {
								var d = focusDatasetById[p.id][0];
								return countryHtml + Math.round(getMetric(d) / metricSum() * 10000) / 100 + "%<br><br>(" + getMetric(d) + " out of " + metricSum() + ")</span>";
							}
							else {
								return countryHtml + "0%<br><br>(0 out of " + metricSum() + ")";
							}
						}
						else {
							return "Unknown";
						}
					});
				svg.call(tip);

				////////////////////////////
				////////// Update //////////
				////////////////////////////

				function updateAll() {
					updateDataset();

					updateColourRange();
					updateGradientScale();
					updateLand();

					rotateGlobe(pathById(idWithMaxMetric()), false);
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
				var $select2 = $('#choropleth-select-subcategory').selectize({
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
				var $select1 = $('#choropleth-select-category').selectize({
					options: toOptionsFormat(["All Types", "Weapon Type", "Attack Type", "Target Type"], "Type")
						.concat(toOptionsFormat(["Terrorist Group"], "Group")),
					optgroups: [{
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

				var $select3 = $('#choropleth-select-metric').selectize({
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
						}

					}
				});
				var selectize3 = $select3[0].selectize;
				selectize3.setValue(focusMetric);
			});
		});
	});
}

loadChoropleth();
