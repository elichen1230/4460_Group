// Pie Chart (NOT USING THIS ONE)

// Set up the margins and dimensions
const margin = { top: 40, right: 200, bottom: 40, left: 60 };
const width = 600;
const height = 600;
const radius = Math.min(width, height) / 2;

// Append the SVG container
const svg = d3
  .select("#pie-chart1")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${(width + margin.left) / 2},${(height + margin.top) / 2})`);

// Tooltip setup
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Define the year range
const minYear = 1990;
const maxYear = 2024;

// Load and process data
d3.csv("specific_networks.csv").then((data) => {
  // Filter data within the year range
  data = data.filter((d) => {
    const year = new Date(d.first_air_date).getFullYear();
    return year >= minYear && year <= maxYear;
  });

  // Add a year property to each data entry
  data.forEach((d) => {
    d.year = new Date(d.first_air_date).getFullYear();
  });

  // Function to update the chart based on the selected year range
  function updateChart(yearRange) {
    // Filter data within the selected year range
    const filteredData = data.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]);

    // Count the occurrences of each genre
    const genreCounts = d3.rollups(
      filteredData.flatMap((d) =>
        d.genres
          .split(",")
          .map((genre) => genre.trim())
          .filter((genre) => genre !== "") // Exclude empty genres
      ),
      (v) => v.length,
      (genre) => genre
    );

    // Prepare data for the pie chart
    const pieData = genreCounts.map(([genre, count]) => ({ genre, count }));

    // Create the pie and arc generators
    const pie = d3.pie().sort(null).value((d) => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Set up the color scale
    const color = d3.scaleOrdinal().domain(pieData.map((d) => d.genre)).range(d3.schemeSet3);

    // Bind data to the pie chart paths
    const pieGroups = svg.selectAll("path").data(pie(pieData));

    // Remove old elements
    pieGroups.exit().remove();

    // Append new paths
    const newPaths = pieGroups
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.genre))
      .attr("stroke", "#fff")
      .style("stroke-width", "2px");

    // Merge old and new paths with transition
    pieGroups.merge(newPaths).transition().duration(1000).attr("d", arc);

    // Add tooltips
    svg
      .selectAll("path")
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
      });

    // Add or update legends
    const legend = svg.selectAll(".legend").data(pieData, (d) => d.genre);

    const legendEnter = legend
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${radius + 20}, ${-radius + i * 20})`);

    legendEnter.append("rect").attr("width", 18).attr("height", 18).attr("fill", (d) => color(d.genre));

    legendEnter.append("text").attr("x", 24).attr("y", 9).attr("dy", ".35em").text((d) => d.genre);

    legend.merge(legendEnter).attr("transform", (d, i) => `translate(${radius + 20}, ${-radius + i * 20})`);

    legend.exit().remove();
  }

  // Render the initial chart
  updateChart([minYear, maxYear]);

  // Add a slider for interactivity
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

  d3.select("#year-slider1")
    .append("svg")
    .attr("width", 900)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(sliderRange);
});

console.log("page1.js loaded");