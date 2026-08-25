document.addEventListener('DOMContentLoaded', () => {
  const musicBtn = document.getElementById('music-btn');
  const bgMusic = document.getElementById('bg-music');
  const downloadBtn = document.getElementById('download-btn');
  const tiktokUrlInput = document.getElementById('tiktok-url');
  const resultBox = document.getElementById('result-box');

  let isPlaying = false;

  // 1. Fitur Tombol Musik Background
  musicBtn.addEventListener('click', () => {
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.classList.remove('playing');
    } else {
      bgMusic.play().then(() => {
        musicBtn.classList.add('playing');
      }).catch(() => {
        alert("Pastikan file 'music.mp3' ada di folder repository Anda atau sentuh layar terlebih dahulu.");
      });
    }
    isPlaying = !isPlaying;
  });

  // 2. Fitur Downloader TikTok (TikWM API)
  downloadBtn.addEventListener('click', async () => {
    const url = tiktokUrlInput.value.trim();
    if (!url) {
      alert("Masukkan tautan TikTok terlebih dahulu!");
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; color:#8e8ea0;"><i class="fa-solid fa-circle-notch fa-spin"></i> Memproses video...</div>';

    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.code === 0) {
        const v = data.data;
        resultBox.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px; align-items:center;">
              <img src="${v.cover}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
              <div style="overflow:hidden;">
                <p style="font-weight:600; font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title || 'Video TikTok'}</p>
                <p style="font-size:11px; color:#8e8ea0;">By @${v.author.unique_id}</p>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <a href="${v.play}" target="_blank" download style="flex:1; text-align:center; background:#6366f1; color:#fff; padding:8px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:600;">Unduh Video</a>
              <a href="${v.music}" target="_blank" download style="flex:1; text-align:center; background:#23232c; color:#fff; padding:8px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:600;">Unduh MP3</a>
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = '<span style="color:#ef4444;">Gagal! Pastikan link video TikTok valid/publik.</span>';
      }
    } catch (err) {
      resultBox.innerHTML = '<span style="color:#ef4444;">Terjadi kesalahan koneksi.</span>';
    }
  });
});