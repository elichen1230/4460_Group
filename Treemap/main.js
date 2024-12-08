// Define the dimensions for the entire page
const baseWidth = 800; // Base width for the entire page
const baseHeight = 600; // Base height for the entire page

// Calculate the scale factor based on the desired width and height
const scaleFactor = .8; // Adjust this value to scale the entire page

// Set the scale factor as a CSS variable
document.documentElement.style.setProperty('--scale-factor', scaleFactor);
document.documentElement.style.setProperty('--base-width', `${baseWidth}px`);
document.documentElement.style.setProperty('--base-height', `${baseHeight}px`);

// Append the SVG container for the treemap
const svg = d3.select("#bar-chart")
  .append("svg")
  .attr("width", baseWidth * 0.7)
  .attr("height", baseHeight * 0.7)
  .style("font-family", "Arial, sans-serif");

// Tooltip setup
const tooltip = d3.select("body")
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

// Define the network colors
const networkColors = {
  netflix: "#8dd3c7",
  fox: "#ffffb3",
  "disney+": "#bebada",
  cbs: "#fb8072",
  "prime video": "#80b1d3",
  nbc: "#fdb462",
  hulu: "#b3de69",
};

// Global variables to track the current view
let currentView = "network"; // Default view is "network"
let currentNetwork = null; // Tracks the selected network (if any)

// Load and process data
d3.csv("specific_networks.csv").then((data) => {
  // Filter and preprocess data
  data = data.filter((d) => {
    const year = new Date(d.first_air_date).getFullYear();
    return year >= minYear && year <= maxYear;
  });

  data.forEach((d) => {
    d.year = new Date(d.first_air_date).getFullYear();
    d.vote_count = +d.vote_count;
    d.popularity = +d.popularity;
  });

  // Add a color scale for genres
  const genreColorScale = d3
    .scaleOrdinal()
    .domain(data.flatMap((d) => d.genres.split(",").map((genre) => genre.trim()).filter((genre) => genre !== "")))
    .range(d3.schemeSet3);

  // Function to update the tree map
  function updateTreeMap(yearRange, metric, filterByNetwork = null) {
    // Dynamically calculate container dimensions
    const containerWidth = baseWidth * 0.7;
    const containerHeight = baseHeight * 0.7;

    let filteredData = data.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]);

    // If a network is clicked, filter data by that network
    if (filterByNetwork) {
      filteredData = filteredData.filter((entry) => entry.networks === filterByNetwork);

      // Aggregate data by genres for the selected network
      const genreCounts = d3.rollups(
        filteredData.flatMap((entry) => entry.genres.split(",").map((genre) => genre.trim()).filter((genre) => genre !== "")),
        (v) => v.length,
        (genre) => genre
      );

      // Prepare data for the treemap
      const genreData = genreCounts.map(([genre, count]) => ({ genre, count }));
      const root = d3
        .hierarchy({ children: genreData })
        .sum((d) => d.count);

      d3.treemap()
        .size([containerWidth, containerHeight]) // Match container size
        .paddingInner(1) // Small padding for readability
        (root);

      // Bind data to treemap nodes for genres
      renderTreemap(root.leaves(), "genre");
      return;
    }

    // Aggregate data by network
    const networkCounts = d3.rollups(
      filteredData,
      (v) => d3.sum(v, (d) => d[metric]),
      (d) => d.networks
    );

    // Prepare data for the treemap
    const networkData = networkCounts.map(([network, count]) => ({ network, count }));
    const root = d3
      .hierarchy({ children: networkData })
      .sum((d) => d.count);

    d3.treemap()
      .size([containerWidth, containerHeight]) // Match container size
      .paddingInner(1) // Small padding for readability
      (root);

    // Bind data to treemap nodes for networks
    renderTreemap(root.leaves(), "network");
  }

  // Function to render the treemap
  function renderTreemap(nodes, type) {
    const rects = svg.selectAll("g").data(nodes, (d) => (type === "network" ? d.data.network : d.data.genre));
  
    // Remove old nodes
    rects.exit().remove();
  
    // Enter new nodes
    const nodeEnter = rects
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .on("mouseover", function (event, d) {
        tooltip
          .transition()
          .duration(200)
          .style("opacity", 0.9);
        tooltip
          .html(
            `<strong>${type === "network" ? "Network" : "Genre"}:</strong> ${
              type === "network" ? d.data.network : d.data.genre
            }<br/><strong>Count:</strong> ${Math.round(d.value)}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
        d3.select(this).select("rect").style("stroke", "#000").style("stroke-width", 2);
  
        // For genres, show labels on hover
        if (type === "genre") {
          d3.select(this).select("text").transition().duration(200).style("opacity", 1);
        }
  
        // Update the table when hovering over a network
        if (type === "network") {
          updateTable(d.data.network);
        }
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(this).select("rect").style("stroke", "none");
  
        // Hide labels for genres on mouse out
        if (type === "genre") {
          d3.select(this).select("text").transition().duration(200).style("opacity", 0);
        }
      })
      .on("click", function (event, d) {
        if (type === "network") {
          currentView = "genre"; // Switch to genre view
          currentNetwork = d.data.network; // Store the selected network
          updateTreeMap([minYear, maxYear], "vote_count", d.data.network); // Update to show genres
        }
      });
  
    // Add rectangles
    nodeEnter
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) =>
        type === "network" ? networkColors[d.data.network.toLowerCase()] : genreColorScale(d.data.genre)
      )
      .attr("stroke", "none");
  
    // Add labels
    nodeEnter
      .append("text")
      .attr("dx", 5)
      .attr("dy", type === "network" ? 20 : 15) // Adjust vertical alignment for labels
      .style("font-size", type === "network" ? "24px" : "12px") // Adjust font size for networks
      .style("fill", "#000") // Black for both networks and genres
      .style("opacity", type === "network" ? 1 : 0) // Always visible for networks, hidden for genres
      .text((d) => (type === "network" ? d.data.network : d.data.genre))
      .each(function (d) {
        adjustFontSizeToFit(this, d.x1 - d.x0, d.y1 - d.y0);
      });
  
    // Update existing nodes
    rects
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .select("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0);
  
    rects
      .select("text")
      .text((d) => (type === "network" ? d.data.network : d.data.genre))
      .style("font-size", type === "network" ? "24px" : "12px")
      .style("fill", "#000") // Black for both networks and genres
      .style("opacity", type === "network" ? 1 : 0) // Ensure text visibility matches the type
      .each(function (d) {
        adjustFontSizeToFit(this, d.x1 - d.x0, d.y1 - d.y0);
      });
  }

  // Function to adjust font size to fit within the rectangle
  function adjustFontSizeToFit(textElement, width, height) {
    const text = d3.select(textElement);
    let fontSize = parseInt(text.style("font-size"));
    while (text.node().getBBox().width > width || text.node().getBBox().height > height) {
      fontSize -= 1;
      text.style("font-size", `${fontSize}px`);
    }
  }

  // Render the initial tree map
  updateTreeMap([minYear, maxYear], "vote_count");

  // Add a slider for interactivity
  const sliderRange = d3
  .sliderBottom()
  .min(minYear)
  .max(maxYear)
  .width(baseWidth * 0.9) // Width matches the CSS
  .ticks(12)
  .tickFormat(d3.format("d")) // Use "d" format to remove commas
  .default([minYear, maxYear])
  .fill("#2196f3")
  .on("onchange", (val) => {
    const metric = document.getElementById("metricSelector").value;
    if (currentView === "genre" && currentNetwork) {
      updateTreeMap(val, metric, currentNetwork);
    } else {
      updateTreeMap(val, metric);
    }
  });

d3.select("#year-slider")
  .append("svg")
  .attr("width", baseWidth * 0.9 + 40) // Extra width for padding
  .attr("height", 100)
  .append("g")
  .attr("transform", "translate(20,30)") // Center slider properly
  .call(sliderRange);



  // Event listener for metric selector
  document.getElementById("metricSelector").addEventListener("change", () => {
    const yearRange = sliderRange.value();
    const metric = document.getElementById("metricSelector").value;
    if (currentView === "genre" && currentNetwork) {
      updateTreeMap(yearRange, metric, currentNetwork);
    } else {
      updateTreeMap(yearRange, metric);
    }
  });

  // Add reset button functionality
  d3.select("#reset-button").on("click", () => {
    currentView = "network"; // Reset to network view
    currentNetwork = null; // Clear selected network
    updateTreeMap([minYear, maxYear], "vote_count"); // Reset to original view
  });

  function updateTable(network) {
    const networkData = data.filter((d) => d.networks === network);

    // Find the most popular genre and show
    const genreCounts = d3.rollups(
      networkData.flatMap((d) => d.genres.split(",").map((genre) => genre.trim()).filter((genre) => genre !== "")),
      (v) => v.length,
      (genre) => genre
    );

    const mostPopularGenre = genreCounts.sort((a, b) => b[1] - a[1])[0][0];

    const mostPopularShow = networkData.sort((a, b) => b.popularity - a.popularity)[0]?.name || "N/A";

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
});