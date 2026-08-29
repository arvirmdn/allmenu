// ===== DOWNLOAD DENGAN FALLBACK =====
downloadBtn.addEventListener('click', async () => {
  const url = mediaUrlInput.value.trim();
  if (!url) {
    alert("Masukkan tautan video terlebih dahulu!");
    return;
  }

  resultBox.style.display = 'block';
  resultBox.innerHTML = '<div style="text-align:center; color:var(--text-sub);"><i class="fa-solid fa-spinner fa-spin"></i> Memproses video...</div>';

  const encodedUrl = encodeURIComponent(url);

  // Daftar API: Cobalt dulu, baru fallback ke TikWM
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

      // Cek response Cobalt
      let videoUrl = data.url || data.data?.url || data.data?.play || data.data?.wmplay || '';
      let audioUrl = data.audio || data.data?.music || '';
      let cover = data.thumbnail || data.cover || data.data?.cover || '';
      let title = data.filename || data.title || data.data?.title || 'Video';

      // Kalo dapet videoUrl, berhasil
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