// ============================================================
// FastTyper Demo Animation Script
// ============================================================

(function () {
  'use strict';

  const container = document.getElementById('text-container');
  if (!container) return;

  const examples = [
    {
      typing: "This is a sentnece with some typso",
      trigger: ".",
      html: `This is a <span class="grammar-applied-underline">sentence<span class="ft-tooltip">…is a <span class="ft-original">[sentnece]</span> with…<span class="ft-hint">click to revert</span></span></span> with some <span class="grammar-applied-underline">typos<span class="ft-tooltip">…some <span class="ft-original">[typso]</span>.<span class="ft-hint">click to revert</span></span></span>.`
    },
    {
      typing: "I defiantly need to get a new keyboard",
      trigger: "!",
      html: `I <span class="grammar-applied-underline">definitely<span class="ft-tooltip">…I <span class="ft-original">[defiantly]</span> need…<span class="ft-hint">click to revert</span></span></span> need to get a new keyboard!`
    },
    {
      typing: "i hav a aple",
      trigger: ".",
      html: `<span class="grammar-applied-underline">I<span class="ft-tooltip"><span class="ft-original">[i]</span> have…<span class="ft-hint">click to revert</span></span></span> <span class="grammar-applied-underline">have<span class="ft-tooltip">…I <span class="ft-original">[hav]</span> an…<span class="ft-hint">click to revert</span></span></span> <span class="grammar-applied-underline">an<span class="ft-tooltip">…have <span class="ft-original">[a]</span> apple…<span class="ft-hint">click to revert</span></span></span> <span class="grammar-applied-underline">apple<span class="ft-tooltip">…an <span class="ft-original">[aple]</span>.<span class="ft-hint">click to revert</span></span></span>.`
    },
    {
      typing: "Their is no way I'm going to finsh this assingment on time",
      trigger: "!",
      html: `<span class="grammar-applied-underline">There<span class="ft-tooltip"><span class="ft-original">[Their]</span> is no…<span class="ft-hint">click to revert</span></span></span> is no way I'm going to <span class="grammar-applied-underline">finish<span class="ft-tooltip">…to <span class="ft-original">[finsh]</span> this…<span class="ft-hint">click to revert</span></span></span> this <span class="grammar-applied-underline">assignment<span class="ft-tooltip">…this <span class="ft-original">[assingment]</span> on…<span class="ft-hint">click to revert</span></span></span> on time!`
    }
  ];

  let currentExampleIndex = 0;

  // Utility for animation timeline delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function runAnimation() {
    container.innerHTML = "";

    const example = examples[currentExampleIndex];
    const typoText = example.typing;

    // Phase 1: Typing
    for (let i = 0; i < typoText.length; i++) {
      container.innerHTML += typoText[i];
      await sleep(Math.random() * 50 + 20); // Natural typing variance
    }

    await sleep(300); // Brief pause before the trigger punctuation

    // Phase 2: Trigger via full-stop/exclamation
    container.innerHTML += example.trigger;

    // Simulate TRIGGER_VERIFY_MS from src/main.ts
    await sleep(100);

    // Phase 3: In-flight processing state
    // Wraps the sentence in the amber thinking pulse while hitting local API
    const rawText = container.innerHTML;
    container.innerHTML = `<span class="ft-processing ft-processing-thinking">${rawText}</span>`;

    // Simulate LLM inference time (~1.5s thinking pass)
    await sleep(1500);

    // Phase 4: Applied Correction
    // Replaces the text and isolates the diff hunks with blue wavy spans and tooltips
    container.innerHTML = example.html;

    // Add standard click-to-revert interactivity for the demo
    container.querySelectorAll('.grammar-applied-underline').forEach(el => {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        // Extract text from inside the brackets of the tooltip using textContent
        const origEl = this.querySelector('.ft-original');
        if (origEl) {
          const orig = origEl.textContent.replace(/[\[\]]/g, '');
          this.replaceWith(orig);
        }
      });
    });

    // Advance to the next example, loop around if at the end
    currentExampleIndex = (currentExampleIndex + 1) % examples.length;

    // Loop animation
    await sleep(5000);
    runAnimation();
  }

  // Start cycle after DOM content is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(runAnimation, 1000));
  } else {
    setTimeout(runAnimation, 1000);
  }
})();
