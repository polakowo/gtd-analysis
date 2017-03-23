function loadScatterplot() {

    function generateRandomData(number) {
        var maxValue = 300;
        var ds = [];
        for (var i = 0; i < number; i++) {
            ds.push([Math.round(Math.random() * maxValue), Math.round(Math.random() * maxValue)]);
        }
        return ds;
    }

    var dataset = generateRandomData(30);

    var svgW = 800;
    var svgH = 400;

    // Clip margin
    var clipM = {
            left: 40,
            top: 20,
            right: 20,
            bottom: 40
        },
        clipW = svgW - clipM.left - clipM.right,
        clipH = svgH - clipM.top - clipM.bottom;

    var svg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH);

    svg.append("clipPath")
        .attr("id", "chart-area")
        .append("rect")
        .attr("x", clipM.left)
        .attr("y", clipM.top)
        .attr("width", clipW)
        .attr("height", clipH);

    svg.append("g")
        .attr("id", "circles")
        .attr("clip-path", "url(#chart-area)") // we could append clip-path attribute to every cicle, but with g its easier
        .selectAll(".circle")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "circle");

    var xG = svg.append("g")
        .attr("transform", "translate(0," + (clipH + clipM.top) + ")"); // first argument is x, second y
    var yG = svg.append("g")
        .attr("transform", "translate(" + clipM.left + ",0)");

    function updateChart() {

        var xMax = d3.max(dataset, function(d) {
            return d[0];
        });
        var yMax = d3.max(dataset, function(d) {
            return d[1];
        });

        var xScale = d3.scaleLinear()
            .domain([0, xMax])
            .rangeRound([clipM.left, clipW + clipM.left]);
        var yScale = d3.scaleLinear()
            .domain([0, yMax])
            .rangeRound([clipH + clipM.top, clipM.top]); // Reverse the scale for y (good for Axis creation, else reversed ticks order)
        var rScale = d3.scaleLinear()
            .domain([0, xMax + yMax])
            .rangeRound([0, 10]);

        svg.selectAll(".circle")
            .data(dataset)
            .transition()
            .delay(function(d, i) {
                return i / dataset.length * 500;
            })
            .duration(500)
            .ease(d3.easeCubic)
            .attr("cx", function(d) {
                return xScale(d[0]);
            })
            .attr("cy", function(d) {
                return yScale(d[1]);
            })
            .attr("r", function(d) {
                return 2 + rScale(d[0] + d[1]);
            });

        var xAxis = d3.axisBottom(xScale);
        xG.transition()
            .duration(500)
            .call(xAxis);
        var yAxis = d3.axisLeft(yScale);
        yG.transition()
            .duration(500)
            .call(yAxis);
    }

    updateChart();

    d3.select("#scatterplot-randomize").on("click", function() {
        dataset = generateRandomData(dataset.length);

        updateChart();
    });
}
