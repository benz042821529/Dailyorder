// ============================================================
//  STOCK — Firebase config (ใช้ project เดิม คนละ collection)
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAxYXGFAdnMeD67tfFeIHlFjmQt2Yn-oVM",
  authDomain: "daily-order-cd95a.firebaseapp.com",
  projectId: "daily-order-cd95a",
  storageBucket: "daily-order-cd95a.firebasestorage.app",
  messagingSenderId: "695242806338",
  appId: "1:695242806338:web:af8f60ec0970e1d8bc49db"
};

(function loadFirebase() {
  const s1 = document.createElement('script');
  s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
  s1.onload = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s2.onload = _firebaseReady;
    s2.onerror = () => _firebaseResolve(false);
    document.head.appendChild(s2);
  };
  s1.onerror = () => _firebaseResolve(false);
  document.head.appendChild(s1);
})();

let _db = null;
let _firebaseResolve;
const _firebaseReady_p = new Promise(r => _firebaseResolve = r);

function _firebaseReady() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
    _firebaseResolve(true);
  } catch(e) {
    _firebaseResolve(false);
  }
}

// ============================================================
//  STOCK DB — collection "stock" แยกจาก Dailyorder
// ============================================================
const STOCK = (() => {
  let _cats  = null;
  let _items = null;
  let _sales = null;

  async function _get(key) {
    if (!_db) return null;
    try {
      const snap = await _db.collection('stock').doc(key).get();
      return snap.exists ? snap.data().value : null;
    } catch(e) { return null; }
  }

  async function _set(key, value) {
    if (!_db) return;
    try {
      await _db.collection('stock').doc(key).set({ value });
    } catch(e) { console.warn('_set error', key, e); }
  }

  async function prefetch() {
    await _firebaseReady_p;
    const [c, i, s] = await Promise.all([
      _get('categories'), _get('items'), _get('sales')
    ]);
    _cats  = c || [];
    _items = i || [];
    _sales = s || [];
  }

  return {
    ready:       () => prefetch(),
    getCats:     () => _cats  || [],
    getItems:    () => _items || [],
    getSales:    () => _sales || [],

    setCats:  v => { _cats  = v; _set('categories', v); },
    setItems: v => { _items = v; _set('items', v); },
    setSales: v => { _sales = v; _set('sales', v); },

    addSale: sale => {
      if (!_sales) _sales = [];
      _sales.unshift(sale);
      if (_sales.length > 500) _sales.splice(500);
      _set('sales', _sales);
    },

    adjustStock: (id, delta) => {
      _items = (_items || []).map(it =>
        it.id === id ? { ...it, stock: Math.max(0, (it.stock || 0) + delta) } : it
      );
      _set('items', _items);
    },

    setStock: (id, val) => {
      _items = (_items || []).map(it =>
        it.id === id ? { ...it, stock: Math.max(0, val) } : it
      );
      _set('items', _items);
    },
  };
})();

// ============================================================
//  UTILS
// ============================================================
function fmt(n) {
  return '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function todayStr() {
  return new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
function fallbackCopy(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => _execCopy(text));
  } else { _execCopy(text); }
  toast('คัดลอกแล้ว');
}
function _execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}
function openModal(title, bodyHtml, btnsHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-btns').innerHTML = btnsHtml;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal')?.classList.remove('open'); }
function closeModalOutside(e) { if (e.target === document.getElementById('modal')) closeModal(); }

// ============================================================
//  BOOT — รอ Firebase พร้อม แล้วซ่อน loader เรียก init ครั้งเดียว
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    const el = document.getElementById('fb-loader');
    if (el) el.classList.add('hide');
    if (typeof init === 'function') init();
  };

  // timeout สำรอง 6 วิ
  const timer = setTimeout(finish, 6000);

  try {
    await STOCK.ready();
  } catch(e) {
    console.warn('STOCK.ready error', e);
  }

  clearTimeout(timer);
  finish();
});
