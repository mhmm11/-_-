(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var menuToggle = document.querySelector(".menu-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  function setHeaderScrolled() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  setHeaderScrolled();
  window.addEventListener("scroll", setHeaderScrolled, { passive: true });

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!open));
      if (open) {
        mobileNav.setAttribute("hidden", "");
      } else {
        mobileNav.removeAttribute("hidden");
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menuToggle.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("hidden", "");
      });
    });
  }

  var headerOffset = function () {
    return header ? header.getBoundingClientRect().height : 0;
  };

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - headerOffset() - 8;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll(".fade-in").forEach(function (el) {
      io.observe(el);
    });
  } else {
    document.querySelectorAll(".fade-in").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  var lineBtn = document.querySelector(".js-line-placeholder");
  var formBtn = document.querySelector(".js-form-placeholder");
  var lineUrl = lineBtn && lineBtn.dataset.lineUrl;

  if (lineBtn && lineUrl && lineUrl !== "#") {
    lineBtn.setAttribute("href", lineUrl);
  }
  if (formBtn) {
    var formUrl = formBtn.dataset.formUrl;
    if (formUrl && formUrl !== "#") {
      formBtn.setAttribute("href", formUrl);
    }
  }

  /* ---------- お問い合わせフォーム → Google Apps Script ----------
     Live Server 等クロスオリジンから fetch(no-cors) すると、リクエストが正しく届かない／
     成功・失敗がブラウザから判別できないことがあります。隠し iframe への実フォーム POST が確実です。
  */
  var contactForm = document.getElementById("contact-form");
  var contactMessage = document.getElementById("contact-form-message");
  var contactSubmit = document.getElementById("contact-submit");
  var sourceUrlField = document.getElementById("contact-source-url");
  var gasFrame = document.getElementById("gas-contact-frame");

  var pendingGasSubmit = false;
  var gasSubmitTimeoutId = null;
  var gasFallbackTimeoutId = null;

  function isGasOrigin(origin) {
    if (!origin || typeof origin !== "string") return false;
    return (
      origin.indexOf("https://script.google.com") === 0 ||
      origin.indexOf("script.googleusercontent.com") !== -1
    );
  }

  function resetGasSubmitUi() {
    pendingGasSubmit = false;
    clearGasSubmitTimer();
    if (gasFallbackTimeoutId != null) {
      clearTimeout(gasFallbackTimeoutId);
      gasFallbackTimeoutId = null;
    }
    if (contactSubmit) contactSubmit.disabled = false;
    if (contactForm) {
      contactForm.removeAttribute("action");
      contactForm.removeAttribute("target");
    }
  }

  window.addEventListener("message", function (ev) {
    if (!isGasOrigin(ev.origin)) return;
    var d = ev.data;
    if (!d || d.type !== "skin-note-contact") return;
    if (!pendingGasSubmit) return;
    if (gasFallbackTimeoutId != null) {
      clearTimeout(gasFallbackTimeoutId);
      gasFallbackTimeoutId = null;
    }
    resetGasSubmitUi();
    if (d.ok) {
      showContactMsg(
        "送信が完了しました。スプレッドシートに行が追加されているかご確認ください。",
        false
      );
      if (contactForm) {
        contactForm.reset();
        if (sourceUrlField) sourceUrlField.value = window.location.href;
      }
    } else {
      showContactMsg(
        "サーバー側でエラーか入力不備がありました。iframe 内のメッセージか、Apps Script の「実行数」を確認してください。",
        true
      );
    }
  });

  function showContactMsg(text, isError) {
    if (!contactMessage) return;
    contactMessage.textContent = text;
    contactMessage.hidden = false;
    contactMessage.classList.toggle("is-error", !!isError);
    contactMessage.classList.toggle("is-success", !isError);
  }

  function hideContactMsg() {
    if (!contactMessage) return;
    contactMessage.hidden = true;
    contactMessage.textContent = "";
    contactMessage.classList.remove("is-error", "is-success");
  }

  function clearGasSubmitTimer() {
    if (gasSubmitTimeoutId != null) {
      clearTimeout(gasSubmitTimeoutId);
      gasSubmitTimeoutId = null;
    }
  }

  function onGasFrameLoaded() {
    if (!pendingGasSubmit) return;
    if (gasFallbackTimeoutId != null) {
      clearTimeout(gasFallbackTimeoutId);
      gasFallbackTimeoutId = null;
    }
    /* GAS の HTML 内の parent.postMessage がサンドボックスで届かないことがあるため、
       load 後にフォールバックで UI を確定する（POST は method="post" で飛んでいる前提） */
    gasFallbackTimeoutId = setTimeout(function () {
      gasFallbackTimeoutId = null;
      if (!pendingGasSubmit) return;
      resetGasSubmitUi();
      showContactMsg(
        "送信を受け付けました。スプレッドシートに行が増えているか確認してください。増えない場合は Apps Script の「実行数」で doPost のエラーを見てください。",
        false
      );
      if (contactForm) {
        contactForm.reset();
        if (sourceUrlField) sourceUrlField.value = window.location.href;
      }
    }, 600);
  }

  if (gasFrame) {
    gasFrame.addEventListener("load", onGasFrameLoaded);
  }

  if (contactForm && sourceUrlField) {
    sourceUrlField.value = window.location.href;
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var endpoint = (contactForm.getAttribute("data-gas-url") || "").trim();
      if (!endpoint || endpoint.indexOf("http") !== 0) {
        showContactMsg(
          "送信先（GAS の Web アプリ URL）が未設定です。index.html のフォーム data-gas-url に …/exec の URL を設定してください。",
          true
        );
        return;
      }

      if (endpoint.indexOf("/exec") === -1) {
        showContactMsg(
          "GAS の URL は通常「…/exec」で終わります。デプロイ後に表示された「ウェブアプリの URL」をそのまま貼り付けてください。",
          true
        );
        return;
      }

      var fd = new FormData(contactForm);
      if ((fd.get("company") || "").toString().trim() !== "") {
        showContactMsg("送信しました。ありがとうございます。", false);
        contactForm.reset();
        if (sourceUrlField) sourceUrlField.value = window.location.href;
        return;
      }

      var name = (fd.get("name") || "").toString().trim();
      var email = (fd.get("email") || "").toString().trim();
      var message = (fd.get("message") || "").toString().trim();
      if (!name || !email || !message) {
        showContactMsg("必須項目を入力してください。", true);
        return;
      }
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        showContactMsg("メールアドレスの形式を確認してください。", true);
        return;
      }

      if (!gasFrame) {
        showContactMsg("送信用フレームの読み込みに失敗しています。ページを再読み込みしてください。", true);
        return;
      }

      hideContactMsg();
      if (contactSubmit) contactSubmit.disabled = true;

      pendingGasSubmit = true;
      clearGasSubmitTimer();
      gasSubmitTimeoutId = setTimeout(function () {
        if (!pendingGasSubmit) return;
        resetGasSubmitUi();
        showContactMsg(
          "応答が得られませんでした。ネットワーク・GAS の URL（/exec）・デプロイ設定を確認してください。",
          true
        );
      }, 25000);

      contactForm.setAttribute("action", endpoint);
      contactForm.setAttribute("target", "gas-contact-frame");
      contactForm.submit();
    });
  }
})();
