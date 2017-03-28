function loadKMeans() {

	///////////////////////////////////////////////////////////////////////////
	//////////////////// Set up and initiate svg containers ///////////////////
	///////////////////////////////////////////////////////////////////////////

	// Make svg size scalable
	var svgW = $("#kmeans")
		.width();
	var svgH = 0.7 * svgW;
	var margin = {
			left: 30,
			top: 20,
			right: 30,
			bottom: 50
		},
		width = svgW - margin.left - margin.right,
		height = svgH - margin.top - margin.bottom;

	var svg = d3.select("#kmeans")
		.append("svg")
		.attr("width", svgW)
		.attr("height", svgH)
		.append("g") // New coordinate system (= clipPath)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Else our map will extend our working area "g" of svg
	svg.append("clipPath")
		.attr("id", "kmeans-map-area")
		.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("width", width)
		.attr("height", height);

	///////////////////////////////////////////////////////////////////////////
	/////////////////////////////// Load GeoJSON //////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	d3.json("geojson/sfpddistricts.geojson", function(json) {

		// 3D space is “projected” onto a 2D plane
		var projection = d3.geoMercator()
			.center([-122.433701, 37.767683])
			.scale(230000) // default scale is 1000 (which is the world level)
			.translate([width / 2, height / 2]); // translate to the center of the SVG

		// Transform features in GeoJSON to SVG paths (creates a function)
		var path = d3.geoPath()
			.projection(projection);

		///////////////////////////////////////////////////////////////////////////
		/////////////////////////////// Load centroids ////////////////////////////
		///////////////////////////////////////////////////////////////////////////

		d3.csv("data/kmeans_centroids.csv", function(error, centroids_data) {

			// Methods to access important properties
			var getLon = function(d) {
				return +d.lon; // change data format inline
			};
			var getLat = function(d) {
				return +d.lat;
			};
			var getIndex = function(d) {
				return +d.index;
			};
			var getK = function(d) {
				return +d.K;
			};
			var getXY = function(d) {
				return projection([getLon(d), getLat(d)]);
			};
			var getCount = function(d) {
				return +d.count;
			};

			// Group centroids by k
			var kmeans = {};
			centroids_data.forEach(function(d, i) {
				// Append to each centroid unique index which will act as a key
				d.index = i;
				d.x = getXY(d)[0];
				d.y = getXY(d)[1];

				var group = getK(d);
				if (!kmeans[group]) {
					kmeans[group] = [];
				}
				kmeans[group].push(d);
			});

			var K = 3;
			var centroids = kmeans[K];

			///////////////////////////////////////////////////////////////////////////
			////////////////////////////// Setup color ////////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			var cScale = d3.scaleOrdinal(d3.schemeCategory10);
			var cMap = function(d) {
				return d3.color(cScale(getIndex(d)));
			};

			///////////////////////////////////////////////////////////////////////////
			/////////////////////////////// Load points ///////////////////////////////
			///////////////////////////////////////////////////////////////////////////

			d3.csv("data/kmeans_points.csv", function(error, points_data) {

				///////////////////////////////////////////////////////////////////////////
				////////////////////////////////// Hexbin data ////////////////////////////
				///////////////////////////////////////////////////////////////////////////

				var hexbin = d3.hexbin()
					.extent([
						[-margin.left, -margin.top],
						[width + margin.right, height + margin.bottom]
					])
					.radius(5);

				var euclideanDistance = function(x1, y1, x2, y2) {
					return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
				};

				var nearestCentroidIndex = function(x, y) {
					var minIndex = getIndex(centroids[0]);
					var minDistance = euclideanDistance(x, y, centroids[0].x, centroids[0].y);
					centroids.forEach(function(d, i) {
						distance = euclideanDistance(x, y, d.x, d.y);
						if (distance < minDistance) {
							minDistance = distance;
							minIndex = getIndex(d);
						}
					});
					return minIndex;
				};

				var bins = hexbin(points_data.map(getXY));

				var updateBinClasses = function() {
					bins.forEach(function(d, i) {
						d.index = nearestCentroidIndex(d.x, d.y);
						centroids.forEach(function(c, j) {
							if (getIndex(c) == getIndex(d)) {
								if (c.hasOwnProperty("count")) {
									c.count = c.count + d.length;
								} else {
									c.count = 0;
								}
							}
						});
					});
				};

				updateBinClasses();

				///////////////////////////////////////////////////////////////////////////
				////////////////////////////// Draw the map ///////////////////////////////
				///////////////////////////////////////////////////////////////////////////

				svg.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("clip-path", "url(#kmeans-map-area)")
					.attr("stroke", "white")
					.attr("stroke-width", 2)
					.attr("fill", "lightgrey")
					.attr("opacity", 0.7)
					.attr("d", path);

				///////////////////////////////////////////////////////////////////////////
				///////////////////////////// Draw the labels /////////////////////////////
				///////////////////////////////////////////////////////////////////////////

				// Get average coordinates of each district
				labels = [];
				json.features.forEach(function(d, i) {
					var coordinates;
					// There is one MultiPolygon (SOUTHERN district)
					if (d.geometry.type == "MultiPolygon") {
						coordinates = d.geometry.coordinates[1][0];
					} else {
						coordinates = d.geometry.coordinates[0];
					}
					var minMaxX = d3.extent(coordinates, function(c) {
						return projection(c)[0];
					});
					var minMaxY = d3.extent(coordinates, function(c) {
						return projection(c)[1];
					});
					labels.push({
						district: d.properties.DISTRICT,
						x: 0.5 * minMaxX[0] + 0.5 * minMaxX[1],
						y: 0.5 * minMaxY[0] + 0.5 * minMaxY[1]
					});
				});

				svg.selectAll(".district-label")
					.data(labels)
					.enter()
					.append("text")
					.classed("district-label", true)
					.attr("x", function(d) {
						return d.x;
					})
					.attr("y", function(d) {
						return d.y;
					})
					.attr("opacity", 0.7)
					.attr("fill", d3.color("lightgrey").darker(1.5))
					.text(function(d) {
						return d.district;
					});

				///////////////////////////////////////////////////////////////////////////
				////////////////////////////// Draw the bins //////////////////////////////
				///////////////////////////////////////////////////////////////////////////

				svg.selectAll(".bin")
					.data(bins)
					.enter()
					.append("path")
					.classed("bin", true)
					.attr("opacity", 0)
					.attr("transform", function(d) {
						return "translate(" + d.x + "," + d.y + ")";
					})
					.attr("d", hexbin.hexagon());

				function updateBins() {
					svg.selectAll(".bin")
						.data(bins)
						.transition()
						.duration(1000)
						.attr("fill", function(d) {
							return d3.color(cScale(d.index));
						})
						.attr("opacity", 0.7);
				}

				updateBins();

				///////////////////////////////////////////////////////////////////////////
				/////////////////////////// Draw the centroids ////////////////////////////
				///////////////////////////////////////////////////////////////////////////

				function updateCentroids() {
					var t = d3.transition()
						.duration(1000);
					centroid_paths = svg.selectAll(".centroid")
						.data(centroids, getIndex);
					centroid_paths.exit()
						.transition(t)
						.attr("opacity", 0)
						.remove();
					centroid_paths.enter()
						.append("circle")
						.classed("centroid", true)
						.attr("cx", function(d) {
							return projection([getLon(d), getLat(d)])[0];
						})
						.attr("cy", function(d) {
							return projection([getLon(d), getLat(d)])[1];
						})
						.attr("r", 25)
						.attr("fill", cMap)
						.attr("stroke", function(d) {
							return cMap(d).darker(0.5);
						})
						.attr("stroke-width", 0.15 * 25)
						.on("mouseover", function(d, i) {
							d3.selectAll(".centroid")
								.attr("opacity", function(c) {
									if (getIndex(d) == getIndex(c)) {
										return 1;
									} else {
										return 0.3;
									}
								});
							d3.selectAll(".bin")
								.attr("opacity", function(b) {
									if (getIndex(d) == getIndex(b)) {
										return 1;
									} else {
										return 0.3;
									}
								});
							tip.show(d);
						})
						.on("mouseout", function(d, i) {
							d3.selectAll(".centroid")
								.attr("opacity", 0.7);
							d3.selectAll(".bin")
								.attr("opacity", 0.7);
							tip.hide(d);
						})
						.attr("opacity", 0)
						.transition(t)
						.attr("opacity", 0.7);
				}

				updateCentroids();

				///////////////////////////////////////////////////////////////////////////
				///////////////////////// Set up and call tooltip /////////////////////////
				///////////////////////////////////////////////////////////////////////////

				var tip = d3.tip()
					.attr("class", "d3-tip")
					.direction("ne")
					.html(function(d) {
						return "<span style='color:" + cMap(d).brighter(0.5) + "'>X: " + getLon(d) + "<br><br>Y: " + getLat(d) + "</span><br><br><span style='color:white'>" + getCount(d) + " crimes</span>";
					});
				svg.call(tip);

				///////////////////////////////////////////////////////////////////////////
				////////////////////// Populate and handle K dropdown /////////////////////
				///////////////////////////////////////////////////////////////////////////

				// Handle category selection
				d3.select("#kmeans-k-menu-button")
					.text("K = " + K);
				d3.select("#kmeans-k-dropdown")
					.selectAll("li")
					.data(Object.keys(kmeans).sort())
					.enter()
					.append("li")
					.append("button")
					.classed("dropdown-item", true)
					.text(function(d) {
						if (d == 3) {
							return "K = 3 (optimal)";
						} else {
							return "K = " + d;
						}
					})
					.on("click", function(d) {
						K = +d.slice(-1);
						centroids = kmeans[K];

						updateBinClasses();
						updateBins();
						updateCentroids();

						d3.select("#kmeans-k-menu-button")
							.text("K = " + d);
					});
			});
		});
	});
}

loadKMeans();
