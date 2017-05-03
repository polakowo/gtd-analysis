function loadData(callback) {
	d3.queue()
		// Data
		.defer(d3.csv, "data/histogram.csv")
		.defer(d3.csv, "data/scatterplot.csv")
		.defer(d3.csv, "data/choropleth.csv")
		.defer(d3.csv, "data/points.csv")
		.defer(d3.csv, "data/centroids.csv")
		// Dicts (contains map of all strings to reduce the size of each csv)
		.defer(d3.json, "dicts/strings.json")
		// Maps
		.defer(d3.json, "maps/world.json")
		.await(function(error,
				histogramData,
				scatterplotData,
				choroplethData,
				pointsData,
				centroidsData,
				stringsDict,
				worldMap) {
			if (error) throw error;

			histogramData.forEach(function(d, i) {
				// Convert strings to numbers
				d.nattacks = +d.nattacks;
				d.nkilled = +d.nkilled;
				d.nkilledter = +d.nkilledter;
				d.nwounded = +d.nwounded;
				d.nwoundedter = +d.nwoundedter;
				d.year = +d.year;

				// Decode data
				d.category = stringsDict[d.category];
				d.subcategory = stringsDict[d.subcategory];
			});

			scatterplotData.forEach(function(d, i) {
				d.nattacks = +d.nattacks;
				d.nkilled = +d.nkilled;
				d.nkilledter = +d.nkilledter;
				d.nwounded = +d.nwounded;
				d.nwoundedter = +d.nwoundedter;

				d.category = stringsDict[d.category];
				d.subcategory = stringsDict[d.subcategory];
				d.type = stringsDict[d.type];
				d.subtype = stringsDict[d.subtype];
			});

			choroplethData.forEach(function(d, i) {
				d.nattacks = +d.nattacks;
				d.nkilled = +d.nkilled;
				d.nkilledter = +d.nkilledter;
				d.nwounded = +d.nwounded;
				d.nwoundedter = +d.nwoundedter;
				d.year = +d.year;

				// Align with worldMap.features.id format
				d.id = stringsDict[d.countrycode].toUpperCase();
				delete d.countrycode;

				d.category = stringsDict[d.category];
				d.subcategory = stringsDict[d.subcategory];
			});

			pointsData.forEach(function(d, i) {
				d.lon = +d.lon;
				d.lat = +d.lat;

				d.weapontype = stringsDict[d.weapontype];
				d.attacktype = stringsDict[d.attacktype];
				d.targettype = stringsDict[d.targettype];
			});

			centroidsData.forEach(function(d, i) {
				d.lon = +d.lon;
				d.lat = +d.lat;
				d.k = +d.k;

				d.type = stringsDict[d.type];
			});

			this.data = {
				histogramData: histogramData,
				scatterplotData: scatterplotData,
				choroplethData: choroplethData,
				pointsData: pointsData,
				centroidsData: centroidsData,
				stringsDict: stringsDict,
				worldMap: worldMap
			};

			callback();
		});
}
