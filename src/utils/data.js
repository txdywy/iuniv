const DATA_URL = './data/universities.json';

let _cache = null;

export async function loadUniversities() {
  if (_cache) return _cache;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _cache = await res.json();
  } catch (err) {
    console.error('Failed to load university data:', err);
    _cache = [];
  }
  return _cache;
}

export function computeOverall(uni) {
  if (uni.overallScore) return uni.overallScore;
  const dims = [
    uni.scores?.academic,
    uni.scores?.research,
    uni.scores?.employability,
    uni.scores?.international,
    uni.scores?.facilities,
  ].filter(v => typeof v === 'number');
  if (!dims.length) return 50;
  return Math.round(dims.reduce((a, b) => a + b, 0) / dims.length);
}

export function getScoreColorClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-average';
  return 'score-below';
}

export function getScoreColor(score) {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#3b82f6';
  if (score >= 55) return '#facc15';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

export function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function debounce(fn, ms = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
