/**
 * Shared bottom nav for legacy pages using css/style.css.
 * Keeps links and active state consistent across sub-pages.
 */
(function () {
  const nav = document.querySelector('.bottom-nav');
  if (!nav) return;

  // Skip homepage v2 nav (it has custom inner wrapper and icon assets).
  if (nav.querySelector('.bottom-nav-inner')) return;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const depth = Math.max(parts.length - 1, 1);
  const prefix = '../'.repeat(depth);

  const path = window.location.pathname;
  const isGames = /\/(math|wordsearch|fiveminutes)\//.test(path);
  const isMap = /\/routes\//.test(path);
  const isCollection = /\/collection\//.test(path);
  const isStore = /\/store\//.test(path);
  const isHome = !isGames && !isMap && !isCollection && !isStore;

  nav.innerHTML = `
    <a href="${prefix}index.html" class="${isHome ? 'active' : ''}">
      <div class="nav-icon">🏠</div>
      <div>Home</div>
    </a>
    <a href="${prefix}math/index.html" class="${isGames ? 'active' : ''}">
      <div class="nav-icon">⚔️</div>
      <div>Games</div>
    </a>
    <a href="${prefix}routes/index.html" class="${isMap ? 'active' : ''}">
      <div class="nav-icon">🗺️</div>
      <div>Peta</div>
    </a>
    <a href="${prefix}collection/index.html" class="${isCollection ? 'active' : ''}">
      <div class="nav-icon">📦</div>
      <div>Koleksi</div>
    </a>
    <a href="${prefix}store/index.html" class="${isStore ? 'active' : ''}">
      <div class="nav-icon">🏪</div>
      <div>Toko</div>
    </a>
  `;
})();
