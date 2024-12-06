const margin = { top: 40, right: 150, bottom: 60, left: 60 };
const width = 1200 - margin.left - margin.right;

const fixedrectHeight = 60;
const fixedrectWidth = 16;

const height = 500 - margin.top - margin.bottom + fixedrectHeight;
const minYear = 1990;
const maxYear = 2024;


const networkColors = {
    "netflix": "#8dd3c7",
    "fox": "#ffffb3",
    "disney+": "#bebada",
    "cbs": "#fb8072",
    "prime video": "#80b1d3",
    "nbc": "#fdb462",
    "hulu": "#b3de69"
  };

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
  .style("font-weight", "bold");
//   .text("Network TV Show Metrics Over Time");

// Create tooltip
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Create color scale
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

const validNetworks = ["netflix", "fox", "disney+", "cbs", "prime video", "nbc", "hulu"];

d3.csv("specific_networks.csv").then(function (data) {
    // Process the data
    data.forEach((d) => {
      const parsedDate = new Date(d.first_air_date);
      d.firstYear = !isNaN(parsedDate) ? parsedDate.getFullYear() : null;
      d.lastYear = !isNaN(new Date(d.last_air_date)) ? new Date(d.last_air_date).getFullYear() : null;
      d.vote_count = +d.vote_count;
      d.popularity = +d.popularity;
  
      try {
        d.networks = JSON.parse(d.networks.replace(/'/g, '"'));
      } catch (e) {
        d.networks = d.networks.split(",").map((network) => ({ name: network.trim() }));
      }
  
      // Filter out networks that are not in the list of valid networks
      d.networks = d.networks.filter((network) => validNetworks.includes(network.name));
    //   console.log(d.networks[0])
    });
  
    // Filter out entries with invalid years and outside our range
    data = data.filter(
      (d) => d.firstYear !== null && d.firstYear >= minYear && d.firstYear <= maxYear
    );
    // console.log(data)
  
    // Function to get the highest-rated show by network for each year and metric
    function getHighestRatedShow(network, year, metric) {
      const filteredData = data.filter((d) => {
        return (
            d.networks.some((net) => net.name.trim().toLowerCase() === network.name.trim().toLowerCase())
        //   && d.firstYear <= year
        //   && d.lastYear >= year
        );
      });
    //   console.log("FilteredData:", filteredData)
  
      let highestShow = { value: 0 };
  
      filteredData.forEach((d) => {
        const showMetric = metric === "vote_count" ? d.vote_count : d.popularity;
        if (showMetric > highestShow.value) {
          highestShow = { show: d.name, value: showMetric, year: year, showData: d };
        }
      });
      console.log(highestShow)
  
      return highestShow;
    }
  
    // Continue with the rest of your code to render the chart
    // Scales for x and y
    const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
  
    // Add axes
    const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
    const yAxis = svg.append("g");

    xAxis.transition().duration(750)
      .call(d3.axisBottom(x)
      .ticks(d3.timeYear.every(1))  // Creates a tick for every year
      .tickFormat(d3.timeFormat("%Y"))); // Format ticks as years (e.g., 1990, 1991, ...)
  
    // Optional: Rotate the tick labels for better readability
    xAxis.selectAll("text")
        .style("text-anchor", "middle")
        .attr("transform", "rotate(-90)")  // Rotate labels if necessary
        .style("font-size", "10px");

    // Add axis labels
    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", `translate(${width / 2},${height + 40})`)
      .style("text-anchor", "middle")
      .text("Year");
  
    const yLabel = svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -height / 2)
      .style("text-anchor", "middle");
  

      function updateChart() {
        const year = document.getElementById("year-slider").value;
        const metric = document.getElementById("metricSelector").value;
      
        // Get highest-rated shows for each network
        const networkData = validNetworks.map((network) => getHighestRatedShow({ name: network }, year, metric));
      
        // Update the y-axis domain based on metric
        y.domain([0, d3.max(networkData, (d) => d.value)+1000]);
      
        // Update the axes
        xAxis.transition().duration(750).call(d3.axisBottom(x));
        yAxis.transition().duration(750).call(d3.axisLeft(y));

        yLabel.text(metric === "vote_count" ? "Vote Count" : "Popularity");
      
        // Create rectangles for the highest-rated shows
        const rectangles = svg.selectAll(".rect").data(networkData);
      
        rectangles.exit().remove(); // Remove old rectangles
      
        // Add new rectangles
        const newRects = rectangles.enter().append("rect").attr("class", "rect");
      
        // Merge and update rectangles
        rectangles
          .merge(newRects)
          .transition()
          .duration(750)
          .attr("x", (d) => x(d.showData.firstYear) - fixedrectWidth / 2) // Set x based on first year
          .attr("width", (d) => {
            // Check if the show is only one year long
            const width = d.showData.firstYear === d.showData.lastYear
              ? fixedrectWidth // Use fixed width for shows that are only one year long
              : x(d.showData.lastYear) - x(d.showData.firstYear) + fixedrectWidth; // Use calculated width for multi-year shows
            return width;
          })
          .attr("y", (d) => {
            const centerY = y(d.value); // Center the rectangle at the vote count or popularity
            return centerY - fixedrectHeight / 2; // Adjust to center it with a fixed height
          })
          .attr("height", fixedrectHeight) // Fixed height of the rectangle
          .attr("fill", (d) => networkColors[d.showData.networks[0].name.toLowerCase()]);
      
        // Add tooltip events
        svg
          .selectAll(".rect")
          .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
              .html(`
                <strong>${d.showData.name}</strong><br/>
                ${metric === "vote_count" ? "Votes: " : "Popularity: "} ${d.value}<br/>
                Network: ${d.showData.networks.map(net => net.name).join(', ')}<br/>
                First Year: ${d.showData.firstYear}<br/>
                Last Year: ${d.showData.lastYear}
              `)
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseout", function () {
            tooltip.transition().duration(500).style("opacity", 0);
          });
      }

    const legend = svg
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .attr("transform", `translate(${width + 20}, 0)`);

    const legend_networks = [...new Set(data.map((d) => d.networks[0].name))];
    console.log(legend_networks)
    legend_networks.forEach((network, i) => {
        const legendItem = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 20})`);
      
        // Add the colored box
        legendItem
          .append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .attr("fill", networkColors[network.toLowerCase()]); // Use the color for the network
      
        // Add the text (network name)
        legendItem
          .append("text")
          .attr("x", 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .text(network);
      });

    // Event Listener
    document
      .getElementById("metricSelector")
      .addEventListener("change", updateChart);
  
    // Initial rendering
    updateChart();
  });