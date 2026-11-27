/* =========================================================
   青崖书斋 · 交互
   1. 滚轮纵向增量 -> 卷轴向左展读（RTL 容器，scrollLeft -= deltaY）
   2. 纸色 / 栏线切换，状态写入 localStorage
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var viewport = document.querySelector("[data-scroll]");
  var desktopQuery = window.matchMedia("(min-width: 861px)");
  var paperStorageKey = "epistle_paper_theme";
  var gridStorageKey = "epistle.grid";

  /* ---------- 横向展卷 ---------- */
  var scrollToStart = function (smooth) {
    if (!desktopQuery.matches) {
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
      return;
    }
    if (viewport) {
      viewport.scrollTo({ left: 0, behavior: smooth ? "smooth" : "auto" });
    }
  };

  if (viewport) {
    var normalizedDelta = function (event) {
      var factor = event.deltaMode === 1 ? 36 : event.deltaMode === 2 ? viewport.clientWidth : 1;
      return {
        x: event.deltaX * factor,
        y: event.deltaY * factor
      };
    };

    viewport.addEventListener(
      "wheel",
      function (event) {
        // 触屏降级为纵向阅读，交给浏览器；按住 Ctrl/Cmd 时保留缩放
        if (!desktopQuery.matches || event.ctrlKey || event.metaKey) return;

        var delta = normalizedDelta(event);
        var horizontal = Math.abs(delta.x) > Math.abs(delta.y);
        var step = horizontal ? delta.x : -delta.y;

        if (!step) return;

        var before = viewport.scrollLeft;
        viewport.scrollLeft = before + step;

        // 卷首卷尾也阻止默认行为，避免页面橡皮筋回弹
        if (viewport.scrollLeft !== before || event.deltaY !== 0) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    window.addEventListener("keydown", function (event) {
      if (!desktopQuery.matches) return;

      var target = event.target;
      var tag = target && target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (target && target.isContentEditable)) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;

      var page = Math.max(320, viewport.clientWidth * 0.82);
      var step = 0;

      if (event.key === "ArrowLeft") step = -page;
      else if (event.key === "ArrowRight") step = page;
      else if (event.key === "PageDown") step = -page;
      else if (event.key === "PageUp") step = page;
      else return;

      event.preventDefault();
      viewport.scrollLeft += step;
    });
  }

  /* ---------- 纸色切换：素白 / 老笺 / 天青 / 松烟 ---------- */
  var papers = ["default", "warm", "celadon", "night"];
  var paperAliases = {
    tianqing: "celadon",
    songyan: "night",
    qing: "celadon",
    hui: "night",
    xuan: "default",
    chen: "warm"
  };
  var defaultPaper = "night";

  var normalizePaper = function (name) {
    var mapped = paperAliases[name] || name;
    return papers.indexOf(mapped) > -1 ? mapped : defaultPaper;
  };

  var applyPaper = function (name) {
    var target = normalizePaper(name);

    // 素白是 :root 的基准纸色，需移除属性才会生效
    if (target === "default") {
      root.removeAttribute("data-paper");
    } else {
      root.setAttribute("data-paper", target);
    }

    try {
      window.localStorage.setItem(paperStorageKey, target);
    } catch (error) {
      /* 隐私模式下忽略 */
    }

    var buttons = document.querySelectorAll("[data-set-paper]");
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute("data-set-paper") === target;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
  };

  /* ---------- 栏线切换 ---------- */
  var grids = ["zhu", "wu", "none"];

  var applyGrid = function (id, persist) {
    var target = grids.indexOf(id) > -1 ? id : "zhu";
    root.setAttribute("data-grid", target);

    var buttons = document.querySelectorAll("[data-set-grid]");
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute("data-set-grid") === target;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }

    if (persist) {
      try {
        window.localStorage.setItem(gridStorageKey, target);
      } catch (error) {
        /* 隐私模式下忽略 */
      }
    }
  };

  /* ---------- 设置面板开合：点印章展开，点外部或 Esc 收起 ---------- */
  var toolDock = document.querySelector(".tool-dock");
  var toolToggle = document.querySelector("[data-tool-toggle]");
  var toolPanel = document.querySelector("[data-tool-panel]");

  if (toolDock && toolToggle && toolPanel) {
    var setPanelOpen = function (open) {
      toolToggle.setAttribute("aria-expanded", open ? "true" : "false");
      toolToggle.setAttribute("aria-label", open ? "收起信笺设置" : "展开信笺设置");
      toolPanel.hidden = !open;
    };

    toolToggle.addEventListener("click", function () {
      setPanelOpen(toolPanel.hidden);
    });

    document.addEventListener("click", function (event) {
      if (toolPanel.hidden || toolDock.contains(event.target)) return;
      setPanelOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || toolPanel.hidden) return;
      setPanelOpen(false);
      toolToggle.focus();
    });
  }

  /* ---------- 控件绑定 ---------- */
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var paperButton = target.closest("[data-set-paper]");
    if (paperButton) {
      applyPaper(paperButton.getAttribute("data-set-paper"));
      return;
    }

    var gridButton = target.closest("[data-set-grid]");
    if (gridButton) {
      applyGrid(gridButton.getAttribute("data-set-grid"), true);
      return;
    }

    if (target.closest("[data-scroll-start]")) {
      scrollToStart(true);
    }
  });

  var savedPaper = defaultPaper;
  try {
    savedPaper = window.localStorage.getItem(paperStorageKey) || defaultPaper;
  } catch (error) {
    /* 隐私模式下使用默认纸色 */
  }
  applyPaper(savedPaper);

  applyGrid(root.getAttribute("data-grid") || "zhu", false);
})();
