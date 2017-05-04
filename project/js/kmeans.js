function loadKMeans() {

	////////////////////////////////////////
	////////// SVG and containers //////////
	////////////////////////////////////////

	var svgW = $("#kmeans")
		.width();
	var svgH = 0.8 * svgW;
	// Margins of inner plot area
	var margin = {
			left: 20,
			top: 100,
			right: 20,
			bottom: 100
		},
		width = svgW - margin.left - margin.right,
		height = svgH - margin.top - margin.bottom;
	// Padding used for placing titles and axis labels outside of the inner area
	var padding = 15;

	// Append new svg element to document body
	var svg = d3.select("#svg-kmeans")
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
		.attr("id", "kmeans-area")
		.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", width)
		.attr("height", height);

	////////////////////////////////
	////////// Projection //////////
	////////////////////////////////

	var projection = d3.geoMercator()
		.scale(width / (2 * Math.PI))
		.translate([width / 2, height / 2])
		.precision(0.3);

	var path = d3.geoPath()
		.projection(projection);

	// Get x and y out of lon, lat coordinates
	var getX = function(d) {
		return projection([d.lon, d.lat])[0];
	};
	var getY = function(d) {
		return projection([d.lon, d.lat])[1];
	};
	// Get the name of country containing the point
	var getCountry = function(d) {
		for (var i = 0; i < this.data.worldMap.features.length; i++) {
			var country = this.data.worldMap.features[i];
			if (d3.geoContains(country, projection.invert([d.x, d.y]))) {
				return country.properties.name;
			}
		}
	};

	///////////////////////////////
	////////// Graticule //////////
	///////////////////////////////

	// Grid around the sphere
	var graticule = d3.geoGraticule();

	clip.append("path")
		.datum(graticule)
		.attr("clip-path", "url(#kmeans-area)")
		.attr("class", "graticule")
		.attr("d", path);

	//////////////////////////
	////////// Land //////////
	//////////////////////////

	clip.selectAll("path.land")
		.data(this.data.worldMap.features)
		.enter()
		.append("path")
		.attr("clip-path", "url(#kmeans-area)")
		.attr("class", "land")
		.attr("d", path)
		.attr("fill", "#C7C7C7");

	////////////////////////////
	////////// Points //////////
	////////////////////////////

	var categories = {
		"Weapon Type": "weapontype",
		"Attack Type": "attacktype",
		"Target Type": "targettype"
	};

	// Set initial data
	// All types means we want the whole dataset rather than some group of points
	var focusCategory = "All Types";
	var focusType = "All Types";

	// Get types of each category (list of unique values in a column)
	function getTypes() {
		if (focusCategory === "All Types") {
			return ["All Types"];
		} else {
			return d3.map(this.data.pointsData, function(d) {
				return d[categories[focusCategory]];
			}).keys().sort();
		}
	}

	// Points assigned to the focus type (e.g., Weapon Type = Biological)
	var focusPoints;

	function updatePoints() {
		if (focusCategory === "All Types") {
			// All types means the whole dataset
			focusPoints = this.data.pointsData;
		} else {
			// Get only subset of points assigned to this focus type
			var pointsByType = d3.nest()
				.key(function(d) {
					return d[categories[focusCategory]];
				})
				.object(this.data.pointsData);

			focusPoints = pointsByType[focusType];
		}
	}

	updatePoints();

	///////////////////////////////
	////////// Centroids //////////
	///////////////////////////////

	this.data.centroidsData.forEach(function(d, i) {
		// Append to each centroid unique index which will act as a key
		d.index = i;

		// Get coordinates on plot
		d.x = getX(d);
		d.y = getY(d);
	});

	var getCentroidIndex = function(d) {
		return d.index;
	};

	// Current K (number of centroids)
	var focusK = 3;
	// Subset of centroids assigned to the focus points
	var focusCentroids;
	// Centroids grouped by type and K
	var centroidsGrouped;

	function updateCentroids() {
		centroidsGrouped = d3.nest()
			.key(function(d) {
				return d.type;
			})
			.key(function(d) {
				return d.k;
			})
			.object(this.data.centroidsData);

		focusCentroids = centroidsGrouped[focusType][focusK];
	}

	updateCentroids();

	/////////////////////////////////
	////////// Color scale //////////
	/////////////////////////////////

	var cScale = d3.scaleOrdinal(d3.schemeCategory10);
	var cMap = function(d) {
		return d3.color(cScale(getCentroidIndex(d)));
	};

	/////////////////////////////
	////////// Hexbins //////////
	/////////////////////////////

	// Radius of hexagon
	var radius = 5;

 	// Set bounds for hexagons
	var hexbin = d3.hexbin()
		.radius(radius)
		.extent([
			[0, 0],
			[width, height]
		]);

	// Unique key of each bin (coordinates + unique centroid index they belong to)
	var getBinIndex = function(d) {
		return [d.x, d.y, getCentroidIndex(d)];
	};

	// Calculate Euclidean distance
	var euclideanDistance = function(dx, dy, cx, cy) {
		return Math.sqrt(Math.pow((cx - dx), 2) + Math.pow((cy - dy), 2));
	};

	// For point with x and y, get the nearest centroid index
	function nearestCentroidIndex(d) {
		var minIndex = getCentroidIndex(focusCentroids[0]);
		var minDistance = euclideanDistance(d.x, d.y, focusCentroids[0].x, focusCentroids[0].y);

		focusCentroids.forEach(function(c, i) {
			// Calculate the distance to each centroid and return the closest
			distance = euclideanDistance(d.x, d.y, c.x, c.y);
			if (distance < minDistance) {
				minDistance = distance;
				minIndex = getCentroidIndex(c);
			}
		});
		return minIndex;
	}

	// actual hexagons
	var bins;

	function updateBins() {
		// Group data points by hexagons
		bins = hexbin(focusPoints.map(function(d) {
			return projection([d.lon, d.lat]);
		}));

		bins.forEach(function(d, i) {
			// Assign the hexagon to the closest centroid
			d.index = nearestCentroidIndex(d);
			// Count the number of data points in the hexagon
			focusCentroids.forEach(function(c, j) {
				if (getCentroidIndex(c) == getCentroidIndex(d)) {
					if (c.hasOwnProperty("count")) {
						c.count = c.count + d.length;
					} else {
						c.count = 0;
					}
				}
			});
		});
	}

	updateBins();

	///////////////////////////////
	////////// Draw bins //////////
	///////////////////////////////

	function redrawBins() {
		// EXIT old elements not present in new data.
		clip.selectAll(".bin")
			.data(bins, getBinIndex)
			.exit()
			.transition("exit")
			.duration(1000)
			.attr("opacity", 0)
			.remove();

		// ENTER new elements present in new data.
		clip.selectAll(".bin")
			.data(bins, getBinIndex)
			.enter()
			.append("path")
			.attr("class", "bin")
			.attr("d", function(d) {
				return "M" + d.x + "," + d.y + hexbin.hexagon();
			})
			.on("mouseover", function(d, i) {
				d3.select(this)
					.attr("opacity", 1);
				tip.html(function(d) {
						var homeCountry = getCountry(d);
						if (!homeCountry) {
							// There may be no country under hexagon (think of water)
							homeCountry = "";
						} else {
							homeCountry = "<br><br><span style='color:grey'>" + homeCountry + "</span>";
						}
						return "<span style='color:" + cMap(d).brighter(0.5) + "'>Centroid #" + getCentroidIndex(d) + "</span>" + homeCountry + "<br><hr style='border-color:grey'>Attacks: " + d.length;
					})
					.show(d);
			})
			.on("mouseout", function(d, i) {
				d3.select(this)
					.attr("opacity", 0.7);
				tip.hide();
			})
			.attr("opacity", 0);

		// UPDATE elements present in new data.
		clip.selectAll(".bin")
			.data(bins, getBinIndex)
			.transition("update")
			.duration(1000)
			.attr("fill", cMap)
			.attr("opacity", 0.7);
	}

	redrawBins();

	////////////////////////////////////
	////////// Draw centroids //////////
	////////////////////////////////////

	function redrawCentroids() {
		// EXIT old elements not present in new data.
		clip.selectAll(".centroid")
			.data(focusCentroids, getCentroidIndex)
			.exit()
			.transition("exit")
			.duration(1000)
			.attr("opacity", 0)
			.remove();

		// ENTER new elements present in new data.
		clip.selectAll(".centroid")
			.data(focusCentroids, getCentroidIndex)
			.enter()
			.append("circle")
			.attr("class", "centroid")
			.attr("cx", function(d) {
				return getX(d);
			})
			.attr("cy", function(d) {
				return getY(d);
			})
			.attr("r", 20)
			.attr("fill", cMap)
			.attr("stroke", function(d) {
				return cMap(d).darker(0.5);
			})
			.attr("opacity", 0)
			.attr("stroke-width", 0.15 * 25)
			.on("mouseover", function(d, i) {
				d3.selectAll(".centroid")
					// Find all assigned hexbins and highlight them
					.attr("opacity", function(c) {
						if (getCentroidIndex(d) == getCentroidIndex(c)) {
							return 1;
						} else {
							return 0.3;
						}
					});
				d3.selectAll(".bin")
					.attr("opacity", function(b) {
						if (getCentroidIndex(d) == getCentroidIndex(b)) {
							return 1;
						} else {
							return 0.3;
						}
					});
				tip.html(function(d) {
						return "<span style='color:" + cMap(d).brighter(0.5) + "'>Centroid #" + getCentroidIndex(d) + "</span><br><hr style='border-color:grey'>Attacks: " + d.count;
					})
					.show(d);
			})
			.on("mouseout", function(d, i) {
				d3.selectAll(".centroid")
					.attr("opacity", 0.7);
				d3.selectAll(".bin")
					.attr("opacity", 0.7);
				tip.hide();
			});

		// UPDATE elements present in new data.
		clip.selectAll(".centroid")
			.data(focusCentroids, getCentroidIndex)
			.transition("update")
			.duration(1000)
			.attr("opacity", 0.7);
	}

	redrawCentroids();

	/////////////////////////////
	////////// Tooltip //////////
	/////////////////////////////

	var tip = d3.tip()
		.attr("class", "d3-tip")
		.direction("ne");
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

		// All the hustle for enabling italics ^^
		var tmp = document.createElement("text");
		tmp.innerHTML = "Terrorist Attacks Divided into <tspan style='font-style: italic;'>K=" + focusK + "</tspan> Partitions";
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

	// Once user changes the category, type, or K, update the entire chart
	function updateAll() {
		updatePoints();
		updateCentroids();
		updateBins();

		redrawBins();
		redrawCentroids();

		setTitle();
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
	var $select2 = $('#kmeans-select-subcategory').selectize({
		options: toOptionsFormat(getTypes(), focusCategory),
		optgroups: [{
			value: focusCategory,
			label: focusCategory
		}],
		optgroupField: 'class',
		labelField: 'name',
		searchField: ['name'],
		onChange: function(t) {
			// If we don't do t != focusType, the method will be called twice
			if (t && t != focusType) {
				focusType = t;

				updateAll();
			}
		}
	});
	var selectize2 = $select2[0].selectize;
	selectize2.setValue(focusType);

	///////////////////////////////////////
	////////// Category dropdown //////////
	///////////////////////////////////////

	// Initialize dropdown using selectize.js
	var $select1 = $('#kmeans-select-category').selectize({
		options: toOptionsFormat(["All Types", "Weapon Type", "Attack Type", "Target Type"], "Type"),
		optgroups: [{
			value: "Type",
			label: "Type"
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

				if (focusCategory === "All Types") {
					selectize2.load(function(callback) {
						callback(toOptionsFormat(["All Types"], focusCategory));
					});
					focusType = "All Types";
				} else {
					var types = getTypes();
					selectize2.load(function(callback) {
						callback(toOptionsFormat(types, focusCategory));
					});
					focusType = types[0];
				}
				selectize2.setValue(focusType);

				updateAll();
			}
		}
	});
	var selectize1 = $select1[0].selectize;
	selectize1.setValue(focusCategory);

	////////////////////////////////
	////////// K dropdown //////////
	////////////////////////////////

	var $select3 = $('#kmeans-select-k').selectize({
		options: toOptionsFormat(Object.keys(centroidsGrouped[focusType]).sort(), "K"),
		optgroups: [{
			value: "K",
			label: "K"
		}],
		optgroupField: 'class',
		labelField: 'name',
		searchField: ['name'],
		onChange: function(t) {
			if (t && +t != focusK) {
				focusK = +t;

				updateAll();
			}

		}
	});
	var selectize3 = $select3[0].selectize;
	selectize3.setValue(focusK);
}
