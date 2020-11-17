//add the map, disable the scroll zoom feature
let map = L.map('map-container',{scrollWheelZoom: false});
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

Promise.all([
  d3.csv("/assets/covidCasesTrend.csv"), //datasets[0]
  d3.csv("/assets/ocp_exposure_proximity-alph.csv"), //datasets[1]
  d3.csv("/assets/ocp_exposure_proximity-prox.csv"), //datasets[2]
  d3.csv("/assets/ocp_exposure_proximity-exp.csv") //datasets[3]
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

  //will display the county name when click on mymap
  //the name variable store the name of selected county
  function displayPlace(name) {
    $("#county-name").text(name);
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
        opacity: 1,
        weight: 1,
        fillColor: '#35495d',
        fillOpacity: 0.8
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

  //fetch the geojson and add it to our geojson layer
  //getGeoData("https://opendata.arcgis.com/datasets/12712f465fc44fb58328c6e0255ca27e_11.geojson").then(data => geojson.addData(data));
  getGeoData("../assets/WA_BOUNTIES.geojson").then(data => geojson.addData(data));


  //start your customized code for the page
  let ocpRiskData_Alph = datasets[1];
  let ocpRiskData_Prox = datasets[2];
  let ocpRiskData_Exp = datasets[3];

  var chart = c3.generate({
    data: {
        json: ocpRiskData_Alph,
        keys: {
          value: ["Exposure_Rating", "Proximity_Rating"]
        },
        type: 'scatter'
    },
    axis: {
        x: {
            label: 'Exposure Rating',
        },
        y: {
            label: 'Proximity Rating',
        }
    },
    grid: {
      x: {
          show: true,
      },
      y: {
          show: true,
      }
    },
    regions: [
      {axis: 'x', start: 50, class: 'highRisk'},
      {axis: 'y', start: 50, class: 'highRisk'},
    ],
    legend: {
      show: false
    },
    padding: {
      top: 30
    },
    bindto: "#ocp-chart"
  });

  // Page user behavior
  window.addEventListener("load", initialize);

  function initialize() {
    const dropdown = document.getElementById("occ-sort");
    dropdown.addEventListener('change', updateList);
    alphabetize();
    const searchBar = document.getElementById("ocp-search-bar");
    searchBar.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        search(searchBar.value);
      }
    });
  }

  function updateList() {
    const sortBy = this.value;
    if (sortBy === "alph") {
      alphabetize();
    } else if (sortBy === "prox") {
      sortByProx();
    } else {
      sortByExp();
    }

  }

  function alphabetize() {
    let list = document.getElementById("list");
    list.innerHTML = "";
    for (let i = 0; i < ocpRiskData_Alph.length; i++) {
      let item = document.createElement("li");
      item.innerText = ocpRiskData_Alph[i].Occupation;
      list.appendChild(item);
      item.addEventListener("click", () => { 
        search(item.innerText);
        document.getElementById("ocp-search-bar").placeholder = item.innerText;
      });
    }
  }

  function sortByProx() {
    let list = document.getElementById("list");
    list.innerHTML = "";
    for (let i = 0; i < ocpRiskData_Prox.length; i++) {
      let item = document.createElement("li");
      item.innerText = ocpRiskData_Prox[i].Proximity_Rating + " - " + ocpRiskData_Prox[i].Occupation;
      list.appendChild(item);
      item.addEventListener("click", () => { 
        search(item.innerText);
        document.getElementById("ocp-search-bar").placeholder = item.innerText;
      });
    }
  }

  function sortByExp() {
    let list = document.getElementById("list");
    list.innerHTML = "";
    for (let i = 0; i < ocpRiskData_Exp.length; i++) {
      let item = document.createElement("li");
      item.innerText = ocpRiskData_Exp[i].Exposure_Rating + " - " + ocpRiskData_Exp[i].Occupation;
      list.appendChild(item);
      item.addEventListener("click", () => { 
        search(item.innerText);
        document.getElementById("ocp-search-bar").placeholder = item.innerText;
      });
    }
  }

  function search(searchText) {
    ocpRiskData.forEach(item => {
      if (item.Occupation === searchText) {
        updateValues(item);
        return;
      }
    });
  }

  function updateValues(occ) {
    document.getElementById("exp-rating").innerText = occ.Exposure_Rating;
    document.getElementById("prox-rating").innerText = occ.Proximity_Rating;
  }

});
