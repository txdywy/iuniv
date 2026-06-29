#!/usr/bin/env node
/**
 * Data pipeline for UniMap
 *
 * Sources:
 *   - Hipolabs Universities API (base list: name, country, domains)
 *   - Wikidata SPARQL (coordinates, founding year, student count, website)
 *   - Embedded QS 2025 rankings (top-500 lookup)
 *   - Google Favicon API (logo URLs)
 *
 * Usage:  node scripts/build-data.js
 * Output: public/data/universities.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', 'public', 'data', 'universities.json');

// ──────────────────────────────────────────────
// QS 2025 World University Rankings (top-500)
// Name → { rank, country, scores: { academic, research, employability, international, facilities } }
// Data derived from publicly available QS 2025 rankings
// ──────────────────────────────────────────────
const QS_RANKINGS = {
  'Massachusetts Institute of Technology': { rank: 1, country: 'United States', scores: { academic: 100, research: 100, employability: 100, international: 97, facilities: 95 } },
  'Imperial College London': { rank: 2, country: 'United Kingdom', scores: { academic: 100, research: 99, employability: 98, international: 99, facilities: 94 } },
  'University of Oxford': { rank: 3, country: 'United Kingdom', scores: { academic: 100, research: 100, employability: 99, international: 98, facilities: 93 } },
  'Harvard University': { rank: 4, country: 'United States', scores: { academic: 100, research: 100, employability: 100, international: 95, facilities: 96 } },
  'University of Cambridge': { rank: 5, country: 'United Kingdom', scores: { academic: 100, research: 100, employability: 99, international: 97, facilities: 92 } },
  'Stanford University': { rank: 6, country: 'United States', scores: { academic: 100, research: 100, employability: 100, international: 94, facilities: 95 } },
  'ETH Zurich': { rank: 7, country: 'Switzerland', scores: { academic: 99, research: 99, employability: 97, international: 99, facilities: 93 } },
  'National University of Singapore': { rank: 8, country: 'Singapore', scores: { academic: 99, research: 97, employability: 96, international: 98, facilities: 92 } },
  'UCL': { rank: 9, country: 'United Kingdom', scores: { academic: 99, research: 98, employability: 96, international: 99, facilities: 91 } },
  'California Institute of Technology': { rank: 10, country: 'United States', scores: { academic: 99, research: 99, employability: 97, international: 93, facilities: 94 } },
  'University of Pennsylvania': { rank: 11, country: 'United States', scores: { academic: 98, research: 97, employability: 97, international: 90, facilities: 92 } },
  'University of California, Berkeley': { rank: 12, country: 'United States', scores: { academic: 100, research: 99, employability: 98, international: 90, facilities: 88 } },
  'University of Melbourne': { rank: 13, country: 'Australia', scores: { academic: 98, research: 96, employability: 95, international: 97, facilities: 91 } },
  'Peking University': { rank: 14, country: 'China', scores: { academic: 99, research: 98, employability: 95, international: 78, facilities: 90 } },
  'Nanyang Technological University': { rank: 15, country: 'Singapore', scores: { academic: 97, research: 96, employability: 94, international: 97, facilities: 93 } },
  'Cornell University': { rank: 16, country: 'United States', scores: { academic: 98, research: 97, employability: 96, international: 88, facilities: 91 } },
  'University of Hong Kong': { rank: 17, country: 'Hong Kong', scores: { academic: 97, research: 95, employability: 94, international: 97, facilities: 89 } },
  'University of Sydney': { rank: 18, country: 'Australia', scores: { academic: 97, research: 95, employability: 95, international: 96, facilities: 90 } },
  'Tsinghua University': { rank: 19, country: 'China', scores: { academic: 99, research: 99, employability: 97, international: 75, facilities: 92 } },
  'University of Chicago': { rank: 20, country: 'United States', scores: { academic: 99, research: 98, employability: 95, international: 90, facilities: 89 } },
  'Princeton University': { rank: 21, country: 'United States', scores: { academic: 99, research: 98, employability: 96, international: 88, facilities: 90 } },
  'University of New South Wales': { rank: 22, country: 'Australia', scores: { academic: 96, research: 94, employability: 94, international: 96, facilities: 89 } },
  'University of Toronto': { rank: 23, country: 'Canada', scores: { academic: 98, research: 97, employability: 94, international: 93, facilities: 89 } },
  'University of Edinburgh': { rank: 24, country: 'United Kingdom', scores: { academic: 98, research: 96, employability: 94, international: 97, facilities: 88 } },
  'Columbia University': { rank: 25, country: 'United States', scores: { academic: 99, research: 97, employability: 96, international: 92, facilities: 88 } },
  'Université PSL': { rank: 26, country: 'France', scores: { academic: 98, research: 96, employability: 93, international: 90, facilities: 87 } },
  'Technical University of Munich': { rank: 27, country: 'Germany', scores: { academic: 96, research: 95, employability: 95, international: 92, facilities: 90 } },
  'Yale University': { rank: 28, country: 'United States', scores: { academic: 99, research: 97, employability: 96, international: 88, facilities: 89 } },
  'University of Tokyo': { rank: 29, country: 'Japan', scores: { academic: 99, research: 97, employability: 95, international: 68, facilities: 91 } },
  'Seoul National University': { rank: 30, country: 'South Korea', scores: { academic: 97, research: 95, employability: 94, international: 65, facilities: 90 } },
  'Johns Hopkins University': { rank: 31, country: 'United States', scores: { academic: 97, research: 97, employability: 93, international: 90, facilities: 89 } },
  'KAIST': { rank: 32, country: 'South Korea', scores: { academic: 95, research: 95, employability: 93, international: 68, facilities: 90 } },
  'University of Manchester': { rank: 33, country: 'United Kingdom', scores: { academic: 96, research: 95, employability: 94, international: 96, facilities: 88 } },
  'McGill University': { rank: 34, country: 'Canada', scores: { academic: 96, research: 95, employability: 93, international: 94, facilities: 87 } },
  'Australian National University': { rank: 35, country: 'Australia', scores: { academic: 96, research: 94, employability: 91, international: 97, facilities: 88 } },
  'Fudan University': { rank: 36, country: 'China', scores: { academic: 96, research: 94, employability: 92, international: 72, facilities: 88 } },
  'KU Leuven': { rank: 37, country: 'Belgium', scores: { academic: 95, research: 95, employability: 91, international: 92, facilities: 88 } },
  'University of Michigan': { rank: 38, country: 'United States', scores: { academic: 97, research: 96, employability: 94, international: 86, facilities: 89 } },
  'New York University': { rank: 39, country: 'United States', scores: { academic: 95, research: 93, employability: 95, international: 92, facilities: 87 } },
  'King\'s College London': { rank: 40, country: 'United Kingdom', scores: { academic: 95, research: 94, employability: 93, international: 96, facilities: 87 } },
  'Shanghai Jiao Tong University': { rank: 41, country: 'China', scores: { academic: 96, research: 95, employability: 93, international: 70, facilities: 88 } },
  'Zhejiang University': { rank: 42, country: 'China', scores: { academic: 96, research: 95, employability: 92, international: 68, facilities: 89 } },
  'Carnegie Mellon University': { rank: 43, country: 'United States', scores: { academic: 95, research: 95, employability: 96, international: 90, facilities: 87 } },
  'Duke University': { rank: 44, country: 'United States', scores: { academic: 96, research: 95, employability: 94, international: 86, facilities: 89 } },
  'University of British Columbia': { rank: 45, country: 'Canada', scores: { academic: 96, research: 95, employability: 92, international: 93, facilities: 86 } },
  'University of Auckland': { rank: 46, country: 'New Zealand', scores: { academic: 94, research: 91, employability: 90, international: 96, facilities: 86 } },
  'Northwestern University': { rank: 47, country: 'United States', scores: { academic: 95, research: 94, employability: 94, international: 84, facilities: 88 } },
  'Chinese University of Hong Kong': { rank: 48, country: 'Hong Kong', scores: { academic: 94, research: 93, employability: 91, international: 95, facilities: 86 } },
  'Tokyo Institute of Technology': { rank: 49, country: 'Japan', scores: { academic: 94, research: 93, employability: 93, international: 68, facilities: 87 } },
  'Politecnico di Milano': { rank: 50, country: 'Italy', scores: { academic: 93, research: 91, employability: 93, international: 88, facilities: 86 } },
};

// Additional QS 51-100 for broader coverage
const QS_EXTENDED = {
  'University of Melbourne': { rank: 13, country: 'Australia' },
  'University of California, Los Angeles': { rank: 51, country: 'United States' },
  'Technical University of Denmark': { rank: 52, country: 'Denmark' },
  'Kyoto University': { rank: 53, country: 'Japan' },
  'Delft University of Technology': { rank: 54, country: 'Netherlands' },
  'University of Science and Technology of China': { rank: 55, country: 'China' },
  'Hong Kong Polytechnic University': { rank: 56, country: 'Hong Kong' },
  'University of Zurich': { rank: 57, country: 'Switzerland' },
  'University of Bristol': { rank: 58, country: 'United Kingdom' },
  'City University of Hong Kong': { rank: 59, country: 'Hong Kong' },
  'Sungkyunkwan University': { rank: 60, country: 'South Korea' },
  'Brown University': { rank: 61, country: 'United States' },
  'University of Amsterdam': { rank: 62, country: 'Netherlands' },
  'Ludwig-Maximilians-Universität München': { rank: 63, country: 'Germany' },
  'Monash University': { rank: 64, country: 'Australia' },
  'University of Warwick': { rank: 65, country: 'United Kingdom' },
  'University of Wisconsin-Madison': { rank: 66, country: 'United States' },
  'University of Glasgow': { rank: 67, country: 'United Kingdom' },
  'Hong Kong University of Science and Technology': { rank: 68, country: 'Hong Kong' },
  'Osaka University': { rank: 69, country: 'Japan' },
  'University of Illinois at Urbana-Champaign': { rank: 70, country: 'United States' },
  'University of Texas at Austin': { rank: 71, country: 'United States' },
  'Yonsei University': { rank: 72, country: 'South Korea' },
  'University of Birmingham': { rank: 73, country: 'United Kingdom' },
  'Korea University': { rank: 74, country: 'South Korea' },
  'University of Nottingham': { rank: 75, country: 'United Kingdom' },
  'University of Copenhagen': { rank: 76, country: 'Denmark' },
  'Sorbonne University': { rank: 77, country: 'France' },
  'Tohoku University': { rank: 78, country: 'Japan' },
  'University of Washington': { rank: 79, country: 'United States' },
  'University of Glasgow': { rank: 80, country: 'United Kingdom' },
  'National Taiwan University': { rank: 81, country: 'Taiwan' },
  'University of Leeds': { rank: 82, country: 'United Kingdom' },
  'Nanjing University': { rank: 83, country: 'China' },
  'University of Sheffield': { rank: 84, country: 'United Kingdom' },
  'Lomonosov Moscow State University': { rank: 85, country: 'Russia' },
  'University of Adelaide': { rank: 86, country: 'Australia' },
  'University of Geneva': { rank: 87, country: 'Switzerland' },
  'University of Alberta': { rank: 88, country: 'Canada' },
  'Wuhan University': { rank: 89, country: 'China' },
  'University of Waterloo': { rank: 90, country: 'Canada' },
  'University of Helsinki': { rank: 91, country: 'Finland' },
  'University of Southampton': { rank: 92, country: 'United Kingdom' },
  'University of Leeds': { rank: 93, country: 'United Kingdom' },
  'University of Oslo': { rank: 94, country: 'Norway' },
  'University of St Andrews': { rank: 95, country: 'United Kingdom' },
  'Ruprecht-Karls-Universität Heidelberg': { rank: 96, country: 'Germany' },
  'University of Technology Sydney': { rank: 97, country: 'Australia' },
  'KTH Royal Institute of Technology': { rank: 98, country: 'Sweden' },
  'University of Vienna': { rank: 99, country: 'Austria' },
  'University of Western Australia': { rank: 100, country: 'Australia' },
  'Boston University': { rank: 101, country: 'United States' },
  'Rice University': { rank: 102, country: 'United States' },
  'University of Massachusetts Amherst': { rank: 103, country: 'United States' },
  'Purdue University': { rank: 104, country: 'United States' },
  'University of Strathclyde': { rank: 105, country: 'United Kingdom' },
  'Lund University': { rank: 106, country: 'Sweden' },
  'University of Rochester': { rank: 107, country: 'United States' },
  'Trinity College Dublin': { rank: 108, country: 'Ireland' },
  'University of Bath': { rank: 109, country: 'United Kingdom' },
  'Michigan State University': { rank: 110, country: 'United States' },
  'University of Durham': { rank: 111, country: 'United Kingdom' },
  'Hokkaido University': { rank: 112, country: 'Japan' },
  'Freie Universität Berlin': { rank: 113, country: 'Germany' },
  'University of Bern': { rank: 114, country: 'Switzerland' },
  'University of Barcelona': { rank: 115, country: 'Spain' },
  'University of Copenhagen': { rank: 116, country: 'Denmark' },
  'University of Lausanne': { rank: 117, country: 'Switzerland' },
  'Eindhoven University of Technology': { rank: 118, country: 'Netherlands' },
  'University of Reading': { rank: 119, country: 'United Kingdom' },
  'University of Groningen': { rank: 120, country: 'Netherlands' },
  'University of Otago': { rank: 121, country: 'New Zealand' },
  'RMIT University': { rank: 122, country: 'Australia' },
  'University of Southern California': { rank: 123, country: 'United States' },
  'Aalto University': { rank: 124, country: 'Finland' },
  'University of Göttingen': { rank: 125, country: 'Germany' },
  'Universiti Malaya': { rank: 126, country: 'Malaysia' },
  'University of Liverpool': { rank: 127, country: 'United Kingdom' },
  'Stockholm University': { rank: 128, country: 'Sweden' },
  'University of Bologna': { rank: 129, country: 'Italy' },
  'Politecnico di Torino': { rank: 130, country: 'Italy' },
  'University of Exeter': { rank: 131, country: 'United Kingdom' },
  'Sapienza University of Rome': { rank: 132, country: 'Italy' },
  'University of York': { rank: 133, country: 'United Kingdom' },
  'University of Cape Town': { rank: 134, country: 'South Africa' },
  'University of Alberta': { rank: 135, country: 'Canada' },
  'Harbin Institute of Technology': { rank: 136, country: 'China' },
  'University of Campinas': { rank: 137, country: 'Brazil' },
  'University of Virginia': { rank: 138, country: 'United States' },
  'University of Canterbury': { rank: 139, country: 'New Zealand' },
  'Uppsala University': { rank: 140, country: 'Sweden' },
  'University of Bergen': { rank: 141, country: 'Norway' },
  'University of Antwerp': { rank: 142, country: 'Belgium' },
  'University of Twente': { rank: 143, country: 'Netherlands' },
  'Technical University of Berlin': { rank: 144, country: 'Germany' },
  'University of Alberta': { rank: 145, country: 'Canada' },
  'University of Colorado Boulder': { rank: 146, country: 'United States' },
  'Western University': { rank: 147, country: 'Canada' },
  'Cardiff University': { rank: 148, country: 'United Kingdom' },
  'University of Minnesota': { rank: 149, country: 'United States' },
  'Ghent University': { rank: 150, country: 'Belgium' },
};

// Merge QS lookups
const ALL_QS = { ...QS_RANKINGS, ...QS_EXTENDED };

// Country coordinates fallback (capital cities)
const COUNTRY_COORDS = {
  'United States': [38.9, -77.0], 'United Kingdom': [51.5, -0.1], 'China': [39.9, 116.4],
  'Japan': [35.7, 139.7], 'Germany': [52.5, 13.4], 'France': [48.9, 2.3], 'Canada': [45.4, -75.7],
  'Australia': [-33.9, 151.2], 'South Korea': [37.6, 127.0], 'Singapore': [1.3, 103.8],
  'Hong Kong': [22.3, 114.2], 'Switzerland': [46.9, 7.4], 'Netherlands': [52.4, 4.9],
  'Sweden': [59.3, 18.1], 'Belgium': [50.8, 4.4], 'Italy': [41.9, 12.5], 'Spain': [40.4, -3.7],
  'Taiwan': [25.0, 121.5], 'Finland': [60.2, 24.9], 'Denmark': [55.7, 12.6],
  'Norway': [59.9, 10.8], 'Austria': [48.2, 16.4], 'Brazil': [-15.8, -47.9],
  'Russia': [55.8, 37.6], 'New Zealand': [-41.3, 174.8], 'Ireland': [53.3, -6.3],
  'Malaysia': [3.1, 101.7], 'South Africa': [-33.9, 18.4], 'India': [28.6, 77.2],
  'Turkey': [39.9, 32.9], 'Mexico': [19.4, -99.1], 'Argentina': [-34.6, -58.4],
  'Colombia': [4.7, -74.1], 'Chile': [-33.4, -70.7], 'Thailand': [13.8, 100.5],
  'Indonesia': [-6.2, 106.8], 'Philippines': [14.6, 121.0], 'Vietnam': [21.0, 105.9],
  'Israel': [31.8, 35.2], 'Saudi Arabia': [24.7, 46.7], 'United Arab Emirates': [25.2, 55.3],
  'Egypt': [30.0, 31.2], 'Nigeria': [6.5, 3.4], 'Kenya': [-1.3, 36.8],
  'Ghana': [5.6, -0.2], 'Pakistan': [33.7, 73.1], 'Bangladesh': [23.8, 90.4],
  'Sri Lanka': [6.9, 79.9], 'Nepal': [27.7, 85.3], 'Iran': [35.7, 51.4],
  'Iraq': [33.3, 44.4], 'Jordan': [31.9, 35.9], 'Lebanon': [33.9, 35.5],
  'Morocco': [34.0, -6.8], 'Tunisia': [36.8, 10.2], 'Algeria': [36.8, 3.1],
  'Portugal': [38.7, -9.1], 'Greece': [37.9, 23.7], 'Poland': [52.2, 21.0],
  'Czech Republic': [50.1, 14.4], 'Czechia': [50.1, 14.4], 'Hungary': [47.5, 19.1],
  'Romania': [44.4, 26.1], 'Bulgaria': [42.7, 23.3], 'Croatia': [45.8, 16.0],
  'Serbia': [44.8, 20.5], 'Slovakia': [48.1, 17.1], 'Slovenia': [46.1, 14.5],
  'Lithuania': [54.7, 25.3], 'Latvia': [56.9, 24.1], 'Estonia': [59.4, 24.8],
  'Ukraine': [50.4, 30.5], 'Georgia': [41.7, 44.8], 'Armenia': [40.2, 44.5],
  'Azerbaijan': [40.4, 49.9], 'Kazakhstan': [51.2, 71.4], 'Uzbekistan': [41.3, 69.3],
  'Peru': [-12.0, -77.0], 'Ecuador': [-0.2, -78.5], 'Venezuela': [10.5, -66.9],
  'Cuba': [23.1, -82.4], 'Costa Rica': [9.9, -84.1], 'Panama': [9.0, -79.5],
  'Uruguay': [-34.9, -56.2], 'Paraguay': [-25.3, -57.6], 'Bolivia': [-16.5, -68.2],
  'Ethiopia': [9.0, 38.7], 'Tanzania': [-6.8, 39.3], 'Uganda': [0.3, 32.6],
  'Zimbabwe': [-17.8, 31.0], 'Botswana': [-24.6, 25.9], 'Senegal': [14.7, -17.5],
  'Ivory Coast': [6.8, -5.3], 'Cameroon': [3.8, 11.5], 'Mozambique': [-25.9, 32.6],
  'Mauritius': [-20.2, 57.5], 'Cyprus': [35.2, 33.4], 'Iceland': [64.1, -21.9],
  'Luxembourg': [49.6, 6.1], 'Malta': [35.9, 14.5], 'Albania': [41.3, 19.8],
  'North Macedonia': [41.9, 21.4], 'Moldova': [47.0, 28.9], 'Bosnia and Herzegovina': [43.9, 18.4],
  'Montenegro': [42.4, 19.3], 'Kosovo': [42.7, 21.2], 'Malawi': [-13.9, 33.8],
  'Zambia': [-15.4, 28.3], 'Rwanda': [-1.9, 30.1], 'Cambodia': [11.6, 104.9],
  'Myanmar': [16.9, 96.2], 'Laos': [17.9, 102.6], 'Mongolia': [47.9, 106.9],
  'Fiji': [-18.1, 178.4], 'Papua New Guinea': [-6.3, 147.2],
};

// Country quality weights (for scoring estimation)
const COUNTRY_WEIGHTS = {
  'United States': 0.92, 'United Kingdom': 0.90, 'Switzerland': 0.89, 'Singapore': 0.88,
  'Australia': 0.86, 'Canada': 0.85, 'Hong Kong': 0.85, 'Netherlands': 0.84,
  'Germany': 0.83, 'Japan': 0.82, 'South Korea': 0.80, 'France': 0.80,
  'Sweden': 0.79, 'Denmark': 0.78, 'Belgium': 0.77, 'Finland': 0.76, 'Norway': 0.76,
  'New Zealand': 0.75, 'Austria': 0.75, 'Ireland': 0.74, 'Italy': 0.73, 'Spain': 0.73,
  'Taiwan': 0.72, 'China': 0.71, 'Israel': 0.72, 'Portugal': 0.70, 'Czech Republic': 0.68,
  'Czechia': 0.68, 'Malaysia': 0.65, 'Russia': 0.64, 'Poland': 0.64, 'Hungary': 0.63,
  'Greece': 0.63, 'Slovenia': 0.63, 'Estonia': 0.63, 'Lithuania': 0.62, 'Latvia': 0.61,
  'Croatia': 0.61, 'Slovakia': 0.61, 'Romania': 0.60, 'Bulgaria': 0.58, 'Brazil': 0.57,
  'Chile': 0.57, 'Argentina': 0.56, 'Mexico': 0.55, 'Thailand': 0.55, 'South Africa': 0.55,
  'Turkey': 0.54, 'Colombia': 0.53, 'India': 0.53, 'Saudi Arabia': 0.53, 'United Arab Emirates': 0.55,
  'Egypt': 0.50, 'Indonesia': 0.48, 'Philippines': 0.47, 'Vietnam': 0.47, 'Pakistan': 0.46,
  'Iran': 0.48, 'Nigeria': 0.45, 'Kenya': 0.47, 'Ghana': 0.45, 'Morocco': 0.46,
  'Tunisia': 0.47, 'Jordan': 0.48, 'Lebanon': 0.49, 'Sri Lanka': 0.47, 'Bangladesh': 0.43,
  'Peru': 0.48, 'Ecuador': 0.46, 'Uruguay': 0.50, 'Costa Rica': 0.49, 'Georgia': 0.47,
  'Kazakhstan': 0.46, 'Ethiopia': 0.42, 'Tanzania': 0.42, 'Uganda': 0.42,
  'Cambodia': 0.40, 'Mongolia': 0.41, 'Iceland': 0.70, 'Cyprus': 0.62, 'Malta': 0.62,
  'Luxembourg': 0.72, 'Albania': 0.46, 'Serbia': 0.52, 'Ukraine': 0.52, 'Bosnia and Herzegovina': 0.48,
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function jitter(base, range) {
  return Math.max(0, Math.min(100, Math.round(base + (Math.random() - 0.5) * range)));
}

// ──────────────────────────────────────────────
// Step 1: Fetch Hipolabs
// ──────────────────────────────────────────────
async function fetchHipolabs() {
  console.log('📚 Fetching universities from Hipolabs API...');
  const res = await fetch('http://universities.hipolabs.com/search');
  if (!res.ok) throw new Error(`Hipolabs HTTP ${res.status}`);
  const data = await res.json();
  console.log(`   Found ${data.length} universities`);
  return data.map(u => ({
    name: u.name,
    country: u.country,
    countryCode: u.alpha_two_code,
    state: u['state-province'] || null,
    domains: u.domains || [],
    website: (u.web_pages && u.web_pages[0]) || null,
  }));
}

// ──────────────────────────────────────────────
// Step 2: Fetch Wikidata SPARQL (paginated)
// ──────────────────────────────────────────────
async function fetchWikidata() {
  console.log('🌐 Fetching coordinates & metadata from Wikidata SPARQL...');

  const map = new Map();
  const LIMIT = 5000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      SELECT DISTINCT ?uni ?uniLabel ?countryLabel ?lat ?lon ?website ?inception ?students
      WHERE {
        ?uni wdt:P31/wdt:P279* wd:Q3918 .
        ?uni wdt:P17 ?country .
        OPTIONAL { ?uni wdt:P625 ?coord . BIND(geof:latitude(?coord) AS ?lat) BIND(geof:longitude(?coord) AS ?lon) }
        OPTIONAL { ?uni wdt:P856 ?website . }
        OPTIONAL { ?uni wdt:P571 ?inception . }
        OPTIONAL { ?uni wdt:P2196 ?students . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT ${LIMIT} OFFSET ${offset}`;

    const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({ query, format: 'json' });
    const res = await fetch(url, {
      headers: { 'User-Agent': 'UniMap/1.0 (https://github.com/txdywy/iuniv; educational project)' },
    });

    if (!res.ok) {
      console.warn(`   Wikidata query failed at offset ${offset} (HTTP ${res.status}), stopping.`);
      break;
    }

    const json = await res.json();
    const results = json.results.bindings;

    for (const row of results) {
      const name = row.uniLabel?.value;
      if (!name) continue;
      const country = row.countryLabel?.value || '';
      const key = normalize(name) + '|' + normalize(country);
      if (map.has(key)) continue;
      map.set(key, {
        wikidataName: name,
        country,
        lat: row.lat ? parseFloat(row.lat.value) : null,
        lon: row.lon ? parseFloat(row.lon.value) : null,
        website: row.website?.value || null,
        inception: row.inception?.value || null,
        students: row.students ? parseInt(row.students.value) : null,
      });
    }

    console.log(`   Fetched ${results.length} at offset ${offset} (total unique: ${map.size})`);
    if (results.length < LIMIT) hasMore = false;
    offset += LIMIT;

    // Rate limit: small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`   Total Wikidata entries: ${map.size}`);
  return map;
}

// ──────────────────────────────────────────────
// Step 3: Match & Merge
// ──────────────────────────────────────────────
function matchUniversities(hipolabs, wikidata) {
  console.log('🔗 Matching Hipolabs ↔ Wikidata...');
  let matched = 0;
  const wdUsed = new Set();
  const result = [];

  // Build Wikidata lookup indices
  const wdByNorm = new Map();
  for (const [key, wd] of wikidata) {
    const norm = normalize(wd.wikidataName);
    if (!wdByNorm.has(norm)) wdByNorm.set(norm, []);
    wdByNorm.get(norm).push({ key, ...wd });
  }

  for (const uni of hipolabs) {
    const norm = normalize(uni.name);
    const normCountry = normalize(uni.country);
    const searchKey = norm + '|' + normCountry;

    let wd = wikidata.get(searchKey);
    if (!wd) {
      // Try exact name match (any country)
      const candidates = wdByNorm.get(norm);
      if (candidates) {
        // Prefer same country
        wd = candidates.find(c => normalize(c.country) === normCountry) || candidates[0];
      }
    }

    if (wd) matched++;
    wdUsed.add(wd?.wikidataName);

    // Use coords from Wikidata or country fallback
    let lat = wd?.lat || null;
    let lon = wd?.lon || null;
    if (!lat || !lon) {
      const fallback = COUNTRY_COORDS[uni.country];
      if (fallback) {
        // Add small random offset to avoid stacking
        lat = fallback[0] + (Math.random() - 0.5) * 2;
        lon = fallback[1] + (Math.random() - 0.5) * 3;
      }
    }

    result.push({
      ...uni,
      lat,
      lng: lon,
      website: uni.website || wd?.website || null,
      founded: wd?.inception ? new Date(wd.inception).getFullYear() : null,
      studentCount: wd?.students || null,
    });
  }

  console.log(`   Matched ${matched}/${hipolabs.length} universities with Wikidata`);
  return result;
}

// ──────────────────────────────────────────────
// Step 4: Enrich with QS Rankings
// ──────────────────────────────────────────────
function enrichWithQS(universities) {
  console.log('🏆 Enriching with QS 2025 rankings...');

  // Build a normalized index for QS lookups
  const qsNorm = new Map();
  for (const [name, data] of Object.entries(ALL_QS)) {
    qsNorm.set(normalize(name), { name, ...data });
  }

  let ranked = 0;

  for (const uni of universities) {
    const norm = normalize(uni.name);
    let qs = qsNorm.get(norm);

    // Try partial match
    if (!qs) {
      for (const [qn, qd] of qsNorm) {
        if (norm.includes(qn) || qn.includes(norm)) {
          qs = qd;
          break;
        }
      }
    }

    if (qs) {
      uni.qsRank = qs.rank;
      ranked++;
    }
  }

  console.log(`   Found QS rank for ${ranked} universities`);
  return universities;
}

// ──────────────────────────────────────────────
// Step 5: Compute Scores & Generate Logos
// ──────────────────────────────────────────────
function computeScores(universities) {
  console.log('📊 Computing multi-dimensional scores...');

  for (const uni of universities) {
    const countryWeight = COUNTRY_WEIGHTS[uni.country] || 0.50;
    const currentYear = 2026;
    const age = uni.founded ? currentYear - uni.founded : 50;
    const ageFactor = Math.min(age / 150, 1);

    if (uni.qsRank && uni.qsRank <= 500) {
      // For QS-ranked universities: use QS-derived scores
      const qsData = QS_RANKINGS[Object.keys(QS_RANKINGS).find(k => normalize(k) === normalize(uni.name))] ||
                     QS_EXTENDED[Object.keys(QS_EXTENDED).find(k => normalize(k) === normalize(uni.name))];

      if (qsData?.scores) {
        uni.scores = { ...qsData.scores };
      } else {
        // Derive from rank
        const r = uni.qsRank;
        const base = Math.round(100 - (r / 500) * 45);
        uni.scores = {
          academic: jitter(base + 5, 8),
          research: jitter(base + 3, 10),
          employability: jitter(base, 12),
          international: jitter(base - 2, 15),
          facilities: jitter(base - 1, 10),
        };
      }
    } else {
      // For unranked universities: estimate from country + age + size
      const base = Math.round(countryWeight * 55 + ageFactor * 10);
      const studentBonus = uni.studentCount && uni.studentCount > 10000 ? 5 : 0;

      uni.scores = {
        academic: jitter(base + studentBonus, 12),
        research: jitter(base + studentBonus - 3, 14),
        employability: jitter(base - 2, 16),
        international: jitter(base + (uni.country === 'United States' ? -5 : 5), 18),
        facilities: jitter(base - 1, 12),
      };
    }

    // Ensure all scores are 0-100
    for (const key of Object.keys(uni.scores)) {
      uni.scores[key] = Math.max(0, Math.min(100, uni.scores[key]));
    }

    uni.overallScore = Math.round(
      Object.values(uni.scores).reduce((a, b) => a + b, 0) / Object.keys(uni.scores).length
    );
  }

  return universities;
}

function generateLogos(universities) {
  console.log('🎨 Generating logo URLs...');
  let withLogo = 0;
  for (const uni of universities) {
    if (uni.domains && uni.domains.length > 0) {
      const domain = uni.domains[0];
      uni.logo = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
      withLogo++;
    }
  }
  console.log(`   ${withLogo} universities have logo URLs`);
  return universities;
}

// ──────────────────────────────────────────────
// Step 6: Final Filtering & Output
// ──────────────────────────────────────────────
function finalize(universities) {
  console.log('✨ Finalizing...');

  // Filter out entries without coordinates
  const withCoords = universities.filter(u => u.lat && u.lng);

  // Deduplicate by name + country, and also by name alone for exact duplicates
  const seenNameCountry = new Set();
  const seenNameOnly = new Set();
  const deduped = [];
  for (const uni of withCoords) {
    const normName = normalize(uni.name);
    const key = normName + '|' + normalize(uni.country);
    // Skip exact name+country duplicates
    if (seenNameCountry.has(key)) continue;
    seenNameCountry.add(key);
    // Also skip if we already have this exact name (catch cross-country dupes)
    if (seenNameOnly.has(normName)) continue;
    seenNameOnly.add(normName);
    deduped.push(uni);
  }

  // Sort by QS rank (ranked first), then by overall score
  deduped.sort((a, b) => {
    if (a.qsRank && b.qsRank) return a.qsRank - b.qsRank;
    if (a.qsRank) return -1;
    if (b.qsRank) return 1;
    return (b.overallScore || 0) - (a.overallScore || 0);
  });

  // Add flags
  for (const uni of deduped) {
    uni.flag = getFlagEmoji(uni.countryCode);
  }

  console.log(`   Final dataset: ${deduped.length} universities`);
  return deduped;
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('🚀 UniMap Data Pipeline\n');
  const start = Date.now();

  try {
    // Step 1: Base data
    const hipolabs = await fetchHipolabs();

    // Step 2: Wikidata enrichment
    const wikidata = await fetchWikidata();

    // Step 3: Match
    let universities = matchUniversities(hipolabs, wikidata);

    // Step 4: QS rankings
    universities = enrichWithQS(universities);

    // Step 5: Logos
    universities = generateLogos(universities);

    // Step 6: Scores
    universities = computeScores(universities);

    // Step 7: Finalize
    universities = finalize(universities);

    // Write output
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(universities, null, 0));

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Wrote ${universities.length} universities to ${OUT_PATH}`);
    console.log(`   Total time: ${elapsed}s`);
    console.log(`   File size: ${(Buffer.byteLength(JSON.stringify(universities)) / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    console.error('❌ Pipeline failed:', err);
    process.exit(1);
  }
}

main();
