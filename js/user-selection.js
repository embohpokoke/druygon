/**
 * Druygon User Selection Modal
 * Shows on page load to select from 5 player slots
 */

// User slot configuration (from profile.js)
const SLOT_CONFIG = [
  { id: 1, name: 'Dru', emoji: '🐉', color: '#FFCB05' },
  { id: 2, name: 'Oming', emoji: '🦖', color: '#FF6B35' },
  { id: 3, name: 'Illy', emoji: '🦈', color: '#4FC3F7' },
  { id: 4, name: 'Reymar', emoji: '🐺', color: '#00BCD4' },
  { id: 5, name: 'Extra', emoji: '🦅', color: '#9C27B0' }
];

const ACTIVE_SLOT_KEY = 'druygon_active_slot';

/**
 * Get active slot from localStorage
 */
function getActiveSlot() {
  const slot = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY));
  return (slot >= 1 && slot <= 5) ? slot : null;
}

/**
 * Set active slot
 */
function setActiveSlot(slotId) {
  localStorage.setItem(ACTIVE_SLOT_KEY, slotId.toString());
  console.log(`✅ Active slot set to: ${slotId} (${SLOT_CONFIG[slotId - 1].name})`);
}

/**
 * Show user selection modal
 */
function showUserSelection() {
  // Check if already selected
  const activeSlot = getActiveSlot();
  if (activeSlot) {
    console.log(`User already selected: Slot ${activeSlot}`);
    return false;
  }

  // Create modal HTML
  const modal = document.createElement('div');
  modal.id = 'user-selection-modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>🎮 Pilih Pemain</h2>
        <p>Siapa yang mau main hari ini?</p>
      </div>

      <div class="user-grid">
        ${SLOT_CONFIG.map(slot => `
          <div class="user-card" data-slot="${slot.id}" style="--user-color: ${slot.color}">
            <div class="user-emoji">${slot.emoji}</div>
            <div class="user-name">${slot.name}</div>
            <div class="user-info" id="user-info-${slot.id}">
              <div class="loading">Loading...</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="modal-footer">
        <p class="hint">💡 Pilih pemain untuk lanjut petualangan!</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add styles
  addModalStyles();

  // Load user stats for each slot
  loadUserStats();

  // Add click handlers
  document.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', () => {
      const slotId = parseInt(card.dataset.slot);
      selectUser(slotId);
    });
  });

  // Show modal with animation
  setTimeout(() => modal.classList.add('show'), 10);

  return true;
}

/**
 * Load user stats from localStorage and API
 */
async function loadUserStats() {
  for (let i = 1; i <= 5; i++) {
    const infoEl = document.getElementById(`user-info-${i}`);
    if (!infoEl) continue;

    try {
      // Try API first
      let profile = await DruygonAPI.loadProfile(i);

      // Fallback to localStorage
      if (!profile && typeof DruygonProfile !== 'undefined') {
        const localProfile = new DruygonProfile(i);
        profile = localProfile.data;
      }

      if (profile && profile.level) {
        infoEl.innerHTML = `
          <div class="stat">Level ${profile.level}</div>
          <div class="stat">${profile.xp || 0} XP</div>
          <div class="stat">${profile.gamesPlayed || profile.stats?.gamesPlayed || 0} games</div>
        `;
      } else {
        infoEl.innerHTML = `<div class="new-player">✨ New Player</div>`;
      }
    } catch (error) {
      console.error(`Failed to load stats for slot ${i}:`, error);
      infoEl.innerHTML = `<div class="new-player">✨ New Player</div>`;
    }
  }
}

/**
 * Select user and close modal
 */
function selectUser(slotId) {
  const slot = SLOT_CONFIG[slotId - 1];

  // Highlight selected card
  document.querySelectorAll('.user-card').forEach(card => {
    card.classList.remove('selected');
  });
  const selectedCard = document.querySelector(`.user-card[data-slot="${slotId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Save selection
  setActiveSlot(slotId);

  // Update API current slot
  if (window.DruygonAPI) {
    window.DruygonAPI.setCurrentSlot(slotId);
  }

  // Show confirmation
  setTimeout(() => {
    const modal = document.getElementById('user-selection-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }

    // Reload page to apply user
    window.location.reload();
  }, 500);
}

/**
 * Add modal styles
 */
function addModalStyles() {
  if (document.getElementById('user-selection-styles')) return;

  const style = document.createElement('style');
  style.id = 'user-selection-styles';
  style.textContent = `
    #user-selection-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    #user-selection-modal.show {
      opacity: 1;
    }

    .modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
    }

    .modal-content {
      position: relative;
      background: linear-gradient(145deg, #1e1c35 0%, #110f22 100%);
      border: 2px solid #FFCB05;
      border-radius: 24px;
      padding: 32px;
      max-width: 90%;
      width: 640px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }

    .modal-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .modal-header h2 {
      font-family: var(--font-display);
      font-size: 28px;
      color: #FFCB05;
      margin-bottom: 8px;
    }

    .modal-header p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }

    .user-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .user-card {
      background: linear-gradient(145deg, #252340 0%, #1a1830 100%);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
    }

    .user-card::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, var(--user-color), transparent);
      opacity: 0;
      border-radius: 16px;
      transition: opacity 0.3s;
      z-index: -1;
    }

    .user-card:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: var(--user-color);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .user-card:hover::before {
      opacity: 0.2;
    }

    .user-card.selected {
      border-color: var(--user-color);
      background: linear-gradient(145deg, #2a2850 0%, #1e1c35 100%);
      transform: scale(1.05);
    }

    .user-card.selected::before {
      opacity: 0.3;
    }

    .user-emoji {
      font-size: 48px;
      margin-bottom: 8px;
      animation: float 3s ease-in-out infinite;
    }

    .user-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--user-color);
      margin-bottom: 8px;
    }

    .user-info {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-info .loading {
      color: rgba(255, 255, 255, 0.4);
    }

    .user-info .new-player {
      color: #4ADE80;
      font-weight: 600;
    }

    .user-info .stat {
      white-space: nowrap;
    }

    .modal-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-footer .hint {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .modal-content {
        padding: 24px;
      }

      .user-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .modal-header h2 {
        font-size: 22px;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Initialize user selection on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Only show on homepage
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    // Small delay to ensure other scripts are loaded
    setTimeout(() => {
      const shown = showUserSelection();
      if (!shown) {
        console.log('User already selected, skipping modal');
      }
    }, 500);
  }
});

/**
 * Add "Change User" button to page
 */
function addChangeUserButton() {
  const activeSlot = getActiveSlot();
  if (!activeSlot) return;

  const slot = SLOT_CONFIG[activeSlot - 1];

  // Create button
  const button = document.createElement('button');
  button.className = 'change-user-btn';
  button.innerHTML = `
    <span class="btn-emoji">${slot.emoji}</span>
    <span class="btn-text">${slot.name}</span>
  `;
  button.title = 'Change User';

  // Add to header
  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    headerActions.insertBefore(button, headerActions.firstChild);
  }

  // Click handler
  button.addEventListener('click', () => {
    localStorage.removeItem(ACTIVE_SLOT_KEY);
    showUserSelection();
  });

  // Add button styles
  if (!document.getElementById('change-user-btn-styles')) {
    const style = document.createElement('style');
    style.id = 'change-user-btn-styles';
    style.textContent = `
      .change-user-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(8, 7, 20, 0.65);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        color: white;
        font-family: var(--font-display);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .change-user-btn:hover {
        background: rgba(8, 7, 20, 0.85);
        border-color: var(--yellow);
        transform: scale(1.05);
      }

      .change-user-btn .btn-emoji {
        font-size: 16px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Add change user button after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addChangeUserButton, 1000);
});

// Export for use in other scripts
window.UserSelection = {
  getActiveSlot,
  setActiveSlot,
  showUserSelection,
  SLOT_CONFIG
};

console.log('✅ User Selection System loaded');
