const baseWidth = 1600; // Base width for the entire page
const baseHeight = 1200; // Base height for the entire page

// Calculate the scale factor based on the desired width and height
const scaleFactor = 0.8; // Adjust this value to scale the entire page

// Set the scale factor as a CSS variable
document.documentElement.style.setProperty('--scale-factor', scaleFactor);
document.documentElement.style.setProperty('--base-width', `${baseWidth}px`);
document.documentElement.style.setProperty('--base-height', `${baseHeight}px`);

// Define the dimensions for the chart
const fixedrectHeight = 20;
const fixedrectWidth = 0;
const margin = { top: 40, right: 10, bottom: 60, left: 60 };
const width = (800 - margin.left - margin.right) * scaleFactor;
const height = (500 - margin.top - margin.bottom + fixedrectHeight) * scaleFactor;

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
d3.csv("use_these_shows.csv").then(function (data) {
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
    d.networks = d.networks.filter((network) => validNetworks.includes(network.name));
  });

  // Function to get the highest-rated show by network for each year and metric
  function getFilteredShows(network, year, metric) {
    const filteredData = data.filter((d) => {
      return (
        d.networks.some((net) => net.name.trim().toLowerCase() == network.name.trim().toLowerCase())
      );
    });

    return filteredData.map((d) => {
      const showMetric = metric === "vote_count" ? d.vote_count : d.popularity;
      return {
        show: d.name,
        value: showMetric,
        year: year,
        showData: d,
      };
    });
  }

  // Scales for x and y
  const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  // Add axes
  const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
  const yAxis = svg.append("g");

  xAxis.transition().duration(750)
    .call(d3.axisBottom(x)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.format("d")));

  xAxis.selectAll("text")
    .style("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
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

    let showData = validNetworks.map((network) => getFilteredShows({ name: network }, year, metric));
    let networkData = [];

    for (let i = 0; i < showData.length; i++) {
      for (let j = 0; j < showData[i].length; j++) {
        networkData.push(showData[i][j]);
      }
    }

    y.domain([0, d3.max(networkData, (d) => d.value)]);

    yAxis.transition().duration(750).call(d3.axisLeft(y));

    yLabel.text(metric === "vote_count" ? "Vote Count" : "Popularity")
      .attr("dy", -5);

    const rectangles = svg.selectAll(".rect").data(networkData);

    rectangles.exit().remove();

    const newRects = rectangles.enter().append("rect").attr("class", "rect");

    rectangles
      .merge(newRects)
      .transition()
      .duration(750)
      .attr("x", (d) => {
        const startYear = Math.max(d.showData.firstYear, minYear);
        return x(startYear) - fixedrectWidth / 2;
      })
      .attr("width", (d) => {
        const width = d.showData.firstYear === d.showData.lastYear
          ? fixedrectWidth
          : x(d.showData.lastYear) - x(d.showData.firstYear) + fixedrectWidth;
        return width;
      })
      .attr("y", (d) => {
        const centerY = y(d.value);
        return centerY - fixedrectHeight / 2;
      })
      .attr("height", fixedrectHeight)
      .style("opacity", 0.5)
      .attr("fill", (d) => networkColors[d.showData.networks[0].name.toLowerCase()]);

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

    svg.selectAll(".rect")
      .on("click", function (event, d) {
        d3.select(this).raise();
        const content = customContent[d.showData.name];
        const message = content ? content.msg : "No custom message available for this show.";
        const image = content ? content.image : "./images/default.jpg";
        const imageBox = d3.select("#image-box");
        const infoBox = d3.select('#info-box');

        imageBox.html(`
          <img src="${image}" alt="Image for ${d.showData.name}" style="width: 100%; border-radius: 8px; margin-top: 10px;"/>
        `);
        infoBox.html(`
          <p>${message}</p>
        `);

        d3.selectAll(".rect").attr("stroke", "none");
        d3.select(this).attr("stroke", "black").attr("stroke-width", 2);

        event.stopPropagation();
      });
  }

  d3.select("svg").on("click", function (event) {
    const isRectangle = event.target.tagName === "rect";
    if (!isRectangle) {
      d3.selectAll(".rect").attr("stroke", "none");
      d3.select("#info-box").html("<p>Click on a bar to see details here.</p>");
      d3.select("#image-box").html("");
    }
  });

  let currentRangeIndex = 0;

  const button = d3
    .select("body")
    .append("button")
    .text("Change X-Axis Range")
    .style("display", "block")
    .style("margin", "20px auto")
    .on("click", () => {
      currentRangeIndex = (currentRangeIndex + 1) % xRanges.length;
      updateXAxisRange();
    });

  function updateXAxisRange() {
    const { start, end } = xRanges[currentRangeIndex];
    x.domain([start, end]);

    xAxis.transition().duration(750).call(d3.axisBottom(x).tickFormat(d3.format("d")));

    updateChart();
  }

  const legendContainer = d3.select("#legend");
  const legend = legendContainer
    .append("svg")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${length + 20}, 0)`);

  const legend_networks = [...new Set(data.map((d) => d.networks[0].name))];
  legend_networks.forEach((network, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    legendItem
      .append("rect")
      .attr("text-anchor", "start")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", networkColors[network.toLowerCase()]);

    legendItem
      .append("text")
      .attr("text-anchor", "start")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .text(network);
  });

  document
    .getElementById("metricSelector")
    .addEventListener("change", updateChart);

  updateXAxisRange();
});

const customContent = {
  "Breaking Bad": {
    msg: "While \"Breaking Bad\" originally aired on AMC, it became a massive hit on Netflix and is considered one of the best shows in television history. Netflix's instant streaming model helped the show gain a new audience, particularly during its later seasons. The ability to binge-watch the series allowed fans to experience the show's intense storytelling in a new way, contributing to its cultural impact and boosting its and Netflix's popularity.",
    image: "./images/BreakingBad.jpg"
  },
  "Orange Is the New Black": {
    msg: "\"Orange Is the New Black\" (2013) was one of Netflix's first original series, signaling the company’s transition to producing original content. These shows were ground-breaking for the platform because they showed that Netflix could not only be a distributor but also a producer of high-quality, award-winning television, which helped it grow into a global entertainment powerhouse.",
    image: "./images/oisnb.jpg"
  },
  "The Simpsons": {
    msg: "\"The Simpsons\" (1989–present) became an iconic animated series that established Fox's reputation for bold and edgy content. The show’s cultural influence and ability to attract both critical and commercial success cemented Fox’s place in TV history.",
    image: "./images/Simpsons.jpg"
  },
  "24": {
    msg: "\"24\" (2001–2010) redefined the procedural genre with its real-time format and intense storytelling, introducing a more serialized narrative structure on network television. This show’s innovative format and suspense-driven plotlines helped Fox maintain its relevance and push boundaries in the 2000s.",
    image: "./images/24.jpg"
  },
  "Empire": {
    msg: "\"Empire\" (2015–2020) was a cultural phenomenon that blended drama, music, and social issues. The show’s success helped Fox tap into diverse audiences and break new ground in terms of representation and storytelling, solidifying Fox as a major player in the entertainment world.",
    image: "./images/Empire.jpg"
  },
  "Hannah Montana": {
    msg: "The creation of \"Hannah Montana\" (2006–2011) on the Disney Channel was pivotal for Disney's domination in the children's and pre-teen market. This show helped to solidify Disney Channel as a powerhouse in youth-focused entertainment. Although not a part of Disney+, shows on the Disney Channel garnered approval and aided the later arrival of Disney+.",
    image: "./images/HannahMontana.jpg"
  },
  "The Mandalorian": {
    msg: "\"The Mandaloiran\" (2019) marked Disney+’s grand entry into streaming and made a massive impact. As the first live-action Star Wars series, it not only solidified the Star Wars franchise’s continued success but also helped Disney+ establish itself as a major player in streaming by attracting both new and nostalgic fans. This success demonstrated the potential of Disney's vast content library.",
    image: "./images/Mandalorian.jpg"
  },
  "Frasier": {
    msg: "\"Frasier\" (1993–2004) became one of the most critically acclaimed sitcoms of its time, winning multiple Emmys, including Outstanding Comedy Series, and was praised for its witty writing, sophisticated humor, and strong ensemble cast. It became one of CBS's flagship shows throughout its run, consistently drawing large audiences and helping to solidify the network's position as a leader in prime-time sitcoms.",
    image: "./images/Frasier.jpg"
  },
  "Survivor": {
    msg: "\"Survivor\" (2000–present) was a groundbreaking reality TV show that became a cultural phenomenon. Its success brought millions of viewers to CBS and helped establish the network as a leader in unscripted content, pushing CBS into the mainstream reality TV market.",
    image: "./images/Survivor.jpg"
  },
  "The Big Bang Theory": {
    msg: "\"The Big Bang Theory\" (2007–2019) became one of the most successful sitcoms of all time. It helped CBS build a loyal audience base, particularly with younger viewers, and provided a huge ratings boost. The show’s success, combined with its syndication deals, made it one of the highest-grossing TV series for CBS.",
    image: "./images/BigBangTheory.jpg"
  },
  "The Marvelous Mrs. Maisel": {
    msg: "\"The Marvelous Mrs. Maisel\" (2017–2023) was a game-changer for Amazon Prime Video, receiving critical acclaim and multiple awards. This show demonstrated Amazon’s ability to compete with traditional television networks and streaming services like Netflix by creating high-quality, engaging original content that appealed to both critics and audiences.",
    image: "./images/MarvelousMrsMaisel"
  },
  "The Boys": {
    msg: "\"The Boys\" (2019-2022) revolutionized the superhero genre by subverting typical superhero tropes. It is a dark, violent, and satirical look at the world of corrupt superheroes. The series' success helped solidify Prime Video as a provider of edgy, high-quality original content. \"The Boys\" is not only a fan favorite but also a critical success, praised for its sharp writing, acting, and unique take on the superhero genre.",
    image: "./images/TheBoys.jpg"
  },
  "Friends": {
    msg: "\"Friends\" (1994–2004) was one of NBC’s most influential shows during the 1990s, which along with another NBC show, \"Seinfeld\" (1989–1998), shaped the sitcom genre. Friends helped NBC dominate the primetime slot and became a cultural milestone, attracting millions of viewers worldwide.",
    image: "./images/Friends.jpeg"
  },
  "The Office": {
    msg: "\"The Office\" (U.S., 2005–2013) redefined sitcoms with its mockumentary format and quirky characters. It gained a cult following and helped NBC maintain its relevancy in the competitive TV landscape of the 2000s, especially after the end of \"Friends\".",
    image: "./images/TheOffice.jpg"
  },
  "This Is Us": {
    msg: "\"This Is Us\" (2016–2022) was one of the most critically acclaimed dramas of the decade and helped NBC regain its dominance in the drama space. It created a buzz for its emotionally powerful storytelling, and its success helped boost the network's ratings and reputation for high-quality, character-driven narratives.",
    image: "./images/ThisIsUs.jpg"
  },
  "Lost": {
    msg: "\"Lost\" (2004–2010) is considered one of the most influential and groundbreaking shows of the early 2000s, and its availability on Hulu played a significant role in the network’s growth. \"Lost\" became a key part of the platform’s offering, helping to draw in new Hulu subscribers who wanted to binge-watch this cultural touchstone.",
    image: "./images/Lost.jpg"
  },
  "The Handmaid's Tale": {
    msg: "\"The Handmaid's Tale\" (2017–present) was Hulu’s first major original series and earned critical acclaim, including several Emmy Awards. The show helped Hulu solidify itself as a serious competitor in the original content space, comparable to Netflix and Amazon Prime Video.",
    image: "./images/HandmaidsTale.jpeg"
  },
  // Add more messages for other shows
};