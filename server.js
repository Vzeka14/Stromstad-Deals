'use strict';

const express    = require('express');
const axios      = require('axios');
const cheerio    = require('cheerio');
const puppeteer  = require('puppeteer');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Store metadata ───────────────────────────────────────────────────────────

const STORES = {
  // Strömstad stores
  ica: {
    id: 'ica',
    name: 'ICA Kvantum',
    shortName: 'ICA',
    color: '#E2001A',
    textColor: '#fff',
    url: 'https://www.ica.se/butiker/kvantum/stromstad/ica-kvantum-stromstad-1003740/',
    offersUrl: 'https://www.ica.se/butiker/kvantum/stromstad/ica-kvantum-stromstad-1003740/erbjudanden/'
  },
  maxi: {
    id: 'maxi',
    name: 'Maxi ICA Nordby',
    shortName: 'Maxi',
    color: '#003087',
    textColor: '#fff',
    url: 'https://www.maximatnordby.se/'
  },
  willys: {
    id: 'willys',
    name: 'Willys',
    shortName: 'Willys',
    color: '#009F3E',
    textColor: '#fff',
    url: 'https://www.willys.se/erbjudanden/ehandel'
  },
  eurocash: {
    id: 'eurocash',
    name: 'Eurocash',
    shortName: 'Eurocash',
    color: '#E6B000',
    textColor: '#000',
    url: 'https://www.eurocash.se/butiker/stromstad/'
  },
  coop: {
    id: 'coop',
    name: 'Coop',
    shortName: 'Coop',
    color: '#00A550',
    textColor: '#fff',
    url: 'https://www.coop.se/handla/'
  },
  // Göteborg stores
  'ica-gbg': {
    id: 'ica-gbg',
    name: 'ICA Supermarket Nordstan',
    shortName: 'ICA',
    color: '#E2001A',
    textColor: '#fff',
    url: 'https://www.ica.se/butiker/supermarket/goteborg/ica-supermarket-nordstan-1177009/'
  },
  hemkop: {
    id: 'hemkop',
    name: 'Hemköp Vasagatan',
    shortName: 'Hemköp',
    color: '#CC0000',
    textColor: '#fff',
    url: 'https://www.hemkop.se/butik/4504'
  },
  lidl: {
    id: 'lidl',
    name: 'Lidl Kungsgatan',
    shortName: 'Lidl',
    color: '#003DA5',
    textColor: '#fff',
    url: 'https://www.lidl.se/s/sv-SE/butiker/goeteborg/kungsgatan-16/'
  },
  'coop-gbg': {
    id: 'coop-gbg',
    name: 'Coop Avenyn',
    shortName: 'Coop',
    color: '#00A550',
    textColor: '#fff',
    url: 'https://www.coop.se/butiker-erbjudanden/coop/coop-avenyn/'
  },
  'willys-gbg': {
    id: 'willys-gbg',
    name: 'Willys Hvitfeldtsplatsen',
    shortName: 'Willys',
    color: '#009F3E',
    textColor: '#fff',
    url: 'https://www.willys.se/butik/goteborg/willys-hvitfeldtsplatsen-2247'
  }
};

// ─── City config ──────────────────────────────────────────────────────────────

const CITIES = {
  stromstad: {
    id: 'stromstad',
    sv: 'Strömstad',
    no: 'Strömstad',
    emoji: '🛒',
    stores: ['ica', 'maxi', 'willys', 'eurocash', 'coop'],
    tagline: { sv: '5 butiker · Västra Sverige', no: '5 butikker · Vest-Sverige' }
  },
  goteborg: {
    id: 'goteborg',
    sv: 'Göteborg',
    no: 'Gøteborg',
    emoji: '🏙️',
    stores: ['ica-gbg', 'hemkop', 'lidl', 'coop-gbg', 'willys-gbg'],
    tagline: { sv: '5 butiker · Centrum', no: '5 butikker · Sentrum' }
  }
};

// Price multipliers for Göteborg vs Strömstad ICA as base
const GBG_MULT = { 'ica-gbg': 1.04, 'hemkop': 1.06, 'coop-gbg': 1.02, 'willys-gbg': 0.95, 'lidl': 0.88 };

// ─── Demo / fallback product data ────────────────────────────────────────────
// Used when live scraping returns no results.
// Prices are realistic SEK values for Strömstad area (2024–2025).

const DEMO_PRODUCTS = [
  // ── Mejeri › Mjölk & fil ──────────────────────────────────────────────────
  { id:'mellanmjolk-1l',  name:'Mellanmjölk',       brand:'Arla',        subtitle:'3% fetthalt · 1 L',    category:'mejeri', subcategory:'mjolk',    emoji:'🥛', unit:'1 L',     image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:14.50,inOffer:false}, maxi:{price:13.95,inOffer:false}, willys:{price:14.50,inOffer:false}, eurocash:{price:13.50,inOffer:false} } },
  { id:'lattmjolk-1l',    name:'Lättmjölk',          brand:'Arla',        subtitle:'0.5% fetthalt · 1 L',  category:'mejeri', subcategory:'mjolk',    emoji:'🥛', unit:'1 L',     image:null, prices:{ ica:{price:13.90,inOffer:false}, coop:{price:13.50,inOffer:false}, maxi:{price:12.95,inOffer:false}, willys:{price:13.50,inOffer:true},  eurocash:{price:12.50,inOffer:false} } },
  { id:'filmjolk-1l',     name:'Filmjölk',            brand:'Arla',        subtitle:'3% fetthalt · 1 L',    category:'mejeri', subcategory:'mjolk',    emoji:'🥛', unit:'1 L',     image:null, prices:{ ica:{price:16.90,inOffer:false}, coop:{price:16.50,inOffer:false}, maxi:{price:15.95,inOffer:false}, willys:{price:16.50,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },
  // ── Mejeri › Smör & ägg ──────────────────────────────────────────────────
  { id:'smor-500g',       name:'Normalsaltat smör',  brand:'Arla',        subtitle:'500 g',                category:'mejeri', subcategory:'smor_agg', emoji:'🧈', unit:'500 g',   image:null, prices:{ ica:{price:44.90,inOffer:false}, coop:{price:42.95,inOffer:false}, maxi:{price:42.95,inOffer:false}, willys:{price:39.90,inOffer:true},  eurocash:{price:40.00,inOffer:false} } },
  { id:'agg-12',          name:'Ägg M/L',             brand:'Frilandsæg',  subtitle:'12-pack · frigående',  category:'mejeri', subcategory:'smor_agg', emoji:'🥚', unit:'12-pack', image:null, prices:{ ica:{price:59.90,inOffer:false}, coop:{price:57.95,inOffer:false}, maxi:{price:55.95,inOffer:true},  willys:{price:54.90,inOffer:false}, eurocash:{price:52.00,inOffer:false} } },
  // ── Mejeri › Ost ─────────────────────────────────────────────────────────
  { id:'hushallsost-400g',name:'Hushållsost',         brand:'Arla',        subtitle:'28% · 400 g',          category:'mejeri', subcategory:'ost',      emoji:'🧀', unit:'400 g',   image:null, prices:{ ica:{price:54.90,inOffer:false}, coop:{price:52.95,inOffer:false}, maxi:{price:49.95,inOffer:false}, willys:{price:52.90,inOffer:false}, eurocash:{price:47.00,inOffer:false} } },
  { id:'mozzarella-125g', name:'Mozzarella',          brand:'Galbani',     subtitle:'125 g',                category:'mejeri', subcategory:'ost',      emoji:'🧀', unit:'125 g',   image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  { id:'parmesan-100g',   name:'Parmesan riven',      brand:'Galbani',     subtitle:'100 g',                category:'mejeri', subcategory:'ost',      emoji:'🧀', unit:'100 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:28.90,inOffer:false} } },
  // ── Mejeri › Yoghurt & grädde ────────────────────────────────────────────
  { id:'yoghurt-1kg',     name:'Naturell yoghurt',    brand:'Arla',        subtitle:'3% · 1 kg',            category:'mejeri', subcategory:'yoghurt',  emoji:'🫙', unit:'1 kg',    image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:28.50,inOffer:false}, maxi:{price:27.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:26.50,inOffer:false} } },
  { id:'graddfil-200g',   name:'Gräddfil',            brand:'Arla',        subtitle:'200 g',                category:'mejeri', subcategory:'yoghurt',  emoji:'🥛', unit:'200 g',   image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:13.95,inOffer:false}, maxi:{price:13.50,inOffer:false}, willys:{price:14.50,inOffer:false}, eurocash:{price:13.00,inOffer:false} } },
  { id:'creme-fraiche',   name:'Crème fraîche',       brand:'Arla',        subtitle:'300 ml',               category:'mejeri', subcategory:'yoghurt',  emoji:'🫙', unit:'300 ml',  image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:21.50,inOffer:false}, maxi:{price:20.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:19.50,inOffer:false} } },
  { id:'vispgradde-2dl',  name:'Vispgrädde',          brand:'Arla',        subtitle:'2 dl',                 category:'mejeri', subcategory:'yoghurt',  emoji:'🥛', unit:'2 dl',    image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:18.95,inOffer:false}, maxi:{price:17.95,inOffer:false}, willys:{price:19.50,inOffer:false}, eurocash:{price:17.00,inOffer:false} } },
  { id:'kvarg-500g',      name:'Kvarg naturell',      brand:'Arla',        subtitle:'500 g',                category:'mejeri', subcategory:'yoghurt',  emoji:'🫙', unit:'500 g',   image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:32.95,inOffer:false}, maxi:{price:31.95,inOffer:false}, willys:{price:33.90,inOffer:false}, eurocash:{price:30.00,inOffer:false} } },

  // ── Bröd › Mjukt bröd ────────────────────────────────────────────────────
  { id:'formbrod-700g',   name:'Formbröd',            brand:'Pågen',       subtitle:'Vete · 700 g',         category:'brod',   subcategory:'mjukt',       emoji:'🍞', unit:'700 g',    image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.50,inOffer:false}, willys:{price:25.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },
  { id:'baguette-2-pack', name:'Baguette',            brand:'ICA',         subtitle:'2-pack · färsk',       category:'brod',   subcategory:'mjukt',       emoji:'🥖', unit:'2-pack',   image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:18.50,inOffer:false}, maxi:{price:17.95,inOffer:false}, willys:{price:18.90,inOffer:true} } },
  { id:'surdegsbrod',     name:'Surdegsfranska',      brand:'Lantmännen',  subtitle:'500 g',                category:'brod',   subcategory:'mjukt',       emoji:'🍞', unit:'500 g',    image:null, prices:{ ica:{price:39.90,inOffer:false}, coop:{price:36.95,inOffer:false}, maxi:{price:34.95,inOffer:false}, willys:{price:37.90,inOffer:false} } },
  // ── Bröd › Knäckebröd ────────────────────────────────────────────────────
  { id:'knackebrod-500g', name:'Råg-knäckebröd',      brand:'Wasa',        subtitle:'500 g',                category:'brod',   subcategory:'knackebrod',  emoji:'🥖', unit:'500 g',    image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  { id:'fullkorn-kn',     name:'Fullkornsknäcke',     brand:'Wasa',        subtitle:'250 g',                category:'brod',   subcategory:'knackebrod',  emoji:'🥖', unit:'250 g',    image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:21.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:20.00,inOffer:false} } },

  // ── Kött › Fågel ─────────────────────────────────────────────────────────
  { id:'kycklingfile-900g',name:'Kycklingfilé',       brand:'Kronfågel',   subtitle:'Färsk · 900 g',        category:'kott',   subcategory:'fagel',  emoji:'🍗', unit:'900 g',   image:null, prices:{ ica:{price:99.90,inOffer:true},  coop:{price:95.95,inOffer:false}, maxi:{price:89.95,inOffer:false}, willys:{price:94.90,inOffer:false}, eurocash:{price:85.00,inOffer:false} } },
  { id:'hel-kyckling',    name:'Hel kyckling',        brand:'Kronfågel',   subtitle:'Färsk · ca 1,3 kg',    category:'kott',   subcategory:'fagel',  emoji:'🐔', unit:'ca 1,3 kg',image:null, prices:{ ica:{price:89.90,inOffer:false}, coop:{price:85.95,inOffer:false}, maxi:{price:82.95,inOffer:false}, willys:{price:87.90,inOffer:false}, eurocash:{price:79.00,inOffer:false} } },
  // ── Kött › Nötkött ───────────────────────────────────────────────────────
  { id:'notfars-500g',    name:'Nötfärs',             brand:'Scan',        subtitle:'12% fett · 500 g',     category:'kott',   subcategory:'not',    emoji:'🥩', unit:'500 g',   image:null, prices:{ ica:{price:54.90,inOffer:false}, coop:{price:52.95,inOffer:false}, maxi:{price:49.95,inOffer:false}, willys:{price:52.90,inOffer:true},  eurocash:{price:47.00,inOffer:false} } },
  { id:'not-strimlor',    name:'Nötköttsstrimlor',    brand:'Scan',        subtitle:'400 g',                category:'kott',   subcategory:'not',    emoji:'🥩', unit:'400 g',   image:null, prices:{ ica:{price:79.90,inOffer:false}, coop:{price:76.95,inOffer:false}, maxi:{price:74.95,inOffer:false}, willys:{price:77.90,inOffer:false}, eurocash:{price:69.00,inOffer:false} } },
  // ── Kött › Fläsk & chark ─────────────────────────────────────────────────
  { id:'skinka-200g',     name:'Kokt skinka',         brand:'Scan',        subtitle:'Skivad · 200 g',       category:'kott',   subcategory:'flask',  emoji:'🥓', unit:'200 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:27.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:25.00,inOffer:false} } },
  { id:'flaskfile-600g',  name:'Fläskfilé',           brand:'Scan',        subtitle:'600 g',                category:'kott',   subcategory:'flask',  emoji:'🥩', unit:'600 g',   image:null, prices:{ ica:{price:74.90,inOffer:false}, coop:{price:71.95,inOffer:false}, maxi:{price:68.95,inOffer:false}, willys:{price:72.90,inOffer:false}, eurocash:{price:65.00,inOffer:false} } },
  { id:'bacon-140g',      name:'Bacon',               brand:'Tulip',       subtitle:'140 g',                category:'kott',   subcategory:'flask',  emoji:'🥓', unit:'140 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:25.00,inOffer:false} } },
  { id:'prinskorv-500g',  name:'Prinskorv',           brand:'Scan',        subtitle:'500 g',                category:'kott',   subcategory:'flask',  emoji:'🌭', unit:'500 g',   image:null, prices:{ ica:{price:44.90,inOffer:false}, coop:{price:42.95,inOffer:false}, maxi:{price:40.95,inOffer:false}, willys:{price:43.90,inOffer:false}, eurocash:{price:38.00,inOffer:false} } },

  // ── Fisk › Lax ───────────────────────────────────────────────────────────
  { id:'laxfile-400g',    name:'Laxfilé',             brand:'Salma',       subtitle:'Norsk atlantlax · 400 g', category:'fisk', subcategory:'lax',     emoji:'🐟', unit:'400 g',  image:null, prices:{ ica:{price:79.90,inOffer:false}, coop:{price:76.95,inOffer:false}, maxi:{price:74.95,inOffer:true},  willys:{price:77.90,inOffer:false} } },
  { id:'gravlax-200g',    name:'Gravlax',             brand:'Abba',        subtitle:'200 g',                   category:'fisk', subcategory:'lax',     emoji:'🐟', unit:'200 g',  image:null, prices:{ ica:{price:59.90,inOffer:false}, coop:{price:57.95,inOffer:false}, maxi:{price:54.95,inOffer:false}, willys:{price:58.90,inOffer:false} } },
  // ── Fisk › Vitfisk ───────────────────────────────────────────────────────
  { id:'torskfile-400g',  name:'Torskfilé',           brand:'Findus',      subtitle:'400 g',                   category:'fisk', subcategory:'vitfisk', emoji:'🐠', unit:'400 g',  image:null, prices:{ ica:{price:69.90,inOffer:false}, coop:{price:66.95,inOffer:false}, maxi:{price:64.95,inOffer:false}, willys:{price:67.90,inOffer:false} } },
  { id:'sejfile-500g',    name:'Sejfilé',             brand:'Findus',      subtitle:'500 g',                   category:'fisk', subcategory:'vitfisk', emoji:'🐠', unit:'500 g',  image:null, prices:{ ica:{price:59.90,inOffer:false}, coop:{price:57.95,inOffer:false}, maxi:{price:55.95,inOffer:false}, willys:{price:58.90,inOffer:false}, eurocash:{price:52.00,inOffer:false} } },
  // ── Fisk › Skaldjur ──────────────────────────────────────────────────────
  { id:'rakor-400g',      name:'Räkor',               brand:'Coldwater',   subtitle:'400 g',                   category:'fisk', subcategory:'skaldjur',emoji:'🍤', unit:'400 g',  image:null, prices:{ ica:{price:79.90,inOffer:false}, coop:{price:76.95,inOffer:true},  maxi:{price:74.95,inOffer:false}, willys:{price:77.90,inOffer:false} } },
  // ── Fisk › Konserverad ───────────────────────────────────────────────────
  { id:'tonfisk-185g',    name:'Tonfisk på burk',     brand:'Felix',       subtitle:'185 g',                   category:'fisk', subcategory:'konserv', emoji:'🐟', unit:'185 g',  image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:18.00,inOffer:false} } },
  { id:'makrill-125g',    name:'Makrill i tomatsås',  brand:'King Oscar',  subtitle:'125 g',                   category:'fisk', subcategory:'konserv', emoji:'🐟', unit:'125 g',  image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:13.95,inOffer:false}, maxi:{price:12.95,inOffer:false}, willys:{price:13.90,inOffer:false}, eurocash:{price:11.00,inOffer:false} } },

  // ── Frukt › Frukter ───────────────────────────────────────────────────────
  { id:'applen-1kg',      name:'Äpplen',              brand:'Gala',        subtitle:'1 kg',                 category:'frukt', subcategory:'frukter',   emoji:'🍎', unit:'1 kg',    image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:27.95,inOffer:false}, willys:{price:25.90,inOffer:true},  eurocash:{price:24.00,inOffer:false} } },
  { id:'bananer-1kg',     name:'Bananer',             brand:'Chiquita',    subtitle:'1 kg',                 category:'frukt', subcategory:'frukter',   emoji:'🍌', unit:'1 kg',    image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:18.00,inOffer:false} } },
  { id:'citron-4pack',    name:'Citron',              brand:'ICA',         subtitle:'4-pack',               category:'frukt', subcategory:'frukter',   emoji:'🍋', unit:'4-pack',   image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },
  { id:'jordgubbar-500g', name:'Jordgubbar',          brand:'Säsongens',   subtitle:'500 g',                category:'frukt', subcategory:'frukter',   emoji:'🍓', unit:'500 g',   image:null, prices:{ ica:{price:39.90,inOffer:false}, coop:{price:36.95,inOffer:false}, maxi:{price:34.95,inOffer:true},  willys:{price:37.90,inOffer:false} } },
  { id:'vindruvor-500g',  name:'Vindruvor gröna',     brand:'ICA',         subtitle:'500 g',                category:'frukt', subcategory:'frukter',   emoji:'🍇', unit:'500 g',   image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:32.95,inOffer:false}, maxi:{price:29.95,inOffer:false}, willys:{price:33.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  { id:'paron-1kg',       name:'Päron',               brand:'ICA',         subtitle:'1 kg',                 category:'frukt', subcategory:'frukter',   emoji:'🍐', unit:'1 kg',    image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:25.00,inOffer:false} } },
  // ── Frukt › Grönsaker ────────────────────────────────────────────────────
  { id:'tomater-500g',    name:'Tomater',             brand:'ICA',         subtitle:'500 g',                category:'frukt', subcategory:'grönsaker', emoji:'🍅', unit:'500 g',   image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:17.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:16.00,inOffer:false} } },
  { id:'gurka-st',        name:'Gurka',               brand:'ICA',         subtitle:'1 st',                 category:'frukt', subcategory:'grönsaker', emoji:'🥒', unit:'1 st',    image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:12.95,inOffer:false}, maxi:{price:12.95,inOffer:false}, willys:{price:13.90,inOffer:false}, eurocash:{price:11.00,inOffer:false} } },
  { id:'morotter-1kg',    name:'Morötter',            brand:'ICA',         subtitle:'1 kg',                 category:'frukt', subcategory:'grönsaker', emoji:'🥕', unit:'1 kg',    image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:13.50,inOffer:false}, maxi:{price:13.95,inOffer:false}, willys:{price:12.90,inOffer:false}, eurocash:{price:12.00,inOffer:false} } },
  { id:'broccoli-400g',   name:'Broccoli',            brand:'ICA',         subtitle:'400 g',                category:'frukt', subcategory:'grönsaker', emoji:'🥦', unit:'400 g',   image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:21.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:20.00,inOffer:false} } },
  { id:'paprika-3pack',   name:'Röd paprika',         brand:'ICA',         subtitle:'3-pack',               category:'frukt', subcategory:'grönsaker', emoji:'🫑', unit:'3-pack',  image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:32.95,inOffer:false}, maxi:{price:29.95,inOffer:false}, willys:{price:33.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  { id:'lok-1kg',         name:'Gul lök',             brand:'ICA',         subtitle:'1 kg',                 category:'frukt', subcategory:'grönsaker', emoji:'🧅', unit:'1 kg',    image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:12.95,inOffer:false}, maxi:{price:11.95,inOffer:false}, willys:{price:13.90,inOffer:false}, eurocash:{price:11.00,inOffer:false} } },
  { id:'potatis-2kg',     name:'Mandelpotatis',       brand:'ICA',         subtitle:'2 kg',                 category:'frukt', subcategory:'grönsaker', emoji:'🥔', unit:'2 kg',    image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:26.95,inOffer:false}, maxi:{price:24.95,inOffer:false}, willys:{price:27.90,inOffer:false}, eurocash:{price:23.00,inOffer:false} } },
  { id:'avokado-2pack',   name:'Avokado',             brand:'Calavo',      subtitle:'2-pack',               category:'frukt', subcategory:'grönsaker', emoji:'🥑', unit:'2-pack',  image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:21.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:20.00,inOffer:false} } },

  // ── Torrvaror › Spannmål & flingor ───────────────────────────────────────
  { id:'pasta-500g',      name:'Pasta',               brand:'Barilla',     subtitle:'Penne eller spagetti · 500 g', category:'torrvaror', subcategory:'spannmal', emoji:'🍝', unit:'500 g', image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:12.95,inOffer:false}, maxi:{price:12.95,inOffer:false}, willys:{price:13.90,inOffer:false}, eurocash:{price:11.00,inOffer:false} } },
  { id:'ris-1kg',         name:'Långkornigt ris',     brand:"Uncle Ben's", subtitle:'1 kg',                 category:'torrvaror', subcategory:'spannmal', emoji:'🍚', unit:'1 kg',    image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:18.00,inOffer:false} } },
  { id:'vetemjol-2kg',    name:'Vetemjöl',            brand:'Kungsörnen',  subtitle:'2 kg',                 category:'torrvaror', subcategory:'spannmal', emoji:'🌾', unit:'2 kg',    image:null, prices:{ ica:{price:27.90,inOffer:false}, coop:{price:25.95,inOffer:false}, maxi:{price:24.95,inOffer:false}, willys:{price:25.90,inOffer:false}, eurocash:{price:22.00,inOffer:false} } },
  { id:'havregryn-500g',  name:'Havregryn',           brand:'ICA Basic',   subtitle:'500 g',                category:'torrvaror', subcategory:'spannmal', emoji:'🌾', unit:'500 g',   image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },
  { id:'cornflakes-375g', name:'Cornflakes',          brand:"Kellogg's",   subtitle:'375 g',                category:'torrvaror', subcategory:'spannmal', emoji:'🥣', unit:'375 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },
  { id:'musli-500g',      name:'Müsli',               brand:"Kellogg's",   subtitle:'Frukt & nötter · 500 g', category:'torrvaror', subcategory:'spannmal', emoji:'🥣', unit:'500 g', image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:32.95,inOffer:false}, maxi:{price:30.95,inOffer:false}, willys:{price:32.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  // ── Torrvaror › Konserver ─────────────────────────────────────────────────
  { id:'tomatkross-400g', name:'Krossade tomater',    brand:'Felix',       subtitle:'400 g',                category:'torrvaror', subcategory:'konserver', emoji:'🥫', unit:'400 g',  image:null, prices:{ ica:{price:10.90,inOffer:false}, coop:{price:9.95,inOffer:false},  maxi:{price:9.95,inOffer:false},  willys:{price:10.50,inOffer:false}, eurocash:{price:8.50,inOffer:false} } },
  { id:'kikarter-400g',   name:'Kikärtor på burk',    brand:'ICA',         subtitle:'400 g',                category:'torrvaror', subcategory:'konserver', emoji:'🫘', unit:'400 g',  image:null, prices:{ ica:{price:12.90,inOffer:false}, coop:{price:11.95,inOffer:false}, maxi:{price:10.95,inOffer:false}, willys:{price:11.90,inOffer:false}, eurocash:{price:9.50,inOffer:false} } },
  { id:'bönor-400g',      name:'Röda bönor på burk',  brand:'ICA',         subtitle:'400 g',                category:'torrvaror', subcategory:'konserver', emoji:'🫘', unit:'400 g',  image:null, prices:{ ica:{price:11.90,inOffer:false}, coop:{price:10.95,inOffer:false}, maxi:{price:9.95,inOffer:false},  willys:{price:10.90,inOffer:false}, eurocash:{price:8.50,inOffer:false} } },
  // ── Torrvaror › Kryddor & såser ───────────────────────────────────────────
  { id:'olivolja-500ml',  name:'Olivolja',            brand:'Santa Maria', subtitle:'Extra virgin · 500 ml',category:'torrvaror', subcategory:'kryddor',   emoji:'🫙', unit:'500 ml', image:null, prices:{ ica:{price:69.90,inOffer:false}, coop:{price:64.95,inOffer:false}, maxi:{price:62.95,inOffer:false}, willys:{price:64.90,inOffer:false}, eurocash:{price:58.00,inOffer:false} } },
  { id:'ketchup-570g',    name:'Ketchup',             brand:'Felix',       subtitle:'570 g',                category:'torrvaror', subcategory:'kryddor',   emoji:'🍅', unit:'570 g',  image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:21.95,inOffer:false}, willys:{price:22.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  { id:'majonnais-410g',  name:'Majonnäs',            brand:"Hellmann's",  subtitle:'410 g',                category:'torrvaror', subcategory:'kryddor',   emoji:'🥗', unit:'410 g',  image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:27.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },

  // ── Dryck › Kaffe & te ───────────────────────────────────────────────────
  { id:'kaffe-500g',      name:'Bryggkaffe',          brand:'Gevalia',     subtitle:'Mellanrost · 500 g',   category:'dryck', subcategory:'varm',      emoji:'☕', unit:'500 g',   image:null, prices:{ ica:{price:79.90,inOffer:false}, coop:{price:74.95,inOffer:false}, maxi:{price:74.95,inOffer:false}, willys:{price:69.90,inOffer:true},  eurocash:{price:67.00,inOffer:false} } },
  { id:'gront-te-20',     name:'Grönt te',            brand:'Lipton',      subtitle:'20-pack',              category:'dryck', subcategory:'varm',      emoji:'🍵', unit:'20-pack',  image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:28.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },
  // ── Dryck › Juice, läsk & vatten ─────────────────────────────────────────
  { id:'apelsinjuice-1l', name:'Apelsinjuice',        brand:'Tropicana',   subtitle:'Med fruktkött · 1 L',  category:'dryck', subcategory:'kall',      emoji:'🍊', unit:'1 L',     image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:22.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:21.00,inOffer:false} } },
  { id:'appelj-1l',       name:'Äppeljuice',          brand:'Brämhults',   subtitle:'1 L',                  category:'dryck', subcategory:'kall',      emoji:'🍏', unit:'1 L',     image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:21.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:20.00,inOffer:false} } },
  { id:'cola-1.5l',       name:'Cola',                brand:'Coca-Cola',   subtitle:'1,5 L',                category:'dryck', subcategory:'kall',      emoji:'🥤', unit:'1,5 L',   image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:20.90,inOffer:false}, eurocash:{price:18.00,inOffer:false} } },
  { id:'vatten-1.5l',     name:'Mineralvatten',       brand:'Ramlösa',     subtitle:'Naturellt · 1,5 L',    category:'dryck', subcategory:'kall',      emoji:'💧', unit:'1,5 L',   image:null, prices:{ ica:{price:12.90,inOffer:false}, coop:{price:10.95,inOffer:false}, maxi:{price:10.95,inOffer:false}, willys:{price:11.90,inOffer:false}, eurocash:{price:9.50,inOffer:false} } },
  { id:'energidryck-500', name:'Energidryck',         brand:'Monster',     subtitle:'500 ml',               category:'dryck', subcategory:'kall',      emoji:'⚡', unit:'500 ml',  image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },
  // ── Dryck › Växtbaserat ───────────────────────────────────────────────────
  { id:'havredryck-1l',   name:'Havredryck',          brand:'Oatly',       subtitle:'Naturell · 1 L',       category:'dryck', subcategory:'alternativ',emoji:'🌾', unit:'1 L',     image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:16.00,inOffer:false} } },
  { id:'sojadryck-1l',    name:'Sojadryck',           brand:'Alpro',       subtitle:'Naturell · 1 L',       category:'dryck', subcategory:'alternativ',emoji:'🌱', unit:'1 L',     image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false} } },

  // ── Snacks › Salt ─────────────────────────────────────────────────────────
  { id:'chips-200g',      name:'Chips',               brand:'OLW',         subtitle:'Naturell · 200 g',     category:'snacks', subcategory:'salt', emoji:'🥨', unit:'200 g',   image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:22.95,inOffer:false}, willys:{price:23.90,inOffer:true},  eurocash:{price:20.00,inOffer:false} } },
  { id:'popcorn-90g',     name:'Popcorn',             brand:'OLW',         subtitle:'Smör · 90 g',          category:'snacks', subcategory:'salt', emoji:'🍿', unit:'90 g',    image:null, prices:{ ica:{price:14.90,inOffer:false}, coop:{price:12.95,inOffer:false}, maxi:{price:11.95,inOffer:false}, willys:{price:13.90,inOffer:false}, eurocash:{price:10.00,inOffer:false} } },
  { id:'notter-175g',     name:'Blandade nötter',     brand:'ICA',         subtitle:'175 g',                category:'snacks', subcategory:'salt', emoji:'🥜', unit:'175 g',   image:null, prices:{ ica:{price:49.90,inOffer:false}, coop:{price:46.95,inOffer:false}, maxi:{price:44.95,inOffer:false}, willys:{price:47.90,inOffer:false}, eurocash:{price:42.00,inOffer:false} } },
  // ── Snacks › Godis & choklad ──────────────────────────────────────────────
  { id:'choklad-200g',    name:'Mjölkchoklad',        brand:'Marabou',     subtitle:'200 g',                category:'snacks', subcategory:'sott', emoji:'🍫', unit:'200 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:27.90,inOffer:false}, eurocash:{price:25.00,inOffer:false} } },
  { id:'lakrits-200g',    name:'Lakrits',             brand:'Ahlgrens',    subtitle:'200 g',                category:'snacks', subcategory:'sott', emoji:'🍬', unit:'200 g',   image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:20.95,inOffer:false}, willys:{price:22.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  // ── Snacks › Kex & kakor ─────────────────────────────────────────────────
  { id:'digestive-400g',  name:'Digestivekex',        brand:"McVitie's",   subtitle:'400 g',                category:'snacks', subcategory:'kex',  emoji:'🍪', unit:'400 g',   image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:27.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },
  { id:'riskaka-130g',    name:'Riskaka',             brand:'Friggs',      subtitle:'Naturell · 130 g',     category:'snacks', subcategory:'kex',  emoji:'⭕', unit:'130 g',   image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },

  // ── Fryst › Glass & dessert ───────────────────────────────────────────────
  { id:'vaniljglass-1l',  name:'Vaniljglass',         brand:'GB',          subtitle:'1 L',                  category:'frys', subcategory:'glass', emoji:'🍦', unit:'1 L',    image:null, prices:{ ica:{price:39.90,inOffer:false}, coop:{price:36.95,inOffer:false}, maxi:{price:34.95,inOffer:true},  willys:{price:37.90,inOffer:false}, eurocash:{price:33.00,inOffer:false} } },
  // ── Fryst › Fryst mat ─────────────────────────────────────────────────────
  { id:'fryst-pizza',     name:'Fryst pizza',         brand:'Grandiosa',   subtitle:'Vesuvio · 375 g',      category:'frys', subcategory:'mat',   emoji:'🍕', unit:'375 g',  image:null, prices:{ ica:{price:54.90,inOffer:false}, coop:{price:49.95,inOffer:false}, maxi:{price:47.95,inOffer:false}, willys:{price:52.90,inOffer:false}, eurocash:{price:44.00,inOffer:false} } },
  { id:'pommes-1kg',      name:'Pommes frites',       brand:'McCain',      subtitle:'1 kg',                 category:'frys', subcategory:'mat',   emoji:'🍟', unit:'1 kg',   image:null, prices:{ ica:{price:39.90,inOffer:false}, coop:{price:36.95,inOffer:false}, maxi:{price:34.95,inOffer:false}, willys:{price:37.90,inOffer:false}, eurocash:{price:32.00,inOffer:false} } },
  { id:'fiskpinnar-400g', name:'Fiskpinnar',          brand:'Findus',      subtitle:'400 g',                category:'frys', subcategory:'mat',   emoji:'🐠', unit:'400 g',  image:null, prices:{ ica:{price:44.90,inOffer:false}, coop:{price:41.95,inOffer:false}, maxi:{price:39.95,inOffer:false}, willys:{price:42.90,inOffer:false}, eurocash:{price:37.00,inOffer:false} } },
  // ── Fryst › Fryst grönt ───────────────────────────────────────────────────
  { id:'fryst-spenat-500g',name:'Fryst hackad spenat',brand:'ICA',         subtitle:'500 g',                category:'frys', subcategory:'gront', emoji:'🥬', unit:'500 g',  image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, willys:{price:17.90,inOffer:false}, eurocash:{price:16.00,inOffer:false} } },
  { id:'fryst-blandgront', name:'Fryst blandgrönt',   brand:'ICA',         subtitle:'500 g',                category:'frys', subcategory:'gront', emoji:'🥦', unit:'500 g',  image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:20.95,inOffer:false}, willys:{price:23.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  { id:'fryst-artor-500g', name:'Fryst ärtor',        brand:'ICA',         subtitle:'500 g',                category:'frys', subcategory:'gront', emoji:'🌱', unit:'500 g',  image:null, prices:{ ica:{price:19.90,inOffer:false}, coop:{price:17.95,inOffer:false}, maxi:{price:16.95,inOffer:false}, willys:{price:18.90,inOffer:false}, eurocash:{price:15.00,inOffer:false} } },

  // ── Hygien › Munvård ─────────────────────────────────────────────────────
  { id:'tandkram-75ml',   name:'Tandkräm',            brand:'Colgate',     subtitle:'Fluor · 75 ml',        category:'hygien', subcategory:'munvard', emoji:'🦷', unit:'75 ml',   image:null, prices:{ ica:{price:24.90,inOffer:false}, coop:{price:22.95,inOffer:false}, maxi:{price:22.95,inOffer:false}, willys:{price:19.90,inOffer:false}, eurocash:{price:19.00,inOffer:false} } },
  { id:'tandborste',      name:'Tandborste',           brand:'Oral-B',      subtitle:'Mjuk · 2-pack',        category:'hygien', subcategory:'munvard', emoji:'🦷', unit:'2-pack',  image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:31.95,inOffer:false}, maxi:{price:29.95,inOffer:false}, willys:{price:32.90,inOffer:false}, eurocash:{price:27.00,inOffer:false} } },
  // ── Hygien › Hår ─────────────────────────────────────────────────────────
  { id:'schampo-250ml',   name:'Schampo',             brand:'Elvital',     subtitle:'Normalt hår · 250 ml', category:'hygien', subcategory:'har',     emoji:'🧴', unit:'250 ml',  image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:31.95,inOffer:false}, maxi:{price:29.95,inOffer:true},  willys:{price:32.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  { id:'balsam-250ml',    name:'Balsam',              brand:'Elvital',     subtitle:'Normalt hår · 250 ml', category:'hygien', subcategory:'har',     emoji:'🧴', unit:'250 ml',  image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:31.95,inOffer:false}, maxi:{price:29.95,inOffer:false}, willys:{price:32.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  // ── Hygien › Kropp & hud ─────────────────────────────────────────────────
  { id:'duschtvål-300ml', name:'Duschtvål',           brand:'Dove',        subtitle:'300 ml',               category:'hygien', subcategory:'kropp',   emoji:'🧼', unit:'300 ml',  image:null, prices:{ ica:{price:29.90,inOffer:false}, coop:{price:27.95,inOffer:false}, maxi:{price:26.95,inOffer:false}, willys:{price:27.90,inOffer:false}, eurocash:{price:24.00,inOffer:false} } },
  { id:'deodorant-150ml', name:'Deodorant',           brand:'Nivea',       subtitle:'150 ml',               category:'hygien', subcategory:'kropp',   emoji:'🌸', unit:'150 ml',  image:null, prices:{ ica:{price:39.90,inOffer:false}, coop:{price:36.95,inOffer:false}, maxi:{price:34.95,inOffer:false}, willys:{price:37.90,inOffer:false}, eurocash:{price:32.00,inOffer:false} } },

  // ── Städ › Disk ───────────────────────────────────────────────────────────
  { id:'diskmedel-500ml', name:'Diskmedel',           brand:'Fairy',       subtitle:'Citron · 500 ml',      category:'stad', subcategory:'disk',   emoji:'🫧', unit:'500 ml',  image:null, prices:{ ica:{price:22.90,inOffer:false}, coop:{price:20.95,inOffer:false}, maxi:{price:19.95,inOffer:false}, willys:{price:21.90,inOffer:false}, eurocash:{price:18.00,inOffer:false} } },
  { id:'diskmaskinspulver',name:'Diskmaskinspulver',  brand:'Finish',      subtitle:'30 tabletter',          category:'stad', subcategory:'disk',   emoji:'🫧', unit:'30 st',   image:null, prices:{ ica:{price:59.90,inOffer:false}, coop:{price:56.95,inOffer:false}, maxi:{price:54.95,inOffer:false}, willys:{price:57.90,inOffer:false}, eurocash:{price:50.00,inOffer:false} } },
  // ── Städ › Tvätt ──────────────────────────────────────────────────────────
  { id:'tvattmedel-1.5kg',name:'Tvättmedel',          brand:'Persil',      subtitle:'Colour · 1,5 kg',       category:'stad', subcategory:'tatt',   emoji:'🧺', unit:'1,5 kg',  image:null, prices:{ ica:{price:79.90,inOffer:false}, coop:{price:74.95,inOffer:false}, maxi:{price:74.95,inOffer:false}, willys:{price:69.90,inOffer:true},  eurocash:{price:65.00,inOffer:false} } },
  // ── Städ › Papper ─────────────────────────────────────────────────────────
  { id:'hushallspapper',  name:'Hushållspapper',      brand:'Lambi',       subtitle:'4-pack',               category:'stad', subcategory:'papper', emoji:'🧻', unit:'4-pack',  image:null, prices:{ ica:{price:34.90,inOffer:false}, coop:{price:31.95,inOffer:false}, maxi:{price:29.95,inOffer:false}, willys:{price:32.90,inOffer:false}, eurocash:{price:28.00,inOffer:false} } },
  { id:'toalettpapper',   name:'Toalettpapper',       brand:'Lambi',       subtitle:'8-pack',               category:'stad', subcategory:'papper', emoji:'🧻', unit:'8-pack',  image:null, prices:{ ica:{price:49.90,inOffer:false}, coop:{price:46.95,inOffer:false}, maxi:{price:44.95,inOffer:false}, willys:{price:47.90,inOffer:false}, eurocash:{price:42.00,inOffer:false} } }
];

// ─── Göteborg product generator ───────────────────────────────────────────────

function generateGoteborgProducts() {
  return DEMO_PRODUCTS.map(p => {
    const gbgPrices = {};
    // Use ICA base price for multipliers; fall back to first available store price
    const basePrice = p.prices.ica ? p.prices.ica.price
      : Object.values(p.prices)[0].price;

    for (const [storeId, mult] of Object.entries(GBG_MULT)) {
      const raw = Math.round(basePrice * mult * 20) / 20; // round to .05
      gbgPrices[storeId] = { price: raw, inOffer: false };
    }

    return { ...p, prices: gbgPrices };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enrichProducts(products) {
  return products.map(p => {
    const entries = Object.entries(p.prices);
    const sorted  = [...entries].sort((a, b) => a[1].price - b[1].price);
    const bestStore = sorted[0][0];
    const bestPrice = sorted[0][1].price;
    // For single-store offers: savings = ordPrice − offerPrice
    // For multi-store: savings = highest − lowest
    const ordPrice   = sorted[0][1].ordPrice || null;
    const worstPrice = ordPrice || sorted[sorted.length - 1][1].price;
    const savings    = parseFloat((worstPrice - bestPrice).toFixed(2));
    return { ...p, bestStore, bestPrice, savings };
  }).sort((a, b) => b.savings - a.savings);
}

// ─── Category / emoji inference ───────────────────────────────────────────────

const CAT_KEYWORDS = {
  mejeri:    ['mjölk','filmjölk','grädde','smör','ost','mozzarella','parmesan','brie','cheddar','halloumi','ricotta','kvarg','yoghurt','ägg','crème fraiche','créme','gräddfil'],
  brod:      ['bröd','knäckebröd','franska','baguette','toast','bulle','croissant','limpa'],
  kott:      ['kyckling','fläsk','nöt','bacon','korv','skinka','köttfärs','biff','kotlett','steak','falukorv','prinskorv','salami','lamm','fransyska'],
  fisk:      ['lax','torsk','fisk','räk','skaldjur','tonfisk','makrill','strömming','sill','hummer','kräft','gravlax','sejfilé'],
  frukt:     ['äpple','banan','apelsin','citron','druvor','jordgubb','tomat','gurka','moröt','potatis','lök','broccoli','paprika','avokado','mango','päron','plommon','blåbär','hallon','salladsgurka','sallad','spenat','blomkål'],
  torrvaror: ['pasta','ris','mjöl','havregryn','flingor','bönor','kikärtor','olja','ketchup','soja','tomatpuré','tomatkross','konserv','linser','majonnäs','dressing','cracker'],
  dryck:     ['kaffe','te','juice','läsk','vatten','energidryck','smoothie','cola','cider','havredryck','sojadryck','mandeldryck'],
  snacks:    ['chips','popcorn','nötter','choklad','godis','kex','kakor','kola','lakrits','digestive','riskaka','müslibar'],
  frys:      ['fryst','glass','pizza','pommes','fiskpinnar','ärtor','spenatfryst','fryst grönt'],
  hygien:    ['tandkräm','tandborste','schampo','tvål','deo','deodorant','balsam','duschgel','rakgel','blöja','menskopp'],
  stad:      ['diskmedel','tvättmedel','hushållspapper','toalettpapper','soppåsar','rengöring','avfettning']
};

const EMOJI_MAP = [
  [['mjölk','filmjölk'],          '🥛'],
  [['ost','mozzarella','parmesan','brie','cheddar','halloumi'], '🧀'],
  [['smör'],                       '🧈'],
  [['ägg'],                        '🥚'],
  [['yoghurt','kvarg','grädde','créme','gräddfil'], '🫙'],
  [['bröd','franska','limpa'],     '🍞'],
  [['baguette'],                   '🥖'],
  [['kyckling'],                   '🍗'],
  [['bacon','fläsk'],              '🥓'],
  [['köttfärs','biff','fransyska'],'🥩'],
  [['korv','falukorv','prinskorv'],'🌭'],
  [['lax','torsk','fisk','sej'],   '🐟'],
  [['räk','skaldjur','hummer'],    '🍤'],
  [['äpple'],                      '🍎'],
  [['banan'],                      '🍌'],
  [['apelsin'],                    '🍊'],
  [['citron'],                     '🍋'],
  [['druvor'],                     '🍇'],
  [['jordgubb'],                   '🍓'],
  [['tomat'],                      '🍅'],
  [['gurka'],                      '🥒'],
  [['moröt'],                      '🥕'],
  [['broccoli','blomkål'],         '🥦'],
  [['paprika'],                    '🫑'],
  [['lök'],                        '🧅'],
  [['potatis'],                    '🥔'],
  [['avokado'],                    '🥑'],
  [['pasta'],                      '🍝'],
  [['ris'],                        '🍚'],
  [['kaffe'],                      '☕'],
  [['te'],                         '🍵'],
  [['juice'],                      '🍊'],
  [['cola','läsk'],                '🥤'],
  [['vatten'],                     '💧'],
  [['chips'],                      '🥨'],
  [['choklad'],                    '🍫'],
  [['godis','lakrits'],            '🍬'],
  [['glass'],                      '🍦'],
  [['pizza'],                      '🍕'],
  [['pommes'],                     '🍟'],
  [['tandkräm','tandborste'],      '🦷'],
  [['schampo','balsam','duschgel'],'🧴'],
  [['tvättmedel','diskmedel'],     '🧺'],
];

function inferCategory(name, subtitle = '') {
  const text = (name + ' ' + subtitle).toLowerCase();
  for (const [cat, words] of Object.entries(CAT_KEYWORDS)) {
    if (words.some(w => text.includes(w))) return cat;
  }
  return 'torrvaror';
}

function inferEmoji(name) {
  const text = name.toLowerCase();
  for (const [words, em] of EMOJI_MAP) {
    if (words.some(w => text.includes(w))) return em;
  }
  return '🛒';
}

function extractUnit(subtitle) {
  const m = subtitle.match(/(\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l|cl|dl|st|pack|förp))/i);
  return m ? m[1] : (subtitle.split(/[·,]/).pop().trim() || '');
}

function generateId(storeId, name) {
  return storeId + '-' + name.toLowerCase()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .substring(0, 40);
}

// Convert a raw scraped item into a full product object
function parseScrapedProduct(storeId, raw) {
  const name     = raw.name.trim();
  const subtitle = (raw.subtitle || '').trim();
  const cat      = inferCategory(name, subtitle);
  return {
    id:          generateId(storeId, name),
    name,
    brand:       raw.brand || null,
    subtitle,
    category:    cat,
    subcategory: cat,
    emoji:       inferEmoji(name),
    unit:        extractUnit(subtitle) || '1 st',
    image:       raw.image || null,
    prices: {
      [storeId]: { price: raw.price, inOffer: true, ordPrice: raw.ordPrice || null }
    }
  };
}

// ─── Puppeteer browser ────────────────────────────────────────────────────────

let _browser = null;

async function getBrowser() {
  if (!_browser || !_browser.connected) {
    _browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  }
  return _browser;
}

async function withPage(fn) {
  const browser = await getBrowser();
  const page    = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'sv-SE,sv;q=0.9' });
  // Block fonts/stylesheets for speed; keep images (for src attributes)
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['stylesheet','font','media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  try   { return await fn(page); }
  finally { await page.close().catch(() => {}); }
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// ── ICA (Puppeteer — reads window.__INITIAL_DATA__.offers.weeklyOffers) ────────
async function scrapeICAOffers(offersUrl, storeId, label) {
  try {
    return await withPage(async page => {
      await page.goto(offersUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

      const weekly = await page.evaluate(() => {
        const d = window.__INITIAL_DATA__;
        return (d && d.offers && Array.isArray(d.offers.weeklyOffers))
          ? d.offers.weeklyOffers : [];
      });

      // Extract ordPrice from rendered .offer-card elements (ICA SSR includes cards)
      const cardOrdPrices = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.offer-card')).map(card => {
          const title = (card.querySelector('.offer-card__title')?.textContent || '').trim();
          const fullText = card.textContent || '';
          const m = fullText.match(/Ord[.\s]?pris\s+(\d+)[:.]\s*(\d+)/i);
          return { title, ordPrice: m ? parseFloat(m[1] + '.' + m[2]) : null };
        });
      });

      // Build lookup: lowercased name → ordPrice
      const ordPriceMap = {};
      cardOrdPrices.forEach(({ title, ordPrice }) => {
        if (title && ordPrice) ordPriceMap[title.toLowerCase()] = ordPrice;
      });

      const products = [];
      for (const item of weekly) {
        const det = item.details || {};
        const name = (det.name || '').trim();
        if (!name) continue;

        // Parse price from parsedMechanics
        const mech = item.parsedMechanics || {};
        let price = null;
        const val2 = parseFloat((mech.value2 || '').replace(',', '.'));
        if (!isNaN(val2) && val2 > 0) {
          const qty = parseInt(mech.quantity, 10) || 1;
          // For multi-buy (e.g. "2 för 50 kr"), value2 is total → divide by qty
          price = (mech.type === 'Multipack' || mech.type === 'Multibuy')
            ? Math.round((val2 / qty) * 100) / 100
            : val2;
        } else {
          // Fallback: parse mechanicInfo text "25 kr/st" or "2 för 50 kr"
          const mechInfo = det.mechanicInfo || '';
          const forM = mechInfo.match(/(\d+)\s+f[öo]r\s+(\d+(?:[.,]\d+)?)/i);
          if (forM) {
            price = Math.round((parseFloat(forM[2].replace(',', '.')) / parseInt(forM[1], 10)) * 100) / 100;
          } else {
            const m = mechInfo.match(/(\d+(?:[.,]\d+)?)/);
            price = m ? parseFloat(m[1].replace(',', '.')) : null;
          }
        }
        if (!price || price <= 0 || price > 5000) continue;

        const subtitle = (det.packageInformation || '').trim();
        const brand    = (det.brand || '').replace(/\.\s*\w+$/, '').trim();
        const pic      = item.picture || {};
        const image    = pic.baseUrl && pic.fileName
          ? `${pic.baseUrl}/t_product_medium_v2/${pic.fileName}` : null;
        const ordPrice = ordPriceMap[name.toLowerCase()] || null;

        products.push(parseScrapedProduct(storeId, { name, brand, subtitle, price, ordPrice, image }));
      }

      console.log(`${label}: ${products.length} produkter (live)`);
      return products;
    });
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ── Willys / Hemköp (Puppeteer — Axfood Next.js) ──────────────────────────────
// Prices are stored as integers in öre (hundredths of SEK), e.g. 2500 = 25.00 kr
async function scrapeAxfoodOffers(offersUrl, storeId, label) {
  try {
    return await withPage(async page => {
      await page.goto(offersUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      // Axfood uses [data-testid="product"] (not "product-card")
      await page.waitForSelector('[data-testid="product"]', { timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const raw = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[data-testid="product"]'));
        return cards.map(card => {
          // Name via itemprop or aria-label
          const name = card.querySelector('[itemprop="name"]')?.textContent.trim()
            || (card.querySelector('a[aria-label]')?.getAttribute('aria-label') || '')
               .replace(/^Visa produktinformation\s*/i, '').trim()
            || '';

          // Prices in öre (integer text)
          const loyaltyEl = card.querySelector('[data-testid="product-price-LOYALTY"]');
          const generalEl = card.querySelector('[data-testid="product-price-GENERAL"]');
          const loyaltyText = loyaltyEl?.textContent.trim() || '';
          const generalText = generalEl?.textContent.trim() || '';

          // Subtitle: text children that don't look like price parts
          const allTexts = Array.from(card.querySelectorAll('p, span, small'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 2 && t.length < 80
              && !/^\d{1,3}$/.test(t)         // not just digits (price int/decimal parts)
              && !/^\/\w+$/.test(t)            // not "/st", "/kg"
              && !/^(kr|SEK)$/i.test(t));
          const subtitle = allTexts.find(t => /[a-zA-ZåäöÅÄÖ]/.test(t) && /\d/.test(t)) || '';

          const image = card.querySelector('img')?.getAttribute('src') || null;
          return { name, loyaltyText, generalText, subtitle, image };
        });
      });

      const products = [];
      for (const r of raw) {
        if (!r.name) continue;

        // Use loyalty price (member offer) if available; else general offer price
        const priceRaw = (r.loyaltyText || r.generalText).replace(/\/\w+/, '');
        const priceOre = parseInt(priceRaw.replace(/[^0-9]/g, ''), 10);
        if (!priceOre || priceOre <= 0) continue;
        const price = priceOre / 100;
        if (price > 5000) continue;

        // If both prices present, general is likely the regular/ord price
        let ordPrice = null;
        if (r.loyaltyText && r.generalText) {
          const ordOre = parseInt(r.generalText.replace(/[^0-9]/g, ''), 10);
          ordPrice = ordOre > 0 ? ordOre / 100 : null;
        }

        products.push(parseScrapedProduct(storeId, {
          name: r.name, subtitle: r.subtitle, price, ordPrice, image: r.image
        }));
      }

      console.log(`${label}: ${products.length} produkter (live)`);
      return products;
    });
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ── Coop (Puppeteer — React SPA) ──────────────────────────────────────────────
// Coop DKE API key (publicly embedded in coop.se frontend JS)
const COOP_DKE_KEY = '32895bd5b86e4a5ab6e94fb0bc8ae234';

// ── Coop (direct API — external.api.coop.se/dke/offers) ───────────────────────
// storeApiId: Coop Strömstad=131800, Coop Avenyn=125600
async function scrapeCoopOffers(storeApiId, storeId, label) {
  try {
    const url = `https://external.api.coop.se/dke/offers/${storeApiId}?api-version=v2`;
    const res  = await axios.get(url, {
      headers: {
        'User-Agent':    SCRAPE_HEADERS['User-Agent'],
        'Accept':        'application/json',
        'Accept-Language': 'sv-SE,sv;q=0.9',
        'Origin':        'https://www.coop.se',
        'Referer':       'https://www.coop.se/',
        'ocp-apim-subscription-key': COOP_DKE_KEY
      },
      timeout: 12000
    });

    const items = Array.isArray(res.data) ? res.data : [];
    const products = [];

    for (const item of items) {
      const name = (item.content?.title || '').trim();
      if (!name) continue;

      const pi = item.priceInformation || {};
      let price = pi.discountValue || 0;
      if (!price || price <= 0) continue;

      // "2 för X kr" → unit price = X / minimumAmount
      const minAmt = parseInt(pi.minimumAmount, 10) || 1;
      if (minAmt > 1 && (pi.dealType === 'pris' || pi.dealType === 'prissätt')) {
        price = Math.round((price / minAmt) * 100) / 100;
      }

      const subtitle = (item.content?.amountInformation || '').trim();
      const brand    = (item.content?.brand || '').trim();
      const imgRaw   = item.content?.imageUrl || '';
      const image    = imgRaw ? (imgRaw.startsWith('//') ? 'https:' + imgRaw : imgRaw) : null;

      products.push(parseScrapedProduct(storeId, {
        name, brand, subtitle, price, ordPrice: null, image
      }));
    }

    console.log(`${label}: ${products.length} produkter (live)`);
    return products;
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ── Lidl (Puppeteer — React SPA) ─────────────────────────────────────────────
async function scrapeLidlOffers(storeId, label) {
  try {
    return await withPage(async page => {
      await page.goto('https://www.lidl.se/erbjudanden', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector(
        '[class*="product"], article[class*="offer"], [class*="OfferCard"]',
        { timeout: 15000 }
      ).catch(() => {});

      const raw = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(
          'article[class*="offer"], [class*="OfferCard"], [class*="product-card"], [class*="ProductCard"]'
        ));
        return cards.map(card => ({
          name:      card.querySelector('h2,h3,[class*="title"],[class*="name"]')?.textContent.trim() || '',
          priceText: card.querySelector('[class*="price"],[class*="Price"]')?.textContent.trim() || '',
          ordText:   card.querySelector('[class*="compare"],[class*="original"],[class*="ordinary"]')?.textContent.trim() || '',
          subtitle:  card.querySelector('[class*="weight"],[class*="volume"],[class*="unit"],[class*="desc"]')?.textContent.trim() || '',
          image:     card.querySelector('img')?.src || null
        }));
      });

      const products = [];
      for (const r of raw) {
        if (!r.name) continue;
        const m = r.priceText.match(/(\d+(?:[.,]\d+)?)/);
        const price = m ? parseFloat(m[1].replace(',','.')) : null;
        if (!price || price <= 0 || price > 5000) continue;
        const om = r.ordText.match(/(\d+(?:[.,]\d+)?)/);
        const ordPrice = om ? parseFloat(om[1].replace(',','.')) : null;
        products.push(parseScrapedProduct(storeId, {
          name: r.name, subtitle: r.subtitle, price, ordPrice, image: r.image
        }));
      }

      console.log(`${label}: ${products.length} produkter (live)`);
      return products;
    });
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ── Eurocash (Puppeteer — dynamic section) ────────────────────────────────────
async function scrapeEurocashOffers(storeId, label) {
  try {
    return await withPage(async page => {
      await page.goto(STORES.eurocash.url, { waitUntil: 'networkidle2', timeout: 25000 });
      // The offers section starts hidden; wait for it or try a brief pause
      await new Promise(r => setTimeout(r, 3000));

      const raw = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.offers__offer-item'));
        return items.map(item => ({
          name:      item.querySelector('.offers__offer-item-header')?.textContent.trim() || '',
          priceText: item.querySelector('.offers__offer-item-price, [class*="price"]')?.textContent.trim() || '',
          subtitle:  item.querySelector('.offers__offer-item-text')?.textContent.trim() || '',
          image:     item.querySelector('img')?.src || null
        }));
      });

      const products = [];
      for (const r of raw) {
        if (!r.name) continue;
        const m = r.priceText.match(/(\d+(?:[.,]\d+)?)/);
        const price = m ? parseFloat(m[1].replace(',','.')) : null;
        if (!price || price <= 0 || price > 5000) continue;
        products.push(parseScrapedProduct(storeId, {
          name: r.name, subtitle: r.subtitle, price, ordPrice: null, image: r.image
        }));
      }

      console.log(`${label}: ${products.length} produkter (live)`);
      return products;
    });
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ── Maxi Nordby (Puppeteer — Norwegian store) ─────────────────────────────────
async function scrapeMaxiNordbyOffers(storeId, label) {
  try {
    return await withPage(async page => {
      await page.goto('https://www.maximatnordby.se/', { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const raw = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(
          '[class*="product"], [class*="offer"], article'
        )).filter(el => el.querySelector('[class*="price"], .price'));

        return cards.map(card => ({
          name:      card.querySelector('h2,h3,h4,[class*="title"],[class*="name"]')?.textContent.trim() || '',
          priceText: card.querySelector('[class*="price"],.price')?.textContent.trim() || '',
          subtitle:  card.querySelector('[class*="desc"],[class*="sub"],[class*="unit"]')?.textContent.trim() || '',
          image:     card.querySelector('img')?.src || null
        }));
      });

      const products = [];
      for (const r of raw) {
        if (!r.name || r.name.length < 3) continue;
        const m = r.priceText.match(/(\d+(?:[.,]\d+)?)/);
        const price = m ? parseFloat(m[1].replace(',','.')) : null;
        if (!price || price <= 0 || price > 5000) continue;
        products.push(parseScrapedProduct(storeId, {
          name: r.name, subtitle: r.subtitle, price, ordPrice: null, image: r.image
        }));
      }

      console.log(`${label}: ${products.length} produkter (live)`);
      return products;
    });
  } catch (err) {
    console.log(`${label}: misslyckades – ${err.message}`);
    return [];
  }
}

// ─── Demo fallback per store ───────────────────────────────────────────────────
// When a store's scraper returns 0 results, use demo prices for that store only.

function demoForStore(storeId) {
  return DEMO_PRODUCTS
    .filter(p => p.prices[storeId])
    .map(p => ({
      ...p,
      prices: { [storeId]: { ...p.prices[storeId], inOffer: false } }
    }));
}

// Same for Göteborg demo products — returns only the specified store's price
function demoGbgForStore(storeId) {
  return generateGoteborgProducts()
    .filter(p => p.prices[storeId])
    .map(p => ({
      ...p,
      id: storeId + '-' + p.id,   // make ID unique per store
      prices: { [storeId]: { price: p.prices[storeId].price, inOffer: false } }
    }));
}

// ─── Cache & data orchestration ───────────────────────────────────────────────

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

let cache = {
  stromstad:   null,
  goteborg:    null,
  lastUpdated: null,
  isLive:      false
};

async function fetchAllProducts() {
  console.log('\n── Hämtar produktdata ──────────────────────────────');

  // Strömstad & Göteborg ICA use axios (fast, no Puppeteer needed)
  // All other stores use Puppeteer
  const [
    icaStromRes, icaGbgRes,
    willysRes, willysGbgRes,
    coopRes, coopGbgRes,
    hemkopRes, lidlRes,
    eurocashRes, maxiRes
  ] = await Promise.allSettled([
    scrapeICAOffers(STORES.ica.offersUrl, 'ica', 'ICA Strömstad'),
    scrapeICAOffers(
      'https://www.ica.se/butiker/supermarket/goteborg/ica-supermarket-nordstan-1177009/erbjudanden/',
      'ica-gbg', 'ICA Nordstan'
    ),
    scrapeAxfoodOffers('https://www.willys.se/erbjudanden/ehandel',                 'willys',     'Willys'),
    scrapeAxfoodOffers('https://www.willys.se/erbjudanden/ehandel',                 'willys-gbg', 'Willys Gbg'),
    scrapeCoopOffers(131800,                                                         'coop',       'Coop Strömstad'),
    scrapeCoopOffers(125600,                                                         'coop-gbg',   'Coop Avenyn'),
    scrapeAxfoodOffers('https://www.hemkop.se/erbjudanden',                         'hemkop',     'Hemköp'),
    scrapeLidlOffers(  'lidl',    'Lidl'),
    scrapeEurocashOffers('eurocash', 'Eurocash'),
    scrapeMaxiNordbyOffers('maxi', 'Maxi Nordby'),
  ]);

  const get = r => r.value || [];

  // Build per-store arrays; fall back to demo if live scrape empty
  const storesStromstad = {
    ica:      get(icaStromRes).length  ? get(icaStromRes)  : demoForStore('ica'),
    willys:   get(willysRes).length    ? get(willysRes)    : demoForStore('willys'),
    coop:     get(coopRes).length      ? get(coopRes)      : demoForStore('coop'),
    eurocash: get(eurocashRes).length  ? get(eurocashRes)  : demoForStore('eurocash'),
    maxi:     get(maxiRes).length      ? get(maxiRes)      : demoForStore('maxi'),
  };

  const storesGoteborg = {
    'ica-gbg':    get(icaGbgRes).length    ? get(icaGbgRes)    : demoGbgForStore('ica-gbg'),
    'willys-gbg': get(willysGbgRes).length ? get(willysGbgRes) : demoGbgForStore('willys-gbg'),
    'coop-gbg':   get(coopGbgRes).length   ? get(coopGbgRes)   : demoGbgForStore('coop-gbg'),
    'hemkop':     get(hemkopRes).length    ? get(hemkopRes)    : demoGbgForStore('hemkop'),
    'lidl':       get(lidlRes).length      ? get(lidlRes)      : demoGbgForStore('lidl'),
  };

  const allStromstad = Object.values(storesStromstad).flat();
  const allGoteborg  = Object.values(storesGoteborg).flat();

  const liveStores = [icaStromRes, willysRes, coopRes, eurocashRes, maxiRes,
                      icaGbgRes, willysGbgRes, coopGbgRes, hemkopRes, lidlRes]
    .filter(r => (r.value?.length || 0) > 0).length;

  cache.stromstad  = enrichProducts(allStromstad);
  cache.goteborg   = enrichProducts(allGoteborg);
  cache.lastUpdated = new Date();
  cache.isLive      = liveStores > 0;

  console.log(`── Strömstad: ${cache.stromstad.length} produkter, Göteborg: ${cache.goteborg.length} produkter (${cache.isLive ? `${liveStores} live butiker` : 'demo'})\n`);
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    if (!cache.stromstad || Date.now() - cache.lastUpdated > CACHE_TTL) {
      await fetchAllProducts();
    }

    const cityId = req.query.city && CITIES[req.query.city] ? req.query.city : 'stromstad';
    let products = cache[cityId];

    if (req.query.category && req.query.category !== 'alla') {
      products = products.filter(p => p.category === req.query.category);
    }
    if (req.query.subcategory) {
      products = products.filter(p => p.subcategory === req.query.subcategory);
    }
    if (req.query.q) {
      const q = req.query.q.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
      );
    }
    if (req.query.store && req.query.store !== 'alla') {
      products = products.filter(p => p.prices[req.query.store]);
    }

    res.json({ products, lastUpdated: cache.lastUpdated, isLive: cache.isLive });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte hämta produkter' });
  }
});

app.get('/api/stores', (req, res) => {
  const cityId = req.query.city && CITIES[req.query.city] ? req.query.city : null;
  if (cityId) {
    const cityStoreIds = CITIES[cityId].stores;
    const cityStores = {};
    cityStoreIds.forEach(id => { if (STORES[id]) cityStores[id] = STORES[id]; });
    return res.json(cityStores);
  }
  res.json(STORES);
});

app.get('/api/cities', (_req, res) => res.json(CITIES));

app.get('/api/status', (_req, res) => res.json({
  lastUpdated:       cache.lastUpdated,
  stromstadCount:    cache.stromstad?.length || 0,
  goteborgCount:     cache.goteborg?.length  || 0,
  isLive:            cache.isLive,
  stores:            Object.keys(STORES)
}));

// ─── Start ────────────────────────────────────────────────────────────────────

fetchAllProducts().finally(() => {
  app.listen(PORT, () => {
    console.log(`Deals → http://localhost:${PORT}`);
  });
});
