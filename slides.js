// Starts a reveal.js deck rendered by the site server: styles the text, reveals one thing at a time,
// shrinks text that doesn't fit, and adds the comment tool. Add ?present to the URL to hide the comment tool.
(() => {
  const WIDTH = 1200, HEIGHT = 800;
  const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const ORDINALS = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده'];
  const span = (cls, text) => Object.assign(document.createElement('span'), { className: cls, textContent: text });

  // Light touches on the slide text (the words stay the same, so comments still find them):
  // "تمرین …" becomes a tag, "یک. …" becomes a numbered step, a short first line becomes the lead.
  function decorate(body) {
    for (const p of body.querySelectorAll(':scope > p')) {
      const text = p.textContent;
      const ex = text.match(/^(تمرین[^.:]*)([.:])\s*([\s\S]*)$/);
      if (ex) {
        p.replaceChildren(span('tag', ex[1]), span('tag-punct', ex[2] + ' '), ...(ex[3] ? [ex[3]] : []));
        if (!ex[3]) p.classList.add('tag-only');
        continue;
      }
      const step = text.match(new RegExp(`^(${ORDINALS.join('|')})\\.\\s+`));
      if (step) {
        p.classList.add('step');
        p.dataset.n = fa(ORDINALS.indexOf(step[1]) + 1);
        p.replaceChildren(span('step-word', step[0]), text.slice(step[0].length));
      }
    }
    const first = [...body.children].find((x) => !x.classList.contains('tag-only'));
    if (first?.tagName === 'P' && !first.classList.contains('step') && !first.querySelector('.tag')
        && first.textContent.length <= 90 && body.children.length > 1) first.classList.add('lead');
  }

  // Shrink a slide's body text step by step until it fits. The title keeps its size.
  function fit(section) {
    const body = section?.querySelector(':scope > .body');
    if (!body) return;
    body.style.fontSize = '';
    const bottom = () => body.offsetTop + body.offsetHeight;
    for (let k = 1; bottom() > HEIGHT * 0.94 && k > 0.55; ) {
      k -= 0.05;
      body.style.fontSize = k + 'em';
    }
  }
  const fitAll = () => {
    document.querySelectorAll('.reveal .slides > section').forEach(fit);
    Reveal.layout();
  };

  // On touch screens, don't change slides while text is selected (e.g. dragging selection handles to comment).
  for (const type of ['touchstart', 'touchmove']) {
    document.addEventListener(type, (e) => {
      const sel = getSelection();
      if (sel && !sel.isCollapsed) e.stopPropagation();
    }, { capture: true });
  }

  document.querySelectorAll('.reveal .slides > section > .body').forEach((body) => {
    decorate(body);
    // One thing at a time: after the first item, each appears on the next click. Exercise tags and QR codes always show.
    const items = [...body.children].filter((x) => !x.classList.contains('tag-only') && x.dataset.widget !== 'qr');
    items.slice(1).forEach((x) => x.classList.add('fragment'));
  });

  Reveal.initialize({
    width: WIDTH, height: HEIGHT, margin: 0.05,
    rtl: true, hash: true,
    center: false, // titles stay at the top whatever the content's height; cover and part slides have class="center"
    controls: true, progress: true, slideNumber: 'c/t',
    transition: 'fade', backgroundTransition: 'fade', transitionSpeed: 'fast',
    viewDistance: 100, mobileViewDistance: 100, // keep every slide laid out so all of them can be fitted
  }).then(() => {
    fitAll();
    document.fonts.ready.then(fitAll);
    // Measure again when a slide is on screen: slides further away can be measured before they're fully laid out.
    Reveal.on('slidechanged', () => fit(Reveal.getCurrentSlide()));
    fit(Reveal.getCurrentSlide());
    // The comment tool, when the page has one (the site server's decks do; the public static copy doesn't).
    const tool = document.querySelector('.reveal .slides').dataset.comments;
    if (tool && !new URLSearchParams(location.search).has('present')) {
      document.body.appendChild(Object.assign(document.createElement('script'), { src: tool }));
    }
  });
})();
