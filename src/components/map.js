import maplibregl from 'maplibre-gl';
import { computeOverall, getScoreColor } from '../utils/data.js';

let map = null;
let popup = null;
let currentFilter = null;
let hoveredId = null;

// ── Score-based color mapping ──
const SCORE_COLORS = [
  { min: 85, color: '#22c55e' },  // green
  { min: 70, color: '#3b82f6' },  // blue
  { min: 55, color: '#facc15' },  // yellow
  { min: 40, color: '#f97316' },  // orange
  { min: 0,  color: '#ef4444' },  // red
];

function getMarkerColor(score) {
  for (const { min, color } of SCORE_COLORS) {
    if (score >= min) return color;
  }
  return '#ef4444';
}

// ── Tile styles ──
const MAP_STYLES = {
  dark: [
    'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
  ],
  light: [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  ],
  satellite: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
};

const MAP_STYLE = {
  version: 8,
  name: 'UniMap',
  sources: {
    osm: {
      type: 'raster',
      tiles: MAP_STYLES.dark,
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-fade-duration': 0,
      },
    },
  ],
};

// ── Generate marker images (canvas) ──
function createCircleImage(color, size, borderColor = null) {
  const pad = 4;
  const total = size + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext('2d');
  const cx = total / 2;
  const cy = total / 2;
  const r = size / 2;

  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = color + '30';
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color + 'cc';
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor || '#ffffff50';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return canvas;
}

function createClusterImage(color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = color + '25';
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx - r / 3, cy - r / 3, 0, cx, cy, r);
  grad.addColorStop(0, color + 'dd');
  grad.addColorStop(1, color + '88');
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff30';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas;
}

function createHighlightImage(color) {
  const size = 44;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  // Pulsing ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = color + '80';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner fill
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color + '40';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas;
}

// ── Convert to GeoJSON ──
function toGeoJSON(universities) {
  return {
    type: 'FeatureCollection',
    features: universities
      .filter(u => u.lat && u.lng)
      .map((u, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [u.lng, u.lat] },
        properties: {
          id: i,
          name: u.name,
          country: u.country || '',
          countryCode: u.countryCode || '',
          flag: u.flag || '🌍',
          qsRank: u.qsRank || null,
          overallScore: u.overallScore || 50,
          markerColor: getMarkerColor(u.overallScore || 50),
          logo: u.logo || '',
          website: u.website || '',
        },
      })),
  };
}

// ── Main init ──
export async function initMap(universities) {
  map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLE,
    center: [20, 20],
    zoom: 2.2,
    minZoom: 1.5,
    maxZoom: 18,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
    fadeDuration: 0,
    antialias: true,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-right');

  popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
    maxWidth: '300px',
    className: 'uni-popup',
  });

  await new Promise(resolve => map.on('load', resolve));

  // Register marker images
  registerMarkerImages();

  // Convert data to GeoJSON
  const geojson = toGeoJSON(universities);

  // Add source with clustering
  map.addSource('universities', {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 60,
    clusterProperties: {
      avgScore: ['+', ['get', 'overallScore']],
      count: ['+', 1],
    },
  });

  // ── Cluster layers ──
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'universities',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['/', ['get', 'avgScore'], ['get', 'point_count']],
        '#ef4444', 40, '#f97316', 55, '#facc15', 70, '#3b82f6', 85, '#22c55e',
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        18, 10, 22, 50, 28, 100, 35, 500, 42,
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff20',
      'circle-blur': 0.15,
    },
  });

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'universities',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 13,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1,
    },
  });

  // ── Unclustered university points ──
  map.addLayer({
    id: 'university-points',
    type: 'circle',
    source: 'universities',
    filter: ['has', 'name'],
    paint: {
      'circle-color': ['get', 'markerColor'],
      'circle-radius': [
        'case',
        ['has', 'qsRank'],
        ['case', ['<=', ['get', 'qsRank'], 100], 8, ['<=', ['get', 'qsRank'], 500], 6.5, 5],
        5,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': [
        'case',
        ['has', 'qsRank'],
        ['case', ['<=', ['get', 'qsRank'], 100], 2.5, ['<=', ['get', 'qsRank'], 500], 2, 1.5],
        1.5,
      ],
      'circle-stroke-color': [
        'case',
        ['has', 'qsRank'],
        '#ffffff60',
        '#ffffff30',
      ],
      'circle-blur': 0.05,
    },
  });

  // ── Highlight layer ──
  map.addLayer({
    id: 'highlight',
    type: 'circle',
    source: 'universities',
    filter: ['==', 'id', -1],
    paint: {
      'circle-color': '#3b82f6',
      'circle-radius': 14,
      'circle-opacity': 0.3,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#3b82f6',
      'circle-blur': 0.3,
    },
  });

  // ── Interactions ──
  setupInteractions();

  // ── 3D Toggle ──
  setup3DToggle();

  // ── Style Toggle ──
  setupStyleToggle();

  // ── Zoom indicator ──
  const zoomIndicator = document.getElementById('zoom-indicator');
  map.on('zoom', () => {
    const z = map.getZoom();
    if (z > 4 && zoomIndicator) {
      zoomIndicator.classList.remove('hidden');
      zoomIndicator.textContent = `Z ${z.toFixed(1)}`;
    } else if (zoomIndicator) {
      zoomIndicator.classList.add('hidden');
    }
  });

  // Add glow effect for global view
  addAmbientGlow();

  return map;
}

function registerMarkerImages() {
  // No images needed — using circle layers for both clusters and points
}

function setupInteractions() {
  // Change cursor on hover
  map.on('mouseenter', 'university-points', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'university-points', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });

  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });

  // Hover popup on university points
  map.on('mousemove', 'university-points', (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties;
    const id = props.id;

    if (id === hoveredId) return;
    hoveredId = id;

    const coords = e.features[0].geometry.coordinates.slice();
    const qsLabel = props.qsRank ? `<span style="color:#60a5fa;font-weight:700;">QS #${props.qsRank}</span>` : '';
    const scoreColor = getMarkerColor(props.overallScore);

    popup
      .setLngLat(coords)
      .setHTML(`
        <div style="padding:4px 0;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;line-height:1.3;">${escapeHtml(props.name)}</div>
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);">
            <span>${props.flag} ${escapeHtml(props.country)}</span>
            ${qsLabel}
            <span style="margin-left:auto;font-weight:800;font-family:'JetBrains Mono',monospace;color:${scoreColor};font-size:14px;">${props.overallScore}</span>
          </div>
        </div>
      `)
      .addTo(map);
  });

  // Click on university → open detail
  map.on('click', 'university-points', (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties;
    // Find the full university data
    const uni = window.__universities?.[props.id];
    if (uni) {
      window.dispatchEvent(new CustomEvent('university:select', { detail: uni }));
      highlightUniversity(props.id);
    }
  });

  // Click on cluster → zoom in
  map.on('click', 'clusters', (e) => {
    if (!e.features?.length) return;
    const clusterId = e.features[0].properties.cluster_id;
    map.getSource('universities').getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({
        center: e.features[0].geometry.coordinates,
        zoom: zoom + 0.5,
        duration: 800,
      });
    });
  });
}

function highlightUniversity(id) {
  if (!map.getLayer('highlight')) return;
  map.setFilter('highlight', ['==', 'id', id]);
}

function addAmbientGlow() {
  // Add a subtle radial glow at the center of the map for atmosphere
  // This is done via a custom layer using the existing canvas
  const canvas = map.getCanvas();
  const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
  // MapLibre handles its own WebGL context, so we'll use CSS overlay instead
}

function setup3DToggle() {
  const btn = document.getElementById('btn-3d');
  if (!btn) return;
  let is3D = false;

  btn.addEventListener('click', () => {
    is3D = !is3D;
    btn.classList.toggle('active', is3D);
    if (is3D) {
      map.easeTo({ pitch: 60, bearing: -20, duration: 1500 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
  });
}

function setupStyleToggle() {
  const btn = document.getElementById('btn-style');
  if (!btn) return;
  const styles = ['dark', 'light', 'satellite'];
  let currentIdx = 0;

  btn.addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % styles.length;
    const styleName = styles[currentIdx];

    // Change title and state
    btn.setAttribute('title', `Map Style: ${styleName.charAt(0).toUpperCase() + styleName.slice(1)}`);
    
    // Switch active state highlight
    if (styleName !== 'dark') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    const source = map.getSource('osm');
    if (source) {
      source.setTiles(MAP_STYLES[styleName]);
    }
  });
}

// ── Public API ──
export function flyTo(uni) {
  if (!map || !uni.lat || !uni.lng) return;
  map.flyTo({
    center: [uni.lng, uni.lat],
    zoom: Math.max(map.getZoom(), 6),
    pitch: 0,
    bearing: 0,
    duration: 1500,
    essential: true,
  });
}

export function highlightMarker(uni) {
  if (!uni) {
    map?.setFilter('highlight', ['==', 'id', -1]);
    return;
  }
  // Find the index of this university in the data
  const idx = window.__universities?.indexOf(uni);
  if (idx >= 0) {
    highlightUniversity(idx);
  }
}

export function filterMarkers(visibleIndices) {
  if (!map || !map.getSource('universities')) return;
  const total = window.__universities?.length || 0;
  // If showing all or nearly all, just use the default layer filter
  if (!visibleIndices || visibleIndices.size === 0) {
    map.setFilter('university-points', ['all', ['has', 'name'], ['==', 'id', -1]]);
    return;
  }
  // If showing all universities, reset to default filter (no id filtering)
  if (visibleIndices.size >= total * 0.95) {
    map.setFilter('university-points', ['has', 'name']);
    return;
  }
  const ids = Array.from(visibleIndices);
  if (ids.length > 0) {
    map.setFilter('university-points', ['all', ['has', 'name'], ['in', 'id', ...ids]]);
  }
}

export function getMap() {
  return map;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
