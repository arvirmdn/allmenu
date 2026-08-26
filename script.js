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

  document.addEventListener('touchmove', (e) => {
    if (e.scale !== undefined && e.scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.querySelector('i').className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

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

  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.getAttribute('data-platform');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
    });
  });

  // Logika Fallback API yang Lebih Kuat (Menerima code 0, 200, atau success)
  async function tryAPIs(apis) {
    for (let i = 0; i < apis.length; i++) {
      try {
        const res = await fetch(apis[i]);
        if (!res.ok) throw new Error('HTTP Error: ' + res.status);
        const data = await res.json();
        
        // Deteksi sukses yang lebih fleksibel
        const isSuccess = data.code === 0 || data.code === 200 || data.success === true || data.status === 'success';
        
        if (isSuccess) {
          return data; 
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

    // Daftar API Cadangan yang Diperbanyak
    let apis = [];
    if (currentPlatform === 'tiktok') {
      apis = [
        `https://www.tikwm.com/api/?url=${encodedUrl}`,
        `https://tikwm.com/api/?url=${encodedUrl}`,
        `https://api.vevioz.com/api/button/tiktok?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'youtube') {
      apis = [
        `https://api.vevioz.com/api/button/mp3?url=${encodedUrl}`,
        `https://api.vevioz.com/api/button/mp4?url=${encodedUrl}`,
        `https://api.downloadly.app/api/youtube?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'instagram') {
      apis = [
        `https://api.vevioz.com/api/button/instagram?url=${encodedUrl}`,
        `https://api.downloadly.app/api/instagram?url=${encodedUrl}`,
        `https://api.snapinsta.app/api/v1/instagram?url=${encodedUrl}`
      ];
    } else if (currentPlatform === 'facebook') {
      apis = [
        `https://api.vevioz.com/api/button/facebook?url=${encodedUrl}`,
        `https://api.downloadly.app/api/facebook?url=${encodedUrl}`
      ];
    }

    try {
      const data = await tryAPIs(apis);

      // === EKSTRAKSI DATA HD (PRIORITAS TERTINGGI) ===
      let videoUrl = data.data?.wmplay || data.data?.hdplay || data.data?.play || 
                     data.data?.url || data.url || data.link || data.data?.video || "";
      
      let audioUrl = data.data?.music || data.data?.audio || data.audio || data.mp3 || "";

      // Jika API mengembalikan HTML (Vevioz), kita ekstrak link mp4/mp3 via Regex
      if (typeof videoUrl === 'string' && videoUrl.includes('<')) {
        const urlMatch = videoUrl.match(/href="([^"]+\.(mp4|mov|webm)[^"]*)"/i);
        if (urlMatch) videoUrl = urlMatch[1];
      }
      if (typeof audioUrl === 'string' && audioUrl.includes('<')) {
        const urlMatch = audioUrl.match(/href="([^"]+\.(mp3|m4a)[^"]*)"/i);
        if (urlMatch) audioUrl = urlMatch[1];
      }

      let cover = data.data?.cover || data.cover || '';
      let title = data.data?.title || 'Media Berhasil Diproses (HD)';

      let htmlButtons = `<div style="display:flex; gap:8px;">`;
      
      if (videoUrl) {
        htmlButtons += `<a href="${videoUrl}" target="_blank" download class="download-option-btn" style="background:var(--ios-blue);">⬇️ Unduh MP4 (HD)</a>`;
      }
      
      if (audioUrl) {
        htmlButtons += `<a href="${audioUrl}" target="_blank" download class="download-option-btn" style="background:var(--accent-green);">🎵 Unduh MP3</a>`;
      }
      
      if (!videoUrl && !audioUrl) {
        resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal mendapatkan link HD. API mungkin tidak mendukung media ini.</span>';
        return;
      }

      htmlButtons += `</div>`;

      resultBox.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:10px; align-items:center;">
            ${cover ? `<img src="${cover}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;">` : ''}
            <div style="overflow:hidden;">
              <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
              <p style="font-size:11px; color:var(--text-sub);">Kualitas Terbaik Tersedia</p>
            </div>
          </div>
          ${htmlButtons}
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal! Semua API sedang gangguan. Coba lagi nanti atau ganti link.</span>';
    }
  });
});