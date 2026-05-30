(() => {
  const PASSWORD = '0000';

  // ── State ──────────────────────────────────────────────
  let photos = [];   // [{ id, src, alt }]
  let lbIndex = 0;
  let triggerClicks = 0;
  let triggerTimer = null;

  // ── DOM refs ───────────────────────────────────────────
  const gallery      = document.getElementById('gallery');
  const emptyState   = document.getElementById('empty-state');
  const adminTrigger = document.getElementById('admin-trigger');
  const pwModal      = document.getElementById('pw-modal');
  const pwInput      = document.getElementById('pw-input');
  const pwSubmit     = document.getElementById('pw-submit');
  const pwError      = document.getElementById('pw-error');
  const adminPanel   = document.getElementById('admin-panel');
  const closeAdmin   = document.getElementById('close-admin');
  const photoUrl     = document.getElementById('photo-url');
  const photoAltUrl  = document.getElementById('photo-alt-url');
  const addUrlBtn    = document.getElementById('add-url-btn');
  const photoFile    = document.getElementById('photo-file');
  const photoAltUp   = document.getElementById('photo-alt-upload');
  const addFileBtn   = document.getElementById('add-file-btn');
  const thumbList    = document.getElementById('admin-thumb-list');
  const lightbox     = document.getElementById('lightbox');
  const lbImg        = document.getElementById('lb-img');
  const lbCaption    = document.getElementById('lb-caption');
  const lbClose      = document.getElementById('lb-close');
  const lbPrev       = document.getElementById('lb-prev');
  const lbNext       = document.getElementById('lb-next');
  const tabBtns      = document.querySelectorAll('.tab-btn');
  const tabUrl       = document.getElementById('tab-url');
  const tabUpload    = document.getElementById('tab-upload');

  // ── API ────────────────────────────────────────────────
  async function apiGet() {
    const r = await fetch('/api/photos');
    return r.json();
  }

  async function apiAdd(src, alt) {
    const r = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src, alt }),
    });
    return r.json();
  }

  async function apiDelete(id) {
    await fetch(`/api/photos/${id}`, { method: 'DELETE' });
  }

  // ── Gallery render ─────────────────────────────────────
  function renderGallery() {
    gallery.innerHTML = '';
    emptyState.classList.toggle('hidden', photos.length > 0);

    photos.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || '';
      img.loading = 'lazy';

      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.textContent = p.alt || '';

      item.appendChild(img);
      if (p.alt) item.appendChild(overlay);
      item.addEventListener('click', () => openLightbox(i));
      gallery.appendChild(item);
    });
  }

  // ── Admin thumbnails ───────────────────────────────────
  function renderAdminThumbs() {
    thumbList.innerHTML = '';
    photos.forEach((p) => {
      const wrap = document.createElement('div');
      wrap.className = 'admin-thumb';

      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || '';

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.innerHTML = '&#x2715;';
      del.title = 'Remove';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        await apiDelete(p.id);
        photos = photos.filter(x => x.id !== p.id);
        renderGallery();
        renderAdminThumbs();
      });

      wrap.appendChild(img);
      wrap.appendChild(del);
      thumbList.appendChild(wrap);
    });
  }

  // ── Hidden trigger — 5 quick clicks on "Portfolio" title ──
  adminTrigger.addEventListener('click', () => {
    triggerClicks++;
    clearTimeout(triggerTimer);
    triggerTimer = setTimeout(() => { triggerClicks = 0; }, 1500);
    if (triggerClicks >= 5) {
      triggerClicks = 0;
      clearTimeout(triggerTimer);
      openPasswordModal();
    }
  });

  // ── Password modal ─────────────────────────────────────
  function openPasswordModal() {
    pwInput.value = '';
    pwError.classList.add('hidden');
    pwModal.classList.remove('hidden');
    setTimeout(() => pwInput.focus(), 50);
  }

  function checkPassword() {
    if (pwInput.value === PASSWORD) {
      pwModal.classList.add('hidden');
      openAdmin();
    } else {
      pwError.classList.remove('hidden');
      pwInput.value = '';
      pwInput.focus();
    }
  }

  pwSubmit.addEventListener('click', checkPassword);
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });
  pwModal.addEventListener('click', e => { if (e.target === pwModal) pwModal.classList.add('hidden'); });

  // ── Admin panel ────────────────────────────────────────
  function openAdmin() {
    renderAdminThumbs();
    adminPanel.classList.remove('hidden');
  }

  closeAdmin.addEventListener('click', () => adminPanel.classList.add('hidden'));
  adminPanel.addEventListener('click', e => { if (e.target === adminPanel) adminPanel.classList.add('hidden'); });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      tabUrl.classList.toggle('hidden', tab !== 'url');
      tabUpload.classList.toggle('hidden', tab !== 'upload');
    });
  });

  // add by URL
  addUrlBtn.addEventListener('click', async () => {
    const src = photoUrl.value.trim();
    if (!src) return;
    addUrlBtn.disabled = true;
    const photo = await apiAdd(src, photoAltUrl.value.trim());
    photos.push(photo);
    renderGallery();
    renderAdminThumbs();
    photoUrl.value = '';
    photoAltUrl.value = '';
    addUrlBtn.disabled = false;
  });

  // auto-upload as soon as files are selected
  photoFile.addEventListener('change', () => {
    const files = photoFile.files;
    if (!files.length) return;
    const alt = photoAltUp.value.trim();
    addFileBtn.textContent = `Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`;
    addFileBtn.disabled = true;
    let pending = files.length;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const photo = await apiAdd(e.target.result, alt);
          if (photo && photo.id) photos.push(photo);
        } catch (err) {
          console.error('Upload failed', err);
        }
        pending--;
        if (pending === 0) {
          renderGallery();
          renderAdminThumbs();
          photoFile.value = '';
          photoAltUp.value = '';
          addFileBtn.textContent = 'Add Photo';
          addFileBtn.disabled = false;
        }
      };
      reader.readAsDataURL(file);
    });
  });

  // ── Lightbox ───────────────────────────────────────────
  function openLightbox(index) {
    lbIndex = index;
    updateLightbox();
    lightbox.classList.remove('hidden');
  }

  function updateLightbox() {
    const p = photos[lbIndex];
    lbImg.src = p.src;
    lbImg.alt = p.alt || '';
    lbCaption.textContent = p.alt || '';
    lbPrev.style.visibility = lbIndex > 0 ? 'visible' : 'hidden';
    lbNext.style.visibility = lbIndex < photos.length - 1 ? 'visible' : 'hidden';
  }

  lbClose.addEventListener('click', () => lightbox.classList.add('hidden'));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.add('hidden'); });
  lbPrev.addEventListener('click', () => { if (lbIndex > 0) { lbIndex--; updateLightbox(); } });
  lbNext.addEventListener('click', () => { if (lbIndex < photos.length - 1) { lbIndex++; updateLightbox(); } });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft' && lbIndex > 0)                    { lbIndex--; updateLightbox(); }
      if (e.key === 'ArrowRight' && lbIndex < photos.length - 1)   { lbIndex++; updateLightbox(); }
      if (e.key === 'Escape') lightbox.classList.add('hidden');
    }
    if (!pwModal.classList.contains('hidden') && e.key === 'Escape') {
      pwModal.classList.add('hidden');
    }
  });

  // ── Init ───────────────────────────────────────────────
  async function init() {
    photos = await apiGet();
    renderGallery();
  }

  init();
})();
