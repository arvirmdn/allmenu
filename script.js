document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const shareBtn = document.getElementById('share-btn');
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const downloadBtn = document.getElementById('download-btn');
  const thumbBtn = document.getElementById('thumb-btn');
  const mediaUrlInput = document.getElementById('media-url');
  const resultBox = document.getElementById('result-box');
  const platformBtns = document.querySelectorAll('.platform-btn');
  const qualityBtns = document.querySelectorAll('.quality-btn');
  const historyList = document.getElementById('history-list');
  const historyBox = document.getElementById('history-box');

  let isPlaying = false;
  let selectedQuality = '720';

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
        <span style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.title || 'Video'}</span>
        <span style="color:var(--text-sub);">${item.platform || 'Unknown'}</span>
      </div>
    `).join('');
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

  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      if (isPlaying) {
        bgMusic.pause();
        musicBtn.classList.remove('playing');
      } else {
        bgMusic.play().then(() => musicBtn.classList.add('playing')).catch(() => alert('Sediakan music.mp3'));
      }
      isPlaying = !isPlaying;
    });
  }

  platformBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      platformBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resultBox.style.display = 'none';
      mediaUrlInput.value = '';
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
    });
  }

  const YTDLP_API_URL = 'https://web-production-0c5698.up.railway.app';

  async function callYtdlpVideoApi(url, quality) {
    const endpoint = `${YTDLP_API_URL}/download?url=${encodeURIComponent(url)}&quality=${quality}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!res.ok || data.status === 'error') {
      throw new Error(data.message || data.detail || `HTTP ${res.status}`);
    }
    return data;
  }

  async function callYtdlpAudioApi(url) {
    const endpoint = `${YTDLP_API_URL}/download-audio?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!res.ok || data.status === 'error') {
      throw new Error(data.message || data.detail || `HTTP ${res.status}`);
    }
    return data;
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

  function renderResultCard(url, platform, quality, data, source, errorMsg) {
    if (errorMsg) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ ${platform.toUpperCase()}: ${errorMsg}</span></div>`;
    }
    const fileUrl = data.download_url || data.video_url || data.audio_url;
    const title = data.title || (quality === 'mp3' ? 'Audio' : 'Video');
    if (!fileUrl) {
      return `<div style="padding:8px 0;"><span style="color:#ff3b30;">❌ ${platform.toUpperCase()}: Gagal, coba link/kualitas lain.</span></div>`;
    }
    saveHistory({ title, platform, url });
    const label = quality === 'mp3' ? '🎵 MP3' : `${quality}p`;
    return `
      <div style="display:flex; flex-direction:column; gap:10px; padding:10px 0; border-bottom:1px solid var(--border-color);">
        <div style="display:flex; gap:10px; align-items:center;">
          ${data.thumbnail ? `<img src="${data.thumbnail}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
          <div style="overflow:hidden; flex:1;">
            <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</p>
            <p style="font-size:11px; color:var(--text-sub);">${platform.toUpperCase()} • ${label} • via ${source}</p>
          </div>
          <button onclick="navigator.clipboard.writeText('${fileUrl}')" style="background:var(--input-bg); border:none; border-radius:4px; padding:6px 10px; cursor:pointer; font-size:12px;">📋 Salin</button>
        </div>
        <a href="${fileUrl}" target="_blank" download class="download-option-btn" style="background:var(--ios-blue);">⬇️ Download</a>
      </div>
    `;
  }

  async function processOneLink(url, quality) {
    const platform = getPlatformFromUrl(url);
    if (platform === 'unknown') {
      return renderResultCard(url, 'unknown', quality, null, null, 'Link tidak dikenali.');
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
          data = await callTikwmFallback(url, platform);
          source = data._source;
        }
      }
    } catch (err) {
      return renderResultCard(url, platform, quality, null, null, err.message);
    }
    return renderResultCard(url, platform, quality, data, source, null);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const rawInput = mediaUrlInput.value.trim();
      if (!rawInput) { alert('Masukkan link dulu!'); return; }

      const urls = extractUrls(rawInput);
      if (urls.length === 0) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = '⚠️ Link tidak valid. Pastikan diawali http/https.';
        return;
      }

      resultBox.style.display = 'block';
      resultBox.innerHTML = urls.length > 1
        ? `<div style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Memproses ${urls.length} link satu-satu...</div>`
        : '<div style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Memproses...</div>';

      const cards = [];
      for (const url of urls) {
        const platform = getPlatformFromUrl(url);
        const quality = platform === 'spotify' ? 'mp3' : selectedQuality;
        const card = await processOneLink(url, quality);
        cards.push(card);
        resultBox.innerHTML = cards.join('');
      }
      renderHistory();
    });
  }

  if (thumbBtn) {
    thumbBtn.addEventListener('click', async () => {
      const url = mediaUrlInput.value.trim();
      if (!url) { alert('Masukkan link dulu!'); return; }

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
      }
    });
  }

  renderHistory();
});