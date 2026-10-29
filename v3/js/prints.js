import { printProducts } from '../data/prints/catalog.js?v=prints-20261028b';
import { createPrintProductView } from './print-product.js?v=prints-member-price-20261029';
import { getPrintOffer } from './api.js?v=prints-20261028b';
import { getPrintAccess, renderPrintPrice } from './print-price.js?v=prints-member-price-20261029';

const carousel = document.querySelector('[data-print-carousel]');
const slides = [...carousel.querySelectorAll('[data-product]')];
const productItems = [...document.querySelectorAll('[data-print-item]')];
for (const item of productItems) {
  const price = item.querySelector('.print-price');
  if (price) {
    renderPrintPrice(price, '');
    Promise.all([
      getPrintOffer(item.dataset.printItem),
      getPrintAccess(item.dataset.printItem).catch(() => null),
    ]).then(([offer, access]) => renderPrintPrice(price, offer?.formatted, access?.entitlement === 'member'));
  }
}
const previous = document.querySelector('[data-print-previous]');
const next = document.querySelector('[data-print-next]');
const search = document.querySelector('#print-search');
const searchRegion = document.querySelector('#prints-search');
const searchToggle = document.querySelector('[data-prints-search-toggle]');
const dialog = document.querySelector('[data-print-details]');
let visible = [...slides];
let active = 0;
let scrollTimer;
let wheelCooldown = 0;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const number = value => String(value).padStart(2, '0');

function updateActive(index, updateUrl = true) {
  active = Math.max(0, Math.min(index, visible.length - 1));
  const current = visible[active];
  slides.forEach(slide => { slide.inert = slide !== current; });
  previous.disabled = active === 0 || !visible.length;
  next.disabled = active >= visible.length - 1;
  document.querySelector('[data-print-position]').textContent = `${number(current ? active + 1 : 0)} / ${number(visible.length)}`;
  document.querySelector('[data-result-count]').textContent = number(visible.length);
  let restoreListFocus = false;
  for (const item of productItems) {
    const button = item.querySelector('[data-go-product]');
    const panel = item.querySelector('.print-item-details');
    const selected = item.dataset.printItem === current?.dataset.product;
    if (!selected && panel.contains(document.activeElement)) restoreListFocus = true;
    item.hidden = !visible.some(slide => slide.dataset.product === item.dataset.printItem);
    button.setAttribute('aria-current', String(selected));
    button.setAttribute('aria-expanded', String(selected));
    panel.hidden = !selected;
  }
  if (restoreListFocus) document.querySelector('[data-go-product][aria-current="true"]')?.focus();
  const product = printProducts.find(item => item.slug === current?.dataset.product);
  document.querySelector('[data-print-announcement]').textContent = product ? `${product.name}, ${active + 1} of ${visible.length}` : 'No prints match this search.';
  if (updateUrl && current) {
    const url = new URL(location.href);
    url.searchParams.set('product', current.dataset.product);
    history.replaceState(history.state, '', url);
  }
}

function goTo(index, smooth = true) {
  if (!visible.length) return;
  const target = Math.max(0, Math.min(index, visible.length - 1));
  updateActive(target);
  carousel.scrollTo({ left: visible[target].offsetLeft, behavior: smooth && !reducedMotion() ? 'smooth' : 'instant' });
}

previous.addEventListener('click', () => goTo(active - 1));
next.addEventListener('click', () => goTo(active + 1));
document.querySelectorAll('[data-go-product]').forEach(button => {
  button.addEventListener('click', () => goTo(visible.findIndex(slide => slide.dataset.product === button.dataset.goProduct)));
});
carousel.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    if (!visible.length) return;
    const index = visible.reduce((nearest, slide, i) => Math.abs(slide.offsetLeft - carousel.scrollLeft) < Math.abs(visible[nearest].offsetLeft - carousel.scrollLeft) ? i : nearest, 0);
    updateActive(index);
  }, 100);
}, { passive: true });
carousel.addEventListener('keydown', event => {
  if (event.target !== carousel) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault(); goTo(event.key === 'Home' ? 0 : visible.length - 1);
  }
});
carousel.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || !matchMedia('(hover:hover)').matches) return;
  if (Math.abs(event.deltaY) < 5) return;
  event.preventDefault();
  const now = performance.now();
  if (now < wheelCooldown) return;
  wheelCooldown = now + 650;
  goTo(active + (event.deltaY > 0 ? 1 : -1));
}, { passive: false });
new ResizeObserver(() => goTo(active, false)).observe(carousel);

function setSearchOpen(open) {
  searchRegion.hidden = !open;
  searchToggle.setAttribute('aria-expanded', String(open));
  (open ? search : searchToggle).focus();
}
searchToggle.addEventListener('click', () => setSearchOpen(searchRegion.hidden));
document.querySelector('[data-search-close]').addEventListener('click', () => setSearchOpen(false));
document.addEventListener('keydown', event => {
  if (!dialog.open && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(searchRegion.hidden); }
  if (event.key === 'Escape' && !searchRegion.hidden && !dialog.open) setSearchOpen(false);
});
search.addEventListener('input', () => {
  const term = search.value.trim().toLowerCase();
  visible = slides.filter(slide => {
    const product = printProducts.find(item => item.slug === slide.dataset.product);
    slide.hidden = !`${product.name} ${product.paragraphs.join(' ')} ${product.included.join(' ')}`.toLowerCase().includes(term);
    return !slide.hidden;
  });
  document.querySelector('[data-prints-empty]').hidden = Boolean(visible.length);
  updateActive(0);
  carousel.scrollTo({ left: 0, behavior: 'instant' });
});

const productView = createPrintProductView(dialog);
function restoreFromUrl() {
  const requested = new URL(location.href).searchParams.get('product');
  const index = visible.findIndex(slide => slide.dataset.product === requested);
  goTo(index < 0 ? 0 : index, false);
  productView.restoreFromUrl();
}
addEventListener('popstate', restoreFromUrl);
restoreFromUrl();
