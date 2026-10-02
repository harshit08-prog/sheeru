const loaderCount = document.getElementById('loader-count');
const loaderMessageText = document.getElementById('loader-message-text');
const body = document.body;

const startLoader = () => {
  const message = 'my love for you';
  if (loaderMessageText) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      loaderMessageText.textContent = message;
    } else {
      let characterIndex = 0;
      const writeMessage = () => {
        loaderMessageText.textContent = message.slice(0, characterIndex);
        characterIndex += 1;
        if (characterIndex <= message.length) setTimeout(writeMessage, 95);
      };
      writeMessage();
    }
  }

  const start = performance.now();
  const duration = 2200;
  let current = 0;

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(100, (elapsed / duration) * 100);
    const displayValue = Math.max(current, progress);

    if (displayValue >= 100) {
      if (loaderCount) loaderCount.textContent = '100%';
      const loader = document.querySelector('.loader');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduceMotion || !loader) {
        body.classList.add('loaded');
      } else {
        loader.classList.add('is-zooming');
        setTimeout(() => body.classList.add('loaded'), 700);
      }
      return;
    }

    current = displayValue;
    if (loaderCount) loaderCount.textContent = `${Math.round(current)}%`;
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

window.addEventListener('load', startLoader);

// IntersectionObserver for scroll-down reveal (translateY from negative to 0)
const initScrollReveal = () => {
  const memoriesSection = document.getElementById('memories');
  const memoriesHeading = document.querySelector('.memories h2');
  const memoryCarousel = document.querySelector('.memory-carousel');

  if (!memoriesSection) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        memoriesSection.classList.add('is-visible');
        if (memoriesHeading) memoriesHeading.classList.add('is-visible');
        if (memoryCarousel) memoryCarousel.classList.add('is-visible');
      }
    });
  }, observerOptions);

  observer.observe(memoriesSection);
};

// Interactive 3D Carousel rotation controlled by cursor position, 3D tilt & drag velocity
const initCursorCarousel = () => {
  const carousel = document.querySelector('.memory-carousel');
  const orbit = document.querySelector('.memory-orbit');

  if (!carousel || !orbit) return;

  const videos = Array.from(orbit.querySelectorAll('video'));
  const videoCards = Array.from(orbit.querySelectorAll('.memory-card'))
    .map((card) => ({
      angle: parseFloat(getComputedStyle(card).getPropertyValue('--orbit-angle')) || 0,
      front: card.querySelector('video.memory-card-front'),
      back: card.querySelector('video.memory-card-back'),
      activeVideo: null
    }))
    .filter((card) => card.front && card.back);

  // Turn off CSS animation keyframes so JS animation loop has full control
  orbit.style.animation = 'none';

  let currentRotationY = 0;
  const rotationSpeed = 15;
  let lastFrameTime = performance.now();
  let animationFrameId = null;
  let isCarouselVisible = false;
  let isDivaCovering = false;
  let isPaused = true;

  const updateVideoPlayback = () => {
    videoCards.forEach((card) => {
      const angle = (currentRotationY + card.angle) * Math.PI / 180;
      const nextVideo = Math.cos(angle) >= 0 ? card.front : card.back;

      if (card.activeVideo !== nextVideo) {
        if (card.activeVideo) {
          if (card.activeVideo.readyState > 0 && nextVideo.readyState > 0) {
            nextVideo.currentTime = card.activeVideo.currentTime;
          }
          card.activeVideo.pause();
        }
        card.activeVideo = nextVideo;
      }

      if (nextVideo.paused) nextVideo.play().catch(() => {});
    });
  };

  // Smooth Animation Frame Loop
  const animate = (now) => {
    if (isPaused) {
      animationFrameId = null;
      return;
    }

    currentRotationY += rotationSpeed * (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    orbit.style.transform = `rotateY(${currentRotationY}deg)`;
    updateVideoPlayback();

    animationFrameId = requestAnimationFrame(animate);
  };

  const updateActivity = () => {
    const shouldPause = !isCarouselVisible || isDivaCovering;
    if (shouldPause === isPaused) return;

    isPaused = shouldPause;
    if (isPaused) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      videos.forEach((video) => video.pause());
    } else {
      lastFrameTime = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    }
  };

  const carouselObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isCarouselVisible = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      updateActivity();
    });
  }, { threshold: 0.1 });
  carouselObserver.observe(carousel);

  const diva = document.getElementById('diva');
  if (diva) {
    const divaObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isDivaCovering = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        updateActivity();
      });
    }, { threshold: 0.6 });

    divaObserver.observe(diva);
  }

};

// Smooth parallax scaling / fading for the hero as memories enters
const initMultiSectionParallax = () => {
  const heroText = document.querySelector('.hero-text');
  const heroImageWrap = document.querySelector('.hero-image-wrap');
  const memories = document.getElementById('memories');

  if (!memories) return;

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const windowHeight = window.innerHeight;

      // 1. As memories section slides over hero
      const memoriesRect = memories.getBoundingClientRect();
      if (memoriesRect.top <= windowHeight && memoriesRect.top >= 0) {
        const progress = 1 - memoriesRect.top / windowHeight;
        const scale = 1 - progress * 0.08;
        const opacity = 1 - progress * 0.45;

        if (heroText) {
          heroText.style.transform = `translateY(calc(-50% - ${progress * 40}px)) scale(${scale})`;
          heroText.style.opacity = opacity;
        }
        if (heroImageWrap) {
          heroImageWrap.style.transform = `translateY(calc(-50% - ${progress * 30}px)) scale(${scale})`;
          heroImageWrap.style.opacity = opacity;
        }
      } else if (memoriesRect.top < 0) {
        // Scrolled fully into memories -> Keep hero static & minimized
        if (heroText) {
          heroText.style.transform = 'translateY(calc(-50% - 40px)) scale(0.92)';
          heroText.style.opacity = '0.55';
        }
        if (heroImageWrap) {
          heroImageWrap.style.transform = 'translateY(calc(-50% - 30px)) scale(0.92)';
          heroImageWrap.style.opacity = '0.55';
        }
      } else if (memoriesRect.top > windowHeight) {
        // Above memories -> Reset hero to initial
        if (heroText) {
          heroText.style.transform = 'translateY(-50%) scale(1)';
          heroText.style.opacity = '1';
        }
        if (heroImageWrap) {
          heroImageWrap.style.transform = 'translateY(-50%) scale(1)';
          heroImageWrap.style.opacity = '1';
        }
      }

      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
};

// Video slideshow controls for Diva section (Prev/Next buttons, Dots, Touch Swipe)
const initDivaSlideshow = () => {
  const slideshow = document.querySelector('.diva-video-slideshow');
  const track = document.querySelector('.diva-slides-track');
  const slides = document.querySelectorAll('.diva-slide');
  const prevBtn = document.querySelector('.diva-slide-btn.prev-btn');
  const nextBtn = document.querySelector('.diva-slide-btn.next-btn');
  const dots = document.querySelectorAll('.diva-dot');

  if (!slideshow || !track || !slides.length) return;

  let currentIndex = 0;
  const totalSlides = slides.length;

  const updateSlideshow = (index) => {
    currentIndex = (index + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });

    // Ensure video on current slide is playing
    slides.forEach((slide, idx) => {
      const video = slide.querySelector('video');
      if (video) {
        if (idx === currentIndex) {
          video.play().catch(() => { });
        }
      }
    });
  };

  if (prevBtn) {
    prevBtn.addEventListener('click', () => updateSlideshow(currentIndex - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => updateSlideshow(currentIndex + 1));
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => updateSlideshow(idx));
  });

  // Touch Swipe support
  let touchStartX = 0;
  slideshow.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  slideshow.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        updateSlideshow(currentIndex + 1);
      } else {
        updateSlideshow(currentIndex - 1);
      }
    }
  });
};

// Story section: scroll-linked parallax (letter, ghost text, heading, arrow) + one-time reveal
const initStoryParallax = () => {
  const story = document.getElementById('letter');
  if (!story) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    story.classList.add('is-visible');
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        story.classList.add('is-visible');
        revealObserver.disconnect();
      }
    });
  }, { threshold: 0.25 });
  revealObserver.observe(story);

  let ticking = false;

  const update = () => {
    const rect = story.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the section's top enters the viewport, 1 when its bottom leaves
    const progress = (vh - rect.top) / (vh + rect.height);
    const p = Math.max(-1, Math.min(1, (progress - 0.5) * 2));
    story.style.setProperty('--p', p.toFixed(4));
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
};

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initCursorCarousel();
  initMultiSectionParallax();
  initDivaSlideshow();
  initStoryParallax();
});





