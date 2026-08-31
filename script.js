document.addEventListener('DOMContentLoaded', () => {
  // ---------- Sound Effect Function ----------
  // Generate beep sound menggunakan Web Audio API
  // PENTING: AudioContext dibuat SEKALI saja dan dipakai ulang.
  // Sebelumnya `new AudioContext()` dipanggil di setiap klik, dan browser
  // membatasi jumlah AudioContext aktif secara bersamaan — jadi kalau tombol
  // dipencet cepat, context baru gagal dibuat dan bunyinya hilang diam-diam.
  let sharedAudioContext = null;
  function getAudioContext() {
    if (!sharedAudioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      sharedAudioContext = new AC();
    }
    return sharedAudioContext;
  }

  function playSound(frequency = 800, duration = 80) {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      // Jika context ter-suspend (misal tab baru dibuka / autoplay policy),
      // resume dulu supaya bunyi tetap keluar.
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency; // Hz
      oscillator.type = 'sine';

      const now = audioContext.currentTime;
      // Fade in & out untuk smooth sound
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);

      // Bersihkan node setelah selesai supaya tidak menumpuk di memori
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      // Silent fail jika Audio API tidak tersedia
    }
  }

  // Bunyi khusus tombol hapus: nada meluncur turun (bukan beep datar biasa),
  // biar kerasa beda dan "berkesan menghapus" dibanding klik tombol umum.
  function playDeleteSound() {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      const now = audioContext.currentTime;
      const duration = 0.16;

      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(180, now + duration);

      gainNode.gain.setValueAtTime(0.28, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
      // Silent fail jika Audio API tidak tersedia
    }
  }
  
  const themeToggle = document.getElementById('theme-toggle');
  const shareBtn = document.getElementById('share-btn');
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  const playlistModal = document.getElementById('playlist-modal');
  const playlistCloseBtn = document.getElementById('playlist-close');
  const playlistListEl = document.getElementById('playlist-list');
  const nowPlayingBar = document.getElementById('playlist-now-playing');
  const nowPlayingTitle = document.getElementById('now-playing-title');
  const nowPlayingArtist = document.getElementById('now-playing-artist');
  const nowPlayingToggleBtn = document.getElementById('now-playing-toggle');
  const nowPlayingPrevBtn = document.getElementById('now-playing-prev');
  const nowPlayingNextBtn = document.getElementById('now-playing-next');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const downloadBtn = document.getElementById('download-btn');
  const thumbBtn = document.getElementById('thumb-btn');
  const mediaUrlInput = document.getElementById('media-url');
  const clearLinkBtn = document.getElementById('clear-link-btn');
  const resultBox = document.getElementById('result-box');
  const platformBtns = document.querySelectorAll('.platform-btn');
  const qualityBtns = document.querySelectorAll('.quality-btn');
  const historyList = document.getElementById('history-list');
  const historyBox = document.getElementById('history-box');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const appModal = document.getElementById('app-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const zipBtn = document.getElementById('download-zip-btn');

  // ---------- Playlist Musik ----------
  // Tambahkan lagu di sini nanti, formatnya:
  // { title: 'Judul Lagu', artist: 'Nama Artis', src: 'musik/nama-file.mp3' }
  const playlist = [
    // { title: 'Contoh Lagu', artist: 'Contoh Artis', src: 'musik/contoh.mp3' },
  ];

  let currentTrackIndex = -1;
  let isPlaying = false;
  let selectedQuality = '720';
  const urlPreviewBox = document.getElementById('url-preview-box');
  const previewCache = new Map(); // key: `${url}|${quality}` -> { data, source }
  let previewDebounceTimer = null;
  let previewRequestToken = 0; // biar hasil fetch lama yang telat nggak nimpa preview yang lebih baru
  let lastBatch = []; // [{url, quality}] dari proses terakhir, dipakai tombol ZIP

  // Escape teks yang berasal dari luar (judul video, dsb.) sebelum dimasukkan
  // ke innerHTML, biar tidak bisa disusupi HTML/script (XSS) dari API pihak ketiga.
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function getPlatformFromUrl(url) {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('spotify.com')) return 'spotify';
    return 'unknown';
  }

  // Post TikTok mode foto/slide (carousel) pakai path /photo/<id> di URL-nya,
  // beda dari /video/<id> untuk video biasa — post foto tidak punya stream
  // video sama sekali, jadi perlu dialihkan ke alur download foto tersendiri.
  function isTikTokPhotoUrl(url) {
    return url.includes('tiktok.com') && url.includes('/photo/');
  }

  // Deteksi link playlist YouTube (bukan sekadar video yang kebetulan dibuka
  // dari dalam playlist). Cermin dari logika is_youtube_playlist() di backend.
  function isYoutubePlaylist(url) {
    const lower = url.toLowerCase();
    if (!lower.includes('list=')) return false;
    if (lower.includes('youtube.com/playlist')) return true;
    if (lower.includes('watch') && lower.includes('v=')) return false;
    return lower.includes('youtube.com') || lower.includes('youtu.be');
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
  }

  const MAX_LINKS = 5;

  function extractUrls(raw) {
    const matches = raw.match(/https?:\/\/\S+/g) || [];
    return matches.slice(0, MAX_LINKS);
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('downloadHistory') || '[]').slice(-10).reverse();
    } catch { return []; }
  }

  function saveHistory(item) {
    try {
      const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
      history.push({ ...item, time: new Date().toISOString() });
      localStorage.setItem('downloadHistory', JSON.stringify(history.slice(-20)));
    } catch {}
  }

  function renderHistory() {
    const history = loadHistory();
    if (history.length === 0) {
      historyBox.style.display = 'none';
      return;
    }
    historyBox.style.display = 'block';
    historyList.innerHTML = history.map((item) => `
      <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; border-bottom:1px solid var(--border-color);">
        <span style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.title || 'Video')}</span>
        <span style="color:var(--text-sub);">${escapeHtml(item.platform || 'Unknown')}</span>
      </div>
    `).join('');
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (!confirm('Hapus semua riwayat download?')) return;
      playDeleteSound();
      try { localStorage.removeItem('downloadHistory'); } catch {}
      renderHistory();
    });
  }

  // Tombol hapus link yang ditempel
  if (clearLinkBtn) {
    clearLinkBtn.addEventListener('click', () => {
      playDeleteSound();
      mediaUrlInput.value = '';
      mediaUrlInput.style.height = 'auto';
      mediaUrlInput.focus();
      clearUrlPreview();
    });
  }

  // ---------- Modal (Cara Pakai / Kebijakan Privasi) ----------
  const MODAL_CONTENT = {
    'cara-pakai': {
      title: 'Cara Pakai',
      body: `
        <h4>1. Pilih Platform</h4>
        <p>Buka tab <b>Tools</b>, lalu pilih platform (TikTok, YouTube, Instagram, Facebook, X, atau Spotify) — atau langsung tempel link-nya, platform akan terdeteksi otomatis.</p>
        <h4>2. Tempel Link</h4>
        <p>Tempel link video di kotak teks. Bisa beberapa link sekaligus, satu link per baris (maksimal 5 link). Kalau kamu tempel link <b>playlist YouTube</b>, kamu akan diminta memilih video mana saja yang mau diunduh.</p>
        <h4>3. Pilih Kualitas</h4>
        <p>Pilih 360p / 720p / 1080p untuk video, atau 🎵 MP3 untuk audio saja. Link Spotify otomatis diunduh sebagai MP3.</p>
        <h4>4. Cek & Download</h4>
        <p>Tekan tombol panah untuk mengecek link — kamu akan lihat pratinjau (thumbnail, judul, durasi, perkiraan ukuran file) sebelum benar-benar mengunduh. Tekan <b>Download</b> pada kartu hasil untuk mulai mengunduh (ada progress bar-nya).</p>
        <h4>Catatan</h4>
        <ul>
          <li>Video/audio di atas 15 menit akan ditolak server.</li>
          <li>Gunakan tombol 🖼️ Download Thumbnail untuk mengunduh cover video saja.</li>
          <li>Kalau kamu proses lebih dari 1 link sekaligus, tombol 🗜️ <b>Download Semua (ZIP)</b> akan muncul untuk mengunduh semuanya dalam satu file .zip.</li>
          <li>Kalau server sedang sibuk, kamu akan lihat hitung mundur singkat sebelum bisa coba lagi.</li>
        </ul>
      `
    },
    'privasi': {
      title: 'Kebijakan Privasi',
      body: `
        <h4>Penggunaan Data</h4>
        <p>Link yang kamu masukkan diproses langsung ke server untuk diambil media-nya dan tidak disimpan permanen di server kami.</p>
        <h4>Riwayat Download</h4>
        <p>Riwayat download disimpan <b>hanya di perangkatmu sendiri</b> (localStorage browser), bukan di server. Kamu bisa menghapusnya kapan saja lewat tombol "Hapus" di bagian History.</p>
        <h4>Hak Cipta</h4>
        <p>Layanan ini disediakan untuk keperluan pribadi/backup. Kami tidak bertanggung jawab atas penyalahgunaan konten yang melanggar hak cipta pemilik asli. Unduh dan gunakan konten secara bertanggung jawab.</p>
        <h4>Pihak Ketiga</h4>
        <p>Untuk beberapa platform, proses ekstraksi media dapat memanfaatkan layanan pihak ketiga sebagai fallback (misalnya untuk TikTok). Kami tidak mengontrol kebijakan privasi layanan tersebut.</p>
      `
    }
  };

  function openModal(key) {
    const content = MODAL_CONTENT[key];
    if (!content || !appModal) return;
    modalTitle.textContent = content.title;
    modalBody.innerHTML = content.body;
    appModal.classList.add('open');
    appModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    if (!appModal) return;
    appModal.classList.remove('open');
    appModal.setAttribute('aria-hidden', 'true');
  }

  modalTriggers.forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-modal')));
  });
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (appModal) {
    appModal.addEventListener('click', (e) => {
      if (e.target === appModal) closeModal();
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.querySelector('i').className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: 'arvirmdn - Vintage Hub',
        text: 'Download video dari TikTok, YouTube, Instagram, dan lainnya!',
        url: window.location.href
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('Link berhasil disalin!');
        } catch {}
      }
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
    });
  });

  function renderPlaylist() {
    if (!playlistListEl) return;
    if (!playlist.length) {
      playlistListEl.innerHTML = `
        <div style="text-align:center; padding:28px 10px; color:var(--text-sub); font-size:13px;">
          <i class="fa-solid fa-record-vinyl" style="font-size:26px; margin-bottom:10px; display:block; color:var(--ios-blue);"></i>
          Belum ada musik di playlist.<br>Musik akan ditambahkan segera.
        </div>
      `;
      return;
    }
    playlistListEl.innerHTML = playlist.map((track, i) => `
      <button type="button" class="playlist-item${i === currentTrackIndex ? ' active' : ''}" data-index="${i}">
        <div class="playlist-item-icon">
          <i class="fa-solid ${i === currentTrackIndex && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
        </div>
        <div class="playlist-item-text">
          <span class="playlist-item-title">${escapeHtml(track.title)}</span>
          <span class="playlist-item-artist">${escapeHtml(track.artist || '')}</span>
        </div>
        ${i === currentTrackIndex && isPlaying ? '<i class="fa-solid fa-volume-high playlist-item-wave"></i>' : ''}
      </button>
    `).join('');

    playlistListEl.querySelectorAll('.playlist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx === currentTrackIndex) {
          togglePlayPause();
        } else {
          playTrack(idx);
        }
      });
    });
  }

  function updateNowPlayingUI() {
    const track = playlist[currentTrackIndex];
    if (!track) {
      nowPlayingBar.style.display = 'none';
      return;
    }
    nowPlayingBar.style.display = 'flex';
    nowPlayingTitle.textContent = track.title;
    nowPlayingArtist.textContent = track.artist || '';
    const icon = nowPlayingToggleBtn.querySelector('i');
    icon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  function updateMusicBadge() {
    if (!musicBtn) return;
    musicBtn.classList.toggle('playing', isPlaying);
  }

  function playTrack(index) {
    if (!playlist.length) return;
    if (index < 0) index = playlist.length - 1;
    if (index >= playlist.length) index = 0;
    currentTrackIndex = index;
    const track = playlist[currentTrackIndex];
    bgMusic.src = track.src;
    bgMusic.play().then(() => {
      isPlaying = true;
      renderPlaylist();
      updateNowPlayingUI();
      updateMusicBadge();
    }).catch(() => {
      alert('Gagal memutar lagu, cek kembali file musiknya.');
    });
  }

  function togglePlayPause() {
    if (currentTrackIndex === -1) {
      if (playlist.length) playTrack(0);
      return;
    }
    if (isPlaying) {
      bgMusic.pause();
      isPlaying = false;
    } else {
      bgMusic.play().catch(() => {});
      isPlaying = true;
    }
    renderPlaylist();
    updateNowPlayingUI();
    updateMusicBadge();
  }

  bgMusic.addEventListener('ended', () => {
    if (playlist.length) playTrack(currentTrackIndex + 1);
  });

  function openPlaylistModal() {
    if (!playlistModal) return;
    renderPlaylist();
    updateNowPlayingUI();
    playlistModal.classList.add('open');
    playlistModal.setAttribute('aria-hidden', 'false');
  }

  function closePlaylistModal() {
    if (!playlistModal) return;
    playlistModal.classList.remove('open');
    playlistModal.setAttribute('aria-hidden', 'true');
  }

  if (musicBtn) {
    musicBtn.addEventListener('click', openPlaylistModal);
  }
  if (playlistCloseBtn) playlistCloseBtn.addEventListener('click', closePlaylistModal);
  if (playlistModal) {
    playlistModal.addEventListener('click', (e) => {
      if (e.target === playlistModal) closePlaylistModal();
    });
  }
  if (nowPlayingToggleBtn) nowPlayingToggleBtn.addEventListener('click', togglePlayPause);
  if (nowPlayingPrevBtn) nowPlayingPrevBtn.addEventListener('click', () => playTrack(currentTrackIndex - 1));
  if (nowPlayingNextBtn) nowPlayingNextBtn.addEventListener('click', () => playTrack(currentTrackIndex + 1));

  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
      clearUrlPreview();
      if (btn.getAttribute('data-platform') === 'spotify') {
        qualityBtns.forEach(b => b.classList.remove('active'));
        const mp3Btn = document.querySelector('.quality-btn[data-quality="mp3"]');
        if (mp3Btn) { mp3Btn.classList.add('active'); selectedQuality = 'mp3'; }
      }
    });
  });

  qualityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      qualityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedQuality = btn.getAttribute('data-quality');
      scheduleUrlPreview();
    });
  });

  if (mediaUrlInput) {
    mediaUrlInput.addEventListener('input', () => {
      // auto-resize textarea biar muat beberapa link
      mediaUrlInput.style.height = 'auto';
      mediaUrlInput.style.height = Math.min(mediaUrlInput.scrollHeight, 110) + 'px';

      const firstUrl = (mediaUrlInput.value.trim().split(/\s+/)[0] || '');
      const platform = getPlatformFromUrl(firstUrl);
      if (platform !== 'unknown') {
        platformBtns.forEach(btn => {
          btn.classList.remove('active');
          if (btn.getAttribute('data-platform') === platform) btn.classList.add('active');
        });
        if (platform === 'spotify') {
          qualityBtns.forEach(b => b.classList.remove('active'));
          const mp3Btn = document.querySelector('.quality-btn[data-quality="mp3"]');
          if (mp3Btn) { mp3Btn.classList.add('active'); selectedQuality = 'mp3'; }
        }
      }

      scheduleUrlPreview();
    });
  }

  const YTDLP_API_URL = 'https://web-production-0c5698.up.railway.app';

  // Wrapper fetch generik untuk endpoint JSON di backend kita. Melempar Error
  // yang membawa `.status` dan (kalau ada) `.retryAfter` supaya pemanggil bisa
  // membedakan rate-limit (429) dari error biasa dan menampilkan UI yang pas.
  async function apiRequest(endpoint) {
    const res = await fetch(endpoint);
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok || data.status === 'error') {
      const err = new Error(data.message || data.detail || `HTTP ${res.status}`);
      err.status = res.status;
      if (data.retry_after) err.retryAfter = data.retry_after;
      throw err;
    }
    return data;
  }

  async function callYtdlpVideoApi(url, quality) {
    return apiRequest(`${YTDLP_API_URL}/download?url=${encodeURIComponent(url)}&quality=${quality}`);
  }

  async function callYtdlpAudioApi(url) {
    return apiRequest(`${YTDLP_API_URL}/download-audio?url=${encodeURIComponent(url)}`);
  }

  async function callPlaylistInfoApi(url) {
    return apiRequest(`${YTDLP_API_URL}/playlist-info?url=${encodeURIComponent(url)}`);
  }

  async function callYtdlpPhotoApi(url) {
    return apiRequest(`${YTDLP_API_URL}/download-photo?url=${encodeURIComponent(url)}`);
  }

  // Fallback khusus foto/slide TikTok lewat TikWM (dipakai kalau instance Railway sedang tidur/down)
  async function callTikwmPhotoFallback(url) {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    const images = json.data?.images;
    if (!images || !images.length) throw new Error('tikwm_no_photo_result');
    return {
      status: 'success',
      type: 'photo',
      title: json.data?.title || 'TikTok Photo',
      photos: images,
      photo_count: images.length,
      thumbnail: images[0],
      _source: 'TikWM (fallback)'
    };
  }

  // Fallback ringan khusus TikTok video (tidak butuh server sendiri, dipakai kalau instance Railway sedang tidur/down)
  async function callTikwmFallback(url, platform) {
    if (platform !== 'tiktok') throw new Error('no_fallback_for_platform');
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    const videoUrl = json.data?.play || json.data?.wmplay;
    if (!videoUrl) throw new Error('tikwm_no_result');
    return {
      status: 'success',
      video_url: videoUrl,
      title: json.data?.title || 'tiktok_video',
      thumbnail: json.data?.cover,
      _source: 'TikWM (fallback)'
    };
  }

  // ---------- Rate-limit banner (countdown) ----------
  // Dipakai saat backend balas 429: kasih tahu user berapa detik lagi harus
  // nunggu, alih-alih cuma teks error generik yang bikin bingung.
  function renderRateLimitBanner(retryAfter) {
    let remaining = Math.max(1, Math.ceil(retryAfter));
    const bannerId = `rl-banner-${Date.now()}`;
    const html = `
      <div id="${bannerId}" class="rate-limit-banner">
        <i class="fa-solid fa-hourglass-half"></i>
        <span class="rl-text">Server sedang sibuk. Coba lagi dalam <b class="rl-count">${remaining}</b> detik...</span>
      </div>
    `;
    requestAnimationFrame(() => {
      const el = document.getElementById(bannerId);
      if (!el) return;
      const countEl = el.querySelector('.rl-count');
      const textEl = el.querySelector('.rl-text');
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timer);
          if (textEl) textEl.textContent = 'Boleh dicoba lagi sekarang. ';
          if (downloadBtn) downloadBtn.disabled = false;
          return;
        }
        if (countEl) countEl.textContent = remaining;
      }, 1000);
    });
    if (downloadBtn) downloadBtn.disabled = true;
    return html;
  }

  // ---------- Progress bar unduhan real (fetch + ReadableStream) ----------
  // Dipakai saat user menekan tombol Download di kartu preview. Kalau server
  // sumbernya mendukung CORS & Content-Length, progress bar-nya real (persentase
  // beneran). Kalau tidak (mis. beberapa CDN pihak ketiga), otomatis fallback ke
  // mode indeterminate lalu tetap trigger download normal lewat browser.
  async function downloadWithProgress(fileUrl, filename, wrapEl) {
    const fillEl = wrapEl.querySelector('.progress-bar-fill');
    const labelEl = wrapEl.querySelector('.progress-label');

    try {
      const res = await fetch(fileUrl);
      if (!res.ok || !res.body) throw new Error('no_stream');

      const total = parseInt(res.headers.get('content-length') || '0', 10);
      if (!total) throw new Error('no_content_length');

      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        fillEl.style.width = `${percent}%`;
        fillEl.classList.remove('indeterminate');
        if (labelEl) {
          labelEl.innerHTML = `<span>${percent}%</span><span>${(loaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB</span>`;
        }
      }

      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      if (labelEl) labelEl.innerHTML = `<span>✅ Selesai</span><span>${(total / (1024 * 1024)).toFixed(1)} MB</span>`;
    } catch (err) {
      // Fallback: nggak bisa dibaca progress-nya (CORS/streaming diblokir),
      // tampilkan progress indeterminate sebentar lalu buka link download biasa.
      fillEl.classList.add('indeterminate');
      if (labelEl) labelEl.innerHTML = `<span>Mengunduh...</span><span></span>`;
      setTimeout(() => {
        window.open(fileUrl, '_blank');
        if (labelEl) labelEl.innerHTML = `<span>✅ Dibuka di tab baru</span><span></span>`;
        fillEl.classList.remove('indeterminate');
        fillEl.style.width = '100%';
      }, 900);
    }
  }

  function renderResultCard(url, platform, quality, data, source, errorMsg) {
    if (errorMsg) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ ${escapeHtml(platform.toUpperCase())}: ${escapeHtml(errorMsg)}</span></div>`;
    }
    const fileUrl = data.download_url || data.video_url || data.audio_url;
    const title = data.title || (quality === 'mp3' ? 'Audio' : 'Video');
    if (!fileUrl) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ ${escapeHtml(platform.toUpperCase())}: Gagal, coba link/kualitas lain.</span></div>`;
    }
    saveHistory({ title, platform, url });
    const label = quality === 'mp3' ? '🎵 MP3' : `${quality}p`;
    // fileUrl & thumbnail dipakai sebagai attribute URL (bukan teks bebas), tetap
    // di-escape supaya tidak bisa memutus attribute HTML kalau berisi karakter aneh.
    const safeFileUrl = escapeHtml(fileUrl);
    const safeThumb = data.thumbnail ? escapeHtml(data.thumbnail) : '';
    const durationTxt = data.duration ? formatDuration(data.duration) : '';
    const filesizeTxt = data.filesize_label || '';
    const cardId = `card-${Math.random().toString(36).slice(2, 9)}`;
    const ext = quality === 'mp3' ? 'mp3' : 'mp4';
    const safeFilename = escapeHtml((title || 'download').replace(/[^\w\-. ]+/g, '').slice(0, 60) + '.' + ext);

    // Preview dulu: thumbnail + judul + durasi + perkiraan ukuran, BARU tombol
    // Download yang trigger unduhan beneran (dengan progress bar).
    return `
      <div id="${cardId}" style="display:flex; flex-direction:column; gap:8px; padding:10px 0; border-bottom:1px solid var(--border-color);">
        <div class="preview-card">
          ${safeThumb ? `<img src="${safeThumb}" class="preview-thumb" onerror="this.style.display='none'">` : ''}
          <div class="preview-info">
            <p class="preview-title">${escapeHtml(title)}</p>
            <div class="preview-meta">
              <span>${escapeHtml(platform.toUpperCase())}</span>
              <span>${escapeHtml(label)}</span>
              ${durationTxt ? `<span>⏱️ ${escapeHtml(durationTxt)}</span>` : ''}
              ${filesizeTxt ? `<span>📦 ~${escapeHtml(filesizeTxt)}</span>` : ''}
              <span>via ${escapeHtml(source)}</span>
            </div>
          </div>
          <button type="button" class="copy-link-btn" data-url="${safeFileUrl}" style="background:var(--input-bg); border:none; border-radius:4px; padding:6px 10px; cursor:pointer; font-size:12px;">📋</button>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="do-download-btn download-option-btn" style="flex:1; background:var(--ios-blue); border:none; cursor:pointer;"
            data-url="${safeFileUrl}" data-filename="${safeFilename}">⬇️ Download${filesizeTxt ? ` (~${escapeHtml(filesizeTxt)})` : ''}</button>
          <button type="button" class="delete-result-btn" data-no-sound style="width:44px; height:44px; background:#ff3b30; border:none; cursor:pointer; color:white; font-size:18px; border-radius:4px; display:flex; align-items:center; justify-content:center;" title="Hapus dari daftar">🗑️</button>
        </div>
        <div class="progress-bar-wrap" style="display:none;">
          <div class="progress-bar-fill"></div>
        </div>
        <div class="progress-label" style="display:none;"><span></span><span></span></div>
      </div>
    `;
  }

  // Kartu hasil khusus post TikTok mode foto/slide: galeri thumbnail + tombol
  // download per foto + tombol download semua foto sebagai ZIP.
  function renderPhotoResultCard(url, data, source, errorMsg) {
    if (errorMsg) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ TIKTOK FOTO: ${escapeHtml(errorMsg)}</span></div>`;
    }
    const photos = data.photos || [];
    if (!photos.length) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ TIKTOK FOTO: Tidak ada foto ditemukan.</span></div>`;
    }
    const title = data.title || 'TikTok Photo';
    saveHistory({ title, platform: 'tiktok-foto', url });
    const cardId = `photocard-${Math.random().toString(36).slice(2, 9)}`;
    const safeTitle = escapeHtml(title);
    const safeBaseName = escapeHtml(title.replace(/[^\w\-. ]+/g, '').slice(0, 50) || 'tiktok-foto');
    const safeUrl = escapeHtml(url);

    return `
      <div id="${cardId}" style="display:flex; flex-direction:column; gap:8px; padding:10px 0; border-bottom:1px solid var(--border-color);">
        <div class="preview-card">
          ${photos[0] ? `<img src="${escapeHtml(photos[0])}" class="preview-thumb" onerror="this.style.display='none'">` : ''}
          <div class="preview-info">
            <p class="preview-title">${safeTitle}</p>
            <div class="preview-meta">
              <span>TIKTOK</span>
              <span>🖼️ ${photos.length} Foto</span>
              <span>via ${escapeHtml(source)}</span>
            </div>
          </div>
        </div>
        <div class="photo-grid">
          ${photos.map((p, i) => `
            <div class="photo-grid-item">
              <img src="${escapeHtml(p)}" onerror="this.style.display='none'">
              <button type="button" class="photo-download-btn" data-url="${escapeHtml(p)}" data-filename="${safeBaseName}-${i + 1}.jpg" title="Download foto ${i + 1}">
                <i class="fa-solid fa-download"></i>
              </button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="photo-download-all-btn ios-btn-secondary" style="flex:1; border:none; border-radius:4px; padding:10px; cursor:pointer;" data-url="${safeUrl}">
            🗜️ Download Semua (ZIP)
          </button>
          <button type="button" class="delete-result-btn" data-no-sound style="width:44px; height:44px; background:#ff3b30; border:none; cursor:pointer; color:white; font-size:18px; border-radius:4px; display:flex; align-items:center; justify-content:center;" title="Hapus galeri ini">🗑️</button>
        </div>
      </div>
    `;
  }

  async function processTikTokPhoto(url) {
    let data, source;
    try {
      try {
        data = await callYtdlpPhotoApi(url);
        source = 'yt-dlp API';
      } catch (err) {
        if (err.status === 429) throw err;
        data = await callTikwmPhotoFallback(url);
        source = data._source;
      }
    } catch (err) {
      if (err.status === 429) {
        return renderRateLimitBanner(err.retryAfter || 30);
      }
      return renderPhotoResultCard(url, null, null, err.message);
    }
    return renderPhotoResultCard(url, data, source, null);
  }

  // Klik tombol "Salin", "Hapus", & "Download" pada result card (event delegation, karena kartunya dibuat dinamis)
  if (resultBox) {
    resultBox.addEventListener('click', (e) => {
      // Tombol Hapus (Delete)
      const deleteBtn = e.target.closest('.delete-result-btn');
      if (deleteBtn) {
        playDeleteSound();
        const card = deleteBtn.closest('[id^="card-"], [id^="photocard-"]');
        if (card) {
          card.style.animation = 'fadeOut 0.3s ease-out forwards';
          setTimeout(() => {
            card.remove();
            // Cek apakah masih ada cards di result-box
            const remainingCards = resultBox.querySelectorAll('[id^="card-"], [id^="photocard-"]').length;
            if (remainingCards === 0) {
              resultBox.innerHTML = '';
              resultBox.style.display = 'none';
            }
          }, 300);
        }
        return;
      }
      
      const copyBtn = e.target.closest('.copy-link-btn');
      if (copyBtn) {
        const url = copyBtn.getAttribute('data-url');
        if (url) navigator.clipboard.writeText(url).catch(() => {});
        return;
      }
      const dlBtn = e.target.closest('.do-download-btn');
      if (dlBtn) {
        const fileUrl = dlBtn.getAttribute('data-url');
        const filename = dlBtn.getAttribute('data-filename');
        const wrap = dlBtn.closest('div[style*="gap:8px"]').parentElement;
        const barWrap = wrap.querySelector('.progress-bar-wrap');
        const label = wrap.querySelector('.progress-label');
        if (barWrap) barWrap.style.display = 'block';
        if (label) label.style.display = 'flex';
        dlBtn.disabled = true;
        dlBtn.textContent = 'Mengunduh...';
        downloadWithProgress(fileUrl, filename, wrap).finally(() => {
          dlBtn.textContent = '⬇️ Download lagi';
          dlBtn.disabled = false;
        });
        return;
      }
      const photoDlBtn = e.target.closest('.photo-download-btn');
      if (photoDlBtn) {
        const photoUrl = photoDlBtn.getAttribute('data-url');
        const filename = photoDlBtn.getAttribute('data-filename') || 'foto.jpg';
        const icon = photoDlBtn.querySelector('i');
        photoDlBtn.disabled = true;
        if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
        fetch(`${YTDLP_API_URL}/proxy-image?source=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(filename)}`)
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
          })
          .catch(() => { window.open(photoUrl, '_blank'); })
          .finally(() => {
            photoDlBtn.disabled = false;
            if (icon) icon.className = 'fa-solid fa-download';
          });
        return;
      }
      const photoZipBtn = e.target.closest('.photo-download-all-btn');
      if (photoZipBtn) {
        const sourceUrl = photoZipBtn.getAttribute('data-url');
        const originalHtml = photoZipBtn.innerHTML;
        photoZipBtn.disabled = true;
        photoZipBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membungkus ZIP...';
        fetch(`${YTDLP_API_URL}/download-photos-zip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sourceUrl }),
        })
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'tiktok-foto.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
          })
          .catch(err => alert(`Gagal membuat ZIP foto: ${err.message}`))
          .finally(() => {
            photoZipBtn.disabled = false;
            photoZipBtn.innerHTML = originalHtml;
          });
      }
    });
  }

  // ---------- Progress card (indikator loading yang lebih jelas dari spinner polos) ----------
  let progressTimerInterval = null;

  function renderProgressCard(label) {
    return `
      <div class="progress-card">
        <div class="progress-header"><i class="fa-solid fa-spinner fa-spin"></i> <span>${escapeHtml(label)}</span></div>
        <div class="progress-bar-track"><div class="progress-bar-fill"></div></div>
        <div class="progress-elapsed">Sudah berjalan <span id="progress-elapsed-time">0</span> detik</div>
      </div>
    `;
  }

  function startProgressTimer() {
    stopProgressTimer();
    const startedAt = Date.now();
    progressTimerInterval = setInterval(() => {
      const el = document.getElementById('progress-elapsed-time');
      if (!el) return; // resultBox sudah diganti isinya (proses selesai)
      el.textContent = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
  }

  function stopProgressTimer() {
    if (progressTimerInterval) {
      clearInterval(progressTimerInterval);
      progressTimerInterval = null;
    }
  }

  function setControlsDisabled(disabled) {
    platformBtns.forEach(b => { b.disabled = disabled; });
    qualityBtns.forEach(b => { b.disabled = disabled; });
  }

  // ---------- Preview thumbnail otomatis (sebelum user klik Download) ----------
  function clearUrlPreview() {
    if (!urlPreviewBox) return;
    previewDebounceTimer && clearTimeout(previewDebounceTimer);
    previewRequestToken++; // batalkan hasil fetch preview yang masih nyantol di udara
    urlPreviewBox.innerHTML = '';
  }

  function scheduleUrlPreview() {
    if (!urlPreviewBox) return;
    previewDebounceTimer && clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(runUrlPreview, 700);
  }

  async function runUrlPreview() {
    const rawInput = mediaUrlInput.value.trim();
    const urls = extractUrls(rawInput);

    // Preview otomatis cuma buat 1 link tunggal yang jelas (bukan playlist,
    // bukan multi-link, biar nggak boros kuota rate-limit backend).
    if (urls.length !== 1 || isYoutubePlaylist(urls[0])) {
      urlPreviewBox.innerHTML = '';
      return;
    }

    const url = urls[0];
    const platform = getPlatformFromUrl(url);
    if (platform === 'unknown') {
      urlPreviewBox.innerHTML = '';
      return;
    }

    const quality = platform === 'spotify' ? 'mp3' : selectedQuality;
    const cacheKey = `${url}|${quality}`;
    const myToken = ++previewRequestToken;

    if (previewCache.has(cacheKey)) {
      renderUrlPreviewCard(previewCache.get(cacheKey), platform);
      return;
    }

    urlPreviewBox.innerHTML = `
      <div class="url-preview-card is-loading">
        <div class="url-preview-skeleton"></div>
        <div class="url-preview-info">
          <div class="url-preview-title">Mengambil pratinjau...</div>
        </div>
      </div>
    `;

    try {
      let data;
      if (isTikTokPhotoUrl(url)) {
        data = await callYtdlpPhotoApi(url).catch(() => callTikwmPhotoFallback(url));
      } else if (quality === 'mp3') {
        data = await callYtdlpAudioApi(url);
      } else {
        try {
          data = await callYtdlpVideoApi(url, quality);
        } catch (err) {
          if (err.status === 429) throw err;
          data = await callTikwmFallback(url, platform);
        }
      }
      if (myToken !== previewRequestToken) return; // user udah ganti link, hasil ini basi
      previewCache.set(cacheKey, data);
      renderUrlPreviewCard(data, platform);
    } catch (err) {
      if (myToken !== previewRequestToken) return;
      urlPreviewBox.innerHTML = ''; // gagal preview: diam aja, biar tombol Download yang nanti nunjukin error-nya
    }
  }

  function renderUrlPreviewCard(data, platform) {
    if (!urlPreviewBox) return;
    const title = data.title || 'Tanpa judul';
    const thumb = data.thumbnail;
    const durationTxt = data.duration ? formatDuration(data.duration) : '';
    const platformLabel = (data.platform || platform || '').toString().toUpperCase();
    const metaParts = [platformLabel, durationTxt].filter(Boolean).join(' • ');

    urlPreviewBox.innerHTML = `
      <div class="url-preview-card">
        ${thumb
          ? `<img src="${escapeHtml(thumb)}" alt="thumbnail" onerror="this.outerHTML='<div class=&quot;url-preview-icon-fallback&quot;><i class=&quot;fa-solid fa-film&quot;></i></div>'">`
          : `<div class="url-preview-icon-fallback"><i class="fa-solid fa-film"></i></div>`}
        <div class="url-preview-info">
          <div class="url-preview-title">${escapeHtml(title)}</div>
          <div class="url-preview-meta">${escapeHtml(metaParts)}</div>
        </div>
      </div>
    `;
  }

  function setBtnLoading(btn, loading, loadingHtml, normalHtml) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? loadingHtml : normalHtml;
  }

  async function processOneLink(url, quality) {
    const platform = getPlatformFromUrl(url);
    if (platform === 'unknown') {
      return renderResultCard(url, 'unknown', quality, null, null, 'Link tidak dikenali.');
    }

    // Kalau baru saja di-preview dengan url+quality yang persis sama, pakai
    // hasil itu langsung daripada nge-fetch ulang ke server.
    const cacheKey = `${url}|${quality}`;
    if (previewCache.has(cacheKey)) {
      const cached = previewCache.get(cacheKey);
      previewCache.delete(cacheKey);
      if (cached && cached.type === 'photo') {
        return renderPhotoResultCard(url, cached, 'yt-dlp API', null);
      }
      return renderResultCard(url, platform, quality, cached, 'yt-dlp API', null);
    }

    let data, source;
    try {
      if (quality === 'mp3') {
        data = await callYtdlpAudioApi(url);
        source = 'yt-dlp API';
      } else {
        try {
          data = await callYtdlpVideoApi(url, quality);
          source = 'yt-dlp API';
        } catch (err) {
          if (err.status === 429) throw err;
          data = await callTikwmFallback(url, platform);
          source = data._source;
        }
      }
    } catch (err) {
      if (err.status === 429) {
        return renderRateLimitBanner(err.retryAfter || 30);
      }
      return renderResultCard(url, platform, quality, null, null, err.message);
    }
    // Link pendek TikTok (vt.tiktok.com/xxx) baru ketahuan post foto/slide
    // setelah di-resolve di server, jadi baru bisa dideteksi di sini (bukan
    // dari pola URL /photo/ seperti isTikTokPhotoUrl di awal).
    if (data && data.type === 'photo') {
      return renderPhotoResultCard(url, data, source, null);
    }
    return renderResultCard(url, platform, quality, data, source, null);
  }

  // ---------- Playlist YouTube: tampilkan checklist video untuk dipilih ----------
  async function handlePlaylistUrl(playlistUrl) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = renderProgressCard('Membaca daftar video di playlist...');
    startProgressTimer();
    setBtnLoading(downloadBtn, true, '<i class="fa-solid fa-spinner fa-spin"></i>', downloadBtn.innerHTML);
    setControlsDisabled(true);

    let info;
    try {
      info = await callPlaylistInfoApi(playlistUrl);
    } catch (err) {
      stopProgressTimer();
      if (err.status === 429) {
        resultBox.innerHTML = renderRateLimitBanner(err.retryAfter || 30);
      } else {
        resultBox.innerHTML = `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ Gagal membaca playlist: ${escapeHtml(err.message)}</span></div>`;
      }
      setBtnLoading(downloadBtn, false, '', downloadBtn.innerHTML);
      setControlsDisabled(false);
      return;
    } finally {
      setBtnLoading(downloadBtn, false, '', '<i class="fa-solid fa-arrow-down"></i>');
    }

    stopProgressTimer();
    setControlsDisabled(false);

    const items = info.items || [];
    const truncatedNote = info.truncated
      ? `<p style="font-size:10.5px; color:var(--text-sub); margin-top:4px;">Menampilkan ${items.length} video pertama dari playlist ini.</p>` : '';

    resultBox.innerHTML = `
      <div class="playlist-picker">
        <div class="playlist-header">
          <span>🎵 ${escapeHtml(info.playlist_title)} — pilih maks ${MAX_LINKS} video</span>
          <span id="playlist-selected-count">0/${MAX_LINKS}</span>
        </div>
        <div class="playlist-items">
          ${items.map((it, idx) => `
            <label class="playlist-item">
              <input type="checkbox" class="playlist-check" data-url="${escapeHtml(it.url)}" data-title="${escapeHtml(it.title)}">
              ${it.thumbnail ? `<img src="${escapeHtml(it.thumbnail)}" onerror="this.style.display='none'">` : ''}
              <span class="playlist-item-title">${escapeHtml(it.title)}</span>
              <span style="font-size:10.5px; color:var(--text-sub); flex-shrink:0;">${it.duration ? escapeHtml(formatDuration(it.duration)) : ''}</span>
            </label>
          `).join('')}
        </div>
        ${truncatedNote}
        <button type="button" id="playlist-process-btn" class="ios-btn-secondary" style="margin-top:10px; width:100%; padding:10px; border:none; border-radius:4px; cursor:pointer;" disabled>
          Pilih video dulu untuk diproses
        </button>
      </div>
    `;

    const checks = resultBox.querySelectorAll('.playlist-check');
    const countLabel = resultBox.querySelector('#playlist-selected-count');
    const processBtn = resultBox.querySelector('#playlist-process-btn');

    function updateSelection() {
      const checked = resultBox.querySelectorAll('.playlist-check:checked');
      countLabel.textContent = `${checked.length}/${MAX_LINKS}`;
      checks.forEach(c => { if (!c.checked) c.disabled = checked.length >= MAX_LINKS; });
      processBtn.disabled = checked.length === 0;
      processBtn.textContent = checked.length === 0
        ? 'Pilih video dulu untuk diproses'
        : `⬇️ Proses ${checked.length} Video Terpilih`;
    }
    checks.forEach(c => c.addEventListener('change', updateSelection));

    processBtn.addEventListener('click', async () => {
      const selectedUrls = Array.from(resultBox.querySelectorAll('.playlist-check:checked')).map(c => c.getAttribute('data-url'));
      if (!selectedUrls.length) return;
      await runBatchDownload(selectedUrls);
    });
  }

  // ---------- Alur proses batch (dipakai flow normal & hasil pilihan playlist) ----------
  async function runBatchDownload(urls) {
    resultBox.style.display = 'block';
    clearUrlPreview();
    resultBox.innerHTML = renderProgressCard(
      urls.length > 1 ? `Memproses ${urls.length} link satu-satu...` : 'Memproses...'
    );
    startProgressTimer();
    setControlsDisabled(true);

    lastBatch = [];
    if (zipBtn) zipBtn.style.display = 'none';

    const cards = [];
    try {
      for (const url of urls) {
        let card;
        if (isTikTokPhotoUrl(url)) {
          card = await processTikTokPhoto(url);
        } else {
          const platform = getPlatformFromUrl(url);
          const quality = platform === 'spotify' ? 'mp3' : selectedQuality;
          card = await processOneLink(url, quality);
          lastBatch.push({ url, quality });
        }
        cards.push(card);
      }
    } finally {
      stopProgressTimer();
      setControlsDisabled(false);
    }
    resultBox.innerHTML = cards.join('');
    renderHistory();
    if (zipBtn && lastBatch.length > 1) {
      zipBtn.style.display = 'block';
    }
  }

  if (downloadBtn) {
    const downloadBtnDefaultHtml = downloadBtn.innerHTML;
    downloadBtn.addEventListener('click', async () => {
      const rawInput = mediaUrlInput.value.trim();
      if (!rawInput) { alert('Masukkan link dulu!'); return; }

      const urls = extractUrls(rawInput);
      if (urls.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '⚠️ Link tidak valid. Pastikan diawali http/https.';
        return;
      }

      // Playlist YouTube: alih-alih langsung download, tampilkan checklist dulu.
      if (urls.length === 1 && isYoutubePlaylist(urls[0])) {
        await handlePlaylistUrl(urls[0]);
        return;
      }

      setBtnLoading(downloadBtn, true, '<i class="fa-solid fa-spinner fa-spin"></i>', downloadBtnDefaultHtml);
      if (thumbBtn) thumbBtn.disabled = true;
      try {
        await runBatchDownload(urls);
      } finally {
        setBtnLoading(downloadBtn, false, '', downloadBtnDefaultHtml);
        if (thumbBtn) thumbBtn.disabled = false;
      }
    });
  }

  if (zipBtn) {
    const zipBtnDefaultHtml = zipBtn.innerHTML;
    zipBtn.addEventListener('click', async () => {
      if (!lastBatch.length) return;

      setBtnLoading(zipBtn, true, '<i class="fa-solid fa-spinner fa-spin"></i> Membungkus ZIP...', zipBtnDefaultHtml);
      try {
        const res = await fetch(`${YTDLP_API_URL}/download-zip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lastBatch),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { msg = (await res.json()).message || msg; } catch {}
          throw new Error(msg);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'downloads.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        alert(`Gagal membuat ZIP: ${err.message}`);
      } finally {
        setBtnLoading(zipBtn, false, '', zipBtnDefaultHtml);
      }
    });
  }

  if (thumbBtn) {
    const thumbBtnDefaultHtml = thumbBtn.innerHTML;
    thumbBtn.addEventListener('click', async () => {
      const url = mediaUrlInput.value.trim();
      if (!url) { alert('Masukkan link dulu!'); return; }

      setBtnLoading(thumbBtn, true, '<i class="fa-solid fa-spinner fa-spin"></i> Mengambil...', thumbBtnDefaultHtml);
      if (downloadBtn) downloadBtn.disabled = true;

      const encodedUrl = encodeURIComponent(url);
      try {
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodedUrl}`);
        const data = await res.json();
        const cover = data.data?.cover || '';
        if (cover) {
          window.open(cover, '_blank');
        } else {
          alert('Gagal mendapatkan thumbnail.');
        }
      } catch {
        alert('Gagal mendapatkan thumbnail.');
      } finally {
        setBtnLoading(thumbBtn, false, '', thumbBtnDefaultHtml);
        if (downloadBtn) downloadBtn.disabled = false;
      }
    });
  }

  // ---------- Universal Button Sound Effect ----------
  // Trigger suara untuk semua buttons (kecuali yang memiliki atribut data-no-sound)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && !btn.hasAttribute('data-no-sound')) {
      playSound(800, 80); // 800 Hz, 80ms
    }
  }, true); // Capture phase untuk catch semua clicks

  renderHistory();
});
