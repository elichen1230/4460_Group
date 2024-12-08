{
    // Define the dimensions for the entire page
const baseWidth = 1200; // Base width for the entire page
const baseHeight = 800; // Base height for the entire page

// Calculate the scale factor based on the desired width and height
const scaleFactor = .5; // Adjust this value to scale the entire page

// Set the scale factor as a CSS variable
document.documentElement.style.setProperty('--scale-factor', scaleFactor);
document.documentElement.style.setProperty('--base-width', `${baseWidth}px`);
document.documentElement.style.setProperty('--base-height', `${baseHeight}px`);

// Load and process data
d3.csv("specific_networks.csv").then((data) => {
  const filteredData = data;
  const margin = { top: 20, right: 20, bottom: 50, left: 70 };
  const width = (960 - margin.left - margin.right) * scaleFactor;
  const height = (500 - margin.top - margin.bottom) * scaleFactor;

  // Populate filter dropdowns
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

  // Initialize range sliders
  const episodeRange = d3.extent(data, (d) => +d.episode_run_time);
  const seasonRange = d3.extent(data, (d) => +d.number_of_seasons);

  // Create episode length slider
  const episodeSlider = d3
    .sliderBottom()
    .min(episodeRange[0])
    .max(episodeRange[1])
    .width(800 * scaleFactor)
    .tickFormat(d3.format("d"))
    .ticks(10)
    .default([episodeRange[0], episodeRange[1]])
    .fill("#4CAF50");

  d3.select("#episode-slider")
    .append("svg")
    .attr("width", 860 * scaleFactor)
    .attr("height", 100 * scaleFactor)
    .append("g")
    .attr("transform", `translate(${30 * scaleFactor},${30 * scaleFactor})`)
    .call(episodeSlider);

  // Create seasons slider
  const seasonSlider = d3
    .sliderBottom()
    .min(seasonRange[0])
    .max(seasonRange[1])
    .width(800 * scaleFactor)
    .tickFormat(d3.format("d"))
    .ticks(10)
    .default([seasonRange[0], seasonRange[1]])
    .fill("#4CAF50");

  d3.select("#season-slider")
    .append("svg")
    .attr("width", 860 * scaleFactor)
    .attr("height", 100 * scaleFactor)
    .append("g")
    .attr("transform", `translate(${30 * scaleFactor},${30 * scaleFactor})`)
    .call(seasonSlider);

  // Create scatter plot
  const svg = d3
    .select("#scatter-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const plotScatterPlot = (data, randomShow = null) => {
    svg.selectAll("*").remove();

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d.number_of_seasons)])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d.popularity)])
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g").call(d3.axisLeft(y));

    svg
      .append("text")
      .attr("transform", `translate(${width / 2},${height + margin.top + 20})`)
      .style("text-anchor", "middle")
      .text("Number of Seasons");

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Popularity");

    // Add regular points with muted colors
    svg
      .selectAll(".dot")
      .data(data.filter((d) => !randomShow || d.name !== randomShow.name))
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 4 * scaleFactor)
      .attr("cx", (d) => x(+d.number_of_seasons))
      .attr("cy", (d) => y(+d.popularity))
      .style("fill", "#b8b8b8")
      .style("opacity", 0.4)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .style("opacity", 1)
          .style("fill", "#808080")
          .attr("r", 5 * scaleFactor);

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
      .on("mouseout", (event) => {
        d3.select(event.currentTarget)
          .style("opacity", 0.4)
          .style("fill", "#b8b8b8")
          .attr("r", 4 * scaleFactor);

        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Add highlighted point on top
    if (randomShow) {
      svg
        .append("circle")
        .attr("class", "highlighted-dot")
        .attr("r", 4 * scaleFactor)
        .attr("cx", x(+randomShow.number_of_seasons))
        .attr("cy", y(+randomShow.popularity))
        .style("fill", "#ff3333")
        .style("stroke", "#000")
        .style("opacity", 1)
        .on("mouseover", (event) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip
            .html(
              `${randomShow.name}<br/>
                 Seasons: ${randomShow.number_of_seasons}<br/>
                 Popularity: ${randomShow.popularity}<br/>
                 Episode Length: ${randomShow.episode_run_time} min`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(500).style("opacity", 0);
        });
    }
  };

  // Initial plot
  plotScatterPlot(filteredData);

  // Update range displays
  const updateRangeDisplays = () => {
    const episodeValues = episodeSlider.value();
    const seasonValues = seasonSlider.value();

    d3.select("#episode-range-display").text(
      `${Math.round(episodeValues[0])} - ${Math.round(episodeValues[1])} min`
    );
    d3.select("#season-range-display").text(
      `${Math.round(seasonValues[0])} - ${Math.round(seasonValues[1])} seasons`
    );
  };

  // Filtering logic
  const applyFilters = (selectNewRandom = false) => {
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

    let randomShow = null;
    const randomShowDisplay = d3.select("#random-show-display");

    if (filteredData.length > 0 && selectNewRandom) {
      randomShow =
        filteredData[Math.floor(Math.random() * filteredData.length)];
      randomShowDisplay.html(`
          <h2>Random Show</h2>
          <p>Name: ${randomShow.name}</p>
          <p>Seasons: ${randomShow.number_of_seasons}</p>
          <p>Popularity: ${randomShow.popularity}</p>
          <p>Episode Length: ${randomShow.episode_run_time} minutes</p>
        `);
    } else if (filteredData.length === 0) {
      randomShowDisplay.html("<h2>No shows match the current filters</h2>");
    }

    plotScatterPlot(filteredData, randomShow);
    updateRangeDisplays();
  };

  // Event listeners for filters
  ["genre-filter", "language-filter"].forEach((id) => {
    d3.select(`#${id}`).on("change", () => applyFilters(false));
  });

  // Event listeners for sliders
  episodeSlider.on("onchange", () => {
    updateRangeDisplays();
    applyFilters(false);
  });

  seasonSlider.on("onchange", () => {
    updateRangeDisplays();
    applyFilters(false);
  });

  // Random show button
  d3.select("#random-show-btn").on("click", () => applyFilters(true));

  // Initialize range displays
  updateRangeDisplays();
});
}