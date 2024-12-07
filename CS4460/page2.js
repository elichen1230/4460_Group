{
    // Set up the margin2s and dimensions for the bar chart
    const margin2 = { top: 40, right: 200, bottom: 60, left: 60 };
    const width = 960 - margin2.left - margin2.right;
    const height = 500 - margin2.top - margin2.bottom;
  
    // Append the SVG container
    const svg = d3
      .select("#bar-chart")
      .append("svg")
      .attr("width", width + margin2.left + margin2.right)
      .attr("height", height + margin2.top + margin2.bottom)
      .append("g")
      .attr("transform", `translate(${margin2.left},${margin2.top})`);
  
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
        const filteredData = data.filter(
          (d) => d.year >= yearRange[0] && d.year <= yearRange[1]
        );
  
        const networkCounts = d3.rollups(
          filteredData,
          (v) => d3.sum(v, (d) => d[metric]),
          (d) => d.networks
        );
  
        const barData = networkCounts.map(([network, count]) => ({
          network,
          count,
        }));
  
        barData.sort((a, b) => b.count - a.count);
  
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
  
        // Add bars
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
          .attr("fill", (d) => networkColors[d.network.toLowerCase()] || "#69b3a2")
          .on("mouseover", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
              .html(
                `<strong>Network:</strong> ${d.network}<br/><strong>Count:</strong> ${Math.round(
                  d.count
                )}`
              )
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
            d3.select(this).style("opacity", 0.7);
  
            updateTable(d.network);
          })
          .on("mousemove", function (event) {
            tooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
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
  
      function updateTable(network) {
        const networkData = data.filter((d) => d.networks === network);
  
        const genreCounts = d3.rollups(
          networkData.flatMap((d) => d.genres.split(",").map((genre) => genre.trim())),
          (v) => v.length,
          (genre) => genre
        );
        const mostPopularGenre = genreCounts.sort((a, b) => b[1] - a[1])[0][0];
        const mostPopularShow = networkData.sort(
          (a, b) => b.popularity - a.popularity
        )[0].name;
  
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
  
      updateChart([minYear, maxYear], "vote_count");
  
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
  
      d3.select("#year-slider2")
        .append("svg")
        .attr("width", 900)
        .attr("height", 100)
        .append("g")
        .attr("transform", "translate(30,30)")
        .call(sliderRange);
  
      document.getElementById("metricSelector").addEventListener("change", () => {
        const yearRange = sliderRange.value();
        const metric = document.getElementById("metricSelector").value;
        updateChart(yearRange, metric);
      });
    });
  
    console.log("Hello from page2.js");
  }
  