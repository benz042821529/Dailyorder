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
  } catch(e) { _firebaseResolve(false); }
}

// ============================================================
//  STOCK DB
// ============================================================
const STOCK = (() => {
  let _cats   = null;
  let _items  = null;
  let _sales  = null;   // ประวัติการขายรายวัน (archive)
  let _today  = null;   // ยอดวันนี้ { date, items: {id: {qty, name, unit, price}} }

  async function _get(key) {
    if (!_db) return null;
    try {
      const snap = await _db.collection('stock').doc(key).get();
      return snap.exists ? snap.data().value : null;
    } catch(e) { return null; }
  }
  async function _set(key, value) {
    if (!_db) return;
    try { await _db.collection('stock').doc(key).set({ value }); } catch(e) {}
  }

  // ตรวจว่าวันเปลี่ยนหรือยัง — ถ้าเปลี่ยนให้ archive ยอดเมื่อวาน
  function _checkDayRollover() {
    const todayKey = new Date().toISOString().slice(0,10);
    if (!_today) {
      _today = { date: todayKey, items: {} };
      return;
    }
    if (_today.date !== todayKey) {
      // archive ยอดเมื่อวาน (ถ้ามีรายการ)
      const entries = Object.values(_today.items).filter(x => x.qty > 0);
      if (entries.length > 0) {
        if (!_sales) _sales = [];
        const total = entries.reduce((s,x) => s + x.qty*(x.price||0), 0);
        _sales.unshift({ date: _today.date, items: entries, total });
        if (_sales.length > 365) _sales.splice(365);
        _set('sales', _sales);
      }
      _today = { date: todayKey, items: {} };
      _set('today', _today);
      // รีเซ็ตสต็อกกลับเป็น dailyStock
      _items = (_items||[]).map(it => ({
        ...it,
        stock: (it.dailyStock !== undefined && it.dailyStock !== null) ? it.dailyStock : (it.stock||0)
      }));
      _set('items', _items);
    }
  }

  async function prefetch() {
    await _firebaseReady_p;
    const [c, i, s, t] = await Promise.all([
      _get('categories'), _get('items'), _get('sales'), _get('today')
    ]);
    _cats  = c || [];
    _items = i || [];
    _sales = s || [];
    _today = t || { date: new Date().toISOString().slice(0,10), items: {} };
    _checkDayRollover();
  }

  return {
    ready:      () => prefetch(),
    getCats:    () => _cats  || [],
    getItems:   () => _items || [],
    getSales:   () => _sales || [],
    getToday:   () => _today || { date: '', items: {} },

    setCats:  v => { _cats  = v; _set('categories', v); },
    setItems: v => { _items = v; _set('items', v); },
    setSales: v => { _sales = v; _set('sales', v); },

    // กด − หน้าร้าน: ลดสต็อก + บันทึกยอดวันนี้
    sellOne: (id) => {
      _checkDayRollover();
      // ลดสต็อก
      const it = (_items||[]).find(x => x.id === id);
      if (!it || (it.stock||0) <= 0) return false;
      _items = _items.map(x => x.id===id ? {...x, stock: Math.max(0,(x.stock||0)-1)} : x);
      _set('items', _items);
      // บวกยอดวันนี้
      if (!_today.items[id]) _today.items[id] = { id, name: it.name, unit: it.unit, price: it.sellPrice||0, qty: 0 };
      _today.items[id].qty += 1;
      _set('today', _today);
      return true;
    },

    // กด + หน้าร้าน: เพิ่มสต็อกคืน + ลดยอดวันนี้
    returnOne: (id) => {
      _checkDayRollover();
      const it = (_items||[]).find(x => x.id === id);
      if (!it) return;
      _items = _items.map(x => x.id===id ? {...x, stock: (x.stock||0)+1} : x);
      _set('items', _items);
      if (_today.items[id] && _today.items[id].qty > 0) {
        _today.items[id].qty -= 1;
        _set('today', _today);
      }
    },

    // เซ็ตสต็อกโดยตรง (หลังบ้าน)
    setStock: (id, val) => {
      _items = (_items||[]).map(it => it.id===id ? {...it, stock: Math.max(0,val)} : it);
      _set('items', _items);
    },

    // ตั้งค่าสต็อกเริ่มต้นต่อวัน
    setDailyStock: (id, val) => {
      _items = (_items||[]).map(it => it.id===id ? {...it, dailyStock: Math.max(0,val)} : it);
      _set('items', _items);
    },

    // รีเซ็ตสต็อกทุกตัวกลับเป็น dailyStock (เรียกตอนปิดวัน/ขึ้นวันใหม่)
    resetDaily: () => {
      _items = (_items||[]).map(it => ({
        ...it,
        stock: (it.dailyStock !== undefined && it.dailyStock !== null) ? it.dailyStock : (it.stock||0)
      }));
      _set('items', _items);
    },

    // archive ด้วยมือ (ปุ่มปิดวัน) + รีเซ็ตสต็อก
    closeDay: () => {
      _checkDayRollover();
      const entries = Object.values(_today.items).filter(x => x.qty > 0);
      if (!entries.length) return false;
      if (!_sales) _sales = [];
      const total = entries.reduce((s,x) => s + x.qty*(x.price||0), 0);
      _sales.unshift({ date: _today.date + 'T' + new Date().toTimeString().slice(0,5), items: entries, total });
      if (_sales.length > 365) _sales.splice(365);
      _set('sales', _sales);
      _today = { date: new Date().toISOString().slice(0,10), items: {} };
      _set('today', _today);
      // รีเซ็ตสต็อกกลับเป็น dailyStock
      _items = (_items||[]).map(it => ({
        ...it,
        stock: (it.dailyStock !== undefined && it.dailyStock !== null) ? it.dailyStock : (it.stock||0)
      }));
      _set('items', _items);
      return true;
    },
  };
})();

// ============================================================
//  UTILS
// ============================================================
function fmt(n) {
  return '฿' + Number(n).toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:2});
}
function todayStr() {
  return new Date().toLocaleDateString('th-TH', {year:'numeric',month:'long',day:'numeric'});
}
function toast(msg, type='') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type?' toast-'+type:'');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
function openModal(title, bodyHtml, btnsHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-btns').innerHTML = btnsHtml;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal')?.classList.remove('open'); }
function closeModalOutside(e) { if(e.target===document.getElementById('modal')) closeModal(); }
function fallbackCopy(text) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(()=>_execCopy(text));
  else _execCopy(text);
  toast('คัดลอกแล้ว');
}
function _execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText='position:fixed;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
}

// ============================================================
//  BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    const el = document.getElementById('fb-loader');
    if (el) el.classList.add('hide');
    if (typeof init === 'function') init();
  };
  const timer = setTimeout(finish, 6000);
  try { await STOCK.ready(); } catch(e) {}
  clearTimeout(timer);
  finish();
});
