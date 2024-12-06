// Set up dimensions and radius for the pie chart
const width = 600;
const height = 600;
const radius = Math.min(width, height) / 2 - 40;

// Append the SVG container for the pie chart
const svgPie = d3
  .select("#pie-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${width / 2},${height / 2})`);

// Append the SVG container for the tree graph
const treeWidth = 800;
const treeHeight = 800;
const svgTree = d3
  .select("#tree-container")
  .append("svg")
  .attr("width", treeWidth)
  .attr("height", treeHeight)
  .append("g");

// Tooltip setup
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.7)")
  .style("color", "#fff")
  .style("padding", "8px")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("font-size", "12px")
  .style("box-shadow", "0 2px 6px rgba(0, 0, 0, 0.15)");

// Define the year range
const minYear = 1990;
const maxYear = 2024;

// Load and process data
d3.csv("specific_networks.csv").then((data) => {
  data = data.filter((d) => {
    const year = new Date(d.first_air_date).getFullYear();
    return year >= minYear && year <= maxYear;
  });

  data.forEach((d) => {
    d.year = new Date(d.first_air_date).getFullYear();
  });

  // Unique color scale for the pie chart
  const colorScale = d3.scaleOrdinal(d3.schemeSet3);

  function updateChart(yearRange) {
    const filteredData = data.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]);

    // Prepare pie chart data
    const genreCounts = d3.rollups(
      filteredData.flatMap((d) => d.genres.split(",").map((g) => g.trim())),
      (v) => v.length,
      (genre) => genre
    );

    const pieData = genreCounts
      .filter(([genre]) => genre !== "") // Exclude blank genres
      .map(([genre, count]) => ({ genre, count }));

    // Update Pie Chart
    const pie = d3.pie().value((d) => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const paths = svgPie.selectAll("path").data(pie(pieData));

    paths
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.genre))
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`<strong>Genre:</strong> ${d.data.genre}<br/><strong>Count:</strong> ${d.data.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        d3.select(this).style("opacity", 0.7);
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(this).style("opacity", 1);
      })
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(
          { startAngle: 0, endAngle: 0 },
          { startAngle: d.startAngle, endAngle: d.endAngle }
        );
        return function (t) {
          return arc(interpolate(t));
        };
      });

    paths
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current || d, d);
        this._current = interpolate(1);
        return function (t) {
          return arc(interpolate(t));
        };
      });

    paths
      .exit()
      .transition()
      .duration(500)
      .style("opacity", 0)
      .remove();

    // Update Tree Graph
    updateTree(filteredData);
  }

  function updateTree(data) {
    const genreCounts = d3.rollups(
      data.flatMap((d) => d.genres.split(",").map((g) => g.trim())),
      (v) => v.length,
      (genre) => genre
    );
  
    const topGenres = genreCounts
      .filter(([genre]) => genre !== "")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => {
        const shows = data
          .filter((d) => d.genres.split(",").map((g) => g.trim()).includes(genre))
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 3)
          .map((show) => ({ name: show.name }));
        return { name: genre, children: shows };
      });
  
    const treeData = {
      name: "Genres",
      children: topGenres,
    };
  
    const root = d3.hierarchy(treeData);
    const treeLayout = d3
      .tree()
      .size([2 * Math.PI, radius - 100]) // Reduced radius to keep visualization within bounds
      .separation((a, b) => (a.parent === b.parent ? 0.8 : 1.5)); // Adjust separation for clarity
  
    treeLayout(root);
  
    // Convert polar coordinates to Cartesian for layout
    const radialPoint = (x, y) => [
      y * Math.cos(x - Math.PI / 2),
      y * Math.sin(x - Math.PI / 2),
    ];
  
    // Clear previous tree elements
    svgTree.selectAll("*").remove();
  
    svgTree.attr("transform", `translate(${treeWidth / 2},${treeHeight / 2})`);
  
    // Add links
    svgTree
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", (d) => radialPoint(d.source.x, d.source.y)[0])
      .attr("y1", (d) => radialPoint(d.source.x, d.source.y)[1])
      .attr("x2", (d) => radialPoint(d.target.x, d.target.y)[0])
      .attr("y2", (d) => radialPoint(d.target.x, d.target.y)[1])
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);
  
    // Add nodes
    const nodes = svgTree
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr(
        "transform",
        (d) => `translate(${radialPoint(d.x, d.y)[0]},${radialPoint(d.x, d.y)[1]})`
      );
  
    nodes
      .append("circle")
      .attr("r", 6) // Reduced node size for better spacing
      .attr("fill", "#69b3a2")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5);
  
    // Add text labels
    nodes
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.x < Math.PI ? 10 : -10)) // Position labels to the side
      .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "Arial, sans-serif")
      .style("fill", "#333");
  }
  

  updateChart([minYear, maxYear]);

  const sliderRange = d3
    .sliderBottom()
    .min(minYear)
    .max(maxYear)
    .width(800)
    .tickFormat(d3.format("d"))
    .ticks(12)
    .step(1)
    .default([minYear, maxYear])
    .fill("#2196f3")
    .on("onchange", (val) => {
      updateChart(val);
    });

  d3.select("#year-slider")
    .append("svg")
    .attr("width", 900)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(sliderRange);
});