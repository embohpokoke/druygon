/**
 * Druygon Interactions
 * Touch and click interactions for the mockup
 */

// ============================================
// 1. TOUCH FEEDBACK
// ============================================

// Add ripple effect on tap
function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');

  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  ripple.classList.add('ripple');

  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
}

// Add ripple CSS dynamically
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }

  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  .btn, .game-card, .card, .bottom-nav-item {
    position: relative;
    overflow: hidden;
  }
`;
document.head.appendChild(rippleStyle);

// Attach ripple to all interactive elements
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.btn, .game-card, .card');
  buttons.forEach(button => {
    button.addEventListener('click', createRipple);
  });
});

// ============================================
// 2. HAPTIC FEEDBACK (iOS/Android)
// ============================================

function vibrateLight() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function vibrateMedium() {
  if ('vibrate' in navigator) {
    navigator.vibrate(20);
  }
}

// Add haptic to buttons
document.addEventListener('DOMContentLoaded', () => {
  const interactiveElements = document.querySelectorAll('.btn, .bottom-nav-item, .game-card');
  interactiveElements.forEach(el => {
    el.addEventListener('touchstart', vibrateLight, { passive: true });
  });

  const primaryButtons = document.querySelectorAll('.btn-primary');
  primaryButtons.forEach(btn => {
    btn.addEventListener('click', vibrateMedium);
  });
});

// ============================================
// 3. GAME CARD INTERACTIONS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const gameCards = document.querySelectorAll('.game-card:not(.game-card-locked)');

  gameCards.forEach(card => {
    // Double-tap to quick play
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;

      if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        quickPlay(card);
        e.preventDefault();
      }
      lastTap = currentTime;
    });

    // Long press to add to favorites
    let pressTimer;
    card.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        addToFavorites(card);
        vibrateMedium();
      }, 800);
    });

    card.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    card.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
  });
});

function quickPlay(card) {
  const title = card.querySelector('.game-card-title').textContent.trim();
  showToast(`Quick Playing: ${title}`, '🚀');

  // Simulate loading
  const sprite = card.querySelector('.game-card-sprite');
  if (sprite) {
    sprite.style.animation = 'spin 0.5s ease-in-out';
    setTimeout(() => {
      sprite.style.animation = '';
    }, 500);
  }
}

function addToFavorites(card) {
  const title = card.querySelector('.game-card-title').textContent.trim();
  showToast(`Added to favorites: ${title}`, '⭐');

  // Add visual feedback
  card.style.borderColor = 'var(--color-primary)';
  card.style.borderWidth = '2px';
  setTimeout(() => {
    card.style.borderColor = '';
    card.style.borderWidth = '';
  }, 1000);
}

// ============================================
// 4. TOAST NOTIFICATIONS
// ============================================

function showToast(message, emoji = '✨') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span style="font-size: 20px; margin-right: 8px;">${emoji}</span>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // Add toast styles if not exists
  if (!document.getElementById('toast-styles')) {
    const toastStyle = document.createElement('style');
    toastStyle.id = 'toast-styles';
    toastStyle.textContent = `
      .toast {
        position: fixed;
        bottom: calc(72px + var(--safe-bottom) + 16px);
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(37, 37, 66, 0.95);
        backdrop-filter: blur(12px);
        color: white;
        padding: 12px 20px;
        border-radius: 24px;
        display: flex;
        align-items: center;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                   toast-out 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 2.5s forwards;
      }

      @keyframes toast-in {
        to {
          transform: translateX(-50%) translateY(0);
        }
      }

      @keyframes toast-out {
        to {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(toastStyle);
  }

  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// 5. SMOOTH SCROLL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('a[href^="#"]');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
});

// ============================================
// 6. BOTTOM NAV ACTIVE STATE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.bottom-nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // Remove active from all
      navItems.forEach(nav => nav.classList.remove('active'));

      // Add active to clicked item
      item.classList.add('active');

      // Show toast for demo purposes
      const label = item.querySelector('div:last-child').textContent;
      if (label !== 'Home') {
        e.preventDefault();
        showToast(`${label} - Coming soon!`, item.querySelector('.bottom-nav-icon').textContent);
      }
    });
  });
});

// ============================================
// 7. PLAY BUTTON INTERACTIONS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const playButtons = document.querySelectorAll('.game-card-cta:not([disabled])');

  playButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click

      const card = button.closest('.game-card');
      const title = card.querySelector('.game-card-title').textContent.trim();

      // Loading state
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;

      // Simulate game loading
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
        showToast(`Starting ${title}`, '🎮');
      }, 1500);
    });
  });
});

// ============================================
// 8. KEYBOARD SHORTCUTS (Desktop)
// ============================================

document.addEventListener('keydown', (e) => {
  // Press 1-5 for navigation
  if (e.key >= '1' && e.key <= '5') {
    const index = parseInt(e.key) - 1;
    const navItems = document.querySelectorAll('.bottom-nav-item');
    if (navItems[index]) {
      navItems[index].click();
    }
  }

  // Press 'p' to play first game
  if (e.key === 'p' || e.key === 'P') {
    const firstPlayButton = document.querySelector('.btn-primary');
    if (firstPlayButton) {
      firstPlayButton.click();
    }
  }
});

// ============================================
// 9. PROGRESS BAR ANIMATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const progressBars = document.querySelectorAll('.progress-bar-fill');

  // Animate on load
  progressBars.forEach(bar => {
    const targetWidth = bar.style.width;
    bar.style.width = '0%';

    setTimeout(() => {
      bar.style.width = targetWidth;
    }, 300);
  });
});

// ============================================
// 10. PERFORMANCE: LAZY LOAD IMAGES
// ============================================

// Intersection Observer for lazy loading
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('fade-in-up');
        observer.unobserve(img);
      }
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
  });
}

// ============================================
// 11. CONSOLE EASTER EGG
// ============================================

console.log(`
%c🎮 DRUYGON PORTAL - REDESIGN MOCKUP
%c
Built with ❤️ using Mobile-First Design
Design System v2.0 | Pokemon-Themed

Keyboard Shortcuts:
- Press 1-5: Navigate sections
- Press P: Play first game
- Double-tap game card: Quick play
- Long-press game card: Add to favorites

🎨 Design Tokens Available
- Check window.designSystem for colors, spacing, etc.

`,
'font-size: 16px; font-weight: bold; color: #FFCB05;',
'font-size: 12px; color: #999;'
);

// Expose design system to console
window.designSystem = {
  colors: {
    primary: '#FFCB05',
    secondary: '#FF4500',
    tertiary: '#00A7E7',
    accent: '#78C850'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  typography: {
    fontPrimary: 'Poppins',
    fontSecondary: 'Inter',
    fontAccent: 'Press Start 2P'
  }
};

console.log('💡 Try: window.designSystem');
