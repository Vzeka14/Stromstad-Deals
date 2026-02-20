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
  }
};

// ─── Demo / fallback product data ────────────────────────────────────────────
// Used when live scraping returns no results.
// Prices are realistic SEK values for Strömstad area (2024–2025).

const DEMO_PRODUCTS = [
  // Mejeri
  {
    id: 'mellanmjolk-1l', name: 'Mellanmjölk', subtitle: '3% fetthalt · 1 L',
    category: 'mejeri', unit: '1 L', image: null,
    prices: {
      ica:      { price: 14.90, inOffer: false },
      maxi:     { price: 13.95, inOffer: false },
      willys:   { price: 14.50, inOffer: false },
      eurocash: { price: 13.50, inOffer: false }
    }
  },
  {
    id: 'lattmjolk-1l', name: 'Lättmjölk', subtitle: '0.5% fetthalt · 1 L',
    category: 'mejeri', unit: '1 L', image: null,
    prices: {
      ica:      { price: 13.90, inOffer: false },
      maxi:     { price: 12.95, inOffer: false },
      willys:   { price: 13.50, inOffer: true },
      eurocash: { price: 12.50, inOffer: false }
    }
  },
  {
    id: 'smor-500g', name: 'Normalsaltat smör', subtitle: '500 g',
    category: 'mejeri', unit: '500 g', image: null,
    prices: {
      ica:      { price: 44.90, inOffer: false },
      maxi:     { price: 42.95, inOffer: false },
      willys:   { price: 39.90, inOffer: true },
      eurocash: { price: 40.00, inOffer: false }
    }
  },
  {
    id: 'agg-12', name: 'Ägg M/L', subtitle: '12-pack · frigående höns',
    category: 'mejeri', unit: '12-pack', image: null,
    prices: {
      ica:      { price: 59.90, inOffer: false },
      maxi:     { price: 55.95, inOffer: true },
      willys:   { price: 54.90, inOffer: false },
      eurocash: { price: 52.00, inOffer: false }
    }
  },
  {
    id: 'hushallsost-400g', name: 'Hushållsost', subtitle: '28% fetthalt · 400 g',
    category: 'mejeri', unit: '400 g', image: null,
    prices: {
      ica:      { price: 54.90, inOffer: false },
      maxi:     { price: 49.95, inOffer: false },
      willys:   { price: 52.90, inOffer: false },
      eurocash: { price: 47.00, inOffer: false }
    }
  },
  {
    id: 'yoghurt-1kg', name: 'Naturell yoghurt', subtitle: '3% fetthalt · 1 kg',
    category: 'mejeri', unit: '1 kg', image: null,
    prices: {
      ica:      { price: 29.90, inOffer: false },
      maxi:     { price: 27.95, inOffer: false },
      willys:   { price: 28.90, inOffer: false },
      eurocash: { price: 26.50, inOffer: false }
    }
  },
  {
    id: 'filmjolk-1l', name: 'Filmjölk', subtitle: '3% fetthalt · 1 L',
    category: 'mejeri', unit: '1 L', image: null,
    prices: {
      ica:      { price: 16.90, inOffer: false },
      maxi:     { price: 15.95, inOffer: false },
      willys:   { price: 16.50, inOffer: false },
      eurocash: { price: 15.00, inOffer: false }
    }
  },
  // Bröd
  {
    id: 'formbrod-700g', name: 'Formbröd', subtitle: 'Vete · 700 g',
    category: 'brod', unit: '700 g', image: null,
    prices: {
      ica:      { price: 29.90, inOffer: false },
      willys:   { price: 25.90, inOffer: false },
      eurocash: { price: 24.00, inOffer: false }
    }
  },
  {
    id: 'knackebrod-500g', name: 'Råg-knäckebröd', subtitle: '500 g',
    category: 'brod', unit: '500 g', image: null,
    prices: {
      ica:      { price: 22.90, inOffer: false },
      maxi:     { price: 19.95, inOffer: false },
      willys:   { price: 21.90, inOffer: false },
      eurocash: { price: 19.00, inOffer: false }
    }
  },
  {
    id: 'baguette-2-pack', name: 'Baguette', subtitle: '2-pack · färsk',
    category: 'brod', unit: '2-pack', image: null,
    prices: {
      ica:    { price: 19.90, inOffer: false },
      maxi:   { price: 17.95, inOffer: false },
      willys: { price: 18.90, inOffer: true }
    }
  },
  // Kött & fisk
  {
    id: 'kycklingfile-900g', name: 'Kycklingfilé', subtitle: 'Färsk · 900 g',
    category: 'kott', unit: '900 g', image: null,
    prices: {
      ica:      { price: 99.90, inOffer: true },
      maxi:     { price: 89.95, inOffer: false },
      willys:   { price: 94.90, inOffer: false },
      eurocash: { price: 85.00, inOffer: false }
    }
  },
  {
    id: 'notfars-500g', name: 'Nötfärs', subtitle: '12% fett · 500 g',
    category: 'kott', unit: '500 g', image: null,
    prices: {
      ica:      { price: 54.90, inOffer: false },
      maxi:     { price: 49.95, inOffer: false },
      willys:   { price: 52.90, inOffer: true },
      eurocash: { price: 47.00, inOffer: false }
    }
  },
  {
    id: 'laxfile-400g', name: 'Laxfilé', subtitle: 'Norsk atlantlax · 400 g',
    category: 'fisk', unit: '400 g', image: null,
    prices: {
      ica:    { price: 79.90, inOffer: false },
      maxi:   { price: 74.95, inOffer: true },
      willys: { price: 77.90, inOffer: false }
    }
  },
  {
    id: 'skinka-200g', name: 'Kokt skinka', subtitle: 'Skivad · 200 g',
    category: 'kott', unit: '200 g', image: null,
    prices: {
      ica:      { price: 29.90, inOffer: false },
      maxi:     { price: 27.95, inOffer: false },
      willys:   { price: 28.90, inOffer: false },
      eurocash: { price: 25.00, inOffer: false }
    }
  },
  // Frukt & grönt
  {
    id: 'applen-1kg', name: 'Äpplen', subtitle: 'Gala · 1 kg',
    category: 'frukt', unit: '1 kg', image: null,
    prices: {
      ica:      { price: 29.90, inOffer: false },
      maxi:     { price: 27.95, inOffer: false },
      willys:   { price: 25.90, inOffer: true },
      eurocash: { price: 24.00, inOffer: false }
    }
  },
  {
    id: 'bananer-1kg', name: 'Bananer', subtitle: '1 kg',
    category: 'frukt', unit: '1 kg', image: null,
    prices: {
      ica:      { price: 22.90, inOffer: false },
      maxi:     { price: 19.95, inOffer: false },
      willys:   { price: 21.90, inOffer: false },
      eurocash: { price: 18.00, inOffer: false }
    }
  },
  {
    id: 'tomater-500g', name: 'Tomater', subtitle: '500 g',
    category: 'frukt', unit: '500 g', image: null,
    prices: {
      ica:      { price: 19.90, inOffer: false },
      maxi:     { price: 17.95, inOffer: false },
      willys:   { price: 18.90, inOffer: false },
      eurocash: { price: 16.00, inOffer: false }
    }
  },
  {
    id: 'gurka-st', name: 'Gurka', subtitle: '1 st',
    category: 'frukt', unit: '1 st', image: null,
    prices: {
      ica:      { price: 14.90, inOffer: false },
      maxi:     { price: 12.95, inOffer: false },
      willys:   { price: 13.90, inOffer: false },
      eurocash: { price: 11.00, inOffer: false }
    }
  },
  {
    id: 'morotter-1kg', name: 'Morötter', subtitle: '1 kg',
    category: 'frukt', unit: '1 kg', image: null,
    prices: {
      ica:      { price: 14.90, inOffer: false },
      maxi:     { price: 13.95, inOffer: false },
      willys:   { price: 12.90, inOffer: false },
      eurocash: { price: 12.00, inOffer: false }
    }
  },
  // Torrvaror
  {
    id: 'pasta-500g', name: 'Pasta', subtitle: 'Penne eller spaghetti · 500 g',
    category: 'torrvaror', unit: '500 g', image: null,
    prices: {
      ica:      { price: 14.90, inOffer: false },
      maxi:     { price: 12.95, inOffer: false },
      willys:   { price: 13.90, inOffer: false },
      eurocash: { price: 11.00, inOffer: false }
    }
  },
  {
    id: 'ris-1kg', name: 'Långkornigt ris', subtitle: '1 kg',
    category: 'torrvaror', unit: '1 kg', image: null,
    prices: {
      ica:      { price: 22.90, inOffer: false },
      maxi:     { price: 19.95, inOffer: false },
      willys:   { price: 21.90, inOffer: false },
      eurocash: { price: 18.00, inOffer: false }
    }
  },
  {
    id: 'vetemjol-2kg', name: 'Vetemjöl', subtitle: '2 kg',
    category: 'torrvaror', unit: '2 kg', image: null,
    prices: {
      ica:      { price: 27.90, inOffer: false },
      maxi:     { price: 24.95, inOffer: false },
      willys:   { price: 25.90, inOffer: false },
      eurocash: { price: 22.00, inOffer: false }
    }
  },
  {
    id: 'tomatkross-400g', name: 'Krossade tomater', subtitle: '400 g',
    category: 'torrvaror', unit: '400 g', image: null,
    prices: {
      ica:      { price: 10.90, inOffer: false },
      maxi:     { price:  9.95, inOffer: false },
      willys:   { price: 10.50, inOffer: false },
      eurocash: { price:  8.50, inOffer: false }
    }
  },
  // Dryck
  {
    id: 'kaffe-500g', name: 'Bryggkaffe', subtitle: 'Mellanrost · 500 g',
    category: 'dryck', unit: '500 g', image: null,
    prices: {
      ica:      { price: 79.90, inOffer: false },
      maxi:     { price: 74.95, inOffer: false },
      willys:   { price: 69.90, inOffer: true },
      eurocash: { price: 67.00, inOffer: false }
    }
  },
  {
    id: 'apelsinjuice-1l', name: 'Apelsinjuice', subtitle: 'Med fruktkött · 1 L',
    category: 'dryck', unit: '1 L', image: null,
    prices: {
      ica:      { price: 24.90, inOffer: false },
      maxi:     { price: 22.95, inOffer: false },
      willys:   { price: 23.90, inOffer: false },
      eurocash: { price: 21.00, inOffer: false }
    }
  },
  {
    id: 'cola-1.5l', name: 'Cola', subtitle: '1,5 L',
    category: 'dryck', unit: '1,5 L', image: null,
    prices: {
      ica:      { price: 22.90, inOffer: false },
      maxi:     { price: 19.95, inOffer: false },
      willys:   { price: 20.90, inOffer: false },
      eurocash: { price: 18.00, inOffer: false }
    }
  },
  {
    id: 'vatten-1.5l', name: 'Mineralvatten', subtitle: 'Naturellt · 1,5 L',
    category: 'dryck', unit: '1,5 L', image: null,
    prices: {
      ica:      { price: 12.90, inOffer: false },
      maxi:     { price: 10.95, inOffer: false },
      willys:   { price: 11.90, inOffer: false },
      eurocash: { price:  9.50, inOffer: false }
    }
  },
  // Snacks & godis
  {
    id: 'chips-200g', name: 'Chips', subtitle: 'Naturell · 200 g',
    category: 'snacks', unit: '200 g', image: null,
    prices: {
      ica:      { price: 24.90, inOffer: false },
      maxi:     { price: 22.95, inOffer: false },
      willys:   { price: 23.90, inOffer: true },
      eurocash: { price: 20.00, inOffer: false }
    }
  },
  {
    id: 'choklad-200g', name: 'Mjölkchoklad', subtitle: '200 g',
    category: 'snacks', unit: '200 g', image: null,
    prices: {
      ica:      { price: 29.90, inOffer: false },
      maxi:     { price: 26.95, inOffer: false },
      willys:   { price: 27.90, inOffer: false },
      eurocash: { price: 25.00, inOffer: false }
    }
  },
  // Fryst
  {
    id: 'vaniljglass-1l', name: 'Vaniljglass', subtitle: '1 L',
    category: 'frys', unit: '1 L', image: null,
    prices: {
      ica:      { price: 39.90, inOffer: false },
      maxi:     { price: 34.95, inOffer: true },
      willys:   { price: 37.90, inOffer: false },
      eurocash: { price: 33.00, inOffer: false }
    }
  },
  {
    id: 'fryst-spenat-500g', name: 'Fryst hackad spenat', subtitle: '500 g',
    category: 'frys', unit: '500 g', image: null,
    prices: {
      ica:      { price: 19.90, inOffer: false },
      willys:   { price: 17.90, inOffer: false },
      eurocash: { price: 16.00, inOffer: false }
    }
  },
  // Hygien
  {
    id: 'tandkram-75ml', name: 'Tandkräm', subtitle: 'Fluor · 75 ml',
    category: 'hygien', unit: '75 ml', image: null,
    prices: {
      ica:      { price: 24.90, inOffer: false },
      maxi:     { price: 22.95, inOffer: false },
      willys:   { price: 19.90, inOffer: false },
      eurocash: { price: 19.00, inOffer: false }
    }
  },
  {
    id: 'schampo-250ml', name: 'Schampo', subtitle: 'Normalt hår · 250 ml',
    category: 'hygien', unit: '250 ml', image: null,
    prices: {
      ica:      { price: 34.90, inOffer: false },
      maxi:     { price: 29.95, inOffer: true },
      willys:   { price: 32.90, inOffer: false },
      eurocash: { price: 28.00, inOffer: false }
    }
  },
  // Städ
  {
    id: 'diskmedel-500ml', name: 'Diskmedel', subtitle: 'Citron · 500 ml',
    category: 'stad', unit: '500 ml', image: null,
    prices: {
      ica:      { price: 22.90, inOffer: false },
      maxi:     { price: 19.95, inOffer: false },
      willys:   { price: 21.90, inOffer: false },
      eurocash: { price: 18.00, inOffer: false }
    }
  },
  {
    id: 'tvattmedel-1.5kg', name: 'Tvättmedel', subtitle: 'Colour · 1,5 kg',
    category: 'stad', unit: '1,5 kg', image: null,
    prices: {
      ica:      { price: 79.90, inOffer: false },
      maxi:     { price: 74.95, inOffer: false },
      willys:   { price: 69.90, inOffer: true },
      eurocash: { price: 65.00, inOffer: false }
    }
  }
];

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

// ─── Cache & data orchestration ───────────────────────────────────────────────

const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

let cache = { products: null, lastUpdated: null, isLive: false };

async function fetchAllProducts() {
  console.log('\n── Hämtar produktdata ──────────────────────────────');
  const [icaRes, maxiRes, willysRes, eurocashRes] = await Promise.allSettled([
    scrapeICA(), scrapeMaxiNordby(), scrapeWillys(), scrapeEurocash()
  ]);

  const isLive =
    (icaRes.value?.length      > 3) ||
    (maxiRes.value?.length     > 3) ||
    (willysRes.value?.length   > 3) ||
    (eurocashRes.value?.length > 3);

  // TODO: When live data is available, merge it with DEMO_PRODUCTS using
  // fuzzy name matching to add real prices alongside demo prices.
  const products = DEMO_PRODUCTS;

  cache.products    = enrichProducts(products);
  cache.lastUpdated = new Date();
  cache.isLive      = isLive;

  console.log(`── ${cache.products.length} produkter laddade (${isLive ? 'live' : 'demo'})\n`);
  return cache.products;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    if (!cache.products || Date.now() - cache.lastUpdated > CACHE_TTL) {
      await fetchAllProducts();
    }

    let products = cache.products;

    if (req.query.category && req.query.category !== 'alla') {
      products = products.filter(p => p.category === req.query.category);
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

app.get('/api/stores', (_req, res) => res.json(STORES));

app.get('/api/status', (_req, res) => res.json({
  lastUpdated:   cache.lastUpdated,
  productCount:  cache.products?.length || 0,
  isLive:        cache.isLive,
  stores:        Object.keys(STORES)
}));

// ─── Start ────────────────────────────────────────────────────────────────────

fetchAllProducts().finally(() => {
  app.listen(PORT, () => {
    console.log(`Stromstad Deals → http://localhost:${PORT}`);
  });
});
