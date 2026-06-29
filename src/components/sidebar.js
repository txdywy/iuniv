import { computeOverall, getScoreColorClass, getFlagEmoji, debounce } from '../utils/data.js';
import { flyTo, highlightMarker, filterMarkers } from './map.js';

let allUniversities = [];
let filteredUniversities = [];
let activeFilter = 'all';
let activeCountry = null;
let sortBy = 'rank';

export function initSidebar(universities, mapInstance) {
  allUniversities = universities;
  filteredUniversities = [...universities];

  sortUniversities();
  renderList();
  renderCountryList();
  updateResultCount();

  // Search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce(() => filterAndRender(), 150));

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      searchInput.blur();
      if (activeCountry) {
        activeCountry = null;
        filterAndRender();
      }
    }
  });

  // Filter chips
  document.getElementById('filter-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    const filter = chip.dataset.filter;
    if (filter === activeFilter) return;
    activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterAndRender();
  });

  // Sort toggle
  const sortBtn = document.getElementById('sort-btn');
  sortBtn.addEventListener('click', () => {
    sortBy = sortBy === 'rank' ? 'name' : sortBy === 'name' ? 'score' : 'rank';
    document.getElementById('sort-label').textContent =
      sortBy === 'rank' ? 'Ranking' : sortBy === 'name' ? 'Name' : 'Score';
    sortUniversities();
    renderList();
  });

  // Sidebar toggle
  const sidebarBtn = document.getElementById('btn-sidebar');
  const sidebar = document.getElementById('sidebar');
  sidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    sidebarBtn.classList.toggle('active');
    setTimeout(() => mapInstance?.resize(), 350);
  });

  // Listen for external selection
  window.addEventListener('university:select', (e) => {
    highlightCard(e.detail);
  });
}

function filterAndRender() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();

  filteredUniversities = allUniversities.filter((uni) => {
    // Search
    if (query) {
      const searchable = [uni.name, uni.country, uni.state, ...(uni.domains || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    // Quick filter
    if (activeFilter === 'top100' && (!uni.qsRank || uni.qsRank > 100)) return false;
    if (activeFilter === 'top500' && (!uni.qsRank || uni.qsRank > 500)) return false;
    if (activeFilter === 'research') {
      const research = uni.scores?.research ?? 0;
      if (research < 70) return false;
    }

    // Country filter
    if (activeCountry && uni.country !== activeCountry) return false;

    return true;
  });

  sortUniversities();
  renderList();
  updateResultCount();

  // Update map markers
  const visibleIndices = new Set(filteredUniversities.map(u => allUniversities.indexOf(u)));
  filterMarkers(visibleIndices);
}

function sortUniversities() {
  filteredUniversities.sort((a, b) => {
    if (sortBy === 'rank') {
      const ra = a.qsRank ?? 99999;
      const rb = b.qsRank ?? 99999;
      if (ra !== rb) return ra - rb;
      return (b.overallScore || 0) - (a.overallScore || 0);
    }
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'score') return (b.overallScore || 0) - (a.overallScore || 0);
    return 0;
  });
}

function renderList() {
  const container = document.getElementById('university-list');
  const display = filteredUniversities.slice(0, 200);

  container.innerHTML = display.map((uni, i) => {
    const overall = uni.overallScore || computeOverall(uni);
    const colorClass = getScoreColorClass(overall);
    const initials = getInitials(uni.name);
    const flag = uni.flag || getFlagEmoji(uni.countryCode);

    return `
    <div class="uni-card animate-fade-in-up" data-uni-idx="${allUniversities.indexOf(uni)}" style="animation-delay: ${Math.min(i * 15, 300)}ms">
      ${
        uni.logo
          ? `<img class="uni-card-logo" src="${uni.logo}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'uni-card-logo-placeholder\\'>${initials}</div>'">`
          : `<div class="uni-card-logo-placeholder">${initials}</div>`
      }
      <div class="uni-card-info">
        <div class="uni-card-name">${escapeHtml(uni.name)}</div>
        <div class="uni-card-meta">
          <span>${flag} ${escapeHtml(uni.country || '')}</span>
          ${uni.qsRank ? `<span class="qs-badge">QS #${uni.qsRank}</span>` : ''}
        </div>
      </div>
      <div class="uni-card-score ${colorClass}">${overall}</div>
    </div>`;
  }).join('');

  // Click handlers
  container.querySelectorAll('.uni-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.uniIdx);
      const uni = allUniversities[idx];
      if (!uni) return;
      flyTo(uni);
      highlightMarker(uni);
      highlightCard(uni);
      window.dispatchEvent(new CustomEvent('university:select', { detail: uni }));
    });
  });
}

function highlightCard(uni) {
  document.querySelectorAll('.uni-card').forEach(c => c.classList.remove('active'));
  if (!uni) return;
  const idx = allUniversities.indexOf(uni);
  const card = document.querySelector(`.uni-card[data-uni-idx="${idx}"]`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderCountryList() {
  const container = document.getElementById('country-list');
  const countryPanel = document.getElementById('country-panel');

  const counts = {};
  allUniversities.forEach(u => {
    if (u.country) counts[u.country] = (counts[u.country] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30);

  container.innerHTML = sorted.map(([country, count]) => {
    const sample = allUniversities.find(u => u.country === country);
    const flag = sample?.flag || getFlagEmoji(sample?.countryCode);
    return `
    <div class="country-item${activeCountry === country ? ' active' : ''}" data-country="${escapeAttr(country)}">
      <span>${flag} ${country}</span>
      <span class="country-count">${count}</span>
    </div>`;
  }).join('');

  countryPanel.classList.remove('hidden');

  container.querySelectorAll('.country-item').forEach(item => {
    item.addEventListener('click', () => {
      const c = item.dataset.country;
      activeCountry = activeCountry === c ? null : c;
      container.querySelectorAll('.country-item').forEach(ci => ci.classList.remove('active'));
      if (activeCountry) item.classList.add('active');
      filterAndRender();
    });
  });
}

function updateResultCount() {
  const el = document.getElementById('result-count');
  const total = filteredUniversities.length;
  const all = allUniversities.length;
  el.textContent = total === all ? `${all.toLocaleString()} universities` : `${total.toLocaleString()} of ${all.toLocaleString()}`;
}

function getInitials(name) {
  return name.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
