/*
  サイト共通スクリプト
  - config/site.json / config/works.json を読み込んで画面を組み立てる
  - テーマ（themes/*.css）の適用と切り替え
  通常はこのファイルを編集する必要はありません。内容の変更は config/ の JSON で行います。
*/
(function () {
  "use strict";

  const VERSIONS = window.ASSET_VERSIONS || {};
  const THEME_KEY = "site-theme";
  const root = document.documentElement;
  const page = document.body.getAttribute("data-page") || "home";

  // キャッシュバスター（デプロイ時に static/versions.js が生成される）
  function withVersion(path) {
    return VERSIONS[path] ? path + "?v=" + VERSIONS[path] : path;
  }

  function getJSON(path) {
    return fetch(withVersion(path)).then(function (res) {
      if (!res.ok) throw new Error(path + " を読み込めませんでした (" + res.status + ")");
      return res.json();
    });
  }

  // 小さな DOM 生成ヘルパー（textContent を使うので HTML として解釈されない）
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(function ([key, value]) {
      if (value === undefined || value === null || value === "") return;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function storage(action, value) {
    try {
      if (action === "get") return localStorage.getItem(THEME_KEY);
      localStorage.setItem(THEME_KEY, value);
    } catch (e) {
      return null;
    }
    return null;
  }

  /* ── テーマ ── */
  function validThemeName(name, choices) {
    if (!/^[a-z0-9_-]+$/i.test(name || "")) return false;
    return !choices.length || choices.some(function (c) { return c.name === name; });
  }

  function pickTheme(themeConf) {
    const choices = themeConf.choices || [];
    const fromUrl = new URLSearchParams(location.search).get("theme");
    if (validThemeName(fromUrl, choices)) return fromUrl;
    if (themeConf.allowSwitch) {
      const saved = storage("get");
      if (validThemeName(saved, choices)) return saved;
    }
    return themeConf.name || "minimal";
  }

  function applyTheme(name) {
    return new Promise(function (resolve) {
      let link = document.getElementById("theme-css");
      if (!link) {
        link = el("link", { rel: "stylesheet", id: "theme-css" });
        document.head.appendChild(link);
      }
      link.onload = resolve;
      link.onerror = resolve;
      link.href = withVersion("themes/" + name + ".css");
      root.setAttribute("data-theme", name);
    });
  }

  function applyOverride(o) {
    if (!o) return;
    const map = { accent: "--accent", background: "--bg", text: "--text", font: "--font" };
    Object.keys(map).forEach(function (key) {
      if (o[key]) root.style.setProperty(map[key], o[key]);
    });
    if (o.backgroundImage) {
      root.style.setProperty("--bg-image", "url(\"" + encodeURI(o.backgroundImage) + "\")");
      root.style.setProperty("--bg-size", "cover");
      root.style.setProperty("--bg-repeat", "no-repeat");
    }
  }

  /* ── 共通部品 ── */
  function renderHeader(conf) {
    const logo = document.querySelector(".logo");
    logo.textContent = conf.site.title;
    const nav = document.querySelector(".site-nav");
    nav.textContent = "";
    const current = location.pathname.split("/").pop() || "./";
    (conf.nav || []).forEach(function (item) {
      const active = item.href === current || (current === "index.html" && item.href === "./");
      nav.appendChild(el("a", { href: item.href, text: item.label, class: active ? "active" : "" }));
    });
  }

  function renderFooter(conf, currentTheme) {
    const footer = document.querySelector("footer");
    footer.textContent = "";
    footer.appendChild(el("p", { text: conf.site.copyright }));
    const t = conf.theme;
    if (!t.allowSwitch || !(t.choices || []).length) return;
    const select = el("select", { "aria-label": "テーマ切り替え" });
    t.choices.forEach(function (c) {
      const opt = el("option", { value: c.name, text: c.label || c.name });
      if (c.name === currentTheme) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      storage("set", select.value);
      applyTheme(select.value).then(function () { applyGalleryOptions(conf); });
    });
    footer.appendChild(el("label", { class: "theme-switch" }, ["テーマ: ", select]));
  }

  /* ── 外部リンク（SNS など）とリファラー制御 ── */
  // site.json の "links.referrer" で指定する値 → ブラウザの referrerpolicy
  const REFERRER = {
    none: { policy: "no-referrer", rel: "noopener noreferrer" },      // 送らない
    origin: { policy: "origin", rel: "noopener" },                    // ドメインだけ送る
    full: { policy: "no-referrer-when-downgrade", rel: "noopener" }   // ページの URL まで送る
  };
  const SNS_LABELS = {
    x: "X", twitter: "X", instagram: "Instagram", threads: "Threads", bluesky: "Bluesky",
    misskey: "Misskey", mastodon: "Mastodon", youtube: "YouTube", tiktok: "TikTok",
    pixiv: "pixiv", booth: "BOOTH", skeb: "Skeb", fanbox: "FANBOX", note: "note",
    github: "GitHub", qiita: "Qiita", zenn: "Zenn", linkedin: "LinkedIn", mail: "Mail"
  };
  let linkSettings = { referrer: "none", newTab: true };

  function externalLink(url, text, cls, referrer) {
    const mode = REFERRER[referrer || linkSettings.referrer] || REFERRER.none;
    const attrs = { href: url, text: text, class: cls, referrerpolicy: mode.policy, rel: mode.rel };
    if (linkSettings.newTab !== false && !url.startsWith("mailto:")) attrs.target = "_blank";
    return el("a", attrs);
  }

  function renderSns(conf) {
    // 旧形式（profile.links）にも対応
    const items = (conf.sns && conf.sns.items) || conf.profile.links || [];
    const visible = items.filter(function (s) { return s.url; });
    if (!visible.length) return null;
    return el("div", { class: "sns-links" }, visible.map(function (s) {
      const label = s.label || SNS_LABELS[(s.service || "").toLowerCase()] || s.service || s.url;
      const link = externalLink(s.url, label, "sns-link", s.referrer);
      if (s.service) link.dataset.service = s.service.toLowerCase();
      return link;
    }));
  }

  /* ── トップページ ── */
  function renderHome(conf) {
    const p = conf.profile;
    const hero = document.getElementById("hero");
    const bio = el("p", { class: "hero-bio" });
    (p.bio || []).forEach(function (line, i) {
      if (i) bio.appendChild(el("br"));
      bio.appendChild(document.createTextNode(line));
    });
    const links = renderSns(conf);
    hero.textContent = "";
    if (p.avatar) hero.appendChild(el("img", { class: "hero-avatar", src: p.avatar, alt: p.name }));
    hero.appendChild(el("div", {}, [el("h1", { class: "hero-name", text: p.name }), bio, links]));

    const a = conf.about;
    const about = document.getElementById("about");
    about.textContent = "";
    about.appendChild(el("h2", { text: a.title || "About" }));
    about.appendChild(el("div", { class: "about-grid" }, [
      el("div", { class: "about-text" }, (a.text || []).map(function (t) { return el("p", { text: t }); })),
      el("div", { class: "about-skills" }, (a.skills || []).map(function (g) {
        return el("div", { class: "skill-group" }, [
          el("h3", { text: g.title }),
          el("ul", { class: "skill-list" }, (g.items || []).map(function (s) { return el("li", { text: s }); }))
        ]);
      }))
    ]));

    const h = conf.history;
    const history = document.getElementById("history");
    history.textContent = "";
    if (!h || !(h.items || []).length) { history.remove(); return; }
    history.appendChild(el("h2", { text: h.title }));
    history.appendChild(el("ol", { class: "timeline" }, h.items.map(function (it) {
      return el("li", { class: "timeline-item" }, [
        el("span", { class: "timeline-year", text: it.year }),
        el("div", {}, [
          el("p", { class: "timeline-org", text: it.org }),
          el("p", { class: "timeline-detail", text: it.detail })
        ])
      ]);
    })));
  }

  /* ── ギャラリー ── */
  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function applyGalleryOptions(conf) {
    const g = conf.gallery || {};
    document.querySelectorAll(".works-grid").forEach(function (grid) {
      grid.setAttribute("data-layout", g.layout || cssVar("--gallery-layout") || "grid");
      grid.setAttribute("data-style", g.style || cssVar("--gallery-style") || "card");
    });
  }

  function workCard(work, index) {
    const src = work.thumbnail || work.image;
    const image = el("div", { class: "work-image" }, [
      src ? el("img", { src: src, alt: work.title, loading: "lazy" }) : "画像未設定"
    ]);
    const body = el("div", { class: "work-body" }, [
      el("h3", { text: work.title }),
      el("p", { class: "work-desc", text: work.description }),
      el("ul", { class: "work-tags" }, (work.tags || []).map(function (t) {
        return el("li", { class: "tag", text: t });
      }))
    ]);
    const card = el("a", { class: "work-card", href: "#work-" + (index + 1) }, [image, body]);
    card.dataset.tags = (work.tags || []).join("\n").toLowerCase();
    return card;
  }

  function setupLightbox(works) {
    const dialog = document.getElementById("lightbox");
    if (!dialog || typeof dialog.showModal !== "function") return function () {};
    let current = 0;

    function show(index) {
      current = (index + works.length) % works.length;
      const w = works[current];
      dialog.textContent = "";
      const figure = el("figure", { class: "lightbox-figure" }, [
        w.image ? el("img", { src: w.image, alt: w.title }) : null,
        el("figcaption", { class: "lightbox-caption" }, [
          el("h3", { text: w.title }),
          el("p", { class: "lightbox-date", text: w.date }),
          el("p", { class: "lightbox-desc", text: w.description }),
          el("ul", { class: "work-tags" }, (w.tags || []).map(function (t) { return el("li", { class: "tag", text: t }); })),
          w.link ? externalLink(w.link, "関連リンク →", "lightbox-link") : null
        ])
      ]);
      const close = el("button", { class: "lightbox-btn lightbox-close", type: "button", "aria-label": "閉じる", text: "×" });
      close.addEventListener("click", function () { dialog.close(); });
      dialog.appendChild(figure);
      dialog.appendChild(close);
      if (works.length > 1) {
        const prev = el("button", { class: "lightbox-btn lightbox-prev", type: "button", "aria-label": "前の作品", text: "‹" });
        const next = el("button", { class: "lightbox-btn lightbox-next", type: "button", "aria-label": "次の作品", text: "›" });
        prev.addEventListener("click", function () { show(current - 1); });
        next.addEventListener("click", function () { show(current + 1); });
        dialog.appendChild(prev);
        dialog.appendChild(next);
      }
      history.replaceState(null, "", "#work-" + (current + 1));
      if (!dialog.open) dialog.showModal();
    }

    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () { history.replaceState(null, "", location.pathname + location.search); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
    return show;
  }

  function renderGallery(conf, data, limit) {
    const grid = document.getElementById("works-grid");
    const works = (data.works || []).slice(0, limit || undefined);
    grid.textContent = "";
    if (!works.length) {
      grid.appendChild(el("p", { class: "empty-note", text: "作品はまだありません。" }));
      return;
    }
    const cards = works.map(workCard);
    cards.forEach(function (c) { grid.appendChild(c); });
    applyGalleryOptions(conf);

    if (page === "works") {
      const show = setupLightbox(works);
      cards.forEach(function (card, i) {
        card.addEventListener("click", function (e) { e.preventDefault(); show(i); });
      });
      const m = location.hash.match(/^#work-(\d+)$/);
      if (m && works[m[1] - 1]) show(m[1] - 1);
      renderFilters(data, cards);
    } else {
      cards.forEach(function (card) { card.href = "works.html" + card.getAttribute("href"); });
    }
  }

  function renderFilters(data, cards) {
    const bar = document.getElementById("filter-bar");
    if (!bar) return;
    let filters = data.filters || [];
    if (!filters.length) {
      const seen = new Set();
      (data.works || []).forEach(function (w) { (w.tags || []).forEach(function (t) { seen.add(t); }); });
      filters = Array.from(seen);
    }
    bar.textContent = "";
    if (!filters.length) { bar.remove(); return; }
    const buttons = ["すべて"].concat(filters).map(function (label, i) {
      const btn = el("button", { class: "filter-btn" + (i ? "" : " active"), type: "button", text: label });
      btn.dataset.filter = i ? label.toLowerCase() : "";
      bar.appendChild(btn);
      return btn;
    });
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.toggle("active", b === btn); });
        const f = btn.dataset.filter;
        cards.forEach(function (card) {
          card.style.display = !f || card.dataset.tags.split("\n").includes(f) ? "" : "none";
        });
      });
    });
  }

  function showError(err) {
    console.error(err);
    const main = document.querySelector("main");
    main.prepend(el("p", { class: "empty-note", text: "設定ファイルの読み込みに失敗しました: " + err.message }));
  }

  /* ── 起動 ── */
  const reveal = function () { root.classList.remove("is-loading"); };
  setTimeout(reveal, 2000); // 何があっても 2 秒後には表示する

  Promise.all([getJSON("config/site.json"), getJSON("config/works.json")])
    .then(function ([conf, works]) {
      if (conf.links) linkSettings = Object.assign(linkSettings, conf.links);
      applyOverride(conf.theme.override);
      const themeName = pickTheme(conf.theme);
      return applyTheme(themeName).then(function () {
        renderHeader(conf);
        renderFooter(conf, themeName);
        document.title = page === "works"
          ? (conf.gallery.title || "Works") + " — " + conf.site.title
          : conf.site.title;
        const title = document.querySelector(".page-title");
        if (title) title.textContent = conf.gallery.title || "Works";

        if (page === "home") {
          renderHome(conf);
          const n = conf.gallery.homeCount;
          const section = document.getElementById("works-section");
          if (!n) section.remove();
          else {
            section.querySelector("h2").textContent = conf.gallery.title || "Works";
            renderGallery(conf, works, n);
          }
        } else {
          renderGallery(conf, works, 0);
        }
      });
    })
    .catch(showError)
    .finally(reveal);
})();
