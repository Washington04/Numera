/* Local persistence. One JSON blob in localStorage, with an in-memory
   fallback when storage is blocked. Swap this file for Capacitor
   Preferences or SQLite when packaging for the app stores. */
(function (root) {
  const MP = (root.MP = root.MP || {});
  const KEY = 'numera.v1';
  const OLD_KEYS = ['mathpath.v1']; // data saved before the rename to Numera
  let memory = null;

  function load() {
    try {
      let raw = root.localStorage && root.localStorage.getItem(KEY);
      if (!raw && root.localStorage) {
        for (const k of OLD_KEYS) { raw = root.localStorage.getItem(k); if (raw) { root.localStorage.setItem(KEY, raw); break; } }
      }
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked or corrupt: fall through */ }
    return memory || { v: 1, profiles: [], activeId: null, seededDemo: false };
  }

  function save(data) {
    memory = data;
    try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  MP.Store = { load, save, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
