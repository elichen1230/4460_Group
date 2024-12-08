// Define the dimensions for the entire page
const baseWidth = 1600; // Base width for the entire page
const baseHeight = 1200; // Base height for the entire page

// Calculate the scale factor based on the desired width and height
const scaleFactor = 0.8; // Adjust this value to scale the entire page

// Set the scale factor as a CSS variable
document.documentElement.style.setProperty('--scale-factor', scaleFactor);
document.documentElement.style.setProperty('--base-width', `${baseWidth}px`);
document.documentElement.style.setProperty('--base-height', `${baseHeight}px`);

// Define the dimensions for the chart
const margin = { top: 40, right: 100, bottom: 100, left: 60 };
const width = (960 - margin.left - margin.right) * scaleFactor;
const height = (500 - margin.top - margin.bottom) * scaleFactor;

// Append the SVG container for the chart
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Define the year range
const minYear = 1990;
const maxYear = 2024;

// Tooltip setup
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load and process data
d3.csv("specific_networks.csv").then(function (data) {
  data = data.filter((d) => {
    const year = new Date(d.first_air_date).getFullYear();
    return year >= minYear && year <= maxYear;
  });

  data.forEach((d) => {
    d.year = new Date(d.first_air_date).getFullYear();
  });

  // Create the slider
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

  function processData(yearRange) {
    // Filter data by year range
    const filteredData = data.filter(
      (d) => d.year >= yearRange[0] && d.year <= yearRange[1]
    );

    // Get unique genres
    const allGenres = new Set();
    filteredData.forEach((d) => {
      d.genres.split(",").forEach((genre) => {
        allGenres.add(genre.trim());
      });
    });

    // Process data by genre and network
    const genreData = {};
    allGenres.forEach((genre) => {
      genreData[genre] = {};
    });

    filteredData.forEach((d) => {
      const genres = d.genres.split(",");
      genres.forEach((genre) => {
        const trimmedGenre = genre.trim();
        if (!genreData[trimmedGenre][d.networks]) {
          genreData[trimmedGenre][d.networks] = 0;
        }
        genreData[trimmedGenre][d.networks]++;
      });
    });

    return {
      genres: Array.from(allGenres).sort(), // Sort genres alphabetically
      data: genreData,
    };
  }

  function updateChart(yearRange) {
    // Update year range display
    d3.select("#year-range").text(
      `Selected Period: ${yearRange[0]} - ${yearRange[1]}`
    );

    const processedData = processData(yearRange);
    const networks = [...new Set(data.map((d) => d.networks))];

    // Update scales
    x.domain(processedData.genres);
    y.domain([
      0,
      d3.max(processedData.genres, (genre) => {
        return d3.sum(
          networks,
          (network) => processedData.data[genre][network] || 0
        );
      }),
    ]);

    // Update axes with transition
    svg
      .select(".x-axis")
      .transition()
      .duration(1000)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    svg.select(".y-axis").transition().duration(1000).call(d3.axisLeft(y));

    // Create the stacked data
    const stackedData = d3.stack().keys(networks)(
      processedData.genres.map((genre) => {
        const obj = { genre };
        networks.forEach((network) => {
          obj[network] = processedData.data[genre][network] || 0;
        });
        return obj;
      })
    );

    // Update bars
    const barGroups = svg.select(".bars").selectAll("g").data(stackedData);

    barGroups.exit().remove();

    const newBarGroups = barGroups
      .enter()
      .append("g")
      .attr("fill", (d) => color(d.key));

    const allBarGroups = barGroups.merge(newBarGroups);
    allBarGroups.attr("fill", (d) => color(d.key));

    const bars = allBarGroups.selectAll("rect").data((d) => d);

    bars
      .exit()
      .transition()
      .duration(1000)
      .attr("y", height)
      .attr("height", 0)
      .remove();

    const newBars = bars.enter().append("rect");

    bars
      .merge(newBars)
      .transition()
      .duration(1000)
      .attr("x", (d) => x(d.data.genre))
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

    // Update hover events
    allBarGroups
      .selectAll("rect")
      .on("mouseover", function (event, d) {
        const network = d3.select(this.parentNode).datum().key;
        const value = d[1] - d[0];

        tooltip.transition().duration(200).style("opacity", 0.9);

        tooltip
          .html(
            `
                    <strong>Genre:</strong> ${d.data.genre}<br/>
                    <strong>Network:</strong> ${network}<br/>
                    <strong>Count:</strong> ${value} shows<br/>
                    <strong>Years:</strong> ${yearRange[0]}-${yearRange[1]}
                `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");

        d3.select(this).style("opacity", 0.7);
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);

        d3.select(this).style("opacity", 1);
      });
  }

  // Set up initial scales
  const x = d3.scaleBand().range([0, width]).padding(0.1);

  const y = d3.scaleLinear().range([height, 0]);

  // Create color scale with a more vibrant palette
  const color = d3
    .scaleOrdinal()
    .domain([...new Set(data.map((d) => d.networks))])
    .range(d3.schemeSet3);

  // Add axes
  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  svg.append("g").attr("class", "y-axis");

  // Add Y axis label
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Number of Shows");

  // Add X axis label
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr(
      "transform",
      `translate(${width / 2}, ${height + margin.bottom - 10})`
    )
    .style("text-anchor", "middle")
    .text("Genres");

  // Create container for bars
  svg.append("g").attr("class", "bars");

  // Add legend
  const legend = svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "start")
    .attr("transform", `translate(${width + 10}, 0)`);

  const networks = [...new Set(data.map((d) => d.networks))];
  networks.forEach((network, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem
      .append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", color(network));

    legendItem
      .append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(network);
  });

  // Initialize the chart
  updateChart([minYear, maxYear]);
});