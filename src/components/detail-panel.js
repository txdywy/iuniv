import { computeOverall, getScoreColor, formatNumber, getFlagEmoji } from '../utils/data.js';
import { flyTo } from './map.js';

let isOpen = false;

export function initDetailPanel(map) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDetail();
  });

  window.addEventListener('university:select', (e) => {
    showDetail(e.detail);
  });
}

function showDetail(uni) {
  const panel = document.getElementById('detail-panel');
  const inner = panel.querySelector('.detail-panel-inner');

  const overall = uni.overallScore || computeOverall(uni);
  const flag = uni.flag || getFlagEmoji(uni.countryCode);
  const initials = uni.name.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  inner.innerHTML = `
    <div class="detail-header">
      <button class="detail-close" id="detail-close-btn" aria-label="Close">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      ${
        uni.logo
          ? `<img class="detail-logo" src="${uni.logo}" alt="" onerror="this.style.display='none'">`
          : `<div class="detail-logo-fallback">${initials}</div>`
      }
      <div class="detail-name">${escapeHtml(uni.name)}</div>
      <div class="detail-country">
        <span>${flag}</span>
        <span>${escapeHtml(uni.country || '')}${uni.state ? `, ${escapeHtml(uni.state)}` : ''}</span>
        ${uni.qsRank ? `<span class="detail-qs-rank">QS #${uni.qsRank}</span>` : ''}
      </div>
    </div>

    <div class="detail-body">
      <!-- Overall Score -->
      <div class="overall-score-section">
        <div class="overall-score-header">
          <span class="scores-section-title">Overall Score</span>
          <span class="overall-score-value" style="color:${getScoreColor(overall)}">${overall}</span>
        </div>
        <div class="score-bar-track" style="height:10px;">
          <div class="score-bar-fill animate-width" data-width="${overall}%" style="width:0%;background:linear-gradient(90deg,${getScoreColor(Math.max(overall - 20, 0))},${getScoreColor(overall)});"></div>
        </div>
      </div>

      <!-- Dimension Scores -->
      <div class="scores-section">
        <div class="scores-section-title">Dimension Scores</div>
        ${renderScoreBar('Academic Reputation', uni.scores?.academic, 'academic')}
        ${renderScoreBar('Research Output', uni.scores?.research, 'research')}
        ${renderScoreBar('Employability', uni.scores?.employability, 'employability')}
        ${renderScoreBar('International Diversity', uni.scores?.international, 'international')}
        ${renderScoreBar('Facilities & Resources', uni.scores?.facilities, 'facilities')}
      </div>

      <!-- Key Info -->
      <div class="scores-section-title">Key Information</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="flex items-center gap-1.5 mb-1 text-white/40">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <div class="info-item-label">Founded</div>
          </div>
          <div class="info-item-value">${uni.founded || '—'}</div>
        </div>
        <div class="info-item">
          <div class="flex items-center gap-1.5 mb-1 text-white/40">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <div class="info-item-label">Type</div>
          </div>
          <div class="info-item-value text-sm">${escapeHtml(uni.type || '—')}</div>
        </div>
        <div class="info-item">
          <div class="flex items-center gap-1.5 mb-1 text-white/40">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <div class="info-item-label">Students</div>
          </div>
          <div class="info-item-value">${formatNumber(uni.studentCount)}</div>
        </div>
        <div class="info-item">
          <div class="flex items-center gap-1.5 mb-1 text-white/40">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
            <div class="info-item-label">Intl Students</div>
          </div>
          <div class="info-item-value">${uni.internationalPct != null ? uni.internationalPct + '%' : '—'}</div>
        </div>
      </div>

      ${uni.website ? `
      <a class="link-btn" href="${escapeAttr(uni.website)}" target="_blank" rel="noopener noreferrer">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Visit Website
      </a>` : ''}

      <div class="coords-bar">
        <span>📍 ${uni.lat?.toFixed(4)}, ${uni.lng?.toFixed(4)}</span>
        <button class="focus-map-btn" id="focus-map-btn">Focus on Map</button>
      </div>
    </div>
  `;

  // Show
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('visible'));
  isOpen = true;

  // Animate score bars
  setTimeout(() => {
    inner.querySelectorAll('.score-bar-fill').forEach((bar, i) => {
      setTimeout(() => {
        bar.style.width = bar.dataset.width;
      }, i * 80); // stagger each bar
    });
  }, 200);

  // Close button
  document.getElementById('detail-close-btn')?.addEventListener('click', closeDetail);

  // Focus on map
  document.getElementById('focus-map-btn')?.addEventListener('click', () => {
    flyTo(uni);
  });
}

function closeDetail() {
  const panel = document.getElementById('detail-panel');
  panel.classList.remove('visible');
  isOpen = false;
  setTimeout(() => panel.classList.add('hidden'), 300);
}

function renderScoreBar(label, value, key) {
  const v = typeof value === 'number' ? value : null;
  const displayVal = v != null ? v : '—';
  const width = v != null ? v : 0;
  const color = v != null ? getScoreColor(v) : 'rgba(255,255,255,0.1)';
  const textColor = v != null ? getScoreColor(v) : 'rgba(255,255,255,0.2)';

  return `
  <div class="score-bar">
    <div class="score-bar-label">
      <span>${label}</span>
      <span style="color:${textColor}">${displayVal}</span>
    </div>
    <div class="score-bar-track">
      <div class="score-bar-fill" data-width="${width}%" style="width:0%;background:${color};transition-delay:0.2s;"></div>
    </div>
  </div>`;
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
