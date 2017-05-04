function loadChoropleth() {

	////////////////////////////////////////
	////////// SVG and containers //////////
	////////////////////////////////////////

	var svgW = $("#choropleth")
		.width();
	var svgH = 0.8 * svgW;
	// Margins of inner plot area
	var margin = {
			left: 100,
			top: 100,
			right: 100,
			bottom: 100
		},
		width = svgW - margin.left - margin.right,
		height = svgH - margin.top - margin.bottom;
	// Padding used for placing titles and axis labels outside of the inner area
	var padding = 15;

	// Append new svg element to document body
	var svg = d3.select("#svg-choropleth")
		.attr("width", svgW)
		.attr("height", svgH);
	// Append rect for colouring background
	svg.append("rect")
		.attr("class", "svg-bg");
	// Append inner plot area (just new coordinate system)
	var clip = svg.append("g")
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

	// Group data by 1) category 2) subcategory 3) year
	var groupedData = d3.nest()
		.key(function(d) {
			return d.category;
		})
		.key(function(d) {
			return d.subcategory;
		})
		.key(function(d) {
			return d.year;
		})
		.object(this.data.choroplethData);

	// Label metrics
	var metrics = {
		"Attacks": "nattacks",
		"Killed": "nkilled",
		"Wounded": "nwounded",
		"Terrorists Killed": "nkilledter",
		"Terrorists Wounded": "nwoundedter"
	};

	// Set initial categories
	var focusCategory = "All Types";
	var focusSubcategory = "All Types";
	var focusMetric = "Attacks";
	var focusYear = 2015;

	var focusDataset;
	var focusDatasetById;

	// Dataset is updated every time user changes a category
	function updateDataset() {
		focusDataset = groupedData[focusCategory][focusSubcategory];
		if (focusDataset.hasOwnProperty(focusYear)) {
			focusDataset = focusDataset[focusYear];
		} else {
			focusDataset = [];
		}

		// We want to get country properties by country id (while looping geojson)
		focusDatasetById = d3.nest()
			.key(function(d) {
				return d.id;
			})
			.object(focusDataset);
	}

	updateDataset();

	// Define functions to get properties depending on metrics chosen by user
	var getMetric = function(d) {
		return d[metrics[focusMetric]];
	};

	var metricMin = function() {
		return 0;
	};
	var metricMax = function() {
		var max = d3.max(focusDataset, getMetric);
		return max > 0 ? max : 1; // Scale must be [0, >0]
	};
	var metricSum = function() {
		return d3.sum(focusDataset, getMetric);
	};

	// In order to jump country with max metric we need its id
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

	var customColours = ["#C7C7C7", "#1F77B4"];
	var cScale = d3.scaleSequential()
		.interpolator(d3.interpolateRgbBasis(customColours));
	var cMap = function(d) {
		return d3.color(cScale(getMetric(d)));
	};

	function updateColor() {
		cScale.domain([metricMin(), metricMax()]);
	}

	updateColor();

	////////////////////////////
	////////// Legend //////////
	////////////////////////////

	var legendWidth = width * 0.6,
		legendHeight = 10;

	// Calculate the gradient
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

	// Color legend container
	var legendsvg = svg.append("g")
		.attr("class", "legendWrapper")
		.attr("transform", "translate(" + svgW / 2 + "," + (svgH - 3 * padding) + ")");

	// Draw the gradient rectagle
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

	// Set metric scale
	var xScale = d3.scaleLinear()
		.range([0, legendWidth]);

	// Define axis
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

	// Set up metric axis
	var gX = legendsvg.append("g")
		.attr("class", "x axis") //Assign "axis" class
		.attr("clip-path", "url(#choropleth-axis-area)")
		.attr("transform", "translate(" + (-legendWidth / 2) + "," + (10 + legendHeight) + ")");

	var defaultDuration = 1000;
	var defaultEase = function(t) {
		return d3.easeCubic(t);
	};

	function updateGradientScale() {
		xScale.domain([0, metricMax()]);
		gX.transition("gradient")
			.duration(defaultDuration)
			.ease(defaultEase)
			.call(xAxis);
		legendsvg.select(".legendTitle")
			.text(focusMetric);
	}

	updateGradientScale();

	///////////////////////////////
	////////// Geography //////////
	///////////////////////////////

	var radius = height / 2; // globe must take the entire plot area

	var projection = d3.geoOrthographic()
		.scale(radius)
		.translate([width / 2, height / 2])
		.clipAngle(90)
		.precision(0.3);

	var path = d3.geoPath()
		.projection(projection);

	function pathById(id) {
		for (var i = 0; i < this.data.worldMap.features.length; i++) {
			if (this.data.worldMap.features[i].id == id) {
				return this.data.worldMap.features[i];
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

	// Grid around the sphere
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
		.data(this.data.worldMap.features)
		.enter()
		.append("path")
		.attr("clip-path", "url(#choropleth-area)")
		.attr("class", "land")
		.attr("d", path)
		.attr("opacity", 0.7)
		.on("click", rotateGlobe)
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
			.data(this.data.worldMap.features)
			.transition("colour")
			.duration(defaultDuration)
			.ease(defaultEase)
			.attr("fill", function(p) {
				// Get data values for country id
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

	// Sensitivity of rotation depends on current zoom (slower if zoomed in)
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

	// We want the tip not to be shown on drag
	var mouseDown = false;

	var dragGlobe = d3.drag()
		.subject(dragSubject)
		.on("start", function() {
			// Change to initial opacity
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

	// Apply to land and sphere
	clip.selectAll("path")
		.call(dragGlobe);

	//////////////////////////////////
	////////// Rotate globe //////////
	//////////////////////////////////

	function rotateGlobe(d) {
		var r;
		if (d) {
			// Get centroid of the target country (central coordinates)
			var countryXY = d3.geoCentroid(d);
			// Transition (or time) scale is projected into rotation scale
			r = d3.interpolate(projection.rotate(), [-countryXY[0], -countryXY[1], 0]);
		} else { // Sometimes country is not known, path is empty, or no terrorism is present at all
			r = d3.interpolate(projection.rotate(), [0, 0, 0]);
		}

		(function transition() {
			clip.transition("rotate")
				.duration(1000)
				.tween("rotate", function() {
					return function(t) {
						projection.rotate(r(t));
						clip.selectAll("path").attr("d", path);
					};
				});
		})();
	}

	rotateGlobe(pathById(idWithMaxMetric()));

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
						// To show changes we have to update paths first (everywhere necessary)
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
			// Advanced terrorism information
			if (focusDatasetById.hasOwnProperty(p.id)) {
				var d = focusDatasetById[p.id][0];
				return "<span style='color:" + cMap(d).brighter(0.5) + "'>" + p.properties.name + "</span><br><hr style='border-color:grey'>" +
					Math.round(getMetric(d) / metricSum() * 10000) / 100 + "%<br><br>(" + getMetric(d) + " out of " + metricSum() + ")</span>";
			} else {
				return p.properties.name + "<br><hr style='border-color:grey'>0%<br><br>(0 out of " + metricSum() + ")";
			}
		});
	svg.call(tip);

	///////////////////////////
	////////// Title //////////
	///////////////////////////

	// Append title
	var title = svg.append("text")
		.classed("title", true)
		.attr("x", svgW / 2)
		.attr("y", margin.top / 2); // We'll set the title later from the dropdown

	function setTitle() {
		title.selectAll("*").remove();

		// We want to show some text in italic
		// Text cannot be appended as html element, only styling with tspan possible
		var tmp = document.createElement("text");
		tmp.innerHTML = "Geographical Distribution by <tspan style='font-style: italic;'>" + focusCategory + ": " + focusSubcategory + "</tspan> (<tspan style='font-style: italic;'>" + focusYear + "</tspan>)";
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

	function updateAll(rotate) {
		updateDataset();

		updateColor();
		updateGradientScale();
		updateLand();

		setTitle();

		if (rotate) {
			rotateGlobe(pathById(idWithMaxMetric()));
		}
	}

	//////////////////////////////////////////
	////////// Subcategory dropdown //////////
	//////////////////////////////////////////

	// Subcategories first because they are dependend on active category

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

				updateAll(true);
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

				// Populate subcategories dropdown
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

				updateAll(true);
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

				updateAll(true);
			}

		}
	});
	var selectize3 = $select3[0].selectize;
	selectize3.setValue(focusMetric);

	/////////////////////////////////
	////////// Year slider //////////
	/////////////////////////////////

	var sliderRange = $('#choropleth-slider-range');
	var sliderMin = $('#choropleth-slider-min');
	var sliderMax = $('#choropleth-slider-max');

	var sliderButton = $("#choropleth-slider-button");
	var timeMachineTimer;

	var yearMin = d3.min(this.data.choroplethData, function(d) {
		return d.year;
	});
	var yearMax = d3.max(this.data.choroplethData, function(d) {
		return d.year;
	});

	sliderMin.html(yearMin);
	sliderMax.html(yearMax);
	sliderRange.prop('min', yearMin);
	sliderRange.prop('max', yearMax);
	sliderRange.prop('value', focusYear);

	// The value on the slider changed
	sliderRange.on("input", function() {
		if (timeMachineTimer) {
			stopTimer();
		}
		focusYear = +this.value;
		updateAll(false);
	});

	// The Time Machine button clicked
	sliderButton.on("click", function() {
		if (sliderButton.html() == "Time Machine") {
			startTimer();
		} else {
			stopTimer();
		}
	});

	// Start timer with some additional settings
	function startTimer() {
		sliderButton.html("Stop");

		var yearsToGo = d3.range(yearMin, yearMax + 1);
		// Make transitions faster
		defaultDuration = 250;
		// and linear
		defaultEase = function(t) {
			return d3.easeLinear(t);
		};

		var i = 0;
		timeMachineTimer = d3.interval(function() {
			if (i < yearsToGo.length) {
				focusYear = yearsToGo[i];
				sliderRange.prop('value', focusYear);

				// Update all without rotations
				updateAll(false);

				++i;
			} else { // There is no timer.onstop method
				stopTimer();
			}
		}, defaultDuration);
	}

	// Stop timer and reset to defaults
	function stopTimer() {
		sliderButton.html("Time Machine");

		timeMachineTimer.stop();
		timeMachineTimer = null;

		// Set the default duration of transitions
		defaultDuration = 1000;
		// and the default ease function
		defaultEase = function(t) {
			return d3.easeCubic(t);
		};
	}
}
