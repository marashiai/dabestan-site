// Interactive parts for slide decks. A slide asks for one in its markdown with <!-- widget: name args -->;
// the server turns that into <div class="widget" data-widget="name" data-args="args">.
// They show on the shared screen, for talking about the results; participants do the exercises on their own phones
// (the session's exercises.html).
(() => {
  const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const h = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const button = (text, cls = 'w-btn') => Object.assign(h('button', cls, text), { type: 'button' });
  // Clicking while selecting text (to comment on it) shouldn't toggle anything.
  const selecting = () => !getSelection().isCollapsed;
  // Pick an option at random, weighted by its odds.
  const pick = (opts) => {
    let r = Math.random() * opts.reduce((a, o) => a + o.p, 0);
    for (const o of opts) if ((r -= o.p) < 0) return o;
    return opts.at(-1);
  };

  // Arguments: JSON when they start with "{", otherwise the plain string.
  // Photos live in images/ next to the slide text; the page says where that's served (data-images).
  const IMAGES = document.querySelector('[data-images]')?.dataset.images || '';
  const imageUrl = (name) => IMAGES + encodeURI(name);
  const CREDITS = JSON.parse(document.querySelector('[data-credits]')?.dataset.credits || '{}');
  const isImage = (name) => /\.(jpe?g|png|webp)$/i.test(name);
  // Simple drawn marks (no emoji): tick, cross, empty box, magnifier.
  const svg = (paths) => {
    const el = document.createElement('span');
    el.className = 'mark';
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
    return el;
  };
  const MARKS = {
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    blank: '<rect x="5" y="5" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3.2 2.6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  };
  const argsOf = (el) => { const a = (el.dataset.args || '').trim(); return a.startsWith('{') ? JSON.parse(a) : a; };
  // Pictures replace the paragraphs just before them on the slide (the slide text keeps the words for listening).
  const take = (el, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = el.previousElementSibling;
      if (!p || p.tagName !== 'P') break;
      out.unshift(p.textContent.trim());
      p.remove();
    }
    return out;
  };
  // A copy in random order (Fisher-Yates), so where the right answer sits is never a pattern.
  const shuffle = (list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const num = (n) => (n < 0 ? '−' : n > 0 ? '+' : '') + fa(Math.abs(n));
  const grouped = (n) => fa(n.toLocaleString('en-US').replace(/,/g, '٬'));
  // Splits "label: first sentence. the rest" into its parts (label only if short and without a full stop).
  function parts(text) {
    let t = text.replace(/^(یک|دو|سه|چهار|پنج|شش|هفت)\.\s*/, '');
    let head = '';
    const c = t.indexOf(':');
    if (c > 0 && c < 30 && !/[.؟?]/.test(t.slice(0, c))) { head = t.slice(0, c).trim(); t = t.slice(c + 1).trim(); }
    const m = t.match(/^(.+?[.؟?])\s+(.+)$/);
    return m ? { head, title: m[1], sub: m[2] } : { head, title: t, sub: '' };
  }
  // Bars grow when their slide (or fragment) shows.
  const bars = (rows, max) => rows.map(([label, value, extra]) => {
    const row = h('div', 'pic-bar-row');
    const track = h('div', 'pic-track'), fill = h('div', 'pic-fill');
    fill.style.setProperty('--w', Math.max(0.8, (value / max) * 100).toFixed(2));
    track.append(fill);
    row.append(h('div', 'pic-label', label), track, h('div', 'pic-value', extra));
    return row;
  });

  const widgets = {
    // The paragraphs before it as cards, each with a photo: <!-- widget: cards a.jpg b.jpg -->; "flow" first adds arrows,
    // "mini" makes a compact reminder row (small photo beside the text), e.g. the prompt's four ingredients during an exercise.
    cards(el) {
      let icons = argsOf(el).split(/\s+/);
      const flow = icons[0] === 'flow', mini = icons[0] === 'mini';
      if (flow || mini) icons = icons.slice(1);
      const row = h('div', 'pic-cards' + (flow ? ' pic-flow' : '') + (mini ? ' pic-mini' : ''));
      take(el, icons.length).forEach((text, i) => {
        if (flow && i) row.append(h('div', 'pic-arrow', '←'));
        const { head, title, sub } = parts(text);
        const card = h('div', 'pic-card');
        if (isImage(icons[i] || '')) {
          const photo = h('div', 'pic-card-photo');
          photo.style.backgroundImage = `url('${imageUrl(icons[i])}')`;
          if (CREDITS[icons[i]]) photo.append(Object.assign(h('span', 'credit', CREDITS[icons[i]]), { dir: 'ltr' }));
          card.append(photo);
        }
        if (head) card.append(h('div', 'pic-card-head', head));
        card.append(h('div', 'pic-card-title', title));
        if (sub) card.append(h('div', 'pic-card-sub', sub));
        row.append(card);
      });
      el.append(row);
    },

    // Next-word odds as bars. Args: { prompt, items: [[word, percent], ...] }. Replaces one paragraph.
    odds(el) {
      const { prompt, items, take: n = 1 } = argsOf(el);
      take(el, n);
      el.append(h('div', 'pic-prompt', prompt), ...bars(items.map(([w, p]) => [w, p, fa(p) + '٪']), 100));
    },

    // Compare amounts as bars. Args: { unit, items: [[label, value], ...] }. Replaces one paragraph.
    compare(el) {
      const { unit, items, take: n = 1 } = argsOf(el);
      take(el, n);
      const max = Math.max(...items.map(([, v]) => v));
      el.append(...bars(items.map(([l, v]) => [l, v, `${grouped(v)} ${unit}`]), max));
    },

    // The model's desk: each message is a note on the desk; a new chat clears it; when the desk is full,
    // the oldest notes fade. Args: { notes: [...], room }.
    desk(el) {
      const { notes, room = 5, image } = argsOf(el);
      const desk = h('div', 'pic-desk'), row = h('div', 'w-row');
      const add = button('پیام بعدی'), clear = button('چت جدید', 'w-btn w-quiet');
      let n = 0;
      const draw = () => {
        [...desk.children].forEach((x, i, all) => x.classList.toggle('pic-faded', all.length - i > room));
        add.disabled = n >= notes.length;
      };
      add.onclick = () => {
        if (n >= notes.length) return;
        const note = h('div', 'pic-note', notes[n++]);
        note.style.setProperty('--r', ((n * 37) % 7) - 3);
        desk.append(note);
        draw();
      };
      clear.onclick = () => {
        desk.querySelectorAll('.pic-note').forEach((x) => x.classList.add('pic-gone'));
        setTimeout(() => { desk.replaceChildren(); n = 0; draw(); }, 450);
      };
      row.append(add, clear);
      if (image) desk.style.backgroundImage = `url('${imageUrl(image)}')`;
      el.append(h('div', 'pic-desk-label', 'میز کار مدل'), desk, row);
      draw();
    },

    // The prompt example as two chat bubbles: "… قبل: short" and "بعد: rich". Replaces two paragraphs.
    bubbles(el) {
      const wrap = h('div', 'pic-bubbles');
      take(el, 2).forEach((text, i) => {
        const c = text.indexOf(':');
        const label = text.slice(0, c).split('.').pop().trim();
        const b = h('div', 'pic-bubble' + (i ? ' pic-bubble-good' : ''));
        b.append(h('div', 'pic-bubble-label', label), h('div', 'pic-bubble-text', text.slice(c + 1).trim()));
        wrap.append(b);
      });
      el.append(wrap);
    },

    // Exam scoring rules as three tiles. Args: { title, right, wrong, blank }. Replaces one paragraph by default.
    rules(el) {
      const { title, right, wrong, blank, take: n = 1 } = argsOf(el);
      take(el, n);
      const row = h('div', 'pic-rules');
      for (const [mark, label, v] of [['tick', 'درست', right], ['cross', 'غلط', wrong], ['blank', 'خالی', blank]]) {
        const tile = h('div', 'pic-rule' + (v < 0 ? ' pic-rule-minus' : ''));
        const m = svg(MARKS[mark]);
        m.classList.add('pic-rule-mark', 'mark-' + mark);
        tile.append(m, h('div', 'pic-rule-label', label), h('div', 'pic-rule-value', num(v)));
        row.append(tile);
      }
      el.append(h('div', 'pic-rules-title', title), row);
    },

    // Knowledge cutoff on a timeline. Args: { before, cutoff, after, search }.
    timeline(el) {
      const { before, cutoff, after, search } = argsOf(el);
      const line = h('div', 'pic-timeline');
      const known = h('div', 'pic-known'), unknown = h('div', 'pic-unknown');
      known.append(h('div', 'pic-tl-text', before));
      const find = h('div', 'pic-tl-search');
      find.append(svg(MARKS.search), search);
      unknown.append(h('div', 'pic-tl-text', after), find);
      line.append(known, h('div', 'pic-cutoff', cutoff), unknown);
      el.append(line);
    },

    // Builds a sentence step by step. Data: { start, first: [{ text, p, then: [[{ text, p }], ...] }] }.
    'sentence-builder'(el) {
      const data = JSON.parse(el.dataset.json);
      const sentence = h('p', 'sb-sentence'), options = h('div', 'sb-options'), row = h('div', 'w-row');
      const random = button('شانسی'), reset = button('از اول', 'w-btn w-quiet');
      row.append(random, reset);
      el.append(sentence, options, row);
      let chosen = [];
      const nextOptions = () => [data.first, ...(chosen[0]?.then || [])][chosen.length];
      const choose = (o) => { chosen.push(o); draw(); };
      function draw() {
        const next = nextOptions();
        sentence.textContent = [data.start, ...chosen.map((o) => o.text)].join(' ') + (next ? ' …' : '.');
        options.replaceChildren(...(next || []).map((o) => {
          const b = button(null, 'sb-option');
          const bar = h('span', 'sb-bar');
          bar.style.setProperty('--p', o.p);
          b.append(h('span', 'sb-text', o.text), bar, h('span', 'sb-p', fa(o.p) + '٪'));
          b.onclick = () => choose(o);
          return b;
        }));
        random.disabled = !next;
      }
      random.onclick = () => { const next = nextOptions(); if (next) choose(pick(next)); };
      reset.onclick = () => { chosen = []; draw(); };
      draw();
    },

    // Countdown. Args: minutes.
    timer(el) {
      const total = Math.round((parseFloat(el.dataset.args) || 5) * 60);
      let left = total, tick = null;
      const face = h('div', 'tm-face'), row = h('div', 'w-row');
      const start = button(''), reset = button('از اول', 'w-btn w-quiet');
      row.append(start, reset);
      el.append(face, row);
      const stop = () => { clearInterval(tick); tick = null; };
      const draw = () => {
        face.textContent = left > 0 ? fa(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`) : 'وقت تمومه!';
        start.textContent = tick ? 'مکث' : 'شروع';
        el.classList.toggle('tm-done', left <= 0);
      };
      start.onclick = () => {
        if (tick) stop();
        else if (left > 0) tick = setInterval(() => { left -= 1; if (left <= 0) stop(); draw(); }, 1000);
        draw();
      };
      reset.onclick = () => { stop(); left = total; draw(); };
      draw();
    },

    // Spot the made-up sentences. Takes the paragraph before it ("label. یک: … دو: …") and turns its numbered
    // sentences into a list. Click a sentence to mark it; «جواب» shows which were fake. Args: fake numbers, e.g. 3,4,7.
    bluff(el) {
      const src = el.previousElementSibling;
      if (!src) return;
      const fake = new Set(el.dataset.args.split(',').map(Number));
      const NUM = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده'];
      const text = src.textContent;
      const found = [...text.matchAll(new RegExp(`(?:^|\\s)(?:${NUM.join('|')}):\\s*`, 'g'))];
      if (!found.length) return;
      src.textContent = text.slice(0, found[0].index).trim();
      const list = h('ol', 'bl-list');
      found.forEach((m, i) => {
        const end = i + 1 < found.length ? found[i + 1].index : text.length;
        const li = h('li', 'bl-item' + (fake.has(i + 1) ? ' bl-fake' : ''), text.slice(m.index + m[0].length, end).trim());
        li.onclick = () => { if (!selecting() && !el.classList.contains('bl-revealed')) li.classList.toggle('bl-marked'); };
        list.append(li);
      });
      const show = button('جواب');
      show.onclick = () => {
        const revealed = el.classList.toggle('bl-revealed');
        show.textContent = revealed ? 'دوباره' : 'جواب';
        if (!revealed) list.querySelectorAll('.bl-marked').forEach((x) => x.classList.remove('bl-marked'));
      };
      const row = h('div', 'w-row');
      row.append(show);
      el.append(list, row);
    },

    // Traffic light. Takes the paragraph before it ("label: task، colour. task، colour. …") and turns the tasks
    // into cards, each with three colour buttons (clicking the chosen colour again clears it). The colour after
    // each task is our suggestion: it shows on every card once all cards have a colour, or on «پیشنهاد ما».
    traffic(el) {
      const src = el.previousElementSibling;
      if (!src) return;
      const COLORS = [['tl-green', 'سبز'], ['tl-yellow', 'زرد'], ['tl-red', 'قرمز']];
      const text = src.textContent;
      const tasks = shuffle(text.slice(text.indexOf(':') + 1).split('.').map((t) => t.trim()).filter(Boolean)).map((t) => {
        const i = t.lastIndexOf('،');
        const rec = i > 0 && COLORS.find(([, name]) => name === t.slice(i + 1).trim());
        return rec ? { text: t.slice(0, i).trim(), rec } : { text: t, rec: null };
      });
      const grid = h('div', 'tl-grid'), row = h('div', 'w-row');
      const showBtn = button('پیشنهاد ما', 'w-btn w-quiet'), resetBtn = button('از اول', 'w-btn w-quiet');
      const reveal = (on) => el.classList.toggle('tl-revealed', on);
      const cards = tasks.map(({ text: t, rec }) => {
        const card = h('div', 'tl-card'), pickRow = h('div', 'tl-pick');
        card.dataset.c = '';
        for (const [cls, label] of COLORS) {
          const chip = button(label, 'tl-chip ' + cls);
          chip.onclick = () => {
            card.dataset.c = card.dataset.c === cls ? '' : cls;
            card.className = 'tl-card ' + card.dataset.c;
            if (cards.every((c) => c.dataset.c)) reveal(true);
          };
          pickRow.append(chip);
        }
        card.append(h('div', 'tl-text', t), pickRow);
        if (rec) card.append(h('div', 'tl-rec ' + rec[0], 'پیشنهاد ما: ' + rec[1]));
        grid.append(card);
        return card;
      });
      showBtn.onclick = () => reveal(true);
      resetBtn.onclick = () => { reveal(false); cards.forEach((c) => { c.dataset.c = ''; c.className = 'tl-card'; }); };
      row.append(showBtn, resetBtn);
      src.remove();
      el.append(grid, row);
    },
  };

  document.querySelectorAll('.widget[data-widget]').forEach((el) => widgets[el.dataset.widget]?.(el));
  // Don't leave buttons focused: Space and arrow keys must keep moving the slides.
  document.addEventListener('click', (e) => e.target.closest('.widget button')?.blur());
})();
