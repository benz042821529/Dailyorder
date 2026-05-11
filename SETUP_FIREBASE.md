# วิธีตั้งค่า Firebase (ทำครั้งเดียว ~10 นาที)

## ขั้นตอนที่ 1 — สร้างโปรเจกต์ Firebase

1. ไปที่ https://console.firebase.google.com
2. คลิก **"Add project"** → ตั้งชื่อโปรเจกต์ (เช่น `daily-order`)
3. ปิด Google Analytics → **"Create project"**

## ขั้นตอนที่ 2 — เปิด Firestore Database

1. เมนูซ้าย → **Firestore Database** → **"Create database"**
2. เลือก **"Start in test mode"** (อ่าน/เขียนได้ 30 วัน — จะเปลี่ยน Security Rules ทีหลัง)
3. เลือก Region → **"asia-southeast1"** (Singapore) → **"Enable"**

## ขั้นตอนที่ 3 — ดึง Config มาใส่โค้ด

1. เมนูซ้าย → **Project Overview** → ไอคอน **"</>"** (Web)
2. ตั้งชื่อ App → **"Register app"**
3. คัดลอกค่าใน `firebaseConfig` ที่ได้
4. เปิดไฟล์ **`data.js`** แก้ค่าตรงนี้:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",        // ← ใส่ค่าของคุณ
  authDomain:        "xxx.firebaseapp.com",
  projectId:         "xxx",
  storageBucket:     "xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
};
```

## ขั้นตอนที่ 4 — ตั้ง Security Rules (สำคัญ!)

ไปที่ Firestore → **Rules** → แก้เป็น:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /store/{document} {
      allow read, write: if true;  // เปิดสาธารณะ (เหมาะใช้คนเดียว)
    }
  }
}
```

คลิก **"Publish"**

## ขั้นตอนที่ 5 — อัปโหลดขึ้น GitHub Pages

1. สร้าง Repository ใหม่บน GitHub
2. อัปโหลดไฟล์ทั้งหมด:
   - index.html
   - shops.html
   - products.html
   - history.html
   - data.js  ← ไฟล์ที่ใส่ FIREBASE_CONFIG แล้ว
   - style.css
3. Settings → Pages → Source: **main** branch → Save
4. ได้ URL: `https://yourusername.github.io/repo-name`

## Free Tier ของ Firebase (เกินยากมากสำหรับใช้คนเดียว)

| | Limit ฟรี |
|---|---|
| Reads | 50,000 ครั้ง/วัน |
| Writes | 20,000 ครั้ง/วัน |
| Storage | 1 GB |
| Network | 10 GB/เดือน |

