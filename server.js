'use strict';

const express = require('express');
const axios   = require('axios');
const cheerio = require('cheerio');
const path    = require('path');

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
    const worstPrice = sorted[sorted.length - 1][1].price;
    const savings   = parseFloat((worstPrice - bestPrice).toFixed(2));
    return { ...p, bestStore, bestPrice, savings };
  }).sort((a, b) => b.savings - a.savings);
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

// Attempt to scrape live offer data from ICA Kvantum Stromstad
async function scrapeICA() {
  try {
    const response = await axios.get(STORES.ica.offersUrl, {
      headers: SCRAPE_HEADERS, timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const products = [];

    // ICA injects a JSON blob into their pages
    $('script').each((_, el) => {
      const src = $(el).html() || '';
      if (!src.includes('"offers"') && !src.includes('"products"')) return;
      try {
        const match = src.match(/\{[\s\S]+\}/);
        if (!match) return;
        const data = JSON.parse(match[0]);
        const offers = data.offers || data.products || [];
        offers.forEach(o => {
          const price = parseFloat(o.price || o.currentPrice || 0);
          if (o.name && price > 0) {
            products.push({ name: o.name, price, image: o.image || null, inOffer: true });
          }
        });
      } catch (_) {}
    });

    // HTML fallback
    if (!products.length) {
      $('[class*="offer"], [class*="product-card"]').each((_, el) => {
        const name  = $(el).find('[class*="title"],[class*="name"],h3,h4').first().text().trim();
        const pText = $(el).find('[class*="price"]').first().text().trim();
        const price = parseFloat(pText.replace(/[^0-9,]/g, '').replace(',', '.'));
        const image = $(el).find('img').first().attr('src') || null;
        if (name && !isNaN(price) && price > 0) products.push({ name, price, image, inOffer: true });
      });
    }

    console.log(`ICA: ${products.length} produkter`);
    return products;
  } catch (err) {
    console.log(`ICA: misslyckades – ${err.message}`);
    return [];
  }
}

// Attempt to scrape Willys – they use Next.js, so we look for __NEXT_DATA__
async function scrapeWillys() {
  try {
    const response = await axios.get(STORES.willys.url, {
      headers: SCRAPE_HEADERS, timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const products = [];

    const nextRaw = $('#__NEXT_DATA__').html();
    if (nextRaw) {
      try {
        const nextData = JSON.parse(nextRaw);
        const offers =
          nextData?.props?.pageProps?.offers ||
          nextData?.props?.pageProps?.products ||
          nextData?.props?.pageProps?.weeklyOffers || [];
        offers.forEach(o => {
          const price = parseFloat(o.price || o.currentPrice || o.priceValue || 0);
          if ((o.name || o.title) && price > 0) {
            products.push({
              name: o.name || o.title,
              price,
              image: o.image || o.imageUrl || null,
              inOffer: true
            });
          }
        });
      } catch (_) {}
    }

    if (!products.length) {
      $('[class*="offer-card"],[class*="product-card"],[class*="OfferCard"]').each((_, el) => {
        const name  = $(el).find('[class*="title"],[class*="name"]').first().text().trim();
        const pText = $(el).find('[class*="price"]').first().text().trim();
        const price = parseFloat(pText.replace(/[^0-9,]/g, '').replace(',', '.'));
        const image = $(el).find('img').first().attr('src') || null;
        if (name && !isNaN(price) && price > 0) products.push({ name, price, image, inOffer: true });
      });
    }

    console.log(`Willys: ${products.length} produkter`);
    return products;
  } catch (err) {
    console.log(`Willys: misslyckades – ${err.message}`);
    return [];
  }
}

async function scrapeMaxiNordby() {
  try {
    const response = await axios.get(STORES.maxi.url, {
      headers: SCRAPE_HEADERS, timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const products = [];

    $('[class*="product"],[class*="offer"],article').each((_, el) => {
      const name  = $(el).find('h2,h3,h4,[class*="title"],[class*="name"]').first().text().trim();
      const pText = $(el).find('[class*="price"],.price').first().text().trim();
      const price = parseFloat(pText.replace(/[^0-9,]/g, '').replace(',', '.'));
      const image = $(el).find('img').first().attr('src') || null;
      if (name && name.length > 2 && !isNaN(price) && price > 0) {
        products.push({ name, price, image, inOffer: true });
      }
    });

    console.log(`Maxi Nordby: ${products.length} produkter`);
    return products;
  } catch (err) {
    console.log(`Maxi Nordby: misslyckades – ${err.message}`);
    return [];
  }
}

async function scrapeEurocash() {
  try {
    const response = await axios.get(STORES.eurocash.url, {
      headers: SCRAPE_HEADERS, timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const products = [];

    $('[class*="product"],[class*="offer"]').each((_, el) => {
      const name  = $(el).find('h2,h3,[class*="title"]').first().text().trim();
      const pText = $(el).find('[class*="price"]').first().text().trim();
      const price = parseFloat(pText.replace(/[^0-9,]/g, '').replace(',', '.'));
      const image = $(el).find('img').first().attr('src') || null;
      if (name && !isNaN(price) && price > 0) {
        products.push({ name, price, image, inOffer: true });
      }
    });

    console.log(`Eurocash: ${products.length} produkter`);
    return products;
  } catch (err) {
    console.log(`Eurocash: misslyckades – ${err.message}`);
    return [];
  }
}

async function scrapeCoopSE() {
  try {
    const response = await axios.get('https://www.coop.se/handla/erbjudanden/', {
      headers: SCRAPE_HEADERS, timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const products = [];

    const nextRaw = $('#__NEXT_DATA__').html();
    if (nextRaw) {
      try {
        const nextData = JSON.parse(nextRaw);
        const offers =
          nextData?.props?.pageProps?.offers ||
          nextData?.props?.pageProps?.products ||
          nextData?.props?.pageProps?.weeklyOffers || [];
        offers.forEach(o => {
          const price = parseFloat(o.price || o.currentPrice || o.priceValue || 0);
          if ((o.name || o.title) && price > 0) {
            products.push({ name: o.name || o.title, price, image: o.image || null, inOffer: true });
          }
        });
      } catch (_) {}
    }

    if (!products.length) {
      $('[class*="offer-card"],[class*="product-card"],[class*="OfferCard"]').each((_, el) => {
        const name  = $(el).find('[class*="title"],[class*="name"]').first().text().trim();
        const pText = $(el).find('[class*="price"]').first().text().trim();
        const price = parseFloat(pText.replace(/[^0-9,]/g, '').replace(',', '.'));
        const image = $(el).find('img').first().attr('src') || null;
        if (name && !isNaN(price) && price > 0) products.push({ name, price, image, inOffer: true });
      });
    }

    console.log(`Coop: ${products.length} produkter`);
    return products;
  } catch (err) {
    console.log(`Coop: misslyckades – ${err.message}`);
    return [];
  }
}

// ─── Cache & data orchestration ───────────────────────────────────────────────

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

let cache = {
  stromstad: null,
  goteborg:  null,
  lastUpdated: null,
  isLive: false
};

async function fetchAllProducts() {
  console.log('\n── Hämtar produktdata ──────────────────────────────');
  const [icaRes, maxiRes, willysRes, eurocashRes, coopRes] = await Promise.allSettled([
    scrapeICA(), scrapeMaxiNordby(), scrapeWillys(), scrapeEurocash(), scrapeCoopSE()
  ]);

  const isLive =
    (icaRes.value?.length      > 3) ||
    (maxiRes.value?.length     > 3) ||
    (willysRes.value?.length   > 3) ||
    (eurocashRes.value?.length > 3) ||
    (coopRes.value?.length     > 3);

  // TODO: When live data is available, merge it with DEMO_PRODUCTS using
  // fuzzy name matching to add real prices alongside demo prices.
  cache.stromstad  = enrichProducts(DEMO_PRODUCTS);
  cache.goteborg   = enrichProducts(generateGoteborgProducts());
  cache.lastUpdated = new Date();
  cache.isLive      = isLive;

  console.log(`── Strömstad: ${cache.stromstad.length} produkter, Göteborg: ${cache.goteborg.length} produkter (${isLive ? 'live' : 'demo'})\n`);
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
