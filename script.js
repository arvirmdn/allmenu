document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const downloadBtn = document.getElementById('download-btn');
  const tiktokUrlInput = document.getElementById('tiktok-url');
  const resultBox = document.getElementById('result-box');

  let isPlaying = false;

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

  // 4. Fitur TikTok Downloader (TikWM API)
  downloadBtn.addEventListener('click', async () => {
    const url = tiktokUrlInput.value.trim();
    if (!url) {
      alert("Masukkan tautan TikTok terlebih dahulu!");
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.code === 0) {
        const v = data.data;
        resultBox.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px; align-items:center;">
              <img src="${v.cover}" style="width:48px; height:48px; border-radius:10px; object-fit:cover;">
              <div style="overflow:hidden;">
                <p style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title || 'Video TikTok'}</p>
                <p style="font-size:11px; color:var(--text-sub);">@${v.author.unique_id}</p>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <a href="${v.play}" target="_blank" download style="flex:1; text-align:center; background:var(--ios-blue); color:#fff; padding:8px; border-radius:10px; text-decoration:none; font-size:12px; font-weight:600;">Unduh Video</a>
              <a href="${v.music}" target="_blank" download style="flex:1; text-align:center; background:var(--card-bg); color:var(--text-main); border:1px solid var(--border-color); padding:8px; border-radius:10px; text-decoration:none; font-size:12px; font-weight:600;">Unduh MP3</a>
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = '<span style="color:#ff3b30;">Gagal! Pastikan link video TikTok valid.</span>';
      }
    } catch (err) {
      resultBox.innerHTML = '<span style="color:#ff3b30;">Terjadi kesalahan koneksi.</span>';
    }
  });
});