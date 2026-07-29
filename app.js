/* ==========================================================================
   5 STAR CHOCOLATE INTERACTIVE SCROLL ANIMATION ENGINE
   ========================================================================== */

(function () {
  'use strict';

  // Configuration Constants
  const TOTAL_FRAMES = 210;
  const FRAME_DIR = './frames';
  const LERP_FACTOR = 0.12; // Smoothness factor for scroll frame transitions

  // Application State
  const state = {
    images: [],
    imagesLoaded: 0,
    isLoaded: false,
    currentFrame: 0,
    targetFrame: 0,
    isPlaying: false,
    playSpeed: 1,
    audioEnabled: false,
    audioCtx: null,
  };

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const progressText = document.getElementById('progress-text');
  
  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas.getContext('2d');
  const scrollTrack = document.querySelector('.scroll-track');
  
  const timelineRange = document.getElementById('timeline-range');
  const frameIndicator = document.getElementById('frame-indicator');
  const playToggleBtn = document.getElementById('play-toggle-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  
  const heroOverlay = document.getElementById('hero-overlay');
  const storyCards = document.querySelectorAll('.story-card');
  const navDots = document.querySelectorAll('.nav-dot-wrapper');
  
  const specsDrawer = document.getElementById('specs-drawer');
  const openSpecsBtn = document.getElementById('open-specs-btn');
  const closeSpecsBtn = document.getElementById('close-specs-btn');

  // ==========================================================================
  // 1. FRAME PRELOADER
  // ==========================================================================

  function getFramePath(index) {
    // Indices are 1-based: ezgif-frame-001.jpg -> ezgif-frame-210.jpg
    const padded = String(index).padStart(3, '0');
    return `${FRAME_DIR}/ezgif-frame-${padded}.jpg`;
  }

  function preloadFrames() {
    return new Promise((resolve) => {
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
          state.imagesLoaded++;
          const percent = Math.floor((state.imagesLoaded / TOTAL_FRAMES) * 100);
          
          if (progressBar) progressBar.style.width = `${percent}%`;
          if (progressPercent) progressPercent.textContent = `${percent}%`;
          if (progressText) progressText.textContent = `Loading Frame ${state.imagesLoaded} of ${TOTAL_FRAMES}...`;

          if (state.imagesLoaded === TOTAL_FRAMES) {
            state.isLoaded = true;
            resolve();
          }
        };
        img.onerror = () => {
          // Fallback handling if a frame fails
          state.imagesLoaded++;
          if (state.imagesLoaded === TOTAL_FRAMES) {
            state.isLoaded = true;
            resolve();
          }
        };
        state.images[i - 1] = img;
      }
    });
  }

  // ==========================================================================
  // 2. CANVAS RENDERING ENGINE (RESPONSIVE COVER SCALING)
  // ==========================================================================

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    renderCanvasFrame(Math.round(state.currentFrame));
  }

  function renderCanvasFrame(frameIndex) {
    if (!state.isLoaded || !state.images[frameIndex]) return;

    const img = state.images[frameIndex];
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.width;
    const ih = img.height;

    // Calculate aspect-ratio cover fill dimensions
    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const cx = (cw - nw) / 2;
    const cy = (ch - nh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, cx, cy, nw, nh);
  }

  // ==========================================================================
  // 3. ANIMATION LOOP & LERP SMOOTH SCROLLING
  // ==========================================================================

  let animationFrameId = null;

  function updateAnimationLoop() {
    if (state.isPlaying) {
      // Auto-play mode: stop automatically when reaching the final frame
      state.targetFrame += 0.5 * state.playSpeed;
      if (state.targetFrame >= TOTAL_FRAMES - 1) {
        state.targetFrame = TOTAL_FRAMES - 1;
        state.isPlaying = false;
        if (playToggleBtn) {
          playToggleBtn.innerHTML = '▶';
          playToggleBtn.classList.remove('active');
        }
      }
    }

    // LERP current frame towards target frame
    const delta = state.targetFrame - state.currentFrame;
    state.currentFrame += delta * LERP_FACTOR;

    // Clamp current frame within [0, TOTAL_FRAMES - 1]
    const clampedFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, state.currentFrame));
    const roundedFrameIndex = Math.round(clampedFrame);

    renderCanvasFrame(roundedFrameIndex);
    updateUIOverlays(roundedFrameIndex);

    animationFrameId = requestAnimationFrame(updateAnimationLoop);
  }

  // ==========================================================================
  // 4. SCROLL TO FRAME CALCULATIONS
  // ==========================================================================

  function calculateTargetFrameFromScroll() {
    if (state.isPlaying) return; // Skip scroll calculation in auto-play mode

    const scrollTop = window.scrollY || window.pageYOffset;
    const maxScroll = scrollTrack.offsetHeight - window.innerHeight;
    
    if (maxScroll <= 0) return;

    const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
    state.targetFrame = scrollFraction * (TOTAL_FRAMES - 1);
  }

  function scrollToFrame(frameIndex) {
    const maxScroll = scrollTrack.offsetHeight - window.innerHeight;
    const fraction = frameIndex / (TOTAL_FRAMES - 1);
    const targetScrollY = fraction * maxScroll;
    
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }

  // ==========================================================================
  // 5. DYNAMIC UI OVERLAYS & CHAPTER MANAGERS
  // ==========================================================================

  function updateUIOverlays(frameIndex) {
    // 1. Update Timeline Scrubber
    if (timelineRange) {
      timelineRange.value = frameIndex;
    }
    if (frameIndicator) {
      const currentPad = String(frameIndex + 1).padStart(3, '0');
      frameIndicator.textContent = `FRAME ${currentPad} / ${TOTAL_FRAMES}`;
    }

    // 2. Hero Overlay (Frame 0 - 25)
    if (heroOverlay) {
      if (frameIndex <= 25) {
        heroOverlay.classList.add('active');
      } else {
        heroOverlay.classList.remove('active');
      }
    }

    // 3. Story Cards
    // Card 1: Frame 26 - 75
    // Card 2: Frame 76 - 125
    // Card 3: Frame 126 - 175
    // Card 4: Frame 176 - 210
    const cardRanges = [
      { id: 'story-1', start: 26, end: 75, dotIndex: 0 },
      { id: 'story-2', start: 76, end: 125, dotIndex: 1 },
      { id: 'story-3', start: 126, end: 175, dotIndex: 2 },
      { id: 'story-4', start: 176, end: 210, dotIndex: 3 }
    ];

    let activeChapter = -1;

    cardRanges.forEach((range) => {
      const cardEl = document.getElementById(range.id);
      if (cardEl) {
        if (frameIndex >= range.start && frameIndex <= range.end) {
          cardEl.classList.add('active');
          activeChapter = range.dotIndex;
        } else {
          cardEl.classList.remove('active');
        }
      }
    });

    // 4. Update Navigation Dots
    navDots.forEach((dotWrapper, idx) => {
      if (idx === activeChapter) {
        dotWrapper.classList.add('active');
      } else {
        dotWrapper.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // 6. AUDIO SYNTHESIZER ENGINE (WEB AUDIO API)
  // ==========================================================================

  function initAudio() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audioCtx = new AudioCtx();
      }
    }
  }

  function playTone(freq, type = 'sine', duration = 0.15) {
    if (!state.audioEnabled || !state.audioCtx) return;
    try {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.15, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // ==========================================================================
  // 7. EVENT LISTENERS & INITIALIZATION
  // ==========================================================================

  function bindEvents() {
    // Scroll listener
    window.addEventListener('scroll', calculateTargetFrameFromScroll, { passive: true });
    window.addEventListener('resize', resizeCanvas);

    // Timeline Scrubber Input
    if (timelineRange) {
      timelineRange.addEventListener('input', (e) => {
        const frameIdx = parseInt(e.target.value, 10);
        state.targetFrame = frameIdx;
        if (!state.isPlaying) {
          scrollToFrame(frameIdx);
        }
        playTone(300 + frameIdx * 2, 'sine', 0.08);
      });
    }

    // Auto-Play Toggle
    if (playToggleBtn) {
      playToggleBtn.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        if (state.isPlaying) {
          playToggleBtn.innerHTML = '❚❚';
          playToggleBtn.classList.add('active');
        } else {
          playToggleBtn.innerHTML = '▶';
          playToggleBtn.classList.remove('active');
        }
        playTone(520, 'triangle', 0.2);
      });
    }

    // Sound Toggle
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        initAudio();
        state.audioEnabled = !state.audioEnabled;
        if (state.audioEnabled) {
          soundToggleBtn.classList.add('active');
          soundToggleBtn.querySelector('.sound-label').textContent = 'SOUND: ON';
          playTone(440, 'sine', 0.2);
        } else {
          soundToggleBtn.classList.remove('active');
          soundToggleBtn.querySelector('.sound-label').textContent = 'SOUND: OFF';
        }
      });
    }

    // Side Nav Dot Clicks
    navDots.forEach((dotWrapper) => {
      dotWrapper.addEventListener('click', () => {
        const targetFrameIdx = parseInt(dotWrapper.getAttribute('data-frame'), 10);
        state.targetFrame = targetFrameIdx;
        scrollToFrame(targetFrameIdx);
        playTone(400, 'triangle', 0.15);
      });
    });

    // Specs Drawer Modal
    if (openSpecsBtn && specsDrawer) {
      openSpecsBtn.addEventListener('click', () => {
        specsDrawer.classList.add('active');
        playTone(350, 'sine', 0.15);
      });
    }

    if (closeSpecsBtn && specsDrawer) {
      closeSpecsBtn.addEventListener('click', () => {
        specsDrawer.classList.remove('active');
        playTone(250, 'sine', 0.15);
      });
    }

    if (specsDrawer) {
      specsDrawer.addEventListener('click', (e) => {
        if (e.target === specsDrawer) {
          specsDrawer.classList.remove('active');
        }
      });
    }
  }

  // Application Entry Point
  async function init() {
    try {
      await preloadFrames();
      
      // Hide preloader
      if (preloader) {
        preloader.classList.add('loaded');
      }

      // Initialize canvas dimensions
      resizeCanvas();
      
      // Bind interactions & launch smooth render loop
      bindEvents();
      calculateTargetFrameFromScroll();
      updateAnimationLoop();

    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
