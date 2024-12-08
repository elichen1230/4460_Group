{
  // Streaming service data with logos
const data = [
  { service: "Netflix", date: new Date("August 29, 1997"), logo: "logos/netflix.png" },
  { service: "Fox", date: new Date("October 9, 1986"), logo: "logos/fox.png" },
  { service: "Disney+", date: new Date("November 12, 2019"), logo: "logos/disneyplus.png" },
  { service: "CBS", date: new Date("January 1, 1929"), logo: "logos/cbs.png" },
  { service: "Prime Video", date: new Date("September 7, 2006"), logo: "logos/primevideo.png" },
  { service: "NBC", date: new Date("November 15, 1926"), logo: "logos/nbc.png" },
  { service: "Hulu", date: new Date("October 29, 2007"), logo: "logos/hulu.png" },
];

// Sort data by date
data.sort((a, b) => a.date - b.date);

// Set up SVG dimensions and margins
const margin = { top: 20, right: 30, bottom: 70, left: 50 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Append the SVG container
const svg = d3
  .select("#timeline")
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

// Define scales
const xScale = d3
  .scaleTime()
  .domain(d3.extent(data, (d) => d.date))
  .range([0, width]);

// Draw timeline line
svg
  .append("line")
  .attr("x1", 0)
  .attr("y1", height / 2)
  .attr("x2", width)
  .attr("y2", height / 2)
  .attr("stroke", "#333")
  .attr("stroke-width", 2);

// Add logos to the timeline
svg
  .selectAll(".logo")
  .data(data)
  .enter()
  .append("image")
  .attr("x", (d) => xScale(d.date) - 15) // Center the logo
  .attr("y", (d, i) => (i % 2 === 0 ? height / 2 - 50 : height / 2 + 20)) // Alternate logo placement
  .attr("width", 30)
  .attr("height", 30)
  .attr("xlink:href", (d) => d.logo)
  .on("mouseover", function (event, d) {
    tooltip
      .transition()
      .duration(200)
      .style("opacity", 0.9);
    tooltip
      .html(
        `<strong>Service:</strong> ${d.service}<br/><strong>Launch Date:</strong> ${d3.timeFormat(
          "%B %d, %Y"
        )(d.date)}`
      )
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 28 + "px");
  })
  .on("mousemove", function (event) {
    tooltip
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 28 + "px");
  })
  .on("mouseout", function () {
    tooltip.transition().duration(500).style("opacity", 0);
  });

// Draw X-axis below the timeline line
const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b %d, %Y")).ticks(data.length);
svg
  .append("g")
  .attr("transform", `translate(0,${height / 2 + 60})`) // Position the axis below the timeline line
  .call(xAxis)
  .selectAll("text")
  .attr("transform", "rotate(-45)")
  .style("text-anchor", "end");
}