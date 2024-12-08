// Define the dimensions for the entire page
const baseWidth = 1600; // Base width for the entire page
const baseHeight = 1200; // Base height for the entire page

// Calculate the scale factor based on the desired width and height
const scaleFactor = .8; // Adjust this value to scale the entire page

// Set the scale factor as a CSS variable
document.documentElement.style.setProperty('--scale-factor', scaleFactor);
document.documentElement.style.setProperty('--base-width', `${baseWidth}px`);
document.documentElement.style.setProperty('--base-height', `${baseHeight}px`);

// Set up dimensions and radius for the pie chart
const width = 600 * scaleFactor;
const height = 600 * scaleFactor;
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
const treeWidth = 800 * scaleFactor;
const treeHeight = 800 * scaleFactor;
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
      .each(function (d) { this._current = d; }) // Store the initial angles
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
          const b = interpolate(t);
          b.innerRadius = 0;
          b.outerRadius = radius + 10 * Math.sin(t * Math.PI); // Add distortion
          return arc(b);
        };
      });

    paths
      .transition()
      .duration(1000)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1);
        return function (t) {
          const b = interpolate(t);
          b.innerRadius = 0;
          b.outerRadius = radius + 10 * Math.sin(t * Math.PI); // Add distortion
          return arc(b);
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
      .size([2 * Math.PI, radius - 50]) // Increased radius for longer edges
      .separation((a, b) => (a.parent === b.parent ? 0.8 : 1.5)); // Adjust separation for clarity

    treeLayout(root);

    // Convert polar coordinates to Cartesian for layout
    const radialPoint = (x, y) => [
      y * Math.cos(x - Math.PI / 2),
      y * Math.sin(x - Math.PI / 2),
    ];

    // Adjust the radial point calculation based on node depth
    const adjustedRadialPoint = (d) => {
      const depthMultiplier = d.depth === 1 ? 1 : 1.5; // Adjust multiplier for different depths
      return radialPoint(d.x, d.y * depthMultiplier);
    };

    // Clear previous tree elements
    svgTree.selectAll("*").remove();

    svgTree.attr("transform", `translate(${treeWidth / 2},${treeHeight / 2})`);

    // Add links with transition
    const links = svgTree
      .selectAll(".link")
      .data(root.links());

    links.enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", (d) => adjustedRadialPoint(d.source)[0])
      .attr("y1", (d) => adjustedRadialPoint(d.source)[1])
      .attr("x2", (d) => adjustedRadialPoint(d.source)[0])
      .attr("y2", (d) => adjustedRadialPoint(d.source)[1])
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2)
      .transition()
      .duration(1000)
      .attr("x2", (d) => adjustedRadialPoint(d.target)[0])
      .attr("y2", (d) => adjustedRadialPoint(d.target)[1]);

    links.transition()
      .duration(1000)
      .attr("x1", (d) => adjustedRadialPoint(d.source)[0])
      .attr("y1", (d) => adjustedRadialPoint(d.source)[1])
      .attr("x2", (d) => adjustedRadialPoint(d.target)[0])
      .attr("y2", (d) => adjustedRadialPoint(d.target)[1]);

    links.exit()
      .transition()
      .duration(500)
      .attr("x2", (d) => adjustedRadialPoint(d.source)[0])
      .attr("y2", (d) => adjustedRadialPoint(d.source)[1])
      .remove();

    // Add nodes with transition
    const nodes = svgTree
      .selectAll(".node")
      .data(root.descendants());

    const nodeEnter = nodes.enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${adjustedRadialPoint(d)[0]},${adjustedRadialPoint(d)[1]})`);

    nodeEnter.append("circle")
      .attr("r", 6) // Reduced node size for better spacing
      .attr("fill", "#69b3a2")
      .attr("stroke", "#555")
      .attr("stroke-width", 1.5);

    // Add background rectangles for text labels (initially hidden)
    const labelBackgrounds = nodeEnter.append("rect")
      .attr("class", "label-background")
      .attr("x", (d) => (d.x < Math.PI ? 10 : -10) - (d.data.name.length * 3.5)) // Center background
      .attr("y", -10) // Adjust y position to center the background
      .attr("width", (d) => d.data.name.length * 7) // Adjust width based on text length
      .attr("height", 20) // Fixed height
      .attr("fill", "rgba(0, 0, 0, 0.7)") // Black background
      .style("opacity", 0); // Initially hidden

    // Add text labels (initially hidden)
    const labels = nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.x < Math.PI ? 10 : -10)) // Position labels to the side
      .attr("text-anchor", (d) => (d.x < Math.PI ? "start" : "end"))
      .text((d) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "Arial, sans-serif")
      .style("fill", "#fff") // Set initial text color to white
      .style("opacity", 0); // Initially hidden

    // Show labels and backgrounds on hover
    nodeEnter.on("mouseover", function (event, d) {
      d3.select(this).select("text").transition().duration(200).style("opacity", 1);
      d3.select(this).select(".label-background").transition().duration(200).style("opacity", 0.7);
    }).on("mouseout", function (event, d) {
      d3.select(this).select("text").transition().duration(200).style("opacity", 0);
      d3.select(this).select(".label-background").transition().duration(200).style("opacity", 0);
    });

    nodes.transition()
      .duration(1000)
      .attr("transform", (d) => `translate(${adjustedRadialPoint(d)[0]},${adjustedRadialPoint(d)[1]})`);

    nodes.exit()
      .transition()
      .duration(500)
      .attr("transform", (d) => `translate(${adjustedRadialPoint(d)[0]},${adjustedRadialPoint(d)[1]})`)
      .remove();
  }

  updateChart([minYear, maxYear]);

  const sliderRange = d3
    .sliderBottom()
    .min(minYear)
    .max(maxYear)
    .width(800 * scaleFactor)
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
    .attr("width", 900 * scaleFactor)
    .attr("height", 100 * scaleFactor)
    .append("g")
    .attr("transform", `translate(${30 * scaleFactor},${30 * scaleFactor})`)
    .call(sliderRange);
});