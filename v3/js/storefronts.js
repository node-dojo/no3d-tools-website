export const storefronts = [
  {
    id: 'tools', name: 'NO3D Tools', suffix: 'Tools', href: '/v3/',
    wordmark: '/assets/light/no3d-tools.png',
    subheading: 'Node based tools, addons and assets enhancing your workflows exclusively in Blender 3D!',
  },
  {
    id: 'prints', name: 'NO3D Prints', suffix: 'Prints', href: '/v3/prints/',
    wordmark: '/assets/light/no3d-prints.png',
    subheading: '3d printable downloads and build plans for next level projects',
  },
];

export function initStorefrontSelector(root = document) {
  const mark = root.querySelector('.v3-wordmark');
  if (!mark || mark.closest('.storefront-brand')) return;
  const current = storefronts.find(item => item.id === document.body.dataset.storefront) || storefronts[0];
  const wrapper = document.createElement('div');
  wrapper.className = 'storefront-brand';
  mark.replaceWith(wrapper);
  wrapper.append(mark);
  mark.href = current.href;
  mark.setAttribute('aria-label', `${current.name} home`);
  const logo = mark.querySelector('img');
  logo.src = current.wordmark;
  logo.alt = current.name;
  const toggle = document.createElement('button');
  toggle.className = 'storefront-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', `Choose storefront, currently ${current.name}`);
  toggle.setAttribute('aria-controls', 'storefront-destinations');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>';
  const panel = document.createElement('nav');
  panel.id = 'storefront-destinations';
  panel.className = 'storefront-destinations';
  panel.setAttribute('aria-label', 'NO3D storefronts');
  panel.hidden = true;
  for (const item of storefronts) {
    const link = document.createElement('a');
    link.href = item.href;
    if (item.id === current.id) link.setAttribute('aria-current', 'page');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const description = document.createElement('span');
    description.textContent = item.subheading;
    link.append(name, description);
    panel.append(link);
  }
  wrapper.append(toggle, panel);
  const close = (returnFocus = false) => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('is-open');
    if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    if (!panel.hidden) return close();
    panel.hidden = false;
    wrapper.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  });
  wrapper.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(true); }
  });
  document.addEventListener('pointerdown', event => { if (!wrapper.contains(event.target)) close(); });
  wrapper.addEventListener('focusout', event => { if (event.relatedTarget && !wrapper.contains(event.relatedTarget)) close(); });
}

initStorefrontSelector();
