document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const downloadBtn = document.getElementById('download-btn');
  const mediaUrlInput = document.getElementById('media-url');
  const resultBox = document.getElementById('result-box');
  const platformBtns = document.querySelectorAll('.platform-btn');

  let isPlaying = false;
  let currentPlatform = 'tiktok';

  // Mencegah Zoom Gestur Pinch di HP
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== undefined && e.scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // 1. Fitur Toggle Dark/Light Mode
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.querySelector('i').className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });

  // 2. Fitur Navigasi Tab (Home & Tools)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // 3. Fitur Musik Background
  musicBtn.addEventListener('click', () => {
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.classList.remove('playing');
    } else {
      bgMusic.play().then(() => {
        musicBtn.classList.add('playing');
      }).catch(() => {
        alert("Sediakan file 'music.mp3' di repository atau ketuk layar terlebih dahulu.");
      });
    }
    isPlaying = !isPlaying;
  });

  // 4. Pilih Platform Downloader
  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.getAttribute('data-platform');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
    });
  });

  // 5. Sistem Multi-API / Fallback Downloader
  async function tryAPIs(apis) {
    for (let i = 0; i < apis.length; i++) {
      try {
        const res = await fetch(apis[i]);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        if (data.code === 0 || data.success || data.status === 'success') {
          return data; // Jika berhasil, langsung kembalikan data
        }
        throw new Error('API tidak valid');
      } catch (err) {
        console.warn(`API ke-${i + 1} gagal, mencoba berikutnya...`);
      }
    }
    throw new Error('Semua API gagal');
  }

  downloadBtn.addEventListener('click', async () => {
    const url = mediaUrlInput.value.trim();
    if (!url) {
      alert("Masukkan tautan terlebih dahulu!");
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

    const encodedUrl = encodeURIComponent(url);

    // Daftar API cadangan berdasarkan platform
    let apis = [];
    if (currentPlatform === 'tiktok') {
      apis = [
        `https://www.tikwm.com/api/?url=${encodedUrl}`,
        `https://api.vevioz.com/api/button/tiktok?url=${encodedUrl}`,
        `https://tikwm.com/api/?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'youtube') {
      apis = [
        `https://api.vevioz.com/api/button/mp3?url=${encodedUrl}`,
        `https://api.downloadly.app/api/youtube?url=${encodedUrl}`,
        `https://api.vevioz.com/api/button/mp4?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'instagram') {
      apis = [
        `https://api.vevioz.com/api/button/instagram?url=${encodedUrl}`,
        `https://api.downloadly.app/api/instagram?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'facebook') {
      apis = [
        `https://api.vevioz.com/api/button/facebook?url=${encodedUrl}`,
        `https://api.downloadly.app/api/facebook?url=${encodedUrl}`
      ];
    }

    try {
      // Coba semua API sampai ada yang berhasil
      const data = await tryAPIs(apis);

      // Tampilkan hasil (format dasar)
      let videoUrl = data.data?.play || data.url || data.link || data.video;
      let title = data.data?.title || 'Media Berhasil Diunduh';
      let cover = data.data?.cover || '';

      resultBox.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:10px; align-items:center;">
            ${cover ? `<img src="${cover}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;">` : ''}
            <div style="overflow:hidden;">
              <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
              <p style="font-size:11px; color:var(--text-sub);">Berhasil diproses!</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="${videoUrl}" target="_blank" download style="flex:1; text-align:center; background:var(--ios-blue); color:#fff; padding:8px; border-radius:10px; text-decoration:none; font-size:12px; font-weight:600;">Unduh Media</a>
          </div>
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal! Semua API sedang gangguan atau link tidak valid.</span>';
    }
  });
});