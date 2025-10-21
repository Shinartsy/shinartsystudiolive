/* app.js — category & item router/render (YAML version)
   Expects a YAML file like: art_catalog.yaml

   categories:
     - name: Comic
       pieces:
         - name: ICON
           img: img/comic/icon.JPG
           date_created: "2025-01-12"
           short_description: "..."
           long_description: "..."
*/

(() => {
  const DATA_URL = 'art_catalog.yaml'; // ← point to your YAML

  // ------- DOM targets (mount prefers #app; falls back to #work .grid) -------
  const appRoot =
    document.getElementById('app') ||
    document.querySelector('#work .grid') ||
    createFallbackRoot();

  function createFallbackRoot() {
    const main = document.createElement('main');
    main.id = 'app';
    document.body.appendChild(main);
    return main;
  }

  // ------- Landing sections (hero + work) toggle -------
  const heroSection = document.querySelector('header.hero');
  const workSection = document.getElementById('work');
  const aboutSection = document.getElementById('about');

  function setLandingVisible(isVisible) {
    const displayValue = isVisible ? '' : 'none';
    if (heroSection) heroSection.style.display = displayValue;
    if (workSection) workSection.style.display = displayValue;
    if (aboutSection) aboutSection.style.display = displayValue;
  }
  

  // ------- Utilities -------
  const slug = (s) =>
    String(s)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const parseDate = (s) => new Date(s || 0).getTime() || 0;
  const byMostRecent = (a, b) => parseDate(b.date_created) - parseDate(a.date_created);

  // Preload an image (returns a Promise)
  const preload = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // ------- Data cache -------
  let CATALOG = null;
  let CATEGORY_INDEX = new Map(); // name -> category

  async function loadCatalog() {
    if (CATALOG) return CATALOG;
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
    const text = await res.text();

    // Parse YAML -> JS object
    let data;
    try {
      // js-yaml is provided by the <script> tag you added in index.html
      data = jsyaml.load(text) || {};
    } catch (e) {
      console.error('YAML parse error:', e);
      throw new Error('Invalid YAML in art_catalog.yaml');
    }

    // Normalize & index
    (data.categories || []).forEach((cat) => {
      cat.pieces = (cat.pieces || []).slice().sort(byMostRecent);
      CATEGORY_INDEX.set(cat.name, cat);
    });

    CATALOG = data;
    return data;
  }

  // ------- Render helpers -------
  function clearNode(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function ensureSectionShell(titleText) {
    // If mounting into #app, create a consistent shell with a .container and .grid
    if (appRoot.id === 'app') {
      clearNode(appRoot);
      const section = document.createElement('section');
      section.className = 'features container';
      const header = document.createElement('h2');
      header.textContent = titleText || '';
      header.style.margin = '0 0 16px 0';
      const grid = document.createElement('div');
      grid.className = 'grid';
      section.appendChild(header);
      section.appendChild(grid);
      appRoot.appendChild(section);
      return grid;
    }

    // Else we’re in #work .grid — reset its parent section title if present.
    const grid = appRoot;
    const section = grid.closest('.features.container') || grid.closest('.container') || document.body;
    // Add/replace a heading just above grid
    let header = section.querySelector(':scope > h2');
    if (!header) {
      header = document.createElement('h2');
      section.insertBefore(header, grid);
    }
    header.textContent = titleText || '';
    clearNode(grid);
    return grid;
  }

  function makeCard({ title, subtitle, bg, onClick }) {
    const card = document.createElement('article');
    card.className = 'card';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.style.cursor = 'pointer';
    card.style.minHeight = '220px';
    card.style.display = 'grid';
    card.style.alignContent = 'end';
    card.style.background = '#fff';

    // Background image layer
    const bgLayer = document.createElement('div');
    bgLayer.style.position = 'absolute';
    bgLayer.style.inset = '0';
    bgLayer.style.background = bg ? `url("${bg}") center/cover no-repeat` : 'transparent';
    bgLayer.style.filter = 'saturate(0.92) contrast(0.98)';
    bgLayer.style.transition = 'transform .2s ease';
    bgLayer.setAttribute('aria-hidden', 'true');

    // Gradient overlay for readability
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 100%)';
    overlay.setAttribute('aria-hidden', 'true');

    const textWrap = document.createElement('div');
    textWrap.style.position = 'relative';
    textWrap.style.zIndex = '1';
    textWrap.style.color = '#fff';
    textWrap.style.padding = '18px';

    const h3 = document.createElement('h3');
    h3.textContent = title;
    h3.style.margin = '0 0 4px 0';

    const p = document.createElement('p');
    p.textContent = subtitle || '';
    p.style.margin = '0';
    p.style.opacity = '0.9';

    textWrap.appendChild(h3);
    if (subtitle) textWrap.appendChild(p);

    card.appendChild(bgLayer);
    card.appendChild(overlay);
    card.appendChild(textWrap);

    card.addEventListener('mouseenter', () => (bgLayer.style.transform = 'scale(1.03)'));
    card.addEventListener('mouseleave', () => (bgLayer.style.transform = 'scale(1.0)'));
    if (onClick) card.addEventListener('click', onClick);

    return card;
  }

  function makeBackBar(label, href) {
    const bar = document.createElement('div');
    bar.className = 'container';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.gap = '8px';
    bar.style.margin = '8px auto 16px auto';

    const a = document.createElement('a');
    a.href = href;
    a.textContent = `← ${label}`;
    a.className = 'btn ghost';
    a.style.display = 'inline-flex';
    a.style.alignItems = 'center';
    a.style.padding = '8px 12px';
    a.style.borderRadius = '10px';
    a.style.border = '2px solid rgba(0,0,0,.12)';

    bar.appendChild(a);
    return bar;
  }

  // ------- Views -------
  async function renderCategories() {
    setLandingVisible(false);
    const { categories = [] } = await loadCatalog();
    const grid = ensureSectionShell('Explore Categories');

    for (const cat of categories) {
      // pick most recent piece for background
      const mostRecent = (cat.pieces || []).slice().sort(byMostRecent)[0];
      const bg = mostRecent?.img || '';
      const subtitle = mostRecent ? `Latest: ${mostRecent.name}` : 'No items yet';
      const card = makeCard({
        title: cat.name,
        subtitle,
        bg,
        onClick: () => navigateToCategory(cat.name),
      });

      if (bg) preload(bg);
      grid.appendChild(card);
    }
  }

  async function renderCategory(name) {
    const category = CATEGORY_INDEX.get(name);
    if (!category) {
      renderNotFound(`Category "${name}" not found.`);
      return;
    }
    const grid = ensureSectionShell(name);

    if (appRoot.id === 'app') {
      const back = makeBackBar('All Categories', '#/');
      appRoot.insertBefore(back, appRoot.firstChild);
    }

    for (const piece of category.pieces) {
      const sub = piece.short_description || piece.long_description || '';
      const card = makeCard({
        title: piece.name,
        subtitle:
          new Date(piece.date_created).toLocaleDateString() + (sub ? ` — ${sub}` : ''),
        bg: piece.img,
        onClick: () => navigateToItem(name, piece.name),
      });
      preload(piece.img);
      grid.appendChild(card);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function renderItem(categoryName, pieceName) {
    const category = CATEGORY_INDEX.get(categoryName);
    if (!category) return renderNotFound(`Category "${categoryName}" not found.`);
    const piece = (category.pieces || []).find((p) => p.name === pieceName);
    if (!piece) return renderNotFound(`Item "${pieceName}" not found in "${categoryName}".`);

    if (appRoot.id === 'app') {
      clearNode(appRoot);

      const back = makeBackBar(
        `Back to ${categoryName}`,
        `#/category/${encodeURIComponent(categoryName)}`
      );
      appRoot.appendChild(back);

      const section = document.createElement('section');
      section.className = 'container';
      section.style.display = 'grid';
      section.style.gap = '18px';

      const header = document.createElement('div');
      header.className = 'card';
      header.style.padding = 'var(--space-card, 24px)';

      const h1 = document.createElement('h1');
      h1.textContent = piece.name;
      h1.style.margin = '0 0 8px 0';

      const meta = document.createElement('div');
      meta.textContent = new Date(piece.date_created).toLocaleDateString();
      meta.style.opacity = '0.8';
      meta.style.marginBottom = '8px';

      const desc = document.createElement('p');
      desc.className = 'muted';
      desc.textContent = piece.long_description || piece.short_description || '';

      header.appendChild(h1);
      header.appendChild(meta);
      header.appendChild(desc);

      const figure = document.createElement('figure');
      figure.className = 'card';
      figure.style.padding = '0';
      figure.style.overflow = 'hidden';

      const img = document.createElement('img');
      img.alt = piece.name;
      img.loading = 'lazy';
      img.src = piece.img;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';

      figure.appendChild(img);

      section.appendChild(header);
      section.appendChild(figure);
      appRoot.appendChild(section);
    } else {
      // Fallback: reuse the #work section area
      const grid = ensureSectionShell(piece.name);
      const back = makeBackBar(
        `Back to ${categoryName}`,
        `#/category/${encodeURIComponent(categoryName)}`
      );
      grid.parentElement.insertBefore(back, grid);

      const figure = document.createElement('article');
      figure.className = 'card';
      figure.style.gridColumn = '1 / -1';
      figure.style.padding = '0';
      figure.style.overflow = 'hidden';

      const img = document.createElement('img');
      img.alt = piece.name;
      img.loading = 'lazy';
      img.src = piece.img;

      figure.appendChild(img);
      grid.appendChild(figure);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderNotFound(msg) {
    const grid = ensureSectionShell('Not Found');
    const card = document.createElement('article');
    card.className = 'card';
    card.textContent = msg || 'The page you requested could not be found.';
    grid.appendChild(card);
  }

  // ------- Router -------
  function parseRoute() {
    const hash = location.hash.replace(/^#/, '');
    // Routes:
    // "" or "/"                -> categories
    // "/category/:name"
    // "/item/:category/:piece"
    const segments = hash.split('/').filter(Boolean);
    if (segments.length === 0) return { view: 'root' };
    if (segments[0] === 'category' && segments[1]) {
      return { view: 'category', category: decodeURIComponent(segments[1]) };
    }
    if (segments[0] === 'item' && segments[1] && segments[2]) {
      return {
        view: 'item',
        category: decodeURIComponent(segments[1]),
        piece: decodeURIComponent(segments[2]),
      };
    }
    return { view: 'not-found' };
  }

  async function onRouteChange() {
    await loadCatalog();
    const route = parseRoute();
    switch (route.view) {
      case 'root':
        setLandingVisible(true);     // show HERO + WORK + ABOUT
        return renderCategories();
      case 'category':
        setLandingVisible(false);
        return renderCategory(route.category);
      case 'item':
        setLandingVisible(false);
        return renderItem(route.category, route.piece);
      default:
        setLandingVisible(false);
        return renderNotFound();
    }
  }
  


  // Navigation helpers
  function navigateToCategory(name) {
    location.hash = `#/category/${encodeURIComponent(name)}`;
  }
  function navigateToItem(category, piece) {
    location.hash = `#/item/${encodeURIComponent(category)}/${encodeURIComponent(piece)}`;
  }

  // Boot
  window.addEventListener('hashchange', onRouteChange);
  document.addEventListener('DOMContentLoaded', onRouteChange);
})();
