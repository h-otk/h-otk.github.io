/*
  サイト共通スクリプト
  - content/site.json（設定）と assets/data/content.json（Markdown から自動生成）を読んで画面を組み立てる
  - テーマ（assets/css/themes/*.css）の適用と切り替え
  通常はこのファイルを編集する必要はありません。内容の変更は content/ で行います。
*/
(function () {
  "use strict";

  const VERSIONS = window.ASSET_VERSIONS || {};
  const THEME_KEY = "site-theme";
  const root = document.documentElement;
  const page = document.body.getAttribute("data-page") || "home";
  const params = new URLSearchParams(location.search);

  let conf = {};
  let linkSettings = { referrer: "none", newTab: true };

  // キャッシュバスター（デプロイ時に assets/js/versions.js が生成される）
  function withVersion(path) {
    return VERSIONS[path] ? path + "?v=" + VERSIONS[path] : path;
  }

  function getJSON(path) {
    return fetch(withVersion(path)).then(function (res) {
      if (!res.ok) throw new Error(path + " を読み込めませんでした (" + res.status + ")");
      return res.json();
    });
  }

  // 小さな DOM 生成ヘルパー（text は textContent に入るので HTML として解釈されない）
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(function ([key, value]) {
      if (value === undefined || value === null || value === "" || value === false) return;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
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

  /* ── リファラー ── */
  const REFERRER = {
    none: { policy: "no-referrer", rel: "noopener noreferrer" },      // 送らない
    origin: { policy: "origin", rel: "noopener" },                    // ドメインだけ送る
    full: { policy: "no-referrer-when-downgrade", rel: "noopener" }   // ページの URL まで送る
  };

  function isExternal(url) {
    return /^([a-z]+:|\/\/)/i.test(url || "");
  }

  /* ── 画像（外部サーバ配信・代替画像・保存抑止） ── */
  function image(src, alt, attrs) {
    const a = conf.assets || {};
    const img = el("img", Object.assign({ src: src, alt: alt || "", loading: "lazy" }, attrs || {}));
    if (isExternal(src)) {
      img.referrerPolicy = (REFERRER[a.imageReferrer] || REFERRER.origin).policy;
    }
    img.addEventListener("error", function onError() {
      img.removeEventListener("error", onError);
      if (a.fallbackImage) img.src = withVersion(a.fallbackImage);
      img.classList.add("is-fallback");
    });
    return img;
  }

  function protectImages(scope) {
    if (!(conf.images && conf.images.protect)) return;
    scope.addEventListener("contextmenu", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });
    scope.addEventListener("dragstart", function (e) { if (e.target.tagName === "IMG") e.preventDefault(); });
    root.classList.add("protect-images");
  }

  /* ── テーマ ── */
  function validThemeName(name, choices) {
    if (!/^[a-z0-9_-]+$/i.test(name || "")) return false;
    return !choices.length || choices.some(function (c) { return c.name === name; });
  }

  function pickTheme(t) {
    const choices = t.choices || [];
    const fromUrl = params.get("theme");
    if (validThemeName(fromUrl, choices)) return fromUrl;
    if (t.allowSwitch) {
      const saved = storage("get");
      if (validThemeName(saved, choices)) return saved;
    }
    return t.name || "minimal";
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
      link.href = withVersion("assets/css/themes/" + name + ".css");
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

  /* ── 外部リンク（SNS など） ── */
  const SNS_LABELS = {
    x: "X", twitter: "X", instagram: "Instagram", threads: "Threads", bluesky: "Bluesky",
    misskey: "Misskey", mastodon: "Mastodon", youtube: "YouTube", tiktok: "TikTok",
    pixiv: "pixiv", booth: "BOOTH", skeb: "Skeb", fanbox: "FANBOX", note: "note",
    github: "GitHub", qiita: "Qiita", zenn: "Zenn", linkedin: "LinkedIn", mail: "Mail"
  };

  function externalLink(url, text, cls, referrer) {
    const mode = REFERRER[referrer || linkSettings.referrer] || REFERRER.none;
    const attrs = { href: url, text: text, class: cls, referrerpolicy: mode.policy, rel: mode.rel };
    if (linkSettings.newTab !== false && !url.startsWith("mailto:")) attrs.target = "_blank";
    return el("a", attrs);
  }

  // Markdown 本文中の外部リンクにも同じ設定を適用する
  function applyLinkPolicy(scope) {
    scope.querySelectorAll("a[href]").forEach(function (a) {
      const href = a.getAttribute("href");
      if (!/^https?:\/\//i.test(href) || href.startsWith(location.origin)) return;
      const mode = REFERRER[linkSettings.referrer] || REFERRER.none;
      a.referrerPolicy = mode.policy;
      a.rel = mode.rel;
      if (linkSettings.newTab !== false) a.target = "_blank";
    });
  }

  function renderSns() {
    const items = (conf.sns && conf.sns.items) || [];
    const visible = items.filter(function (s) { return s.url; });
    if (!visible.length) return null;
    return el("div", { class: "sns-links" }, visible.map(function (s) {
      const label = s.label || SNS_LABELS[(s.service || "").toLowerCase()] || s.service || s.url;
      const link = externalLink(s.url, label, "sns-link", s.referrer);
      if (s.service) link.dataset.service = s.service.toLowerCase();
      return link;
    }));
  }

  /* ── 共通部品 ── */
  function pageEnabled(id) {
    const p = (conf.pages || {})[id];
    return !p || p.enabled !== false;
  }

  function navTargetEnabled(href) {
    const m = href.match(/page\.html\?id=([\w-]+)/);
    if (m) return pageEnabled(m[1]);
    if (/news\.html/.test(href)) return pageEnabled("news");
    return true;
  }

  function renderHeader() {
    const logo = document.querySelector(".logo");
    logo.textContent = conf.site.title;
    const nav = document.querySelector(".site-nav");
    nav.textContent = "";
    const here = (location.pathname.split("/").pop() || "index.html") + location.search;
    (conf.nav || []).filter(function (item) { return navTargetEnabled(item.href); }).forEach(function (item) {
      const target = item.href === "./" ? "index.html" : item.href;
      const active = here === target || (page === "work" && target === "works.html");
      nav.appendChild(el("a", { href: item.href, text: item.label, class: active ? "active" : "" }));
    });
  }

  function renderFooter(currentTheme) {
    const footer = document.querySelector("footer");
    footer.textContent = "";
    const pages = conf.pages || {};
    const links = Object.keys(pages).filter(function (id) {
      return !id.startsWith("_") && pages[id].enabled && pages[id].footer;
    }).map(function (id) {
      const title = (window.SITE_CONTENT.pages[id] || {}).title || id;
      return el("a", { href: "page.html?id=" + id, text: title });
    });
    if (links.length) footer.appendChild(el("nav", { class: "footer-links" }, links));
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
      applyTheme(select.value).then(applyGalleryOptions);
    });
    footer.appendChild(el("label", { class: "theme-switch" }, ["テーマ: ", select]));
  }

  function setHead() {
    const s = conf.site;
    if (s.favicon) {
      const icon = document.querySelector("link[rel='icon']") || el("link", { rel: "icon" });
      icon.href = withVersion(s.favicon);
      icon.type = s.favicon.endsWith(".svg") ? "image/svg+xml" : "";
      document.head.appendChild(icon);
    }
    if (s.description) document.head.appendChild(el("meta", { name: "description", content: s.description }));
  }

  function setTitle(title) {
    document.title = title ? title + " — " + conf.site.title : conf.site.title;
  }

  /* ── アクセス解析 ── */
  function loadAnalytics() {
    const id = (conf.analytics || {}).googleAnalyticsId;
    if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id);
    document.head.appendChild(el("script", { async: true, src: "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id) }));
  }

  /* ── トップページ ── */
  function renderHome(content) {
    const p = conf.profile;
    const hero = document.getElementById("hero");
    const bio = el("p", { class: "hero-bio" });
    (p.bio || []).forEach(function (line, i) {
      if (i) bio.appendChild(el("br"));
      bio.appendChild(document.createTextNode(line));
    });
    hero.textContent = "";
    if (p.avatar) hero.appendChild(image(withVersion(p.avatar), p.name, { class: "hero-avatar", loading: "eager" }));
    hero.appendChild(el("div", {}, [el("h1", { class: "hero-name", text: p.name }), bio, renderSns()]));

    const a = conf.about || {};
    const about = document.getElementById("about");
    if (!a.text && !a.skills) { about.remove(); } else {
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
    }

    const h = conf.history;
    const history = document.getElementById("history");
    if (!h || !(h.items || []).length) history.remove();
    else {
      history.textContent = "";
      history.appendChild(el("h2", { text: h.title }));
      history.appendChild(el("ol", { class: "timeline" }, h.items.map(function (it) {
        return el("li", { class: "timeline-item" }, [
          el("span", { class: "timeline-year", text: it.year }),
          el("div", {}, [el("p", { class: "timeline-org", text: it.org }), el("p", { class: "timeline-detail", text: it.detail })])
        ]);
      })));
    }

    const g = conf.gallery || {};
    const ws = document.getElementById("works-section");
    if (!g.homeCount || !content.works.length) ws.remove();
    else {
      ws.querySelector("h2").textContent = g.title || "Works";
      renderGallery(content.works.slice(0, g.homeCount));
    }

    const n = (conf.pages || {}).news || {};
    const ns = document.getElementById("news-section");
    if (!pageEnabled("news") || !n.homeCount || !content.news.length) ns.remove();
    else {
      ns.querySelector("h2").textContent = n.title || "News";
      const list = document.getElementById("news-list");
      content.news.slice(0, n.homeCount).forEach(function (item) {
        list.appendChild(el("li", {}, [
          el("time", { class: "news-date", text: item.date }),
          el("a", { href: "news.html#" + item.slug, text: item.title })
        ]));
      });
    }
  }

  /* ── 作品一覧 ── */
  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function applyGalleryOptions() {
    const g = conf.gallery || {};
    document.querySelectorAll(".works-grid").forEach(function (grid) {
      grid.setAttribute("data-layout", g.layout || cssVar("--gallery-layout") || "grid");
      grid.setAttribute("data-style", g.style || cssVar("--gallery-style") || "card");
    });
  }

  function workCard(work) {
    const imageBox = el("div", { class: "work-image" }, [
      work.thumbnail ? image(work.thumbnail, work.title) : "画像未設定"
    ]);
    const body = el("div", { class: "work-body" }, [
      el("h3", { text: work.title }),
      el("p", { class: "work-desc", text: work.summary }),
      el("ul", { class: "work-tags" }, work.tags.map(function (t) { return el("li", { class: "tag", text: t }); }))
    ]);
    const card = el("a", { class: "work-card", href: "work.html?id=" + encodeURIComponent(work.slug) }, [imageBox, body]);
    card.dataset.tags = work.tags.join("\n").toLowerCase();
    return card;
  }

  function renderGallery(works) {
    const grid = document.getElementById("works-grid");
    grid.textContent = "";
    if (!works.length) {
      grid.appendChild(el("p", { class: "empty-note", text: "作品はまだありません。" }));
      return [];
    }
    const cards = works.map(workCard);
    cards.forEach(function (c) { grid.appendChild(c); });
    applyGalleryOptions();
    protectImages(grid);
    return cards;
  }

  function renderFilters(works, cards) {
    const bar = document.getElementById("filter-bar");
    let filters = (conf.gallery || {}).filters || [];
    if (!filters.length) {
      const seen = new Set();
      works.forEach(function (w) { w.tags.forEach(function (t) { seen.add(t); }); });
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

  /* ── 作品の個別ページ ── */
  function lightbox() {
    let dialog = document.getElementById("lightbox");
    if (!dialog) {
      dialog = el("dialog", { class: "lightbox", id: "lightbox", "aria-label": "拡大表示" });
      dialog.addEventListener("click", function () { dialog.close(); });
      document.body.appendChild(dialog);
    }
    return function (src, alt) {
      if (typeof dialog.showModal !== "function") { window.open(src, "_blank", "noopener"); return; }
      dialog.textContent = "";
      dialog.appendChild(image(src, alt, { class: "lightbox-full", loading: "eager" }));
      dialog.appendChild(el("button", { class: "lightbox-btn lightbox-close", type: "button", "aria-label": "閉じる", text: "×" }));
      dialog.showModal();
    };
  }

  function renderWork(content) {
    const slug = params.get("id");
    const works = content.works;
    const index = works.findIndex(function (w) { return w.slug === slug; });
    const article = document.getElementById("article");
    if (index < 0) { notFound(article, "作品が見つかりませんでした。"); return; }
    const w = works[index];
    setTitle(w.title);

    const zoom = lightbox();
    const gallery = [w.image].concat(w.images).filter(Boolean).map(function (src) {
      const img = image(src, w.title, { class: "article-image", loading: "eager" });
      img.addEventListener("click", function () { zoom(src, w.title); });
      return img;
    });
    const nav = el("nav", { class: "article-nav" }, [
      works[index - 1] ? el("a", { href: "work.html?id=" + works[index - 1].slug, text: "← " + works[index - 1].title }) : el("span"),
      el("a", { href: "works.html", text: "一覧へ" }),
      works[index + 1] ? el("a", { href: "work.html?id=" + works[index + 1].slug, text: works[index + 1].title + " →" }) : el("span")
    ]);
    const body = el("div", { class: "article-body" });
    body.innerHTML = w.html; // ビルド時に Markdown から生成した HTML（サイト管理者が書いた内容）
    article.textContent = "";
    [
      el("header", { class: "article-header" }, [
        el("h1", { class: "page-title", text: w.title }),
        el("p", { class: "article-meta", text: w.date }),
        el("ul", { class: "work-tags" }, w.tags.map(function (t) { return el("li", { class: "tag", text: t }); }))
      ]),
      gallery.length ? el("div", { class: "article-gallery" }, gallery) : null,
      body,
      w.link ? el("p", {}, [externalLink(w.link, "関連リンク →", "link-arrow")]) : null,
      nav
    ].forEach(function (n) { if (n) article.appendChild(n); });
    applyLinkPolicy(body);
    protectImages(article);
  }

  /* ── 固定ページ・更新履歴 ── */
  function notFound(container, message) {
    setTitle("ページが見つかりません");
    container.textContent = "";
    container.appendChild(el("h1", { class: "page-title", text: "404 Not Found" }));
    container.appendChild(el("p", { text: message }));
    container.appendChild(el("p", { class: "more-link" }, [el("a", { class: "link-arrow", href: "./", text: "トップページへ →" })]));
  }

  function renderPage(content) {
    const id = params.get("id");
    const p = content.pages[id];
    const article = document.getElementById("article");
    if (!p || !pageEnabled(id)) { notFound(article, "このページは公開されていません。"); return; }
    setTitle(p.title);
    const body = el("div", { class: "article-body" });
    body.innerHTML = p.html; // ビルド時に Markdown から生成した HTML
    article.textContent = "";
    article.appendChild(el("h1", { class: "page-title", text: p.title }));
    if (id === "contact") article.appendChild(contactBox());
    article.appendChild(body);
    if (p.date) article.appendChild(el("p", { class: "article-meta", text: "最終更新: " + p.date }));
    applyLinkPolicy(body);
  }

  function contactBox() {
    const c = (conf.pages || {}).contact || {};
    const box = el("div", { class: "contact-box" });
    if (c.formUrl) box.appendChild(externalLink(c.formUrl, "お問い合わせフォームを開く", "button"));
    if (c.email) box.appendChild(el("a", { class: "button button-outline", href: "mailto:" + c.email, text: c.email }));
    return box.childNodes.length ? box : null;
  }

  function renderNews(content) {
    const box = document.getElementById("news-full");
    if (!pageEnabled("news")) { notFound(box, "このページは公開されていません。"); return; }
    const title = ((conf.pages || {}).news || {}).title || "更新履歴";
    document.querySelector(".page-title").textContent = title;
    setTitle(title);
    box.textContent = "";
    if (!content.news.length) box.appendChild(el("p", { class: "empty-note", text: "お知らせはまだありません。" }));
    content.news.forEach(function (n) {
      const body = el("div", { class: "article-body" });
      body.innerHTML = n.html; // ビルド時に Markdown から生成した HTML
      box.appendChild(el("article", { class: "news-item", id: n.slug }, [
        el("time", { class: "news-date", text: n.date }),
        el("h2", { class: "news-title", text: n.title }),
        body
      ]));
      applyLinkPolicy(body);
    });
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  function showError(err) {
    console.error(err);
    const main = document.querySelector("main");
    main.prepend(el("p", { class: "empty-note", text: "サイトデータの読み込みに失敗しました: " + err.message }));
  }

  /* ── 起動 ── */
  const reveal = function () { root.classList.remove("is-loading"); };
  setTimeout(reveal, 2000); // 何があっても 2 秒後には表示する

  Promise.all([getJSON("content/site.json"), getJSON("assets/data/content.json")])
    .then(function ([siteConf, content]) {
      conf = siteConf;
      window.SITE_CONTENT = content;
      if (conf.links) linkSettings = Object.assign(linkSettings, conf.links);
      applyOverride(conf.theme.override);
      setHead();
      loadAnalytics();
      const themeName = pickTheme(conf.theme);
      return applyTheme(themeName).then(function () {
        renderHeader();
        renderFooter(themeName);
        const galleryTitle = (conf.gallery || {}).title || "Works";
        if (page === "home") { setTitle(""); renderHome(content); }
        else if (page === "works") {
          setTitle(galleryTitle);
          document.querySelector(".page-title").textContent = galleryTitle;
          renderFilters(content.works, renderGallery(content.works));
        }
        else if (page === "work") renderWork(content);
        else if (page === "page") renderPage(content);
        else if (page === "news") renderNews(content);
        else setTitle("ページが見つかりません");
      });
    })
    .catch(showError)
    .finally(reveal);
})();
