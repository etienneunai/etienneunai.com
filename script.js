/* etienneunai.com — text scramble on the brand title */
(function () {
  'use strict';

  const brand = document.getElementById('brand-title');
  if (!brand) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  class TextScramble {
    constructor(el) {
      this.el = el;
      this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      this.lockFrames = 12;   // frames each char scrambles before settling
      this.frameRequest = null;
      this.queue = [];
      this.frame = 0;
      this.isTarget = false;
    }

    setText(newText) {
      // Respect reduced motion: swap instantly, no animation.
      if (reduceMotion) {
        this.cancel();
        this.el.textContent = newText;
        return;
      }

      this.cancel();
      const oldText = this.el.textContent;
      const length = Math.max(oldText.length, newText.length);

      // One character per queue slot. Each char starts scrambling one frame
      // after its neighbour and locks after `lockFrames`, giving the stagger.
      this.queue = Array.from({ length }, (_, i) => ({
        from: oldText[i] || '',
        to: newText[i] || '',
        start: i,
        end: i + this.lockFrames,
        char: oldText[i] || '',
      }));

      this.frame = 0;
      this.frameRequest = requestAnimationFrame(() => this.update());
    }

    update() {
      let remaining = 0;
      let output = '';

      for (const c of this.queue) {
        if (this.frame >= c.end) {
          output += c.to;                       // locked in
        } else if (this.frame >= c.start) {
          if (!c.char || Math.random() < 0.28) {
            c.char = this.chars[Math.floor(Math.random() * this.chars.length)];
          }
          output += c.char;                     // scrambling
          remaining++;
        } else {
          output += c.from;                     // not started yet
          remaining++;
        }
      }

      this.el.textContent = output;
      this.frame++;

      if (remaining) {
        this.frameRequest = requestAnimationFrame(() => this.update());
      } else {
        this.frameRequest = null;
      }
    }

    cancel() {
      if (this.frameRequest) {
        cancelAnimationFrame(this.frameRequest);
        this.frameRequest = null;
      }
      this.queue = [];
    }

    to(target, flag) {
      // Skip if already showing (or animating to) this text — prevents
      // mouseenter + focus firing together from restarting the animation.
      if (this.isTarget === flag) return;
      this.isTarget = flag;
      this.setText(target);
    }
  }

  // Keep the brand's hover box at least as wide as the full name, even while
  // the (narrower) scrambled text is showing. Otherwise a cursor parked to the
  // right of "etienneunai.com" falls outside the element once it shrinks,
  // causing an enter/leave flicker loop.
  function measureDefaultWidth() {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
    const styles = getComputedStyle(brand);
    probe.style.font = styles.font;                 // match Ovo size/weight exactly
    probe.style.letterSpacing = styles.letterSpacing;
    probe.textContent = brand.dataset.default;
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  function sizeBrand() {
    brand.style.minWidth = Math.ceil(measureDefaultWidth()) + 48 + 'px';
  }

  if (canHover) {
    sizeBrand(); // fallback with pre-font metrics
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sizeBrand);
    }
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeBrand, 100);
    });
  }

  const scramble = new TextScramble(brand);

  if (canHover) {
    // Desktop: hover and keyboard focus drive the swap.
    // Reverting back to the name is delayed so a quick pass of the cursor
    // doesn't flicker the title back and forth.
    let revertTimer = null;

    function scheduleRevert() {
      if (revertTimer) clearTimeout(revertTimer);
      revertTimer = setTimeout(() => {
        revertTimer = null;
        scramble.to(brand.dataset.default, false);
      }, 400);
    }

    function cancelRevert() {
      if (revertTimer) {
        clearTimeout(revertTimer);
        revertTimer = null;
      }
    }

    brand.addEventListener('mouseenter', () => {
      cancelRevert();
      scramble.to(brand.dataset.target, true);
    });
    brand.addEventListener('mouseleave', scheduleRevert);
    brand.addEventListener('focus', () => {
      cancelRevert();
      scramble.to(brand.dataset.target, true);
    });
    brand.addEventListener('blur', scheduleRevert);
  } else {
    // Touch: tap toggles default <-> target.
    brand.addEventListener('click', (event) => {
      event.preventDefault();
      if (scramble.isTarget) {
        scramble.to(brand.dataset.default, false);
      } else {
        scramble.to(brand.dataset.target, true);
      }
    });
  }
})();
