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
  let currentPlatform = 'tiktok'; // Hanya TikTok yang aktif

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

  // Platform buttons (hanya TikTok yang berfungsi)
  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Jika tombol disabled, jangan lakukan apa-apa
      if (btn.disabled) return;

      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.getAttribute('data-platform');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
    });
  });

  async function tryAPIs(apis) {
    for (let i = 0; i < apis.length; i++) {
      try {
        const res = await fetch(apis[i]);
        if (!res.ok) throw new Error('HTTP Error: ' + res.status);
        const data = await res.json();
        
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
      alert("Masukkan tautan TikTok terlebih dahulu!");
      return;
    }

    // Cegah jika platform selain TikTok dipilih (walaupun tombolnya dikunci)
    if (currentPlatform !== 'tiktok') {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '<span style="color:#ff3b30;">⚠️ Fitur YouTube, Instagram, dan Facebook sedang dalam perbaikan. Gunakan TikTok untuk saat ini.</span>';
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

    const encodedUrl = encodeURIComponent(url);

    // Hanya TikTok yang punya API list
    let apis = [
      `https://www.tikwm.com/api/?url=${encodedUrl}`,
      `https://tikwm.com/api/?url=${encodedUrl}`,
      `https://api.vevioz.com/api/button/tiktok?url=${encodedUrl}`
    ];

    try {
      const data = await tryAPIs(apis);

      let videoUrl = data.data?.wmplay || data.data?.hdplay || data.data?.play || 
                     data.data?.url || data.url || data.link || data.data?.video || "";
      
      let audioUrl = data.data?.music || data.data?.audio || data.audio || data.mp3 || "";

      if (typeof videoUrl === 'string' && videoUrl.includes('<')) {
        const urlMatch = videoUrl.match(/href="([^"]+\.(mp4|mov|webm)[^"]*)"/i);
        if (urlMatch) videoUrl = urlMatch[1];
      }
      if (typeof audioUrl === 'string' && audioUrl.includes('<')) {
        const urlMatch = audioUrl.match(/href="([^"]+\.(mp3|m4a)[^"]*)"/i);
        if (urlMatch) audioUrl = urlMatch[1];
      }

      let cover = data.data?.cover || data.cover || '';
      let title = data.data?.title || 'Video TikTok Berhasil Diproses';

      let htmlButtons = `<div style="display:flex; gap:8px;">`;
      
      if (videoUrl) {
        htmlButtons += `<a href="${videoUrl}" target="_blank" download class="download-option-btn" style="background:var(--ios-blue);">⬇️ Unduh MP4 (HD)</a>`;
      }
      
      if (audioUrl) {
        htmlButtons += `<a href="${audioUrl}" target="_blank" download class="download-option-btn" style="background:var(--accent-green);">🎵 Unduh MP3</a>`;
      }
      
      if (!videoUrl && !audioUrl) {
        resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal mendapatkan link. Coba link lain.</span>';
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
      resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal! API TikTok sedang gangguan. Coba lagi nanti.</span>';
    }
  });
});