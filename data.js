// ============================================================
//  CONFIG — วางค่าจาก Firebase Console ของคุณตรงนี้
// ============================================================
const FIREBASE_CONFIG = {
 apiKey: "AIzaSyAxYXGFAdnMeD67tfFeIHlFjmQt2Yn-oVM",
    authDomain: "daily-order-cd95a.firebaseapp.com",
    projectId: "daily-order-cd95a",
    storageBucket: "daily-order-cd95a.firebasestorage.app",
    messagingSenderId: "695242806338",
    appId: "1:695242806338:web:af8f60ec0970e1d8bc49db"
};

// ============================================================
//  โหลด Firebase SDK อัตโนมัติ (ไม่ต้องใช้ bundler)
// ============================================================
(function loadFirebase() {
  const s1 = document.createElement('script');
  s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
  s1.onload = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s2.onload = _firebaseReady;
    document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
})();

let _db = null;
let _dbResolve;
const _dbReady = new Promise(r => _dbResolve = r);

function _firebaseReady() {
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  _db = firebase.firestore();
  _db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  _dbResolve();
}

// ============================================================
//  DB — เหมือน API เดิม แต่เก็บข้อมูลใน Firestore
// ============================================================
const DB = (() => {

  const DEFAULT_SHOPS = [
    {id:1, name:'ตลาดสด',    color:'#e85d04'},
    {id:2, name:'ร้านค้าส่ง', color:'#2b9348'},
  ];
  const DEFAULT_PRODUCTS = [
    {id:1, name:'ข้าวสาร',   unit:'กก.',  shopId:2, price:0},
    {id:2, name:'น้ำมันพืช', unit:'ขวด',  shopId:2, price:0},
    {id:3, name:'ผักบุ้ง',   unit:'กำ',   shopId:1, price:0},
    {id:4, name:'ไข่ไก่',    unit:'ฟอง',  shopId:1, price:0},
  ];

  let _shops    = null;
  let _products = null;
  let _orders   = null;

  async function _get(key) {
    await _dbReady;
    const snap = await _db.collection('store').doc(key).get();
    return snap.exists ? snap.data().value : null;
  }

  async function _set(key, value) {
    await _dbReady;
    return _db.collection('store').doc(key).set({ value });
  }

  async function prefetch() {
    await _dbReady;
    const [s, p, o] = await Promise.all([
      _get('shops'), _get('products4'), _get('orders4')
    ]);
    _shops    = s || DEFAULT_SHOPS;
    _products = p || DEFAULT_PRODUCTS;
    _orders   = o || [];
  }

  return {
    ready:       () => prefetch(),
    getShops:    () => _shops    || DEFAULT_SHOPS,
    getProducts: () => _products || DEFAULT_PRODUCTS,
    getOrders:   () => _orders   || [],

    setShops: (v)    => { _shops    = v; _set('shops',     v); },
    setProducts: (v) => { _products = v; _set('products4', v); },
    setOrders: (v)   => { _orders   = v; _set('orders4',   v); },

    addOrder: (o) => {
      if (!_orders) _orders = [];
      _orders.unshift(o);
      if (_orders.length > 200) _orders.splice(200);
      _set('orders4', _orders);
    },
  };
})();

// ============================================================
//  UTILS
// ============================================================
function fmt(n) {
  return '\u0e3f' + Number(n).toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:2});
}
function todayStr() {
  return new Date().toLocaleDateString('th-TH', {year:'numeric', month:'long', day:'numeric'});
}
function getShop(shops, id) {
  return shops.find(s => s.id === id) || {name:'\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e49\u0e32\u0e19', color:'#aaa'};
}
function groupByShop(items, shops) {
  const g = {};
  shops.forEach(s => { g[s.id] = []; });
  g[0] = [];
  items.forEach(p => {
    const sid = p.shopId || 0;
    if (!g[sid]) g[sid] = [];
    g[sid].push(p);
  });
  return g;
}
function mkDot(color, size=9) {
  return '<span class="dot" style="width:'+size+'px;height:'+size+'px;background:'+color+';"></span>';
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================================
//  COPY
// ============================================================
function fallbackCopy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => _execCopy(text));
  } else {
    _execCopy(text);
  }
  toast('\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27 \u0e19\u0e33\u0e44\u0e1b\u0e27\u0e32\u0e07\u0e43\u0e19 LINE \u0e44\u0e14\u0e49\u0e40\u0e25\u0e22');
}
function _execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

// ============================================================
//  MODAL
// ============================================================
function openModal(title, bodyHtml, btnsHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-btns').innerHTML = btnsHtml;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOutside(e) { if(e.target === document.getElementById('modal')) closeModal(); }

// ============================================================
//  LOADING OVERLAY
// ============================================================
(function injectLoader() {
  const style = document.createElement('style');
  style.textContent = [
    '#fb-loader{position:fixed;inset:0;background:#f4f4f0;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;z-index:9999;',
    'font-family:"Sarabun",sans-serif;gap:14px;transition:opacity 0.3s;}',
    '#fb-loader.hide{opacity:0;pointer-events:none;}',
    '.fb-spinner{width:36px;height:36px;border:3px solid #ddd;border-top-color:#1a1a1a;',
    'border-radius:50%;animation:fb-spin 0.7s linear infinite;}',
    '@keyframes fb-spin{to{transform:rotate(360deg);}}',
    '#fb-loader p{font-size:14px;color:#888;}'
  ].join('');
  document.head.appendChild(style);

  const div = document.createElement('div');
  div.id = 'fb-loader';
  div.innerHTML = '<div class="fb-spinner"></div><p>\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25...</p>';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(div));
})();

// ============================================================
//  BOOT — รอ DB.ready() แล้วค่อยเรียก init()
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await DB.ready();
  document.getElementById('fb-loader').classList.add('hide');
  if (typeof init === 'function') init();
});
