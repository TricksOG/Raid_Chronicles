/* ══════════════════════════════════════
   RAID CHRONICLES — MAIN ENTRY POINT
   Event wiring, routing, initialization
══════════════════════════════════════ */

(function () {

  // ═══════════════ INIT ═══════════════
  function init() {
    RC.Engine.startGameLoop();
    bindMenuEvents();
    bindCharCreateEvents();
    bindWorldEvents();
    bindCombatEvents();
    bindLootEvents();
    bindModalEvents();
    bindKeyboardEvents();

    RC.UI.renderMenu();

    // Check for existing save
    if (RC.Engine.hasSave()) {
      const savedChar = RC.Engine.load();
      if (savedChar) {
        RC.Engine.state.character = savedChar;
        RC.Engine.recalcStats();
      }
    }
  }

  // ═══════════════ MENU ═══════════════
  function bindMenuEvents() {
    const btnNew = document.getElementById('btn-new-game');
    const btnContinue = document.getElementById('btn-continue');

    btnNew?.addEventListener('click', () => {
      if (RC.Engine.hasSave()) {
        if (!confirm('Start a new game? This will overwrite your saved progress.')) return;
        RC.Engine.deleteSave();
      }
      RC.UI.showScreen('char-create');
      RC.UI.renderClassCards();
    });

    btnContinue?.addEventListener('click', () => {
      if (!RC.Engine.hasSave()) return;
      const saved = RC.Engine.load();
      if (!saved) { RC.UI.notify('Save data corrupted.'); return; }
      RC.Engine.state.character = saved;
      RC.Engine.recalcStats();
      RC.UI.showScreen('world');
    });
  }

  // ═══════════════ CHARACTER CREATION ═══════════════
  function bindCharCreateEvents() {
    const nameInput = document.getElementById('char-name-input');
    const btnBegin = document.getElementById('btn-begin');
    const btnBack = document.getElementById('btn-back-to-menu');

    nameInput?.addEventListener('input', () => {
      const hasName = nameInput.value.trim().length > 0;
      const hasClass = !!RC.UI._selectedClass;
      if (btnBegin) btnBegin.disabled = !(hasName && hasClass);
    });

    btnBegin?.addEventListener('click', () => {
      const classId = RC.UI._selectedClass;
      const name = nameInput?.value.trim();
      if (!classId || !name) return;

      RC.Engine.createCharacter(classId, name);
      RC.UI.showScreen('world');
      RC.UI.notify(`Welcome, ${name} the ${RC.DATA.classes[classId].name}!`);
    });

    btnBack?.addEventListener('click', () => {
      RC.UI._selectedClass = null;
      document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
      RC.UI.showScreen('menu');
      RC.UI.renderMenu();
    });
  }

  // ═══════════════ WORLD ═══════════════
  function bindWorldEvents() {
    // Nav buttons open modals
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => RC.UI.openModal(btn.dataset.modal));
    });
  }

  // ═══════════════ COMBAT ═══════════════
  function bindCombatEvents() {
    document.getElementById('btn-flee')?.addEventListener('click', () => {
      if (confirm('Flee from battle? You will gain no loot or XP.')) {
        RC.Engine.flee();
      }
    });
  }

  // ═══════════════ LOOT ═══════════════
  function bindLootEvents() {
    document.getElementById('btn-take-all')?.addEventListener('click', () => {
      RC.Engine.takeAllLoot();
      // Mark all loot items as taken visually
      document.querySelectorAll('.loot-item').forEach(el => {
        if (!el.querySelector('.loot-item-taken')) {
          const div = document.createElement('div');
          div.className = 'loot-item-taken';
          div.textContent = 'TAKEN';
          el.appendChild(div);
        }
      });
      RC.UI.notify('All items taken!');
      setTimeout(() => {
        RC.UI.showScreen('world');
        RC.Engine.state.pendingLoot = [];
      }, 1200);
    });

    document.getElementById('btn-leave-loot')?.addEventListener('click', () => {
      RC.Engine.state.pendingLoot = [];
      RC.UI.showScreen('world');
    });

    // Individual item take
    document.addEventListener('click', (e) => {
      const item = e.target.closest('[data-loot-idx]');
      if (!item) return;
      const screen = document.getElementById('screen-loot');
      if (!screen?.classList.contains('active')) return;

      const idx = parseInt(item.dataset.lootIdx);
      const lootItem = RC.Engine.state.pendingLoot[idx];
      if (!lootItem) return;

      RC.Engine.takeItem(lootItem);
      RC.Engine.state.pendingLoot.splice(idx, 1);

      // Show taken overlay
      if (!item.querySelector('.loot-item-taken')) {
        const div = document.createElement('div');
        div.className = 'loot-item-taken';
        div.textContent = 'TAKEN';
        item.appendChild(div);
      }

      RC.UI.notify(`Taken: ${lootItem.name || lootItem.isMaterial ? (lootItem.name + ' ×' + (lootItem.quantity || 1)) : lootItem.name}`);
    });
  }

  // ═══════════════ MODALS ═══════════════
  function bindModalEvents() {
    // Close on overlay click or ✕ button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        RC.UI.closeAllModals();
      }
      if (e.target.classList.contains('modal-close')) {
        RC.UI.closeAllModals();
      }
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') RC.UI.closeAllModals();
    });
  }

  // ═══════════════ KEYBOARD SHORTCUTS ═══════════════
  function bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      const screen = RC.Engine.state.screen;

      // Ability bar keybinds during combat
      if (screen === 'combat') {
        const keybinds = ['1','2','3','4','5','6'];
        const idx = keybinds.indexOf(e.key);
        if (idx !== -1) {
          e.preventDefault();
          RC.Engine.useAbility(idx);
        }
      }

      // World screen shortcuts
      if (screen === 'world') {
        if (e.key === 'c' || e.key === 'C') RC.UI.openModal('char');
        if (e.key === 'b' || e.key === 'B') RC.UI.openModal('inventory');
        if (e.key === 'l' || e.key === 'L') RC.UI.openModal('quests');
      }
    });
  }

  // ═══════════════ START ═══════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
