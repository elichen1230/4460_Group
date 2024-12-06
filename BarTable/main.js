// Set up the margins and dimensions for the bar chart
const margin = { top: 40, right: 200, bottom: 60, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Append the SVG container
const svg = d3
  .select("#bar-chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip setup
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Define the year range
const minYear = 1990;
const maxYear = 2024;

// Define the network colors
const networkColors = {
  "netflix": "#8dd3c7",
  "fox": "#ffffb3",
  "disney+": "#bebada",
  "cbs": "#fb8072",
  "prime video": "#80b1d3",
  "nbc": "#fdb462",
  "hulu": "#b3de69"
};

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
    d.vote_count = +d.vote_count;
    d.popularity = +d.popularity;
  });

  // Function to update the chart based on the selected year range and metric
  function updateChart(yearRange, metric) {
    // Filter data within the selected year range
    const filteredData = data.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]);

    // Count occurrences of each network based on the selected metric
    const networkCounts = d3.rollups(
      filteredData,
      (v) => d3.sum(v, (d) => d[metric]),
      (d) => d.networks
    );

    // Prepare data for the bar chart
    const barData = networkCounts.map(([network, count]) => ({ network, count }));

    // Sort data by count
    barData.sort((a, b) => b.count - a.count);

    // Update scales
    const xScale = d3
      .scaleBand()
      .domain(barData.map((d) => d.network))
      .range([0, width])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(barData, (d) => d.count)])
      .nice()
      .range([height, 0]);

    // Clear SVG before redrawing
    svg.selectAll("*").remove();

    // Add X-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    // Add Y-axis
    svg.append("g").call(d3.axisLeft(yScale));

    // Add bars with transition
    svg
      .selectAll(".bar")
      .data(barData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.network))
      .attr("y", height)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => networkColors[d.network.toLowerCase()] || "#69b3a2") // Use network color or default
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`<strong>Network:</strong> ${d.network}<br/><strong>Count:</strong> ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        d3.select(this).style("opacity", 0.7);

        // Update the table with the most popular genre and show
        updateTable(d.network);
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(this).style("opacity", 1);
      })
      .transition()
      .duration(800)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => height - yScale(d.count));
  }

  // Function to update the table
  function updateTable(network) {
    const networkData = data.filter((d) => d.networks === network);

    // Find the most popular genre and show
    const genreCounts = d3.rollups(
      networkData.flatMap((d) => d.genres.split(",").map((genre) => genre.trim())),
      (v) => v.length,
      (genre) => genre
    );
    const mostPopularGenre = genreCounts.sort((a, b) => b[1] - a[1])[0][0];

    const mostPopularShow = networkData.sort((a, b) => b.popularity - a.popularity)[0].name;

    // Update the table with fade-in effect
    d3.select("#table-body")
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", function () {
        d3.select(this)
          .html(
            `<tr>
              <td>${network}</td>
              <td>${mostPopularGenre}</td>
              <td>${mostPopularShow}</td>
            </tr>`
          )
          .transition()
          .duration(500)
          .style("opacity", 1);
      });
  }

  // Render the initial chart
  updateChart([minYear, maxYear], "vote_count");

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
      const metric = document.getElementById("metricSelector").value;
      updateChart(val, metric);
    });

  d3.select("#year-slider")
    .append("svg")
    .attr("width", 900)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(sliderRange);

  // Event listener for metric selector
  document.getElementById("metricSelector").addEventListener("change", () => {
    const yearRange = sliderRange.value();
    const metric = document.getElementById("metricSelector").value;
    updateChart(yearRange, metric);
  });
});