//add the map, disable the scroll zoom feature
let map = L.map('map-container', {
  scrollWheelZoom: false
});
map.setView([47.355416, -120.927528], 6);
let baseLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
  zoomControl: false
});

//adding base layer
baseLayer.addTo(map);

//extend Leaflet to create a GeoJSON layer from a TopoJSON file
L.TopoJSON = L.GeoJSON.extend({
  addData: function(data) {
    var geojson, key;
    if (data.type === "Topology") {
      for (key in data.objects) {
        if (data.objects.hasOwnProperty(key)) {
          geojson = topojson.feature(data, data.objects[key]);
          L.GeoJSON.prototype.addData.call(this, geojson);
        }
      }
      return this;
    }
    L.GeoJSON.prototype.addData.call(this, data);
    return this;
  }
});
L.topoJson = function(data, options) {
  return new L.TopoJSON(data, options);
};

Promise.all([
  d3.csv("/assets/covidCasesTrend.csv"), //datasets[0]
  //load your data here through d3
  d3.csv("/assets/unemployment_rate.csv"), //datasets[1]
  d3.csv("/assets/unemployment_benefit.csv") //datasets[2]
]).then(function(datasets) {

  //highlight the county whne the mouse hover on
  function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle({
      weight: 2,
      opacity: 0.8,
      color: '#e3e3e3',
      fillColor: '#00ffd9',
      fillOpacity: 0.1
    });
    layer.bringToFront();
    layer.openPopup();
  }

  //reset the highlight feature
  function resetHighlight(e) {
    geojson.resetStyle(e.target);
    e.target.closePopup();
  }

  var colors = chroma.scale('YlOrRd').mode('lch').colors(6);

  //this function take a place name, return a color that fills the place area on the maps
  //the color is based on the number of active confirmed case
  function setColor(enname) {
    var id = 0;
    name = enname.replace(" County", "");
    var rate = unemp_rate_data[unemp_rate_data.length - 1][name];
    if (rate >= 0.14) {
      id = 5;
    } else if (rate > 0.12 && rate <= 0.14) {
      id = 4;
    } else if (rate > 0.10 && rate <= 0.12) {
      id = 3;
    } else if (rate > 0.08 && rate <= 0.10) {
      id = 2;
    } else if (rate > 0.06 && rate <= 0.08) {
      id = 1;
    } else {
      id = 0;
    }
    return colors[id];
  }



  //will display the county name when click on mymap
  //the name variable store the name of selected county
  function displayPlace(name) {
    $("#county-name").text(name);
    var stats = update_stats(name);
    draw_charts(stats);
  }

  function zoomToFeature(e) {
    // mymap.fitBounds(e.target.getBounds());
    L.DomEvent.stopPropagation(e);
    displayPlace(e.target.feature.properties.JURISDICT_NM)
  }

  //add hover highlight faeture and popups to the map
  function onEachFeature(feature, layer) {
    layer.bindPopup(feature.properties.JURISDICT_NM, {
      closeButton: false
    });
    layer.on({
      mouseover: highlightFeature,
      click: zoomToFeature,
      mouseout: resetHighlight
    })
  }

  //create an empty geojson layer
  var geojson = L.topoJson(null, {
    style: function(feature) {
      return {
        color: "#000",
        opacity: 0.8,
        weight: 1,
        fillOpacity: 0.8,
        fillColor: setColor(feature.properties.JURISDICT_NM),
      }
    },
    onEachFeature: onEachFeature,
  }).addTo(map);


  async function getGeoData(url) {
    let response = await fetch(url);
    let data = await response.json();
    console.log(data)
    return data;
  }

  var legend = L.control({
    position: 'bottomright'
  });

  legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info-legend'),
      grades = [0, 0.06, 0.08, 0.10, 0.12, 0.14],
      labels = [];
    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        '<span class = "color-block "style="background:' + colors[i] + '"></span> ' +
        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
    return div;
  };

  legend.addTo(map);


  //fetch the geojson and add it to our geojson layer
  //getGeoData("https://opendata.arcgis.com/datasets/12712f465fc44fb58328c6e0255ca27e_11.geojson").then(data => geojson.addData(data));
  getGeoData("../assets/WA_BOUNTIES.geojson").then(data => geojson.addData(data));


  //start your customized code for the page
  var unemp_rate_data = datasets[1];
  var unemp_benefit_data = datasets[2];

  function update_stats(name = "Total") {

    if (name != "Total") {
      name = name.replace(" County", "");
    }

    var dates_rate = [];
    var rates = [];
    unemp_rate_data.forEach(function(e) {
      dates_rate.push(e['Date']);
      rates.push(Math.round(e[name] * 10000) / 10000);
    });
    var rate = Math.round(unemp_rate_data[unemp_rate_data.length - 1][name] * 10000) / 10000;


    var dates_bnft = [];
    var bnfts = [];
    unemp_benefit_data.forEach(function(e) {
      dates_bnft.push(e['Date']);
      bnfts.push(Math.round(e[name]));
    });
    var bnft = Math.round(unemp_benefit_data[unemp_benefit_data.length - 1][name]);

    if (name == "Total") {
      document.getElementById("emp-rate-text").innerHTML = "<h5>Current State Average Unemployment Rate</h5>";
      document.getElementById("emp-bnft-text").innerHTML = "<h5>Current State Average Unemployment Insurance Benefit Per Claimant</h5>";
    } else {
      document.getElementById("emp-rate-text").innerHTML = "<h5>Current ".concat(name, " County Average Unemployment Rate</h5>");
      document.getElementById("emp-bnft-text").innerHTML = "<h5>Current ".concat(name, " County Average Unemployment Insurance Benefit Per Claimant</h5>");
}

    document.getElementById("emp-rate-number").innerHTML = "<h2>".concat(rate, "</h2>");
    document.getElementById("emp-bnft-number").innerHTML = "<h2>$".concat(bnft, "</h2>");

    return [dates_rate, rates, dates_bnft, bnfts]
  };

  var chart_rate = c3.generate({
    size: {
      height: (document.getElementById('emp-rate-content').offsetHeight - document.getElementById('emp-rate-text').offsetHeight) * 0.9,
      width: document.getElementById('emp-rate-content').offsetWidth * 0.8
    },
    data: {
      x: 'x',
      xFormat: '%Y-%m',
      columns: []
    },
    axis: {
      x: {
        label: {
          text: 'Date',
          position: 'outer-center'
        },
        type: 'timeseries',
        tick: {
          format: '%Y-%m'
        }
      },
      y: {
        label: {
          text: 'Unemployment Rate',
          position: 'outer-middle'
        },
        max: 0.17,
        min: 0
      }
    },
    legend: {
      show: false
    },
    bindto: "#emp-rate-chart"
  });


  var chart_bnft = c3.generate({
    size: {
      height: (document.getElementById('emp-bnft-content').offsetHeight - document.getElementById('emp-rate-text').offsetHeight) * 0.9,
      width: document.getElementById('emp-bnft-content').offsetWidth * 0.8
    },
    // padding: {
    //   top: document.getElementById('unemp_rate_tab').offsetHeight / 10,
    //   right: document.getElementById('unemp_rate_tab').offsetWidth / 8
    // },
    data: {
      x: 'x',
      xFormat: '%Y-%m',
      columns: []
    },
    axis: {
      x: {
        label: {
          text: 'Date',
          position: 'outer-center'
        },
        type: 'timeseries',
        tick: {
          format: '%Y-%m'
        }
      },
      y: {
        label: {
          text: 'UIB Per Claimant',
          position: 'outer-middle'
        },
        max: 5000,
        min: 0
      }
    },
    legend: {
      show: false
    },
    bindto: "#emp-bnft-chart"
  });

  function draw_charts(stats) {
    chart_rate.load({
      unload: ['Unemployment Rate'],
      columns: [
        ['x'].concat(stats[0]),
        ['Unemployment Rate'].concat(stats[1])
      ],
    });
    chart_bnft.load({
      unload: ['UIB Per Claimant'],
      columns: [
        ['x'].concat(stats[2]),
        ['UIB Per Claimant'].concat(stats[3])
      ],
    });
  }

  $("#county-name").text("Washington State");
  draw_charts(update_stats());
});
