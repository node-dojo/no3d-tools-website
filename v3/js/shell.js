const catalogButton = document.querySelector('[data-catalog-toggle]');
const catalogPanel = document.querySelector('[data-catalog-panel]');

export function initShell() {
  if (catalogButton && catalogPanel) {
    const setOpen = open => {
      catalogPanel.classList.toggle('is-open', open);
      catalogButton.setAttribute('aria-expanded', String(open));
      catalogButton.querySelector('[data-catalog-glyph]').textContent = open ? '×' : '☰';
      document.documentElement.classList.toggle('catalog-open', open);
    };
    setOpen(false);
    catalogButton.addEventListener('click', () => setOpen(catalogButton.getAttribute('aria-expanded') !== 'true'));
  }

  const searchButton = document.querySelector('[data-search-toggle]');
  const searchRegion = document.querySelector('[data-search-region]');
  if (searchButton && searchRegion) {
    searchButton.addEventListener('click', () => {
      const opening = searchRegion.hidden;
      searchRegion.hidden = !opening;
      searchButton.setAttribute('aria-expanded', String(opening));
      document.querySelector('.mobile-home')?.classList.toggle('is-searching', opening);
      if (opening) searchRegion.querySelector('input')?.focus();
    });
  }
}

export function renderCatalogNavigation(products, onSelect) {
  if (!catalogPanel) return;
  const list = catalogPanel.querySelector('[data-catalog-list]');
  if (!list) return;
  const groups = new Map();
  for (const product of products) {
    const key = product.tags[0] || product.productType || 'All NO3D Tools';
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  list.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button';
  all.innerHTML = `<span>All NO3D Tools</span><span>${String(products.length).padStart(2, '0')}</span>`;
  all.addEventListener('click', () => onSelect?.('all'));
  list.append(all);
  for (const [name, count] of groups) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${name}</span><span>${String(count).padStart(2, '0')}</span>`;
    button.addEventListener('click', () => onSelect?.(name));
    list.append(button);
  }
}

export function setDataStatus(source) {
  const status = document.querySelector('[data-data-status]');
  if (!status) return;
  status.textContent = source === 'live' ? 'Live catalog' : 'Sample catalog / API unavailable';
  status.dataset.source = source;
}

initShell();
