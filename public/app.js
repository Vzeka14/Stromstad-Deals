'use strict';

// ── City config (mirrors server CITIES) ────────────────────────────────────

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

// ── Translations ───────────────────────────────────────────────────────────

const I18N = {
  sv: {
    site_subtitle:  'Jämför matpriser i',
    updating:       'Uppdaterar…',
    updated_at:     'Uppdaterad',
    all_stores:     'Alla butiker',
    search_ph:      'Sök produkt…',
    sort_savings:   'Mest besparing',
    sort_asc:       'Lägst pris',
    sort_desc:      'Högst pris',
    sort_name:      'Namn A–Ö',
    compare_btn:    'Jämför priser →',
    save:           'Spara',
    best_price:     '🏆 Bäst pris',
    offer:          'Erbjudande',
    modal_section:  'Prisjämförelse',
    modal_buy:      'Köp billigast hos',
    store_sg:       'butik',
    store_pl:       'butiker',
    empty:          'Inga produkter hittades.',
    all_sub:        'Alla',
    footer_tagline: 'Gillar du Deals?',
    footer_coffee:  'Bjud utvecklaren på en kopp kaffe ☕',
    footer_paypal:  'Donera via PayPal',
    footer_crypto:  'USDT (TRC-20):',
    copy:           'Kopiera',
    copied:         'Kopierat! ✓',
    ord_price:      'Ord.pris',
    change_city:    'Byt stad',
    welcome_title:  'Deals',
    welcome_subtitle: 'Jämför matpriser i din stad',
    welcome_desc:   'Välj din stad för att se och jämföra aktuella matpriser i de lokala butikerna.',
    choose_city:    'Välj din stad',
    select_btn:     'Välj',
    categories: {
      alla:      'Alla',      mejeri:    'Mejeri',
      brod:      'Bröd & bageri',  kott:      'Kött',
      fisk:      'Fisk & skaldjur', frukt:    'Frukt & grönt',
      torrvaror: 'Torrvaror', dryck:     'Dryck',
      snacks:    'Snacks & godis',  frys:    'Fryst',
      hygien:    'Hygien',    stad:      'Städ & hushåll'
    }
  },
  no: {
    site_subtitle:  'Sammenlign matpriser i',
    updating:       'Oppdaterer…',
    updated_at:     'Oppdatert',
    all_stores:     'Alle butikker',
    search_ph:      'Søk produkt…',
    sort_savings:   'Mest besparelse',
    sort_asc:       'Lavest pris',
    sort_desc:      'Høyest pris',
    sort_name:      'Navn A–Å',
    compare_btn:    'Sammenlign priser →',
    save:           'Spar',
    best_price:     '🏆 Beste pris',
    offer:          'Tilbud',
    modal_section:  'Prissammenligning',
    modal_buy:      'Kjøp billigst hos',
    store_sg:       'butikk',
    store_pl:       'butikker',
    empty:          'Ingen produkter funnet.',
    all_sub:        'Alle',
    footer_tagline: 'Liker du Deals?',
    footer_coffee:  'Spandér utvikleren en kopp kaffe ☕',
    footer_paypal:  'Doner via PayPal',
    footer_crypto:  'USDT (TRC-20):',
    copy:           'Kopier',
    copied:         'Kopiert! ✓',
    ord_price:      'Ord.pris',
    change_city:    'Bytt by',
    welcome_title:  'Deals',
    welcome_subtitle: 'Sammenlign matpriser i din by',
    welcome_desc:   'Velg din by for å se og sammenligne aktuelle matpriser i de lokale butikkene.',
    choose_city:    'Velg din by',
    select_btn:     'Velg',
    categories: {
      alla:      'Alle',      mejeri:    'Meieri',
      brod:      'Brød & bakeri',   kott:      'Kjøtt',
      fisk:      'Fisk & sjømat',   frukt:     'Frukt & grønt',
      torrvaror: 'Tørrvarer', dryck:     'Drikke',
      snacks:    'Snacks & godteri', frys:     'Fryst',
      hygien:    'Hygiene',   stad:      'Rengjøring & husholdning'
    }
  }
};

// ── Subcategory config ─────────────────────────────────────────────────────

const SUBCATEGORIES = {
  mejeri: [
    { id:'mjolk',    sv:'Mjölk & fil',       no:'Melk & kulturmelk' },
    { id:'smor_agg', sv:'Smör & ägg',         no:'Smør & egg'        },
    { id:'ost',      sv:'Ost',                no:'Ost'               },
    { id:'yoghurt',  sv:'Yoghurt & grädde',   no:'Yoghurt & fløte'   }
  ],
  brod: [
    { id:'mjukt',      sv:'Mjukt bröd',   no:'Mykt brød'   },
    { id:'knackebrod', sv:'Knäckebröd',   no:'Knekkebrød'  }
  ],
  kott: [
    { id:'fagel', sv:'Fågel',           no:'Fjærfe'          },
    { id:'not',   sv:'Nötkött',         no:'Storfekjøtt'     },
    { id:'flask', sv:'Fläsk & chark',   no:'Svin & pålegg'   }
  ],
  fisk: [
    { id:'lax',      sv:'Lax',               no:'Laks'             },
    { id:'vitfisk',  sv:'Vitfisk',            no:'Hvitfisk'          },
    { id:'skaldjur', sv:'Skaldjur',           no:'Skalldyr'          },
    { id:'konserv',  sv:'Konserverad fisk',   no:'Hermetisk fisk'    }
  ],
  frukt: [
    { id:'frukter',   sv:'Frukt',       no:'Frukt'       },
    { id:'grönsaker', sv:'Grönsaker',   no:'Grønnsaker'  }
  ],
  torrvaror: [
    { id:'spannmal',  sv:'Spannmål & flingor', no:'Korn & grøt'      },
    { id:'konserver', sv:'Konserver',           no:'Hermetikk'        },
    { id:'kryddor',   sv:'Kryddor & såser',     no:'Krydder & sauser' }
  ],
  dryck: [
    { id:'varm',       sv:'Kaffe & te',           no:'Kaffe & te'        },
    { id:'kall',       sv:'Juice, läsk & vatten', no:'Juice, brus & vann'},
    { id:'alternativ', sv:'Växtbaserat',           no:'Plantebasert'      }
  ],
  snacks: [
    { id:'salt', sv:'Salt snacks',       no:'Salt snacks'        },
    { id:'sott', sv:'Godis & choklad',   no:'Godteri & sjokolade'},
    { id:'kex',  sv:'Kex & kakor',       no:'Kjeks & kaker'      }
  ],
  frys: [
    { id:'glass', sv:'Glass & dessert', no:'Is & dessert'       },
    { id:'mat',   sv:'Fryst mat',       no:'Frossen mat'        },
    { id:'gront', sv:'Fryst grönt',     no:'Frosne grønnsaker'  }
  ],
  hygien: [
    { id:'munvard', sv:'Munvård',     no:'Munnstell' },
    { id:'har',     sv:'Hår',         no:'Hår'       },
    { id:'kropp',   sv:'Kropp & hud', no:'Kropp & hud'}
  ],
  stad: [
    { id:'disk',   sv:'Disk',    no:'Oppvask'      },
    { id:'tatt',   sv:'Tvätt',   no:'Klesvask'     },
    { id:'papper', sv:'Papper',  no:'Papir & poser'}
  ]
};

// ── Category metadata ──────────────────────────────────────────────────────

const CATEGORY_EMOJI = {
  alla:'🛒', mejeri:'🥛', brod:'🍞', kott:'🥩', fisk:'🐟',
  frukt:'🍎', torrvaror:'🌾', dryck:'☕', snacks:'🍫',
  frys:'❄️', hygien:'🧴', stad:'🧹'
};

const CATEGORY_COLORS = {
  mejeri:   ['#ECF8FF','#60a5fa'], brod:     ['#FFF8EC','#f59e0b'],
  kott:     ['#FFECEC','#f87171'], fisk:     ['#E8F8FF','#0ea5e9'],
  frukt:    ['#ECFFEC','#4ade80'], torrvaror:['#F5ECFF','#a78bfa'],
  dryck:    ['#FFF3EC','#fb923c'], snacks:   ['#FFECF5','#f472b6'],
  frys:     ['#ECFFFF','#22d3ee'], hygien:   ['#ECFFF5','#34d399'],
  stad:     ['#F5F5FF','#818cf8']
};

// ── State ──────────────────────────────────────────────────────────────────

let allProducts      = [];
let stores           = {};
let activeStore      = 'alla';
let activeCategory   = 'alla';
let activeSubcategory= null;
let searchQuery      = '';
let sortMode         = 'savings';
let currentLang      = 'sv';
let lastUpdatedRaw   = null;
let currentCity      = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function t(key)    { return I18N[currentLang][key]             ?? I18N.sv[key] ?? key; }
function tCat(cat) { return I18N[currentLang].categories[cat] ?? cat; }

function emoji(catOrProduct) {
  if (catOrProduct && typeof catOrProduct === 'object') {
    return catOrProduct.emoji || CATEGORY_EMOJI[catOrProduct.category] || '🛒';
  }
  return CATEGORY_EMOJI[catOrProduct] || '🛒';
}

function tSub(cat, subId) {
  const sub = (SUBCATEGORIES[cat] || []).find(s => s.id === subId);
  if (!sub) return subId;
  return currentLang === 'no' ? sub.no : sub.sv;
}

function formatPrice(p) { return p.toFixed(2).replace('.', ':') + ' kr'; }
function storeColor(id) { return stores[id]?.color     || '#888'; }
function storeShort(id) { return stores[id]?.shortName || id;     }

// ── DOM refs ───────────────────────────────────────────────────────────────

const welcomePage   = document.getElementById('welcome-page');
const appPage       = document.getElementById('app-page');
const cityGrid      = document.getElementById('city-grid');
const grid          = document.getElementById('product-grid');
const emptyMsg      = document.getElementById('empty-msg');
const storeFiltWrap = document.getElementById('store-filters');
const catTabsWrap   = document.getElementById('category-tabs');
const searchInput   = document.getElementById('search-input');
const sortSelect    = document.getElementById('sort-select');
const lastUpdatedEl = document.getElementById('last-updated');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');
const modalContent  = document.getElementById('modal-content');
const appCityName   = document.getElementById('app-city-name');
const changeCityBtn = document.getElementById('change-city-btn');

// ── Welcome page ───────────────────────────────────────────────────────────

function renderWelcome() {
  // Update i18n texts on welcome
  const el = id => document.getElementById(id);
  if (el('w-title'))        el('w-title').textContent        = t('welcome_title');
  if (el('w-subtitle'))     el('w-subtitle').textContent     = t('welcome_subtitle');
  if (el('w-desc'))         el('w-desc').textContent         = t('welcome_desc');
  if (el('w-footer-tagline')) el('w-footer-tagline').textContent = t('footer_tagline');
  if (el('w-footer-coffee'))  el('w-footer-coffee').textContent  = t('footer_coffee');
  if (el('w-paypal-text'))    el('w-paypal-text').textContent    = t('footer_paypal');
  if (el('w-crypto-label'))   el('w-crypto-label').textContent   = t('footer_crypto');
  const wCopyBtn = el('w-copy-addr-btn');
  if (wCopyBtn && wCopyBtn.dataset.state !== 'copied') wCopyBtn.textContent = t('copy');

  // Render city cards
  cityGrid.innerHTML = Object.values(CITIES).map(city => {
    const cityName = currentLang === 'no' ? city.no : city.sv;
    const tagline  = currentLang === 'no' ? city.tagline.no : city.tagline.sv;
    return `
    <div class="city-card" data-city="${city.id}">
      <div class="city-card-emoji">${city.emoji}</div>
      <div class="city-card-name">${cityName}</div>
      <div class="city-card-tagline">${tagline}</div>
      <button class="city-select-btn" data-city="${city.id}">${t('select_btn')}</button>
    </div>`;
  }).join('');

  cityGrid.querySelectorAll('[data-city]').forEach(el => {
    el.addEventListener('click', () => selectCity(el.dataset.city));
  });

  // Welcome page lang buttons
  welcomePage.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // Welcome copy button
  if (wCopyBtn) {
    wCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('THHNLDw1tmhbRBeu8dzwmFwsiHZyDC56RA').then(() => {
        wCopyBtn.dataset.state = 'copied';
        wCopyBtn.textContent   = t('copied');
        setTimeout(() => {
          wCopyBtn.dataset.state = '';
          wCopyBtn.textContent   = t('copy');
        }, 2000);
      });
    });
  }
}

function showWelcome() {
  welcomePage.classList.remove('hidden');
  appPage.classList.add('hidden');
  renderWelcome();
}

function showApp() {
  welcomePage.classList.add('hidden');
  appPage.classList.remove('hidden');
}

function selectCity(cityId) {
  if (!CITIES[cityId]) return;
  currentCity = cityId;
  localStorage.setItem('selectedCity', cityId);

  const cityName = currentLang === 'no' ? CITIES[cityId].no : CITIES[cityId].sv;
  if (appCityName) appCityName.textContent = `${t('site_subtitle')} ${cityName}`;

  // Reset filters when city changes
  activeStore      = 'alla';
  activeCategory   = 'alla';
  activeSubcategory = null;
  searchQuery      = '';

  showApp();

  // Rebuild store filters for new city
  storeFiltWrap.innerHTML = `<button class="store-pill active" data-store="alla">${t('all_stores')}</button>`;
  storeFiltWrap.querySelector('[data-store="alla"]')
    .addEventListener('click', () => setActiveStore('alla'));

  loadStores().then(() => loadProducts());
  updateStaticText();
}

// ── i18n: update static DOM ────────────────────────────────────────────────

function updateStaticText() {
  if (currentCity) {
    const cityName = currentLang === 'no' ? CITIES[currentCity].no : CITIES[currentCity].sv;
    if (appCityName) appCityName.textContent = `${t('site_subtitle')} ${cityName}`;
  }

  if (searchInput) searchInput.placeholder = t('search_ph');

  const opts = sortSelect ? sortSelect.options : [];
  if (opts[0]) opts[0].text = t('sort_savings');
  if (opts[1]) opts[1].text = t('sort_asc');
  if (opts[2]) opts[2].text = t('sort_desc');
  if (opts[3]) opts[3].text = t('sort_name');

  const allStorePill = storeFiltWrap ? storeFiltWrap.querySelector('[data-store="alla"]') : null;
  if (allStorePill) allStorePill.textContent = t('all_stores');

  const allCatTab = catTabsWrap ? catTabsWrap.querySelector('[data-category="alla"]') : null;
  if (allCatTab) allCatTab.textContent = tCat('alla');

  if (catTabsWrap) {
    catTabsWrap.querySelectorAll('.cat-tab:not([data-category="alla"])').forEach(btn => {
      btn.innerHTML = `${emoji(btn.dataset.category)} ${tCat(btn.dataset.category)}`;
    });
  }

  const subWrap = document.getElementById('subcategory-chips');
  if (subWrap && activeCategory !== 'alla') {
    subWrap.querySelectorAll('.subcat-chip').forEach(chip => {
      const sid = chip.dataset.subcat;
      chip.textContent = sid ? tSub(activeCategory, sid) : t('all_sub');
    });
  }

  if (emptyMsg) emptyMsg.textContent = t('empty');

  if (lastUpdatedRaw && lastUpdatedEl) {
    lastUpdatedEl.textContent =
      `${t('updated_at')} ${lastUpdatedRaw.toLocaleTimeString(
        currentLang === 'no' ? 'nb-NO' : 'sv-SE', { hour:'2-digit', minute:'2-digit' }
      )}`;
  }

  // App page footer
  const el = id => document.getElementById(id);
  if (el('footer-tagline'))    el('footer-tagline').textContent    = t('footer_tagline');
  if (el('footer-coffee'))     el('footer-coffee').textContent     = t('footer_coffee');
  if (el('footer-paypal-text'))el('footer-paypal-text').textContent= t('footer_paypal');
  if (el('footer-crypto-label'))el('footer-crypto-label').textContent= t('footer_crypto');
  const copyBtn = el('copy-addr-btn');
  if (copyBtn && copyBtn.dataset.state !== 'copied') copyBtn.textContent = t('copy');

  // Change-city button text
  const changeCityText = document.getElementById('change-city-text');
  if (changeCityText) changeCityText.textContent = t('change_city');

  // App page lang buttons
  appPage.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  // Welcome page (if visible, re-render)
  if (!welcomePage.classList.contains('hidden')) {
    renderWelcome();
  }
}

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'no' ? 'no' : 'sv';
  updateStaticText();
  if (!appPage.classList.contains('hidden')) renderGrid();
}

// ── Data loading ───────────────────────────────────────────────────────────

async function loadStores() {
  const params = currentCity ? `?city=${currentCity}` : '';
  const res = await fetch(`/api/stores${params}`);
  stores = await res.json();
  buildStoreFilters();
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (currentCity)            params.set('city', currentCity);
  if (activeCategory !== 'alla') params.set('category', activeCategory);
  if (activeSubcategory)          params.set('subcategory', activeSubcategory);
  if (searchQuery)                params.set('q', searchQuery);
  if (activeStore !== 'alla')     params.set('store', activeStore);

  const res  = await fetch(`/api/products?${params}`);
  const data = await res.json();

  allProducts = sortProducts(data.products);
  renderGrid();

  if (data.lastUpdated && lastUpdatedEl) {
    lastUpdatedRaw = new Date(data.lastUpdated);
    lastUpdatedEl.textContent =
      `${t('updated_at')} ${lastUpdatedRaw.toLocaleTimeString(
        currentLang === 'no' ? 'nb-NO' : 'sv-SE', { hour:'2-digit', minute:'2-digit' }
      )}`;
  }
}

function sortProducts(list) {
  const copy = [...list];
  switch (sortMode) {
    case 'price_asc':  return copy.sort((a,b) => a.bestPrice - b.bestPrice);
    case 'price_desc': return copy.sort((a,b) => b.bestPrice - a.bestPrice);
    case 'name':       return copy.sort((a,b) => a.name.localeCompare(b.name,'sv'));
    default:           return copy.sort((a,b) => b.savings - a.savings);
  }
}

// ── Navigation builders ────────────────────────────────────────────────────

function buildStoreFilters() {
  // Remove any previously added store pills (keep "alla" pill)
  storeFiltWrap.querySelectorAll('.store-pill:not([data-store="alla"])').forEach(el => el.remove());

  Object.values(stores).forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'store-pill';
    btn.dataset.store = s.id;
    btn.textContent = s.shortName;
    btn.addEventListener('click', () => setActiveStore(s.id));
    storeFiltWrap.appendChild(btn);
  });
  const allPill = storeFiltWrap.querySelector('[data-store="alla"]');
  if (allPill) allPill.textContent = t('all_stores');
}

function buildCategoryTabs(products) {
  const cats = new Set(products.map(p => p.category));
  catTabsWrap.querySelectorAll('.cat-tab:not([data-category="alla"])').forEach(el => el.remove());

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className        = 'cat-tab';
    btn.dataset.category = cat;
    btn.innerHTML        = `${emoji(cat)} ${tCat(cat)}`;
    if (cat === activeCategory) btn.classList.add('active');
    btn.addEventListener('click', () => setActiveCategory(cat));
    catTabsWrap.appendChild(btn);
  });
}

function buildSubcategoryChips(category) {
  const old = document.getElementById('subcategory-chips');
  if (old) old.remove();

  if (!category || category === 'alla') return;
  const subs = SUBCATEGORIES[category];
  if (!subs || !subs.length) return;

  const wrap = document.createElement('div');
  wrap.id        = 'subcategory-chips';
  wrap.className = 'subcat-chips';

  const allChip = document.createElement('button');
  allChip.className        = `subcat-chip${!activeSubcategory ? ' active' : ''}`;
  allChip.dataset.subcat   = '';
  allChip.textContent      = t('all_sub');
  allChip.addEventListener('click', () => setSubcategory(null));
  wrap.appendChild(allChip);

  subs.forEach(sub => {
    const chip = document.createElement('button');
    chip.className        = `subcat-chip${activeSubcategory === sub.id ? ' active' : ''}`;
    chip.dataset.subcat   = sub.id;
    chip.textContent      = currentLang === 'no' ? sub.no : sub.sv;
    chip.addEventListener('click', () => setSubcategory(sub.id));
    wrap.appendChild(chip);
  });

  catTabsWrap.insertAdjacentElement('afterend', wrap);
}

// ── Rendering ─────────────────────────────────────────────────────────────

function renderGrid() {
  grid.querySelectorAll('.skeleton').forEach(el => el.remove());
  const sorted = sortProducts(allProducts);
  buildCategoryTabs(sorted);
  buildSubcategoryChips(activeCategory);

  if (!sorted.length) {
    emptyMsg.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }
  emptyMsg.classList.add('hidden');
  grid.innerHTML = sorted.map(p => cardHTML(p)).join('');
  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

function cardHTML(p) {
  const [bg, accent] = CATEGORY_COLORS[p.category] || ['#f5f5f5','#888'];
  const em           = emoji(p);
  const sc           = storeColor(p.bestStore);
  const sn           = storeShort(p.bestStore);
  const savingsHTML  = p.savings > 0
    ? `<span class="card-savings">${t('save')} ${formatPrice(p.savings)}</span>` : '';

  return `
  <article class="card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
    <div class="card-img-placeholder" style="background:${bg}; color:${accent}">${em}</div>
    <div class="card-body">
      <span class="card-store-badge"
            style="background:${sc}1a; color:${sc}; border:1.5px solid ${sc}33">
        <svg width="7" height="7" viewBox="0 0 7 7" fill="${sc}"><circle cx="3.5" cy="3.5" r="3.5"/></svg>
        ${sn}
      </span>
      ${p.brand ? `<p class="card-brand">${p.brand}</p>` : ''}
      <p class="card-name">${p.name}</p>
      <p class="card-subtitle">${p.subtitle || ''}</p>
      <div class="card-price-row">
        <span class="card-price">${formatPrice(p.bestPrice)}<span> / ${p.unit}</span></span>
        ${savingsHTML}
      </div>
      <button class="card-compare-btn">${t('compare_btn')}</button>
    </div>
  </article>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────

function openModal(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  const priceValues = Object.values(p.prices).map(v => v.price);
  const maxPrice    = Math.max(...priceValues);

  const rowsHTML = Object.entries(p.prices)
    .sort((a,b) => a[1].price - b[1].price)
    .map(([sid, info]) => {
      const color    = storeColor(sid);
      const name     = stores[sid]?.name || sid;
      const pct      = Math.round((info.price / maxPrice) * 100);
      const isBest   = sid === p.bestStore;
      const url      = stores[sid]?.url || '#';

      return `
      <a class="price-row${isBest ? ' best' : ''}"
         href="${url}" target="_blank" rel="noopener"
         style="text-decoration:none; color:inherit;">
        <div class="price-row-left">
          <div class="price-row-store">
            <span class="store-dot" style="background:${color}"></span>${name}
          </div>
          <div class="price-bar-track">
            <div class="price-bar-fill" style="width:${pct}%; background:${color}"></div>
          </div>
        </div>
        <div class="price-row-right">
          <div class="price-row-amount" style="color:${color}">${formatPrice(info.price)}</div>
          ${isBest       ? `<div class="best-badge">${t('best_price')}</div>` : ''}
          ${info.inOffer ? `<div class="price-row-offer">${t('offer')}</div>` : ''}
          ${info.ordPrice ? `<div class="price-row-ord">${t('ord_price')} ${formatPrice(info.ordPrice)}</div>` : ''}
        </div>
      </a>`;
    }).join('');

  const cnt  = Object.keys(p.prices).length;
  const word = cnt === 1 ? t('store_sg') : t('store_pl');
  const best = stores[p.bestStore]?.name || p.bestStore;

  const subLabel = p.subcategory ? ` · ${tSub(p.category, p.subcategory)}` : '';

  modalContent.innerHTML = `
    <div class="modal-product-header">
      <span class="modal-emoji">${emoji(p)}</span>
      ${p.brand ? `<p class="modal-brand">${p.brand}</p>` : ''}
      <h2 class="modal-name">${p.name}</h2>
      <p class="modal-subtitle">${p.subtitle || ''}${subLabel} · ${cnt} ${word}</p>
    </div>
    <p class="modal-section-title">${t('modal_section')}</p>
    <div class="price-rows">${rowsHTML}</div>
    <a class="modal-store-link" href="${stores[p.bestStore]?.url || '#'}"
       target="_blank" rel="noopener">
      ${t('modal_buy')} ${best} →
    </a>`;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    modalContent.querySelectorAll('.price-bar-fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0';
      requestAnimationFrame(() => { bar.style.width = w; });
    });
  });
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── State setters ──────────────────────────────────────────────────────────

function setActiveStore(id) {
  activeStore = id;
  storeFiltWrap.querySelectorAll('.store-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.store === id);
  });
  loadProducts();
}

function setActiveCategory(cat) {
  activeCategory    = cat;
  activeSubcategory = null;
  catTabsWrap.querySelectorAll('.cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });
  loadProducts();
}

function setSubcategory(subcat) {
  activeSubcategory = subcat;
  document.querySelectorAll('.subcat-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.subcat === (subcat || ''));
  });
  loadProducts();
}

// ── Events ─────────────────────────────────────────────────────────────────

catTabsWrap.querySelector('[data-category="alla"]')
  .addEventListener('click', () => setActiveCategory('alla'));

storeFiltWrap.querySelector('[data-store="alla"]')
  .addEventListener('click', () => setActiveStore('alla'));

let searchTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    loadProducts();
  }, 280);
});

sortSelect.addEventListener('change', e => {
  sortMode = e.target.value;
  allProducts = sortProducts(allProducts);
  renderGrid();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
    e.preventDefault();
    openModal(e.target.dataset.id);
  }
});

// App page lang buttons
appPage.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

// Change city button
if (changeCityBtn) {
  changeCityBtn.addEventListener('click', () => {
    showWelcome();
  });
}

// App footer copy button
const copyBtn = document.getElementById('copy-addr-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('THHNLDw1tmhbRBeu8dzwmFwsiHZyDC56RA').then(() => {
      copyBtn.dataset.state = 'copied';
      copyBtn.textContent   = t('copied');
      setTimeout(() => {
        copyBtn.dataset.state = '';
        copyBtn.textContent   = t('copy');
      }, 2000);
    });
  });
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

(async () => {
  const savedCity = localStorage.getItem('selectedCity');
  if (savedCity && CITIES[savedCity]) {
    // Restore city directly
    currentCity = savedCity;
    const cityName = currentLang === 'no' ? CITIES[savedCity].no : CITIES[savedCity].sv;
    if (appCityName) appCityName.textContent = `${t('site_subtitle')} ${cityName}`;
    showApp();
    await loadStores();
    await loadProducts();
    updateStaticText();
  } else {
    // Show welcome page
    showWelcome();
  }
})();
