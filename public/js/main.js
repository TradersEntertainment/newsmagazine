/* ===================================
   EuroPolitika — Main JavaScript
   =================================== */

(function () {
  'use strict';

  /* --- Subscribe Form AJAX --- */
  var subscribeForm = document.getElementById('subscribeForm');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      window.location.href = 'http://europolitika.org/';
    });
  }

  /* --- Toast Notification System --- */
  function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      toast.addEventListener('animationend', function () {
        toast.remove();
      });
    }, 3500);
  }

  // Expose globally for other scripts
  window.showToast = showToast;

  /* --- Fade-in on Scroll (IntersectionObserver) --- */
  function initFadeIn() {
    var cards = document.querySelectorAll('.article-card');
    if (!cards.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('fade-in-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -40px 0px',
        }
      );

      cards.forEach(function (card) {
        observer.observe(card);
      });
    } else {
      // Fallback: show all immediately
      cards.forEach(function (card) {
        card.classList.add('fade-in-visible');
      });
    }
  }

  /* --- Back to Top Button --- */
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    function toggleVisibility() {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* --- Short share link --- */
  // Article pages expose /h/<id>; it 301s to the full URL, so it is safe to
  // hand out anywhere the long one is awkward to paste.
  function getShareUrl() {
    var holder = document.querySelector('[data-short-path]');
    if (holder && holder.dataset.shortPath) {
      return window.location.origin + holder.dataset.shortPath;
    }
    return window.location.href;
  }

  function initShortLink() {
    var input = document.getElementById('shortLinkInput');
    var btn = document.getElementById('btnCopyShortLink');
    if (!input) return;

    input.value = getShareUrl();
    input.addEventListener('focus', function () { this.select(); });
    if (!btn) return;

    btn.addEventListener('click', function () {
      var original = btn.innerHTML;
      var done = function (ok) {
        btn.innerHTML = ok ? '✅ Kopyalandı' : '⚠️ Kopyalanamadı';
        setTimeout(function () { btn.innerHTML = original; }, 2000);
      };

      // The async clipboard API needs a secure context, so keep the old
      // select-and-copy path as a fallback.
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(input.value).then(function () { done(true); }, function () { done(false); });
        return;
      }
      input.select();
      input.setSelectionRange(0, input.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      done(ok);
    });
  }

  /* --- Share Button Handlers --- */
  function initShareButtons() {
    document.querySelectorAll('.share-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var platform = this.dataset.platform;
        var url = encodeURIComponent(getShareUrl());
        var title = encodeURIComponent(document.title);
        var shareUrl = '';

        switch (platform) {
          case 'twitter':
            shareUrl =
              'https://twitter.com/intent/tweet?url=' + url + '&text=' + title;
            break;
          case 'linkedin':
            shareUrl =
              'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
            break;
          case 'whatsapp':
            shareUrl = 'https://wa.me/?text=' + title + '%20' + url;
            break;
        }

        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes');
        }
      });
    });
  }

  /* --- Dark Mode Theme Switcher --- */
  function initTheme() {
    var savedTheme = localStorage.getItem('theme') || 'light';
    var toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      toggleBtn.addEventListener('click', function () {
        var currentTheme = document.documentElement.getAttribute('data-theme');
        var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      });
    }
  }

  /* --- Init on DOM Ready --- */
  document.addEventListener('DOMContentLoaded', function () {
    initFadeIn();
    initBackToTop();
    initShortLink();
    initShareButtons();
    initTheme();
  });
})();
