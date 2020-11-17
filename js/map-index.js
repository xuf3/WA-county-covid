//add the map, disable the scroll zoom feature
let map = L.map('map-container',{scrollWheelZoom: false});
map.setView([47.355416, -120.927528], 7);
let baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
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

   var options = {offset: null,
	cssClass: 'leaflet-label-overlay'},
   	labelOverlay = new L.LabelOverlay(layer, "Hello, I'm a label overlay", options);
   map.addLayer(labelOverlay);


Promise.all([
  d3.csv("/assets/covidCasesTrend.csv"), //datasets[0]  case-death-hospitalization
  //load your data here through d3
]).then(function(datasets) {

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
    chart.load({
        columns: [places['c'],places['h'],places['d'],places['date']],
        unload: ['Active Confirmed', 'Recovered', 'Death'],
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
});
