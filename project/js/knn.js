function loadKNN() {

	////////////////////////////////////////
	////////// SVG and containers //////////
	////////////////////////////////////////

	var svgW = $("#knn")
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
	var svg = d3.select("#svg-knn")
		.attr("width", svgW)
		.attr("height", svgH)
		.on("mousemove", mousemove)
		.on("mouseleave", mouseleave)
		.on("wheel", wheel);
	// Append rect for colouring background
	svg.append("rect")
		.attr("class", "svg-bg");
	// Append inner plot area (just new coordinate system)
	var clip = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Else our map will extend our working area "g" of svg
	clip.append("clipPath")
		.attr("id", "knn-area")
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
		.attr("clip-path", "url(#knn-area)")
		.attr("class", "graticule")
		.attr("d", path)
		.attr("pointer-events", "none");

	//////////////////////////
	////////// Land //////////
	//////////////////////////

	clip.selectAll("path.land")
		.data(this.data.worldMap.features)
		.enter()
		.append("path")
		.attr("clip-path", "url(#knn-area)")
		.attr("class", "land")
		.attr("d", path)
		.attr("fill", "#C7C7C7")
		.attr("pointer-events", "none");

	//////////////////////////////
	////////// k-d tree //////////
	//////////////////////////////

	// Calculate Euclidean distance
	var distance = function(a, b) {
		return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
	};

	// More efficient than d3.quadtree, but also has in-built knn-functionality
	var tree = new kdTree(this.data.pointsData.map(function(d) {
		d.x = getX(d);
		d.y = getY(d);
		return d;
	}), distance, ["x", "y"]);

	/////////////////////////////////
	////////// Color scale //////////
	/////////////////////////////////

	var categories = {
		"Weapon Type": "weapontype",
		"Attack Type": "attacktype",
		"Target Type": "targettype"
	};

	var focusCategory = "Weapon Type";

	var cScale = d3.scaleOrdinal(d3.schemeCategory10);
	var cMap = function(d) {
		return d3.color(cScale(d[categories[focusCategory]]));
	};

	/////////////////////////////
	////////// Tooltip //////////
	/////////////////////////////

	var tip = d3.tip()
		.attr("class", "d3-tip")
		.direction("ne");
	svg.call(tip);

	////////////////////////////////////
	////////// Classification //////////
	////////////////////////////////////

	// Number of neighbors
	var kMin = 2;
	var kMax = 100;
	var focusK = 50;

	// Classify (get the most common type among the points)
	function classify(points) {
		var pointsGrouped = d3.nest()
			.key(function(d) {
				return d[categories[focusCategory]];
			})
			.object(points);

		var max = 0;
		var result;
		for (var type in pointsGrouped) {
			if (pointsGrouped.hasOwnProperty(type)) {
				if (pointsGrouped[type].length > max) {
					max = pointsGrouped[type].length;
					result = type;
				}
			}
		}
		return result;
	}

	// Find neighbors
	function findNeighbors(x, y) {
		var nearest = tree.nearest({
			x: x,
			y: y
		}, focusK);

		var result = [];
		nearest.forEach(function(d, i) {
			result.push(d[0]);
		});

		return result;
	}

	// Get distance (for zone)
	function zoneDiameter(root, points) {
		var maxDistance = 0;
		points.forEach(function(d, i) {
			if (distance(root, d) > maxDistance) {
				maxDistance = distance(root, d);
			}
		});
		return maxDistance;
	}

	// Find neighbors, classify the root and draw on the map
	function mousemove() {
		preventDefault(event);

		var root = {
			x: d3.mouse(this)[0] - margin.left, // adjust for clip
			y: d3.mouse(this)[1] - margin.top
		};

		if (root.x < 0 || root.y < 0 || root.x > width || root.y > height) {
			mouseleave();
			return;
		}

		var neighbors = findNeighbors(root.x, root.y);

		root[categories[focusCategory]] = classify(neighbors);
		// Number of neighbors of same class divided by number of all neighbors (that is, share)
		root.share = Math.round(d3.sum(neighbors, function(d) {
			if (d[categories[focusCategory]] === root[categories[focusCategory]]) {
				return 1;
			} else {
				return 0;
			}
		}) / neighbors.length * 10000) / 100;

		///////////////////////////////
		////////// Draw zone //////////
		///////////////////////////////

		var diameter = zoneDiameter(root, neighbors);

		clip.select("#zone")
			.remove();

		var target = clip.append("circle")
			.attr("clip-path", "url(#knn-area)")
			.attr("id", "zone")
			.attr("cx", root.x)
			.attr("cy", root.y)
			.attr("r", diameter)
			.attr("fill", cMap(root))
			.attr("fill-opacity", 0.3)
			.attr("stroke", cMap(root).darker(0.5))
			.attr("stroke-opacity", 0.5)
			.attr("stroke-width", 2)
			.attr("pointer-events", "none")
			.node();

		////////////////////////////////////
		////////// Draw neighbors //////////
		////////////////////////////////////

		// Remove last point
		clip.selectAll(".neighbors")
			.remove();

		// Color nearest points
		clip.selectAll(".neighbors")
			.data(neighbors)
			.enter()
			.append("path")
			.attr("class", "neighbors")
			.attr("d", d3.symbol().type(d3.symbolTriangle).size(64))
			.attr("transform", function(d) {
				return "translate(" + getX(d) + "," + getY(d) + ")";
			})
			.attr("fill", cMap)
			.attr("opacity", 0.7)
			.attr("pointer-events", "none");

		////////////////////////////
		////////// Tooltip//////////
		////////////////////////////

		tip.hide();

		tip.html(function(d) {
				var homeCountry = getCountry(root);
				if (!homeCountry) {
					// There may be no country under hexagon (think of water)
					homeCountry = "";
				} else {
					homeCountry = "<br><br><span style='color:grey'>" + homeCountry + "</span>";
				}
				return "<span style='color:" + cMap(root).brighter(0.5) + "'>" + root[categories[focusCategory]] + "</span>" + homeCountry + "<br><hr style='border-color:grey'>Share: " + root.share + "%";
			})
			.show(null, target);
	}

	function mouseleave() {
		clip.selectAll("#zone")
			.remove();

		clip.selectAll(".neighbors")
			.remove();

		tip.hide();
	}

	function wheel() {
		var wheelUp = event.deltaY < 0;
		focusK = wheelUp ? focusK + 1 : focusK - 1;
		focusK = clamp(focusK, kMin, kMax); // limit k to be between 1 and 100
		$('#knn-slider-range').prop('value', focusK);
		mousemove.call(this);

		updateAll();
	}

	function clamp(d, min, max) {
		return d < min ? min : d > max ? max : d;
	}

	function preventDefault(e) {
		e = e || window.event;
		if (e.preventDefault) e.preventDefault();
		e.returnValue = false;
	}

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
		tmp.innerHTML = "Classification by <tspan style='font-style: italic;'>" + focusCategory + "</tspan> Using <tspan style='font-style: italic;'>k=" + focusK + "</tspan> Nearest Neighbors";
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

	// Once user changes the category update the entire chart
	function updateAll() {

		setTitle();
	}

	///////////////////////////////////////
	////////// Category dropdown //////////
	///////////////////////////////////////

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
	var $select1 = $('#knn-select-category').selectize({
		options: toOptionsFormat(Object.keys(categories).sort(), "Category"),
		optgroups: [{
			value: "Category",
			label: "Category"
		}],
		optgroupField: 'class',
		labelField: 'name',
		searchField: ['name'],
		onChange: function(t) {
			// If we don't do t != focusCategory, the method will be called twice
			if (t && t != focusCategory) {
				focusCategory = t;

				updateAll();
			}
		}
	});
	var selectize1 = $select1[0].selectize;
	selectize1.setValue(focusCategory);

	//////////////////////////////
	////////// k slider //////////
	//////////////////////////////

	var sliderRange = $('#knn-slider-range');
	var sliderMin = $('#knn-slider-min');
	var sliderMax = $('#knn-slider-max');

	sliderMin.html(kMin);
	sliderMax.html(kMax);
	sliderRange.prop('min', kMin);
	sliderRange.prop('max', kMax);
	sliderRange.prop('value', focusK);

	// The value on the slider changed
	sliderRange.on("input", function() {
		focusK = +this.value;
		updateAll();
	});
}
