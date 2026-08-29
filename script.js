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

  // ===== THEME TOGGLE =====
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggle.querySelector('i').className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  }

  // ===== SHARE =====
  if (shareBtn) {
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
          alert('Link berhasil disalin!');
        } catch (err) {
          alert('Gagal menyalin link. Silakan salin manual: ' + window.location.href);
        }
      }
    });
  }

  // ===== TAB NAVIGATION =====
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

  // ===== MUSIC =====
  if (musicBtn) {
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
  }

  // ===== PLATFORM SELECTOR =====
  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
    });
  });

  // ===== DETECT PLATFORM FROM INPUT =====
  if (mediaUrlInput) {
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
      }
    });
  }

  // ===== DOWNLOAD =====
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const url = mediaUrlInput.value.trim();
      if (!url) {
        alert("Masukkan tautan video terlebih dahulu!");
        return;
      }

      const platform = getPlatformFromUrl(url);
      if (platform === 'unknown') {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '⚠️ Link tidak dikenali. Pastikan dari TikTok, YouTube, Instagram, Facebook, Twitter, atau Vimeo.';
        return;
      }

      resultBox.style.display = 'block';
      resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

      const encodedUrl = encodeURIComponent(url);

      // API list: Cobalt dulu, fallback ke TikWM
      const apis = [
        {
          name: 'Cobalt',
          url: 'https://api-production-7adf2.up.railway.app/',
          method: 'POST',
          body: JSON.stringify({ url, downloadMode: 'auto', videoQuality: '720' }),
          headers: { 'Content-Type': 'application/json' }
        },
        {
          name: 'TikWM',
          url: `https://www.tikwm.com/api/?url=${encodedUrl}`,
          method: 'GET'
        },
        {
          name: 'TikWM Mirror',
          url: `https://tikwm.com/api/?url=${encodedUrl}`,
          method: 'GET'
        }
      ];

      let success = false;

      for (const api of apis) {
        try {
          let response;
          if (api.method === 'POST') {
            response = await fetch(api.url, {
              method: 'POST',
              headers: api.headers,
              body: api.body
            });
          } else {
            response = await fetch(api.url);
          }

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();

          let videoUrl = data.url || data.data?.url || data.data?.play || data.data?.wmplay || '';
          let audioUrl = data.audio || data.data?.music || '';
          let cover = data.thumbnail || data.cover || data.data?.cover || '';
          let title = data.filename || data.title || data.data?.title || 'Video';

          if (videoUrl) {
            success = true;
            let htmlButtons = `<div style="display:flex; gap:8px; flex-wrap:wrap;">`;
            htmlButtons += `<a href="${videoUrl}" target="_blank" download class="download-option-btn" style="background:var(--ios-blue); flex:1; text-align:center; padding:10px; border-radius:8px; text-decoration:none; color:#fff; font-weight:700;">⬇️ Unduh Video</a>`;
            if (audioUrl) {
              htmlButtons += `<a href="${audioUrl}" target="_blank" download class="download-option-btn" style="background:var(--accent-green); flex:1; text-align:center; padding:10px; border-radius:8px; text-decoration:none; color:#fff; font-weight:700;">🎵 Unduh Audio</a>`;
            }
            htmlButtons += `</div>`;

            resultBox.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; gap:10px; align-items:center;">
                  ${cover ? `<img src="${cover}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
                  <div style="overflow:hidden;">
                    <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
                    <p style="font-size:11px; color:var(--text-sub);">via ${api.name}</p>
                  </div>
                </div>
                ${htmlButtons}
              </div>
            `;
            break;
          }
        } catch (err) {
          console.warn(`API ${api.name} gagal:`, err.message);
        }
      }

      if (!success) {
        resultBox.innerHTML = '<span style="color:#ff3b30;">❌ Gagal! Coba link lain atau cek koneksi.</span>';
      }
    });
  }
});