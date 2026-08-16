(() => {
  const SESSION_MINUTES = 120;
  const MAX_WORK_BLOCK = 45; // cap a single focus block so long tasks still get breaks
  const BREAK_MINUTES = 5;
  const DEFAULT_ESTIMATE = 30;

  let assignments = []; // { id, title, subject, dueDate, minutes }
  let nextId = 1;

  const listEl = document.getElementById('assignment-list');
  const emptyMsg = document.getElementById('empty-msg');
  const planBtn = document.getElementById('plan-btn');
  const uploadStatus = document.getElementById('upload-status');

  // ---------- priority ----------
  function daysUntil(dueDate) {
    if (!dueDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    return Math.round((due - today) / 86400000);
  }

  function priorityOf(dueDate) {
    const d = daysUntil(dueDate);
    if (d <= 1) return 'high';
    if (d <= 4) return 'medium';
    return 'low';
  }

  function priorityRank(p) {
    return { high: 0, medium: 1, low: 2 }[p];
  }

  // ---------- assignment CRUD ----------
  function addAssignment({ title, subject, dueDate, minutes }) {
    if (!title || !title.trim()) return;
    assignments.push({
      id: nextId++,
      title: title.trim(),
      subject: (subject || '').trim(),
      dueDate: dueDate || '',
      minutes: Number(minutes) > 0 ? Math.min(Number(minutes), 120) : DEFAULT_ESTIMATE,
    });
    renderAssignments();
  }

  function removeAssignment(id) {
    assignments = assignments.filter(a => a.id !== id);
    renderAssignments();
  }

  function renderAssignments() {
    listEl.innerHTML = '';
    emptyMsg.classList.toggle('hidden', assignments.length > 0);
    planBtn.disabled = assignments.length === 0;

    for (const a of assignments) {
      const li = document.createElement('li');
      li.className = 'assignment-item';

      const info = document.createElement('div');
      info.className = 'info';

      const title = document.createElement('div');
      title.className = 'title';
      const dot = document.createElement('span');
      dot.className = `priority-dot priority-${priorityOf(a.dueDate)}`;
      title.appendChild(dot);
      title.appendChild(document.createTextNode(a.title));
      info.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const bits = [];
      if (a.subject) bits.push(a.subject);
      if (a.dueDate) bits.push(`due ${a.dueDate}`);
      bits.push(`~${a.minutes} min`);
      meta.textContent = bits.join(' · ');
      info.appendChild(meta);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', () => removeAssignment(a.id));

      li.appendChild(info);
      li.appendChild(removeBtn);
      listEl.appendChild(li);
    }

    document.getElementById('plan-section').classList.add('hidden');
    document.getElementById('resources-section').classList.add('hidden');
  }

  document.getElementById('add-assignment-btn').addEventListener('click', () => {
    addAssignment({
      title: document.getElementById('a-title').value,
      subject: document.getElementById('a-subject').value,
      dueDate: document.getElementById('a-due').value,
      minutes: document.getElementById('a-minutes').value,
    });
    document.getElementById('a-title').value = '';
    document.getElementById('a-subject').value = '';
    document.getElementById('a-due').value = '';
    document.getElementById('a-minutes').value = '';
    document.getElementById('a-title').focus();
  });

  // ---------- screenshot upload ----------
  document.getElementById('screenshot-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.textContent = 'Reading screenshot…';
    const form = new FormData();
    form.append('screenshot', file);

    try {
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        uploadStatus.textContent = data.error || 'Could not read that screenshot.';
        return;
      }
      const found = data.assignments || [];
      found.forEach(a => addAssignment({
        title: a.title,
        subject: a.subject,
        dueDate: a.dueDate,
        minutes: DEFAULT_ESTIMATE,
      }));
      uploadStatus.textContent = found.length
        ? `Added ${found.length} assignment${found.length === 1 ? '' : 's'} from screenshot.`
        : 'No assignments found in that image — try a clearer screenshot or add manually.';
    } catch (err) {
      uploadStatus.textContent = 'Upload failed. Add assignments manually below.';
    } finally {
      e.target.value = '';
    }
  });

  // ---------- 2-hour scheduler ----------
  function buildPlan() {
    const sorted = [...assignments].sort((a, b) => {
      const pr = priorityRank(priorityOf(a.dueDate)) - priorityRank(priorityOf(b.dueDate));
      if (pr !== 0) return pr;
      return daysUntil(a.dueDate) - daysUntil(b.dueDate);
    });

    const blocks = [];
    const carryover = [];
    let elapsed = 0;

    for (const a of sorted) {
      let remaining = a.minutes;
      let firstChunk = true;

      while (remaining > 0) {
        const chunk = Math.min(remaining, MAX_WORK_BLOCK);

        if (elapsed + chunk > SESSION_MINUTES) {
          // doesn't fit — carry the rest of this assignment over
          if (firstChunk) carryover.push(a);
          else carryover.push({ ...a, title: `${a.title} (remainder)`, minutes: remaining });
          remaining = 0;
          break;
        }

        blocks.push({
          type: 'work',
          title: firstChunk ? a.title : `${a.title} (cont.)`,
          subject: a.subject,
          start: elapsed,
          duration: chunk,
        });
        elapsed += chunk;
        remaining -= chunk;
        firstChunk = false;

        if (remaining > 0 || elapsed < SESSION_MINUTES) {
          if (elapsed < SESSION_MINUTES && elapsed + BREAK_MINUTES <= SESSION_MINUTES && (remaining > 0 || sorted.indexOf(a) < sorted.length - 1)) {
            blocks.push({ type: 'break', start: elapsed, duration: BREAK_MINUTES });
            elapsed += BREAK_MINUTES;
          }
        }
      }

      if (elapsed >= SESSION_MINUTES) {
        const idx = sorted.indexOf(a);
        const rest = sorted.slice(idx + 1);
        carryover.push(...rest.filter(r => r !== a));
        break;
      }
    }

    return { blocks, carryover };
  }

  function fmtTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  function renderPlan({ blocks, carryover }) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    for (const b of blocks) {
      const row = document.createElement('div');
      row.className = `block ${b.type}`;
      const time = document.createElement('span');
      time.className = 'time';
      time.textContent = `${fmtTime(b.start)}–${fmtTime(b.start + b.duration)}`;
      row.appendChild(time);

      const label = document.createElement('span');
      if (b.type === 'work') {
        label.textContent = b.subject ? `${b.title} — ${b.subject}` : b.title;
      } else {
        label.textContent = 'Break';
      }
      row.appendChild(label);
      timeline.appendChild(row);
    }

    const carryoverEl = document.getElementById('carryover');
    const carryoverList = document.getElementById('carryover-list');
    carryoverList.innerHTML = '';
    if (carryover.length) {
      carryoverEl.classList.remove('hidden');
      for (const a of carryover) {
        const li = document.createElement('li');
        li.textContent = `${a.title}${a.subject ? ' — ' + a.subject : ''}`;
        carryoverList.appendChild(li);
      }
    } else {
      carryoverEl.classList.add('hidden');
    }

    document.getElementById('plan-section').classList.remove('hidden');
  }

  // ---------- resource links ----------
  function buildResourceLinks(a) {
    const query = encodeURIComponent([a.subject, a.title].filter(Boolean).join(' '));
    return [
      { label: 'Google', url: `https://www.google.com/search?q=${query}` },
      { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${query}` },
      { label: 'Khan Academy', url: `https://www.khanacademy.org/search?page_search_query=${query}` },
      { label: 'Quizlet', url: `https://quizlet.com/search?query=${query}&type=all` },
    ];
  }

  function renderResources() {
    const container = document.getElementById('resources-list');
    container.innerHTML = '';

    for (const a of assignments) {
      const group = document.createElement('div');
      group.className = 'resource-group';

      const h3 = document.createElement('h3');
      h3.textContent = a.subject ? `${a.title} — ${a.subject}` : a.title;
      group.appendChild(h3);

      const linksDiv = document.createElement('div');
      linksDiv.className = 'resource-links';
      for (const link of buildResourceLinks(a)) {
        const el = document.createElement('a');
        el.href = link.url;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.textContent = link.label;
        linksDiv.appendChild(el);
      }
      group.appendChild(linksDiv);
      container.appendChild(group);
    }

    document.getElementById('resources-section').classList.remove('hidden');
  }

  planBtn.addEventListener('click', () => {
    renderPlan(buildPlan());
    renderResources();
    document.getElementById('plan-section').scrollIntoView({ behavior: 'smooth' });
  });

  renderAssignments();
})();
