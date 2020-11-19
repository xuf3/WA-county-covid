//add the map, disable the scroll zoom feature
let map = L.map('map-container',{scrollWheelZoom: false});
map.setView([47.355416, -120.927528], 6);
let baseLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '',
    zoomControl: false
});

//adding base layer
baseLayer.addTo(map);

//extend Leaflet to create a GeoJSON layer from a TopoJSON file
L.TopoJSON = L.GeoJSON.extend({
  addData: function (data) {
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
L.topoJson = function (data, options) {
 return new L.TopoJSON(data, options);
};

var d3locale = d3.formatDefaultLocale({
     "thousands": ",",
     "grouping": [3],
   });


Promise.all([
  d3.csv("assets/covidCasesTrend.csv"),//datasets[0]
  d3.csv("assets/covidAge.csv"), //datasets[1]
  d3.csv("assets/county-pop.csv"),
  //load your data here through d3
]).then(function(datasets) {

  var countyPop = datasets[2];

  //highlight the county whne the mouse hover on
  function highlightFeature(e){
    var layer = e.target;
    layer.setStyle({
      weight: 2,
      opacity: 0.8,
      color: '#e3e3e3',
      fillColor:'#00ffd9',
      fillOpacity: 0.1
    });
    layer.bringToFront();
    layer.openPopup();
  }

  //reset the highlight feature
  function resetHighlight(e){
    geojson.resetStyle(e.target);
    e.target.closePopup();
  }

  var colors = chroma.scale('YlOrRd').mode('lch').colors(6);

  //this function take a place name, return a color that fills the place area on the maps
  //the color is based on the number of active confirmed case
  function setColor(enname) {
    var id = 0;
    var pop = caseData[caseData.length - 1][enname].split('-')[0];
    if (pop >= 20000) {
      id = 5;
    } else if (pop > 10000 && pop <= 20000) {
      id = 4;
    } else if (pop > 5000 && pop <= 10000) {
      id = 3;
    } else if (pop > 1000 && pop <= 5000) {
      id = 2;
    } else if (pop > 100 && pop <= 1000) {
      id = 1;
    } else if (pop > 0 && pop <= 100) {
      id = 0;
    } else {
      id = -1;
      return "#00000000";
    }
    return colors[id];
  }

  //will display the county name when click on mymap
  //the name variable store the name of selected county
  function displayPlace(name) {
    $("#county-name").text(name);
    showNum(name);
    places = calPlace(name);
    lineChart.load({
        columns: [places['c'],places['h'],places['d'],places['date']],
        unload: ['Active Confirmed', 'Recovered', 'Death'],
    });
    age = calAge(name);
    pieChart.load({
        columns: [
          age['Age 0-19'],
          age['Age 20-39'],
          age['Age 40-59'],
          age['Age 60-79'],
          age['Age 80+']
        ],
        unload: ['Age 0-19',
        'Age 20-39',
        'Age 40-59',
        'Age 60-79',
        'Age 80+'],
    });
  }

  function zoomToFeature(e) {
    // mymap.fitBounds(e.target.getBounds());
    L.DomEvent.stopPropagation(e);
    displayPlace(e.target.feature.properties.JURISDICT_NM)
  }

  //add hover highlight faeture and popups to the map
  function onEachFeature(feature,layer){
    layer.bindPopup(feature.properties.JURISDICT_NM, {closeButton: false});
    layer.on({
      mouseover: highlightFeature,
      click: zoomToFeature,
      mouseout: resetHighlight
    })
  }

  //create an empty geojson layer
  var geojson = L.topoJson(null, {
    style: function(feature){
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

  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info-legend'),
        grades = [0, 100, 1000, 5000, 10000, 20000],
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
  var caseData = datasets[0]
  var ageData = datasets[1]

  function calAge(name){
    age = {
      'Age 0-19': ['Age 0-19'],
      'Age 20-39': ['Age 20-39'],
      'Age 40-59': ['Age 40-59'],
      'Age 60-79': ['Age 60-79'],
      'Age 80+': ['Age 80+'],
   }
   var countyAge;
   ageData.forEach(function(d) {
     if(d['County'] == name){
       countyAge = d;
     }
   });
   items = Object.keys(age).map(function(key) {
       age[key].push(countyAge[key])
   });
    //$("#curLayer").text(e.target.textContent);
    return age;
  }

  function showNum(name){
    count = caseData[caseData.length - 1][name].split('-')
    $("#cvd-case").text(count[0]);
    $("#cvd-death").text(count[1]);
    $("#cvd-hospital").text(count[2]);
    let pop;
    countyPop.forEach(function(c) {
      let current = c['county'];
      if (current.localeCompare(name) == 0) {
        pop = c['pop'];
      }
    });
    let morbidity = sortedCounty[name] / pop * 100;
    $('#cvd-pop').text(morbidity.toFixed(2) + "%");
    //$("#curLayer").text(e.target.textContent);
  }

  function calPlace(name){
    var places = {'c':['case'], 'd':['death'],'h':['hospitalization'],'date':['date']};
    caseData.forEach(function(d) {
      count =d[name].split('-')
      places['c'].push(count[0])
      places['d'].push(count[1])
      places['h'].push(count[2])
      places['date'].push(d['Date'])
    });
    return places;
  }

  //this set the style for the linechart displayed in info panel
    var lineChart = c3.generate({
      size: {
      },
      data: {
        x: "date",
        y: "Number",
        columns: [
          calPlace('King County')['c'],
          calPlace('King County')['h'],
          calPlace('King County')['d'],
          calPlace('King County')['date']
        ],
        type: 'line',
        axes: {
          confirmed: 'y'
        },
        colors: {
          'case': '#ffa500',
          'hospitalization': '#28a745',
          'death': '#dc3545'
        }
      },
      zoom: {
        enabled: true,
        type: "scroll"
      },
      axis: {
        x: {
          label: {
            text: 'Date',
            position: 'outer-center'
          },
          type: "timeseries",
            tick: {
              format: "%b %d",
              centered: true,
              fit: true,
              count: 8
            }
        },
        y: {
          label: {
            text: 'Cases',
            position: 'outer-middle'
          },
          min: 0,
          padding: {
            bottom: 0
          },
          tick: {
            format: d3locale.format(",")
          },
          type: 'linear'
        }
      },
      point: {
        r: 3,
        focus: {
          expand: {
            r: 5
          }
        }
      },
      tooltip: {
        linked: true,
      },
      legend: {
        position: 'right',
      },
      bindto: "#line-chart"
    });

    var pieChart = c3.generate({
      data: {
        size: {
          width:50,
          height: 50
        },
        // iris data from R
        columns: [
          ["Age 0-19",1],
          ["Age 20-39",1],
          ["Age 40-59",1],
          ["Age 60-79",1],
          ["Age 80+",1],
        ],
        type : 'pie'
      },
      legend: {
        position: 'right'
      },
      tooltip: {
        format: {
            title: function (d) { return 'Case Number'; },
            value: function (value, ratio, id) {
                var format = id === 'data1' ? d3.format(',') : d3.format('$');
                return format(value);
            }
//            value: d3.format(',') // apply this format to both y and y2
        }
      },
      bindto: "#pie-chart"
      });

      function calTotal(){
          var tcase = 0, tdeath = 0, thospital = 0;
          var result = [tcase,tdeath,thospital];
          var data = caseData[caseData.length - 1];
          items = Object.keys(data).map(function(key) {
              tcase += +data[key].split('-')[0];
              tdeath += +data[key].split('-')[1];
              thospital += +data[key].split('-')[2];
          });
          return [tcase,tdeath,thospital];
      }

      var caltotal = calTotal();
      $("#total-case").text(caltotal[0]);
      $("#total-death").text(caltotal[1]);
      $("#total-hospital").text(caltotal[2]);

      function sortJsObject(obj) {
        items = Object.keys(obj).map(function(key) {
          return [key, obj[key].split('-')[0]];
        });
        items.sort(function(first, second) {
          return second[1] - first[1];
        });
        sorted_obj = {}
        $.each(items, function(k, v) {
          use_key = v[0]
          use_value = v[1]
          sorted_obj[use_key] = use_value
        })
        return (sorted_obj)
      }

      var sortedCounty = sortJsObject(caseData[caseData.length - 1])
      ctList(sortedCounty);

      function ctList(data) {
        let table = document.getElementById("ct-list");
        Object.keys(data).slice(0, 11).forEach(function(key) {
          if(key === "Date") {
            return true;
          }
          let row = document.createElement('li');
          let count = document.createElement('span');
          row.textContent = key;
          count.textContent = data[key];
          row.appendChild(count);
          table.appendChild(row);
        });
      }
});
