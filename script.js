document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const shareBtn = document.getElementById('share-btn');
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

  // ===== CEK PLATFORM =====
  function getPlatformFromUrl(url) {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'unknown';
  }

  // ===== DISABLE ZOOM (Mobile) =====
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== undefined && e.scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });

  // ===== THEME TOGGLE =====
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.querySelector('i').className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });

  // ===== SHARE =====
  shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: 'arvirmdn - Vintage Hub',
      text: 'Kunjungi website arvirmdn! Ada downloader TikTok dan berbagai fitur menarik.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Gagal membagikan:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link berhasil disalin! Silakan tempel di aplikasi lain.');
      } catch (err) {
        alert('Gagal menyalin link. Silakan salin manual: ' + window.location.href);
      }
    }
  });

  // ===== TAB NAVIGATION =====
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // ===== MUSIC =====
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

  // ===== PLATFORM SELECTOR =====
  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.getAttribute('data-platform');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
    });
  });

  // ===== DETECT PLATFORM FROM INPUT =====
  mediaUrlInput.addEventListener('input', () => {
    const url = mediaUrlInput.value.trim();
    const platform = getPlatformFromUrl(url);
    if (platform !== 'unknown') {
      platformBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-platform') === platform) {
          btn.classList.add('active');
        }
      });
      currentPlatform = platform;
    }
  });

  // ===== DOWNLOAD =====
  downloadBtn.addEventListener('click', async () => {
    const url = mediaUrlInput.value.trim();
    if (!url) {
      alert("Masukkan tautan video terlebih dahulu!");
      return;
    }

    // Cek platform
    const platform = getPlatformFromUrl(url);
    if (platform === 'unknown') {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '⚠️ Link tidak dikenali. Pastikan dari TikTok, YouTube, Instagram, Facebook, Twitter, atau Vimeo.';
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

    try {
      // PAKAI API COBALT SENDIRI
      const response = await fetch('https://api-production-7adf2.up.railway.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'auto',
          videoQuality: '720'
        })
      });

      const data = await response.json();

      if (data.status === 'error' || !data.url) {
        throw new Error(data.message || 'Gagal mendapatkan link download');
      }

      let cover = data.thumbnail || data.cover || '';
      let title = data.filename || data.title || 'Video berhasil diproses';
      let videoUrl = data.url;
      let audioUrl = data.audio || '';

      let htmlButtons = `<div style="display:flex; gap:8px; flex-wrap:wrap;">`;
      
      if (videoUrl) {
        htmlButtons += `<a href="${videoUrl}" target="_blank" download class="download-option-btn" style="background:var(--ios-blue); flex:1; text-align:center; padding:10px; border-radius:8px; text-decoration:none; color:#fff; font-weight:700;">⬇️ Unduh Video</a>`;
      }
      
      if (audioUrl) {
        htmlButtons += `<a href="${audioUrl}" target="_blank" download class="download-option-btn" style="background:var(--accent-green); flex:1; text-align:center; padding:10px; border-radius:8px; text-decoration:none; color:#fff; font-weight:700;">🎵 Unduh Audio</a>`;
      }
      
      if (!videoUrl && !audioUrl) {
        resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal mendapatkan link. Coba link lain.</span>';
        return;
      }

      htmlButtons += `</div>`;

      resultBox.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; gap:10px; align-items:center;">
            ${cover ? `<img src="${cover}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
            <div style="overflow:hidden;">
              <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
              <p style="font-size:11px; color:var(--text-sub);">Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
            </div>
          </div>
          ${htmlButtons}
        </div>
      `;

    } catch (err) {
      resultBox.innerHTML = `<span style="color:#ff3b30;">❌ Error: ${err.message}</span>`;
    }
  });
});