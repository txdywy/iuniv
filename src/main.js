import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';
import { initMap } from './components/map.js';
import { initSidebar } from './components/sidebar.js';
import { initDetailPanel } from './components/detail-panel.js';
import { loadUniversities } from './utils/data.js';

async function boot() {
  const loader = document.getElementById('loader');

  try {
    const universities = await loadUniversities();
    console.log(`Loaded ${universities.length} universities`);

    // Store globally for map interaction lookups
    window.__universities = universities;

    const mapInstance = await initMap(universities);
    initSidebar(universities, mapInstance);
    initDetailPanel(mapInstance);

    // Dismiss loader
    loader.classList.add('opacity-0');
    setTimeout(() => { loader.style.display = 'none'; }, 600);
  } catch (err) {
    console.error('Failed to boot:', err);
    const loaderText = loader.querySelector('.loader-text');
    if (loaderText) loaderText.textContent = 'Failed to load data. Please refresh.';
  }
}

document.addEventListener('DOMContentLoaded', boot);
