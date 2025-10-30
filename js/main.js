
mapboxgl.accessToken = 'pk.eyJ1IjoieXVhbnpoYW9ydW4iLCJhIjoiY21oY2ptN2VxMDN0cTJqcHJ5cXg1Y3FuaCJ9.AOLE1vyF6H4pXsAaSDYKXQ';

let map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/navigation-day-v1',
  zoom: 5.5,
  center: [138, 38]
});


const PATH_EARTHQUAKES = 'assets/earthquakes.geojson';
const PATH_TSUNAMI    = 'assets/japan_tsunami_2017_episode.geojson';
const PATH_JAPAN      = 'assets/japan.json';


let earthquakesData = null; 
let tsunamiData = null;       
let currentDataset = 'earthquakes';


function getId(props, feature) {
  return feature?.id ?? props?.id ?? props?.ID ?? props?.event_id ?? props?.EventID ?? '—';
}
function getMag(props) {

  return props?.mag ?? props?.magnitude ?? props?.Magnitude ?? props?.M ?? null;
}
function getTime(props) {

  return props?.time ?? props?.timestamp ?? props?.date ?? props?.Date ?? '—';
}
function getTsunamiLevel(props) {

  return props?.tsunami_level ?? props?.tsunamiLevel ?? props?.level ?? props?.Level ?? null;
}
function formatTime(t) {
  if (typeof t === 'number') {
    try { return new Date(t).toLocaleString(); } catch { return String(t); }
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? String(t) : d.toLocaleString();
}


function clearTableKeepHeader() {
  const table = document.getElementById('data-table') || document.getElementsByTagName('table')[0];
  if (!table) return;
  const tbody = table.tBodies?.[0] || table.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
}

function fillTableFromFeatures(fc) {
  const table = document.getElementById('data-table') || document.getElementsByTagName('table')[0];
  if (!table) return;
  const tbody = table.tBodies?.[0] || table.querySelector('tbody');
  if (!tbody) return;

  const features = fc?.features ?? [];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const p = f.properties || {};

    const tr = document.createElement('tr');

    const c1 = document.createElement('td');
    c1.textContent = getId(p, f);

    const c2 = document.createElement('td');
    const secondValue = (currentDataset === 'tsunami') ? getTsunamiLevel(p) : getMag(p);
    c2.textContent = (secondValue ?? '—');

    const c3 = document.createElement('td');
    c3.textContent = formatTime(getTime(p));

    tr.appendChild(c1);
    tr.appendChild(c2);
    tr.appendChild(c3);
    frag.appendChild(tr);
  }

  tbody.appendChild(frag);
}

function setSecondHeaderLabel() {
  const th2 = document.querySelector('#data-table thead th:nth-child(2)') ||
              document.querySelector('table thead th:nth-child(2)');
  if (th2) th2.textContent = (currentDataset === 'tsunami') ? 'tsunami_level' : 'magnitude';
}


function sortCurrentTableDescBySecondColumn() {
  const table = document.getElementById('data-table') || document.getElementsByTagName('table')[0];
  if (!table) return;
  const tbody = table.tBodies?.[0] || table.querySelector('tbody');
  if (!tbody) return;


  const rows = Array.from(tbody.rows);


  rows.sort((a, b) => {
    const ax = a.cells[1]?.textContent ?? '';
    const bx = b.cells[1]?.textContent ?? '';

    const na = parseFloat(ax);
    const nb = parseFloat(bx);
    const aNum = !isNaN(na);
    const bNum = !isNaN(nb);

    if (aNum && bNum) return nb - na;           
    if (aNum && !bNum) return -1;                 
    if (!aNum && bNum) return 1;
    return String(bx).localeCompare(String(ax));       
  });


  const frag = document.createDocumentFragment();
  rows.forEach(r => frag.appendChild(r));
  tbody.appendChild(frag);
}


async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

async function geojsonFetch() {
  try {
    const [eq, jp, tsu] = await Promise.all([
      loadJson(PATH_EARTHQUAKES),
      loadJson(PATH_JAPAN),
      loadJson(PATH_TSUNAMI)
    ]);

    earthquakesData = eq;
    tsunamiData = tsu;

    map.on('load', () => {

      if (!map.getSource('japan')) {
        map.addSource('japan', { type: 'geojson', data: jp });
      }
      if (!map.getLayer('japan-layer')) {
        map.addLayer({
          id: 'japan-layer',
          type: 'fill',
          source: 'japan',
          paint: {
            'fill-color': '#0080ff',
            'fill-opacity': 0.5
          }
        });
      }


      if (!map.getSource('earthquakes')) {
        map.addSource('earthquakes', { type: 'geojson', data: earthquakesData });
      }
      if (!map.getLayer('earthquakes-layer')) {
        map.addLayer({
          id: 'earthquakes-layer',
          type: 'circle',
          source: 'earthquakes',
          paint: {
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-color': 'red',
            'circle-stroke-color': 'white'
          }
        });
      }


      if (!map.getSource('tsunami')) {
        map.addSource('tsunami', { type: 'geojson', data: tsunamiData });
      }
      if (!map.getLayer('tsunami-layer')) {
        map.addLayer({
          id: 'tsunami-layer',
          type: 'circle',
          source: 'tsunami',
          layout: { 'visibility': 'none' },
          paint: {
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-color': '#00d1ff',
            'circle-stroke-color': 'white'
          }
        });
      }

    
      currentDataset = 'earthquakes';
      setSecondHeaderLabel();    
      clearTableKeepHeader();
      fillTableFromFeatures(earthquakesData);

      
      wireUiHandlers();
    });
  } catch (err) {
    console.error(err);
    alert('Error loading data. Check console for details.');
  }
}


function wireUiHandlers() {

  const selector = document.getElementById('dataset-select');
  if (selector) {
    selector.addEventListener('change', (e) => {
      currentDataset = e.target.value; 

      
      if (currentDataset === 'earthquakes') {
        map.setLayoutProperty('earthquakes-layer', 'visibility', 'visible');
        map.setLayoutProperty('tsunami-layer', 'visibility', 'none');
        
      } else {
        map.setLayoutProperty('earthquakes-layer', 'visibility', 'none');
        map.setLayoutProperty('tsunami-layer', 'visibility', 'visible');
       
      }

    
      setSecondHeaderLabel();

      
      clearTableKeepHeader();
      fillTableFromFeatures(currentDataset === 'earthquakes' ? earthquakesData : tsunamiData);
    });
  }


  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    sortBtn.addEventListener('click', sortCurrentTableDescBySecondColumn);
  }
}


geojsonFetch();
