// Load and process data
d3.csv("specific_networks.csv").then((data) => {
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const width = 400 - margin.left - margin.right;
  const height = 250 - margin.top - margin.bottom;

  const populateFilter = (selectId, dataKey) => {
    const select = d3.select(`#${selectId}`);
    const uniqueValues = [
      ...new Set(data.map((d) => d[dataKey]).filter(Boolean)),
    ];
    uniqueValues.forEach((value) => {
      select.append("option").attr("value", value).text(value);
    });
  };

  populateFilter("genre-filter", "genres");
  populateFilter("language-filter", "original_language");

  const episodeRange = d3.extent(data, (d) => +d.episode_run_time);
  const seasonRange = d3.extent(data, (d) => +d.number_of_seasons);

  const episodeSlider = d3
    .sliderBottom()
    .min(episodeRange[0])
    .max(episodeRange[1])
    .width(320)
    .ticks(5)
    .default([episodeRange[0], episodeRange[1]])
    .fill("#4CAF50");

  d3.select("#episode-slider")
    .append("svg")
    .attr("width", 340)
    .attr("height", 60)
    .append("g")
    .attr("transform", "translate(10,10)")
    .call(episodeSlider);

  const seasonSlider = d3
    .sliderBottom()
    .min(seasonRange[0])
    .max(seasonRange[1])
    .width(320)
    .ticks(5)
    .default([seasonRange[0], seasonRange[1]])
    .fill("#4CAF50");

  d3.select("#season-slider")
    .append("svg")
    .attr("width", 340)
    .attr("height", 60)
    .append("g")
    .attr("transform", "translate(10,10)")
    .call(seasonSlider);

  const svg = d3
    .select("#scatter-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const plotScatterPlot = (filteredData) => {
    svg.selectAll("*").remove();

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => +d.number_of_seasons)])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => +d.popularity)])
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append("g").call(d3.axisLeft(y).ticks(5));

    svg
      .selectAll(".dot")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("cx", (d) => x(+d.number_of_seasons))
      .attr("cy", (d) => y(+d.popularity))
      .style("fill", "#b8b8b8")
      .style("opacity", 0.6)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `${d.name}<br/>
             Seasons: ${d.number_of_seasons}<br/>
             Popularity: ${d.popularity}<br/>
             Episode Length: ${d.episode_run_time} min`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });
  };

  // Function to display a random show
  const displayRandomShow = (filteredData) => {
    if (filteredData.length === 0) {
      d3.select("#random-show-display").html("<h2>No shows found</h2>");
      return;
    }

    const randomShow =
      filteredData[Math.floor(Math.random() * filteredData.length)];

    d3.select("#random-show-display").html(`
      <h2>Random Show</h2>
      <p><strong>Name:</strong> ${randomShow.name}</p>
      <p><strong>Seasons:</strong> ${randomShow.number_of_seasons}</p>
      <p><strong>Popularity:</strong> ${randomShow.popularity}</p>
      <p><strong>Episode Length:</strong> ${randomShow.episode_run_time} minutes</p>
    `);
  };

  const applyFilters = () => {
    const genreFilter = d3.select("#genre-filter").property("value");
    const languageFilter = d3.select("#language-filter").property("value");
    const episodeValues = episodeSlider.value();
    const seasonValues = seasonSlider.value();

    const filteredData = data.filter(
      (show) =>
        (!genreFilter || show.genres.includes(genreFilter)) &&
        (!languageFilter || show.original_language === languageFilter) &&
        +show.episode_run_time >= episodeValues[0] &&
        +show.episode_run_time <= episodeValues[1] &&
        +show.number_of_seasons >= seasonValues[0] &&
        +show.number_of_seasons <= seasonValues[1]
    );

    plotScatterPlot(filteredData);
    return filteredData; // Return filtered data for random show selection
  };

  // Event listener for "Get Random Show" button
  d3.select("#random-show-btn").on("click", () => {
    const filteredData = applyFilters();
    displayRandomShow(filteredData);
  });

  // Initial plot
  plotScatterPlot(data);

  episodeSlider.on("onchange", () => applyFilters());
  seasonSlider.on("onchange", () => applyFilters());
});
