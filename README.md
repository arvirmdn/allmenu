# 🗂️ AllMenu — arvirmdn Vintage Hub

Web app (PWA) buat download media dari berbagai platform sosial, dibungkus dalam satu "hub" ala link-in-bio bergaya vintage/iOS.

🔗 **Web Downloader & tools lainnya:** https://allmenu-phi.vercel.app/ 

---

## ✨ Fitur

**📥 Media Downloader**
- Download video dari **TikTok, YouTube, Instagram, Facebook, X (Twitter)**, dan audio dari **Spotify** (via pencarian YouTube)
- Pilihan kualitas video: 144p – 2160p (4K)
- Ekstrak audio ke **MP3**
- Download foto/slide TikTok (termasuk multi-foto)
- Preview thumbnail sebelum download
- Dukungan **playlist YouTube** — pilih video mana saja yang mau didownload
- **Batch download** banyak link sekaligus, dibungkus jadi satu file ZIP

**🎵 Playlist Musik**
- Pemutar musik bawaan (mini player) di dalam halaman

**📱 PWA (Progressive Web App)**
- Bisa di-install ke homescreen HP (Android/iOS) layaknya app native
- Service worker (`sw.js`) meng-cache app shell biar tetap kebuka walau koneksi lemot
- Ikon & manifest sudah disiapkan (`manifest.json`, `icon-192.png`, `icon-512.png`)

**🛠️ Tools**
- Beberapa tools tambahan (Convert Format, Compress Video, Video ke GIF, Potong Video) — status: *segera hadir*

---

## 🧱 Struktur File

```
├── index.html          # markup utama (semua tab: Home, Tools, Downloader)
├── script.js           # seluruh logic: fetch API, UI, playlist, PWA, dsb.
├── style.css           # styling (tema vintage/iOS)
├── sw.js                # service worker (cache app shell)
├── manifest.json        # metadata PWA (nama, ikon, warna tema)
├── icon-192.png / icon-512.png / apple-touch-icon.png / favicon-32.png
└── README.md
```

Murni **static site** — HTML/CSS/JS biasa, tanpa build step, tanpa framework. Tinggal buka `index.html` atau hosting di mana saja (GitHub Pages, Vercel, Netlify, Railway static, dll).

---

## ⚙️ Konfigurasi

Frontend ini butuh **backend API terpisah** (lihat folder `backend/` — FastAPI/Python) buat proses download sebenarnya (yt-dlp). URL backend-nya di-hardcode di `script.js`:

```js
const YTDLP_API_URL = 'https://web-production-0c5698.up.railway.app';
```

Kalau kamu deploy backend sendiri, **ganti URL ini** ke domain backend kamu.

---

## 🚀 Menjalankan Lokal

Karena static site, tinggal buka langsung di browser, atau pakai server lokal simpel biar service worker & PWA jalan normal:

```bash
# pakai Python
python3 -m http.server 8000

# atau pakai Node (http-server)
npx http-server -p 8000
```

Lalu buka `http://localhost:8000`.

---

## 🚢 Deploy

Cocok di-hosting sebagai static site di:
- **GitHub Pages**
- **Vercel** / **Netlify**
- **Railway** (static/Nixpacks)

Pastikan `YTDLP_API_URL` di `script.js` sudah menunjuk ke backend yang benar sebelum deploy.

---

## 🔗 Terhubung Dengan

- **Backend** — proses download sesungguhnya (yt-dlp, FastAPI Python), lihat folder `backend/`.
- **Bot Telegram** — versi Telegram dari fitur yang sama, dijalankan dari service backend yang sama.

---

## 💬 Kontak & Dukungan

Link kontak, donasi, dan komunitas tersedia langsung di tab **Home** aplikasi (WhatsApp, grup, saluran, kotak saran).

---

*Dibuat & dikembangkan oleh arvirmdn.*
