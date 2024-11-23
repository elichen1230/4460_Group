const margin = { top: 40, right: 20, bottom: 60, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const minYear = 1990;
const maxYear = 2024;

// Create SVG
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Add chart title
svg
  .append("text")
  .attr("class", "chart-title")
  .attr("x", width / 2)
  .attr("y", -10)
  .style("text-anchor", "middle")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .text("TV Network Metrics Over Time");

// Create tooltip
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Create color scale
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// Load and process data
d3.csv("specific_networks.csv").then(function (data) {
  // Process the data
  data.forEach((d) => {
    const parsedDate = new Date(d.first_air_date);
    d.year = !isNaN(parsedDate) ? parsedDate.getFullYear() : null;
    d.vote_count = +d.vote_count;
    d.popularity = +d.popularity;

    // Parse networks
    try {
      d.networks = JSON.parse(d.networks.replace(/'/g, '"'));
    } catch (e) {
      try {
        d.networks = d.networks.split(",").map((network) => ({
          name: network.trim(),
        }));
      } catch (e) {
        d.networks = [{ name: d.networks || "Unknown" }];
      }
    }
  });

  // Filter out entries with invalid years and outside our range
  data = data.filter(
    (d) => d.year !== null && d.year >= minYear && d.year <= maxYear
  );

  // Create the slider
  const sliderRange = d3
    .sliderBottom()
    .min(minYear)
    .max(maxYear)
    .width(800)
    .tickFormat(d3.format("d"))
    .ticks(12)
    .step(1)
    .default(maxYear)
    .fill("#2196f3")
    .on("onchange", (val) => {
      document.getElementById(
        "year-range"
      ).textContent = `Selected Year: ${val}`;
      updateChart();
    });

  // Add the slider to the page
  d3.select("#year-slider")
    .append("svg")
    .attr("width", 900)
    .attr("height", 100)
    .append("g")
    .attr("transform", "translate(30,30)")
    .call(sliderRange);

  // Function to aggregate data by network
  function aggregateByNetwork(data, year, metric) {
    const networkData = {};

    data
      .filter((d) => d.year === year)
      .forEach((d) => {
        d.networks.forEach((network) => {
          if (!networkData[network.name]) {
            networkData[network.name] = 0;
          }
          networkData[network.name] += d[metric];
        });
      });

    return Object.entries(networkData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15); // Top 15 networks
  }

  // Scales
  const x = d3.scaleBand().range([0, width]).padding(0.1);
  const y = d3.scaleLinear().range([height, 0]);

  // Add grid lines
  const gridLines = svg
    .append("g")
    .attr("class", "grid")
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0.1);

  // Add axes
  const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
  const yAxis = svg.append("g");

  // Add axis labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2},${height + 40})`)
    .style("text-anchor", "middle")
    .text("Networks");

  const yLabel = svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -height / 2)
    .style("text-anchor", "middle");

  // Function to update the visualization
  function updateChart() {
    const year = sliderRange.value();
    const metric = document.getElementById("metricSelector").value;
    const filteredData = aggregateByNetwork(data, year, metric);

    // Debug logs
    console.log("Current year:", year);
    console.log("Current metric:", metric);
    console.log("Filtered data:", filteredData);

    // Update scales
    x.domain(filteredData.map((d) => d.name));
    y.domain([0, d3.max(filteredData, (d) => d.value)]);

    // Update grid lines
    gridLines
      .transition()
      .duration(750)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Update axes with transitions
    xAxis
      .transition()
      .duration(750)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", "rotate(-45)");

    yAxis.transition().duration(750).call(d3.axisLeft(y));

    // Update y-axis label
    yLabel.text(metric === "vote_count" ? "Vote Count" : "Popularity");

    // Update bars with proper data binding
    const bars = svg.selectAll(".bar").data(filteredData);

    // Remove old bars
    bars.exit().remove();

    // Add new bars
    const newBars = bars.enter().append("rect").attr("class", "bar");

    // Update all bars (both new and existing)
    bars
      .merge(newBars)
      .transition()
      .duration(750)
      .attr("x", (d) => x(d.name))
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => height - y(d.value))
      .attr("fill", (d) => colorScale(d.name));

    // Add tooltip events
    svg
      .selectAll(".bar")
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `${d.name}<br/>${
              metric === "vote_count" ? "Votes: " : "Popularity: "
            }${d.value.toLocaleString()}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      });
  }

  // Event listener for metric selector
  document
    .getElementById("metricSelector")
    .addEventListener("change", updateChart);

  // Initial rendering
  updateChart();
});
