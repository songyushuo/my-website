/* ============================================================
   sys · 个人网站脚本
   1) 背景画布：点阵网格（鼠标视差）+ 羽毛球飞行抛物线
   2) 滚动浮现动画
   3) 移动端导航
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 背景画布 ---------------- */

  var canvas = document.getElementById("bg-canvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0;
    var H = 0;
    var mouse = { x: 0.5, y: 0.5 };      // 鼠标位置（0-1 归一化）
    var mouseSmooth = { x: 0.5, y: 0.5 };
    var GRID = 46;                        // 点阵间距
    var tStart = performance.now();

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("mousemove", function (e) {
      mouse.x = e.clientX / W;
      mouse.y = e.clientY / H;
    });

    // 羽毛球轨迹：从左下抛向右上的抛物线（随屏幕尺寸自适应）
    function trajectoryPoint(p) {
      // p: 0-1
      var marginX = W * 0.08;
      var startX = marginX;
      var endX = W * 0.92;
      var baseY = H * 0.82;
      var peakY = H * 0.34;
      var x = startX + (endX - startX) * p;
      // 抛物线：y = baseY - 4 * (baseY - peakY) * p * (1 - p)
      var y = baseY - 4 * (baseY - peakY) * p * (1 - p);
      return { x: x, y: y };
    }

    function drawGrid(offsetX, offsetY) {
      ctx.fillStyle = "rgba(122, 162, 255, 0.10)";
      var startX = -GRID + (offsetX % GRID);
      var startY = -GRID + (offsetY % GRID);
      for (var x = startX; x < W + GRID; x += GRID) {
        for (var y = startY; y < H + GRID; y += GRID) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawTrajectory(time) {
      var loop = 5200;                     // 一次飞行的时长（ms）
      var p = ((time - tStart) % loop) / loop;

      // 弧线本体（渐显渐隐）
      ctx.lineWidth = 1.2;
      var grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "rgba(124, 241, 181, 0)");
      grad.addColorStop(0.25, "rgba(124, 241, 181, 0.22)");
      grad.addColorStop(0.75, "rgba(122, 162, 255, 0.22)");
      grad.addColorStop(1, "rgba(122, 162, 255, 0)");
      ctx.strokeStyle = grad;
      ctx.beginPath();
      for (var i = 0; i <= 60; i++) {
        var pt = trajectoryPoint(i / 60);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // 发光的"球"沿弧线飞行
      var ball = trajectoryPoint(p);

      // 拖尾
      for (var j = 1; j <= 8; j++) {
        var tp = Math.max(0, p - j * 0.012);
        var tail = trajectoryPoint(tp);
        var alpha = 0.22 * (1 - j / 9);
        ctx.fillStyle = "rgba(124, 241, 181, " + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, 3.2 - j * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // 光晕
      var glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 26);
      glow.addColorStop(0, "rgba(124, 241, 181, 0.45)");
      glow.addColorStop(1, "rgba(124, 241, 181, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 26, 0, Math.PI * 2);
      ctx.fill();

      // 球心
      ctx.fillStyle = "#7cf1b5";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    function frame(now) {
      ctx.clearRect(0, 0, W, H);

      // 平滑跟随鼠标
      mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.05;
      mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.05;

      // 视差：网格随鼠标反向轻微移动
      var ox = (mouseSmooth.x - 0.5) * -26;
      var oy = (mouseSmooth.y - 0.5) * -26;
      drawGrid(ox, oy);

      if (!reduceMotion) {
        drawTrajectory(now);
      } else {
        // 静态弧线
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(124, 241, 181, 0.16)";
        ctx.beginPath();
        for (var i = 0; i <= 60; i++) {
          var pt = trajectoryPoint(i / 60);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      if (!reduceMotion) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ---------------- 滚动浮现 ---------------- */

  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------------- 移动端导航 ---------------- */

  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- 终端打字机 ---------------- */

  var termEl = document.getElementById("terminal-text");
  var caretEl = document.getElementById("terminal-caret");
  if (termEl) {
    var lines = [
      { text: ">>> import sys", cls: "t-cmd" },
      { text: ">>> sys.whoami", cls: "t-cmd" },
      { text: "'sys · 潍理工'", cls: "t-str" },
      { text: ">>> sys.major", cls: "t-cmd" },
      { text: "'计算机科学与技术'", cls: "t-str" },
      { text: ">>> sys.interests", cls: "t-cmd" },
      { text: "['Python', '羽毛球']", cls: "t-lst" },
      { text: ">>> sys.now()", cls: "t-cmd" },
      { text: "'写代码，或者在球场上'", cls: "t-str" }
    ];

    function renderTerminalInstant() {
      var html = "";
      lines.forEach(function (line, i) {
        html += '<span class="' + line.cls + '">' + line.text + "</span>";
        if (i < lines.length - 1) html += "\n";
      });
      termEl.innerHTML = html;
    }

    if (reduceMotion) {
      renderTerminalInstant();
      if (caretEl) caretEl.style.animation = "none";
    } else {
      var lineIdx = 0;
      var charIdx = 0;
      var currentSpan = null;

      function typeStep() {
        if (lineIdx >= lines.length) return;

        if (!currentSpan) {
          if (lineIdx > 0) termEl.appendChild(document.createTextNode("\n"));
          currentSpan = document.createElement("span");
          currentSpan.className = lines[lineIdx].cls;
          termEl.appendChild(currentSpan);
          charIdx = 0;
        }

        var full = lines[lineIdx].text;
        currentSpan.textContent = full.slice(0, ++charIdx);

        if (charIdx >= full.length) {
          currentSpan = null;
          lineIdx++;
          setTimeout(typeStep, 420);          // 行间停顿
        } else {
          // 命令行敲得慢一点，输出快一点
          var isCmd = lines[lineIdx].cls === "t-cmd";
          setTimeout(typeStep, isCmd ? 34 : 18);
        }
      }

      setTimeout(typeStep, 600);
    }
  }

  /* ---------------- 页脚年份 ---------------- */

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
