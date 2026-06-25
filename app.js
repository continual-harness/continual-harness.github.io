/* Renders ARC-AGI-3-CH.md client-side and wires the interactive embeds.
 *
 * Markdown stays the single source of truth; this script:
 *   1. registers a tiny marked extension that renders \(...\) and \[...\] with KaTeX
 *      (delimiters chosen so literal `$` currency in the prose is never math),
 *   2. parses the fetched markdown,
 *   3. fills every <div data-embed="..."> anchor from the EMBEDS registry, and
 *   4. wraps tables/figures and wires the side-by-side "play both" buttons.
 */
(function () {
  "use strict";

  var MD_SOURCE = "ARC-AGI-3-CH.md";

  // Bump on any figure/asset edit so browsers fetch fresh PNGs instead of stale
  // cached ones (figure images have stable filenames; only their bytes change).
  var ASSET_V = "13";

  // ---- Math: \(inline\) and \[display\] -> KaTeX. Both registered inline-level so
  // display blocks inside a paragraph are still captured. ----
  function mathExtension(katex) {
    function make(name, open, re, display) {
      return {
        name: name,
        level: "inline",
        start: function (src) {
          var i = src.indexOf(open);
          return i < 0 ? undefined : i;
        },
        tokenizer: function (src) {
          var m = re.exec(src);
          if (m) return { type: name, raw: m[0], text: m[1].trim() };
        },
        renderer: function (token) {
          try {
            return katex.renderToString(token.text, {
              displayMode: display,
              throwOnError: false,
            });
          } catch (e) {
            return token.raw;
          }
        },
      };
    }
    return [
      make("mathDisplay", "\\[", /^\\\[([\s\S]+?)\\\]/, true),
      make("mathInline", "\\(", /^\\\(([\s\S]+?)\\\)/, false),
    ];
  }

  // ---- Embeds: exact artifact paths already present under artifacts/ ----
  var CH = "artifacts/CH-videos/";
  var HE = "artifacts/Hermes-videos/";
  var V = {
    ch_cn04: CH + "cn04-2fe56bfb.continualharness.gemini-3.1-pro-preview.eeb9ea21-5521-481d-bc39-8c3d5365c8d8.mp4",
    ch_ft09: CH + "ft09-0d8bbf25.continualharness.gemini-3.1-pro-preview.9bbb053f-db23-41b8-b150-557acb186ecc.mp4",
    ch_lp85: CH + "lp85-305b61c3.continualharness.gemini-3.1-pro-preview.9a8a99bb-2a50-4ed4-a77d-4bd9013680b1.mp4",
    ch_m0r0: CH + "m0r0-492f87ba.continualharness.gemini-3.1-pro-preview.57d652e9-3a8d-4a0e-98dc-5ab56a577a41.mp4",
    ch_sp80: CH + "sp80-589a99af.continualharness.gemini-3.1-pro-preview.2543a2d0-857d-480f-bea4-fa24b27162a3.mp4",
    ch_tu93: CH + "tu93-0768757b.continualharness.gemini-3.1-pro-preview.1a62f880-ad98-4c49-bbd7-8b8287e9476b.mp4",
    he_cn04: HE + "cn04-2fe56bfb-7f9f62c1-ec97-42b7-8004-3bfc36474cee.mp4",
    he_ft09: HE + "ft09-0d8bbf25-52d8aa76-5d45-4345-a63b-d174b35a583e.mp4",
    he_lp85: HE + "lp85-305b61c3-7b765d30-4a93-4cce-aa0b-5b68fd217735.mp4",
  };

  function card(src, agentClass, agentLabel, detail) {
    return (
      '<figure class="video-card">' +
      '<video src="' + src + '" controls muted playsinline preload="metadata"></video>' +
      '<figcaption><span class="agent ' + agentClass + '">' + agentLabel +
      "</span> &middot; " + detail + "</figcaption>" +
      "</figure>"
    );
  }

  function pair(src1, c1, l1, d1, src2, c2, l2, d2, caption) {
    return (
      '<section class="embed pair">' +
      '<button class="play-both" type="button">&#9654; Play both</button>' +
      '<div class="video-grid cols-2">' +
      card(src1, c1, l1, d1) + card(src2, c2, l2, d2) +
      "</div>" +
      '<p class="embed-caption">' + caption + "</p>" +
      "</section>"
    );
  }

  function stub(title, desc) {
    return (
      '<section class="embed"><div class="artifact-stub">' +
      '<span class="tag">Interactive artifact &middot; coming soon</span>' +
      '<div class="title">' + title + "</div>" +
      '<div class="desc">' + desc + "</div></div></section>"
    );
  }

  var EMBEDS = {
    "replay-top": function () {
      return (
        '<section class="embed">' +
        '<div class="video-grid cols-3">' +
        card(V.ch_lp85, "ch", "lp85", "100.0 &middot; 8/8 levels") +
        card(V.ch_ft09, "ch", "ft09", "70.1 &middot; 6/6 levels") +
        card(V.ch_m0r0, "ch", "m0r0", "66.8 &middot; 6/6 levels") +
        card(V.ch_tu93, "ch", "tu93", "61.4 &middot; 8/9 levels") +
        card(V.ch_sp80, "ch", "sp80", "47.6 &middot; 4/6 levels") +
        card(V.ch_cn04, "ch", "cn04", "46.4 &middot; 5/6 levels") +
        "</div>" +
        '<p class="embed-caption"><b>Continual Harness top 6 game replay.</b> ' +
        "Full-episode replays of Continual Harness's six highest-scoring games " +
        "(gemini-3.1-pro-preview).</p>" +
        "</section>"
      );
    },
    "prompt-loop": function () {
      return (
        '<section class="embed">' +
        '<div class="iframe-wrap"><iframe src="artifacts/prompt_loop.html?v=7" ' +
        'title="Example of Continual Harness decision loop" ' +
        'height="940" loading="lazy"></iframe></div>' +
        '<p class="embed-caption"><b>Example of Continual Harness decision loop.</b> ' +
        "A real <code>lp85</code> decision from the trace: turn 0 assembles the full working " +
        "prompt once; later turns append only their new tool result (the cached prefix carries " +
        "the rest) until <code>take_actions</code> changes the game state. Scroll inside the panel.</p>" +
        "</section>"
      );
    },
    "replay-lp85": function () {
      return pair(
        V.ch_lp85, "ch", "Continual Harness", "lp85 &middot; 100.0 (8/8)",
        V.he_lp85, "hermes", "Hermes", "lp85 &middot; 40.3 (7/8)",
        "<b>lp85 replays.</b> Continual Harness solves levels 4&ndash;8 at near-maximum " +
        "credit after refining its policy and saving solver skills; Hermes rebuilds reasoning each " +
        "level and stalls on level 8."
      );
    },
    "replay-cn04": function () {
      return pair(
        V.ch_cn04, "ch", "Continual Harness", "cn04 &middot; 46.4 (5/6)",
        V.he_cn04, "hermes", "Hermes", "cn04 &middot; 4.8 (1/6)",
        "<b>cn04 replays.</b> After action 228 Continual Harness edits and runs " +
        "<code>solve_level_4</code>, emitting 47 of the next 50 actions from saved skills; " +
        "Hermes clears only the first level."
      );
    },
    "refinement-lift": function () {
      var fig = function (name, alt) {
        return '<img src="artifacts/figures/' + name + '?v=' + ASSET_V +
          '" alt="' + alt + '" loading="lazy">';
      };
      return (
        '<section class="embed">' +
        '<div class="figure-stack">' +
        fig("refinement_lift_lp85.png", "lp85: memory accumulation and skill operation over time") +
        fig("refinement_lift_cn04.png", "cn04: memory accumulation and skill operation over time") +
        "</div>" +
        '<p class="embed-caption"><b>Memory accumulation and skill operation over time</b> ' +
        "for <code>lp85</code> (up) and <code>cn04</code> (down).</p>" +
        "</section>"
      );
    },
    "lp85-policy": function () {
      return (
        '<section class="embed">' +
        '<div class="iframe-wrap scroll-artifact"><iframe src="artifacts/refinement_lp85.html?v=5" ' +
        'title="lp85 reset-free refinement timeline" loading="lazy" scrolling="yes"></iframe></div>' +
        '<p class="embed-caption"><b>lp85: refinement compounds across levels.</b> ' +
        "Each game-over and stagnation becomes a one-line policy rewrite plus an executable " +
        "skill (level numbers 1-indexed). Once the method is compiled, levels 4&ndash;8 clear " +
        "at a fraction of the action cost. Scroll inside the artifact to inspect the full trace.</p>" +
        "</section>"
      );
    },
    "cn04-behavior": function () {
      return (
        '<section class="embed">' +
        '<div class="iframe-wrap scroll-artifact"><iframe src="artifacts/refinement_cn04.html?v=5" ' +
        'title="cn04 reset-free refinement timeline" loading="lazy" scrolling="yes"></iframe></div>' +
        '<p class="embed-caption"><b>cn04: the rule is learned by refinement, then reused.</b> ' +
        "The real mechanics are pinned down on level 2 (138 actions); levels 3 and 4 then clear " +
        "in 24 and 47 actions by replaying the learned state instead of re-deriving it. Scroll inside " +
        "the artifact to inspect the full trace.</p>" +
        "</section>"
      );
    },
  };

  // ---- Figure captions (sourced from blog_data/figure_captions.md), keyed by
  // image filename. Rendered as inline markdown so bold/code/italic work. ----
  var FIGCAPTIONS = {
    "arcagi3_continual_harness_loop.png":
      "**The Continual Harness loop on ARC-AGI-3.** " +
      "At each game-state boundary the orchestrator assembles its decision context " +
      "(system prompt, current observation, recent history, and overviews of memory, " +
      "skills, and subagents), then " +
      "picks one harness tool. After executing a tool that changes the game state (blue, except non-action `run_skill`), the orchestrator rebuilds " +
      "the prompt on a new observation. A tool that only edits the " +
      "harness or runs analysis (orange) appends its output and continues the same conversation.",
    "leaderboard_cost_score.svg":
      "**Score vs. cost on the ARC-AGI-3 public set.** Public-set score against total USD " +
      "cost. Top-left is best (cheaper and higher-scoring). Continual Harness (ours) " +
      "reaches 20.54% at $774. Leaderboard points are public results from the ARC Prize " +
      "[verified leaderboard](https://arcprize.org/leaderboard) and " +
      "[community leaderboard](https://arcprize.org/leaderboard/community) " +
      "(as of Jun 23 2026).",
    "score_comparison.png":
      "**Continual Harness vs. Hermes: final score per game.** Final score on each of the " +
      "25 ARC-AGI-3 games. Each dumbbell pairs Continual Harness (blue) with the Hermes " +
      "baseline (orange), sorted by Continual Harness score; the dotted vertical lines mark " +
      "each agent's mean.",
    "level_progression_heatmaps.png":
      "**Per-level score comparison.** Per-level score for every game (rows, " +
      "shared order sorted by Continual Harness final score) across levels (columns). " +
      "Grey cells are levels never reached.",
    "tool_call_distribution.png":
      "**How each agent spends a tool call.** Tool-call distribution for both agents, " +
      "normalized to each agent's own total (Continual Harness 7,307 calls; Hermes 18,717). " +
      "*Left:* the share going to shared functional buckets. *Right:* the same calls in each " +
      "agent's native tool taxonomy, colored by function. ",
  };

  // ---- DOM helpers run after markdown is injected ----
  function wrapTables(root) {
    root.querySelectorAll("table").forEach(function (t) {
      if (t.parentElement && t.parentElement.classList.contains("table-wrap")) return;
      var w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  function wrapFigures(root) {
    root.querySelectorAll("img").forEach(function (img) {
      if (img.closest("figure")) return;
      var fig = document.createElement("figure");
      var cap = document.createElement("figcaption");
      var base = (img.getAttribute("src") || "").split("?")[0];
      var key = base.split("/").pop();
      img.setAttribute("src", base + "?v=" + ASSET_V);  // cache-bust the figure PNG
      var capMd = FIGCAPTIONS[key];
      if (capMd) cap.innerHTML = marked.parseInline(capMd);
      else cap.textContent = img.getAttribute("alt") || "";
      var host = img.closest("p") || img;
      host.parentNode.insertBefore(fig, host);
      fig.appendChild(img);
      if (cap.textContent || cap.innerHTML) fig.appendChild(cap);
      if (host.tagName === "P" && !host.textContent.trim() && !host.children.length) {
        host.remove();
      }
    });
  }

  // Place two figures side by side (e.g., score comparison + level heatmap). CSS
  // collapses the row to a single column on narrow screens.
  function groupFigureRow(root, names) {
    var figs = names.map(function (n) {
      var img = root.querySelector('img[src*="' + n + '"]');
      return img ? img.closest("figure") : null;
    });
    if (figs.some(function (f) { return !f; })) return;
    var row = document.createElement("div");
    row.className = "figure-row";
    figs[0].parentNode.insertBefore(row, figs[0]);
    figs.forEach(function (f) { row.appendChild(f); });
  }

  function fillEmbeds(root) {
    root.querySelectorAll("[data-embed]").forEach(function (el) {
      var key = el.getAttribute("data-embed");
      var make = EMBEDS[key];
      if (make) {
        el.outerHTML = make();
      } else {
        el.outerHTML =
          '<section class="embed"><div class="artifact-stub">' +
          '<div class="title">Missing embed: ' + key + "</div></div></section>";
      }
    });
  }

  // Size opt-in iframes to their content. Refinement timelines intentionally do not
  // use auto-h: they are presented as bounded, scrollable artifacts.
  function autoResizeIframes(root) {
    root.querySelectorAll("iframe.auto-h").forEach(function (frame) {
      function fit() {
        try {
          var doc = frame.contentDocument || frame.contentWindow.document;
          var h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
          if (h) frame.style.height = h + "px";
        } catch (e) {
          /* cross-origin or not ready: keep the fallback height attribute */
        }
      }
      frame.addEventListener("load", fit);
      if (frame.contentDocument && frame.contentDocument.readyState === "complete") fit();
      window.addEventListener("resize", fit);
    });
  }

  function wirePlayBoth(root) {
    root.querySelectorAll(".play-both").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pairEl = btn.closest(".pair");
        if (!pairEl) return;
        pairEl.querySelectorAll("video").forEach(function (v) {
          v.currentTime = 0;
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        });
      });
    });
  }

  function showError(content, msg) {
    content.innerHTML =
      '<p class="status error">' + msg + "</p>";
  }

  function render(md, content) {
    marked.use({ extensions: mathExtension(window.katex) });
    marked.setOptions({ gfm: true });
    content.innerHTML = marked.parse(md);
    wrapTables(content);
    wrapFigures(content);
    groupFigureRow(content, ["score_comparison", "level_progression_heatmaps"]);
    fillEmbeds(content);
    wirePlayBoth(content);
    autoResizeIframes(content);
    document.title = (content.querySelector("h1") || {}).textContent || document.title;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var content = document.getElementById("content");
    if (typeof marked === "undefined" || typeof window.katex === "undefined") {
      showError(content, "Failed to load the markdown/math libraries (CDN blocked?). " +
        "Check your connection, or vendor marked/KaTeX locally per DEPLOY.md.");
      return;
    }
    fetch(MD_SOURCE, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (md) {
        render(md, content);
      })
      .catch(function (err) {
        showError(content,
          "Could not load <code>" + MD_SOURCE + "</code> (" + err.message + "). " +
          "Serve over HTTP, e.g. <code>python3 -m http.server</code> in this folder &mdash; " +
          "opening the file directly with <code>file://</code> blocks fetch.");
      });
  });
})();
