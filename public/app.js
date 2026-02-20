'use strict';

// ── Config ─────────────────────────────────────────────────────────────────

const CATEGORY_META = {
  alla:       { label: 'Alla',            emoji: '🛒' },
  mejeri:     { label: 'Mejeri',          emoji: '🥛' },
  brod:       { label: 'Bröd & bageri',   emoji: '🍞' },
  kott:       { label: 'Kött & fisk',     emoji: '🥩' },
  frukt:      { label: 'Frukt & grönt',   emoji: '🍎' },
  torrvaror:  { label: 'Torrvaror',       emoji: '🌾' },
  dryck:      { label: 'Dryck',           emoji: '☕' },
  snacks:     { label: 'Snacks & godis',  emoji: '🍫' },
  frys:       { label: 'Fryst',           emoji: '❄️' },
  hygien:     { label: 'Hygien',          emoji: '🧴' },
  stad:       { label: 'Städ & hushåll',  emoji: '🧹' }
};

const CATEGORY_COLORS = {
  mejeri:    ['#ECF8FF', '#60a5fa'],
  brod:      ['#FFF8EC', '#f59e0b'],
  kott:      ['#FFECEC', '#f87171'],
  frukt:     ['#ECFFEC', '#4ade80'],
  torrvaror: ['#F5ECFF', '#a78bfa'],
  dryck:     ['#FFF3EC', '#fb923c'],
  snacks:    ['#FFECF5', '#f472b6'],
  frys:      ['#ECFFFF', '#22d3ee'],
  hygien:    ['#ECFFF5', '#34d399'],
  stad:      ['#F5F5FF', '#818cf8']
};

// ── State ──────────────────────────────────────────────────────────────────

let allProducts = [];
let stores      = {};
let activeStore    = 'alla';
let activeCategory = 'alla';
let searchQuery    = '';
let sortMode       = 'savings';

// ── DOM refs ───────────────────────────────────────────────────────────────

const grid         = document.getElementById('product-grid');
const emptyMsg     = document.getElementById('empty-msg');
const storeFiltWrap= document.getElementById('store-filters');
const catTabsWrap  = document.getElementById('category-tabs');
const searchInput  = document.getElementById('search-input');
const sortSelect   = document.getElementById('sort-select');
const lastUpdated  = document.getElementById('last-updated');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose   = document.getElementById('modal-close');
const modalContent = document.getElementById('modal-content');

// ── Utilities ──────────────────────────────────────────────────────────────

function formatPrice(p) {
  return p.toFixed(2).replace('.', ':') + ' kr';
}

function getStoreColor(storeId) {
  return stores[storeId]?.color || '#888';
}

function getStoreShort(storeId) {
  return stores[storeId]?.shortName || storeId;
}

function getCatEmoji(cat) {
  return (CATEGORY_META[cat] || CATEGORY_META.alla).emoji;
}

function getCatLabel(cat) {
  return (CATEGORY_META[cat] || { label: cat }).label;
}

// ── Data loading ───────────────────────────────────────────────────────────

async function loadStores() {
  const res = await fetch('/api/stores');
  stores = await res.json();
  buildStoreFilters();
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (activeCategory !== 'alla') params.set('category', activeCategory);
  if (searchQuery)               params.set('q', searchQuery);
  if (activeStore !== 'alla')    params.set('store', activeStore);

  const res  = await fetch(`/api/products?${params}`);
  const data = await res.json();

  allProducts = sortProducts(data.products);
  renderGrid();

  if (data.lastUpdated) {
    const d = new Date(data.lastUpdated);
    lastUpdated.textContent = `Uppdaterad ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function sortProducts(list) {
  const copy = [...list];
  switch (sortMode) {
    case 'price_asc':  return copy.sort((a,b) => a.bestPrice - b.bestPrice);
    case 'price_desc': return copy.sort((a,b) => b.bestPrice - a.bestPrice);
    case 'name':       return copy.sort((a,b) => a.name.localeCompare(b.name, 'sv'));
    default:           return copy.sort((a,b) => b.savings - a.savings);
  }
}

// ── Build navigation ───────────────────────────────────────────────────────

function buildStoreFilters() {
  Object.values(stores).forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'store-pill';
    btn.dataset.store = s.id;
    btn.textContent = s.shortName;
    btn.addEventListener('click', () => setActiveStore(s.id));
    storeFiltWrap.appendChild(btn);
  });
}

function buildCategoryTabs(products) {
  // Collect categories present in current dataset
  const cats = new Set(products.map(p => p.category));
  // Remove old dynamic tabs
  catTabsWrap.querySelectorAll('.cat-tab:not([data-category="alla"])').forEach(el => el.remove());

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab';
    btn.dataset.category = cat;
    btn.innerHTML = `${getCatEmoji(cat)} ${getCatLabel(cat)}`;
    if (cat === activeCategory) btn.classList.add('active');
    btn.addEventListener('click', () => setActiveCategory(cat));
    catTabsWrap.appendChild(btn);
  });
}

// ── Rendering ─────────────────────────────────────────────────────────────

function renderGrid() {
  // Remove skeletons
  grid.querySelectorAll('.skeleton').forEach(el => el.remove());

  const sorted = sortProducts(allProducts);
  buildCategoryTabs(sorted);

  if (!sorted.length) {
    emptyMsg.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }
  emptyMsg.classList.add('hidden');

  grid.innerHTML = sorted.map(p => cardHTML(p)).join('');

  // Attach click listeners
  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

function cardHTML(p) {
  const [bg, accent] = CATEGORY_COLORS[p.category] || ['#f5f5f5', '#888'];
  const emoji        = getCatEmoji(p.category);
  const storeColor   = getStoreColor(p.bestStore);
  const storeName    = getStoreShort(p.bestStore);
  const savingsHTML  = p.savings > 0
    ? `<span class="card-savings">Spara ${formatPrice(p.savings)}</span>`
    : '';

  return `
  <article class="card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
    <div class="card-img-placeholder" style="background:${bg}; color:${accent}">
      ${emoji}
    </div>
    <div class="card-body">
      <span class="card-store-badge"
            style="background:${storeColor}1a; color:${storeColor}; border:1.5px solid ${storeColor}33">
        <svg width="7" height="7" viewBox="0 0 7 7" fill="${storeColor}">
          <circle cx="3.5" cy="3.5" r="3.5"/>
        </svg>
        ${storeName}
      </span>
      <p class="card-name">${p.name}</p>
      <p class="card-subtitle">${p.subtitle || ''}</p>
      <div class="card-price-row">
        <span class="card-price">${formatPrice(p.bestPrice)}<span> / ${p.unit}</span></span>
        ${savingsHTML}
      </div>
      <button class="card-compare-btn">Jämför priser →</button>
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
    .sort((a, b) => a[1].price - b[1].price)
    .map(([storeId, info], i) => {
      const color     = getStoreColor(storeId);
      const name      = stores[storeId]?.name || storeId;
      const pct       = Math.round((info.price / maxPrice) * 100);
      const isBest    = storeId === p.bestStore;
      const storeUrl  = stores[storeId]?.url || '#';

      return `
      <a class="price-row${isBest ? ' best' : ''}" href="${storeUrl}" target="_blank" rel="noopener"
         style="text-decoration:none; color:inherit;">
        <div class="price-row-left">
          <div class="price-row-store">
            <span class="store-dot" style="background:${color}"></span>
            ${name}
          </div>
          <div class="price-bar-track">
            <div class="price-bar-fill" style="width:${pct}%; background:${color}"></div>
          </div>
        </div>
        <div class="price-row-right">
          <div class="price-row-amount" style="color:${color}">${formatPrice(info.price)}</div>
          ${isBest    ? '<div class="best-badge">🏆 Bäst pris</div>'      : ''}
          ${info.inOffer ? '<div class="price-row-offer">Erbjudande</div>' : ''}
        </div>
      </a>`;
    }).join('');

  const storeCount   = Object.keys(p.prices).length;
  const bestStoreFull = stores[p.bestStore]?.name || p.bestStore;

  modalContent.innerHTML = `
    <div class="modal-product-header">
      <span class="modal-emoji">${getCatEmoji(p.category)}</span>
      <h2 class="modal-name">${p.name}</h2>
      <p class="modal-subtitle">${p.subtitle || ''} · ${storeCount} ${storeCount === 1 ? 'butik' : 'butiker'}</p>
    </div>
    <p class="modal-section-title">Prisjämförelse</p>
    <div class="price-rows">${rowsHTML}</div>
    <a class="modal-store-link"
       href="${stores[p.bestStore]?.url || '#'}"
       target="_blank" rel="noopener">
      Köp billigast hos ${bestStoreFull} →
    </a>`;

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Animate bars
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

function setActiveStore(storeId) {
  activeStore = storeId;
  storeFiltWrap.querySelectorAll('.store-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.store === storeId);
  });
  loadProducts();
}

function setActiveCategory(cat) {
  activeCategory = cat;
  catTabsWrap.querySelectorAll('.cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });
  loadProducts();
}

// ── Event listeners ────────────────────────────────────────────────────────

// "Alla" category tab (already in HTML)
catTabsWrap.querySelector('[data-category="alla"]')
  .addEventListener('click', () => setActiveCategory('alla'));

// "Alla butiker" store pill (already in HTML)
storeFiltWrap.querySelector('[data-store="alla"]')
  .addEventListener('click', () => setActiveStore('alla'));

// Search – debounced
let searchTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    loadProducts();
  }, 280);
});

// Sort
sortSelect.addEventListener('change', e => {
  sortMode = e.target.value;
  allProducts = sortProducts(allProducts);
  renderGrid();
});

// Modal close
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Keyboard accessibility for cards
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
    e.preventDefault();
    openModal(e.target.dataset.id);
  }
});

// ── Bootstrap ──────────────────────────────────────────────────────────────

(async () => {
  await loadStores();
  await loadProducts();
})();
