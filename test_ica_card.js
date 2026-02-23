'use strict';
const puppeteer = require('puppeteer');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'sv-SE,sv;q=0.9' });
  await page.goto('https://www.ica.se/butiker/kvantum/stromstad/ica-kvantum-stromstad-1003740/erbjudanden/', { waitUntil: 'domcontentloaded', timeout: 20000 });

  const data = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.offer-card'));
    return cards.slice(0, 5).map(card => ({
      title: card.querySelector('.offer-card__title')?.textContent.trim(),
      priceAll: card.querySelector('[class*="price"]')?.textContent.trim(),
      fullText: card.textContent.replace(/\s+/g, ' ').trim().substring(0, 200),
      classNames: [...card.querySelectorAll('[class]')].map(el => el.getAttribute('class')).filter(Boolean).slice(0, 10)
    }));
  });

  data.forEach((d, i) => {
    console.log(`\n--- Card ${i} ---`);
    console.log('Title:', d.title);
    console.log('Price element text:', d.priceAll);
    console.log('Full text:', d.fullText);
    console.log('Classes:', d.classNames);
  });

  await browser.close();
})();
