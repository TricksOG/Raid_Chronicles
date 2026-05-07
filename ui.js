/* ══════════════════════════════════════
   RAID CHRONICLES — UI SYSTEM
   All rendering, screen management, tooltips
══════════════════════════════════════ */

RC.UI = (() => {

  // ═══════════════ SCREEN MANAGEMENT ═══════════════
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');
    RC.Engine.state.screen = name;

    if (name === 'world') {
      renderWorld();
    } else if (name === 'combat') {
      renderCombat();
    } else if (name === 'loot') {
      renderLoot();
    }
  }

  // ═══════════════ MENU SCREEN ═══════════════
  function renderMenu() {
    const btn = document.getElementById('btn-continue');
    if (btn) {
      btn.disabled = !RC.Engine.hasSave();
      btn.classList.toggle('btn-menu-dim', !RC.Engine.hasSave());
    }
  }

  // ═══════════════ CHARACTER CREATION ═══════════════
  function renderClassCards() {
    const container = document.getElementById('class-cards');
    if (!container) return;
    container.innerHTML = '';

    Object.values(RC.DATA.classes).forEach(cls => {
      const card = document.createElement('div');
      card.className = 'class-card';
      card.dataset.classId = cls.id;

      const roleLabel = cls.role.charAt(0).toUpperCase() + cls.role.slice(1);
      card.innerHTML = `
        <div class="class-icon">${cls.icon}</div>
        <div class="class-name">${cls.name}</div>
        <div class="class-role-tag ${cls.roleColor}">${roleLabel}</div>
        <div class="class-desc">${cls.description}</div>
        <div class="class-lore">"${cls.roleFlavor}"</div>
        <div class="class-stats-preview mt-4">
          Resource: <span>${cls.resourceLabel}</span> &nbsp;|&nbsp;
          ${cls.role === 'tank' ? 'Armor: <span>Plate</span>' : cls.role === 'dps' ? 'SP: <span>' + cls.base.spellPower + '</span>' : 'Heal: <span>' + cls.base.healingPower + '</span>'}
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        RC.UI._selectedClass = cls.id;
        const btn = document.getElementById('btn-begin');
        const name = document.getElementById('char-name-input').value.trim();
        if (btn) btn.disabled = !name;
      });

      container.appendChild(card);
    });
  }

  // ═══════════════ WORLD SCREEN ═══════════════
  function renderWorld() {
    renderCharPill();
    renderBossMap();
    renderQuestTracker();
    renderPowerDisplay();
  }

  function renderCharPill() {
    const el = document.getElementById('char-pill');
    if (!el) return;
    const char = RC.Engine.state.character;
    if (!char) return;
    const cls = RC.DATA.classes[char.classId];
    el.innerHTML = `
      <div class="char-pill-icon">${cls.icon}</div>
      <div>
        <div class="char-pill-name">${char.name}</div>
        <div class="char-pill-class">${cls.name} &bull; ${cls.role.toUpperCase()}</div>
      </div>
      <div class="char-pill-ilvl">ilvl ${char.stats?.avgIlvl || 0}</div>
    `;
  }

  function renderBossMap() {
    const container = document.getElementById('boss-map');
    if (!container) return;
    container.innerHTML = '';
    const char = RC.Engine.state.character;
    const avgIlvl = char?.stats?.avgIlvl || 0;

    RC.DATA.bosses.forEach(boss => {
      const isLocked = avgIlvl < boss.ilvlReq;
      const isKilled = (char?.bossKills?.[boss.id] || 0) > 0;

      const node = document.createElement('div');
      node.className = `boss-node${isLocked ? ' locked' : ''}${isKilled ? ' killed' : ''}`;

      const dropText = isLocked
        ? `<div class="boss-node-lock">🔒 Requires ilvl ${boss.ilvlReq}</div>`
        : `<div class="boss-node-ilvl">Drops: ilvl ${boss.ilvlDropMin}–${boss.ilvlDropMax}</div>`;

      node.innerHTML = `
        <div class="boss-node-art">${boss.icon}</div>
        <div class="boss-node-info">
          <div class="boss-node-name">${boss.name}</div>
          <div class="boss-node-flavor">${boss.flavor}</div>
          ${dropText}
        </div>
      `;

      if (!isLocked) {
        node.addEventListener('click', () => startBossFight(boss.id));
        addTooltip(node, buildBossTooltip(boss, char));
      }

      container.appendChild(node);
    });
  }

  function buildBossTooltip(boss, char) {
    const kills = char?.bossKills?.[boss.id] || 0;
    return `
      <div class="tt-name text-red">${boss.name}</div>
      <div class="tt-type">World Boss</div>
      <div class="tt-desc">${boss.lore}</div>
      <div class="tt-divider"></div>
      <div class="tt-stat-row"><span class="tt-stat-name">HP</span><span class="tt-stat-val">${boss.stats.maxHP.toLocaleString()}</span></div>
      <div class="tt-stat-row"><span class="tt-stat-name">Abilities</span><span class="tt-stat-val">${boss.stats.abilities.length}</span></div>
      <div class="tt-stat-row"><span class="tt-stat-name">Your Kills</span><span class="tt-stat-val ${kills > 0 ? 'text-green' : ''}">${kills}</span></div>
    `;
  }

  function startBossFight(bossId) {
    if (!RC.Engine.startCombat(bossId)) return;
    showScreen('combat');
    initCombatUI();
  }

  function renderQuestTracker() {
    const el = document.getElementById('quest-tracker');
    if (!el) return;
    const char = RC.Engine.state.character;
    if (!char) return;

    const active = char.questsActive.map(id => RC.DATA.quests.find(q => q.id === id)).filter(Boolean);
    if (active.length === 0) {
      el.innerHTML = '<div class="text-dim" style="font-size:12px;font-style:italic">No active quests</div>';
      return;
    }

    el.innerHTML = active.slice(0, 3).map(q => {
      const objs = q.objectives.map(obj => {
        const cur = char.questObjectives[obj.id] || 0;
        const done = cur >= obj.needed;
        return `<div class="quest-tracker-obj ${done ? 'quest-tracker-done' : ''}">${done ? '✓' : '○'} ${obj.text} (${Math.min(cur, obj.needed)}/${obj.needed})</div>`;
      }).join('');
      return `<div class="quest-tracker-item"><b>${q.title}</b>${objs}</div>`;
    }).join('');
  }

  function renderPowerDisplay() {
    const el = document.getElementById('power-display');
    if (el) el.textContent = RC.Engine.state.character?.stats?.avgIlvl || 0;
  }

  // ═══════════════ MODALS ═══════════════
  function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    const modal = document.getElementById(`modal-${id}`);
    if (modal) {
      modal.classList.remove('hidden');
      renderModalContent(id);
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  }

  function renderModalContent(id) {
    if (id === 'char') renderCharSheet();
    if (id === 'inventory') renderInventory();
    if (id === 'quests') renderQuestLog();
    if (id === 'professions') renderProfessions();
  }

  function renderCharSheet() {
    const el = document.getElementById('char-sheet');
    if (!el) return;
    const char = RC.Engine.state.character;
    const cls = RC.DATA.classes[char.classId];
    const s = char.stats || {};

    // Gear slots
    const slotsHTML = RC.DATA.gearSlots.map(slot => {
      const item = char.equipment[slot.id];
      const qClass = item ? RC.DATA.qualityClass[item.quality] : '';
      const itemName = item ? `<span class="${qClass}">${item.name}</span>` : `<span class="text-dim">— Empty —</span>`;
      return `
        <div class="gear-slot" data-slot="${slot.id}">
          <div class="gear-slot-icon">${item ? item.icon : slot.icon}</div>
          <div>
            <div class="gear-slot-name">${slot.label}</div>
            <div class="gear-slot-item">${itemName}</div>
          </div>
        </div>
      `;
    }).join('');

    // Stats
    const statsHTML = buildStatPanel(s, cls);

    el.innerHTML = `
      <div class="char-sheet-grid">
        <div>
          <div class="stat-section-title">EQUIPPED GEAR</div>
          <div class="char-gear-slots">${slotsHTML}</div>
        </div>
        <div class="char-stat-panel">
          <div class="stat-section-title">${char.name} — ${cls.name}</div>
          ${statsHTML}
          <div class="stat-section-title" style="margin-top:12px">PROGRESSION</div>
          <div class="stat-row"><span class="stat-name">Total XP</span><span class="stat-val">${(char.totalXP||0).toLocaleString()}</span></div>
          <div class="stat-row"><span class="stat-name">Gold</span><span class="stat-val">${(char.gold||0).toLocaleString()}</span></div>
          <div class="stat-row"><span class="stat-name">Boss Kills</span><span class="stat-val">${char.totalKills||0}</span></div>
        </div>
      </div>
    `;

    // Gear slot tooltips
    el.querySelectorAll('.gear-slot[data-slot]').forEach(slotEl => {
      const slotId = slotEl.dataset.slot;
      const item = char.equipment[slotId];
      if (item) {
        addTooltip(slotEl, buildItemTooltip(item));
      }
    });
  }

  function buildStatPanel(s, cls) {
    const rows = [];
    rows.push('<div class="stat-section-title">BASE</div>');
    rows.push(statRow('HP', s.maxHP?.toLocaleString()));
    if (cls.resourceType === 'mana') rows.push(statRow('Mana', s.maxMana?.toLocaleString()));
    rows.push(statRow('Item Level', s.avgIlvl));

    if (cls.role === 'tank') {
      rows.push('<div class="stat-section-title">OFFENSE</div>');
      rows.push(statRow('Attack Power', s.totalAP?.toFixed(0)));
      rows.push(statRow('Crit', (s.totalCrit||0).toFixed(1) + '%'));
      rows.push(statRow('Hit', (s.hit||0).toFixed(1) + '%'));
      rows.push(statRow('Expertise', (s.expertise||0).toFixed(1)));
      rows.push('<div class="stat-section-title">DEFENSE</div>');
      rows.push(statRow('Armor', s.armor?.toLocaleString()));
      rows.push(statRow('Armor DR', ((s.armorDR||0)*100).toFixed(1) + '%'));
      rows.push(statRow('Defense', s.defense));
      rows.push(statRow('Dodge', (s.dodge||0).toFixed(1) + '%'));
      rows.push(statRow('Parry', (s.parry||0).toFixed(1) + '%'));
      rows.push(statRow('Block', (s.block||0).toFixed(1) + '%'));
      rows.push(statRow('Block Value', s.blockValue));
    } else if (cls.role === 'dps') {
      rows.push('<div class="stat-section-title">SPELL POWER</div>');
      rows.push(statRow('Spell Power', s.totalSP?.toFixed(0)));
      rows.push(statRow('Crit', (s.totalCrit||0).toFixed(1) + '%'));
      rows.push(statRow('Hit', (s.hit||0).toFixed(1) + '%'));
      rows.push(statRow('Haste', (s.haste||0).toFixed(1) + '%'));
      rows.push(statRow('MP5', s.mp5));
    } else {
      rows.push('<div class="stat-section-title">HEALING</div>');
      rows.push(statRow('Healing Power', s.totalHP_stat?.toFixed(0)));
      rows.push(statRow('Crit', (s.totalCrit||0).toFixed(1) + '%'));
      rows.push(statRow('Haste', (s.haste||0).toFixed(1) + '%'));
      rows.push(statRow('MP5', s.mp5));
      rows.push(statRow('Spirit', s.spirit));
    }
    return rows.join('');
  }

  function statRow(name, val) {
    return `<div class="stat-row"><span class="stat-name">${name}</span><span class="stat-val">${val ?? '—'}</span></div>`;
  }

  function renderInventory() {
    const el = document.getElementById('inventory-panel');
    if (!el) return;
    const char = RC.Engine.state.character;
    const inv = char.inventory || [];

    // Materials section
    const mats = Object.entries(char.materials || {});
    const matHTML = mats.length ? mats.map(([id, qty]) => {
      const mat = RC.DATA.materials.find(m => m.id === id);
      return mat ? `<div class="inv-slot" title="${mat.name} ×${qty}">${mat.icon}<div style="font-size:9px;color:#aaa">×${qty}</div></div>` : '';
    }).join('') : '';

    // Items
    const itemHTML = inv.map((item, idx) => {
      const qClass = RC.DATA.qualityClass[item.quality] || 'q-white';
      const div = document.createElement('div');
      div.className = 'inv-slot';
      div.innerHTML = `<div class="inv-item-icon ${qClass}">${item.icon}</div>`;
      return `<div class="inv-slot ${RC.DATA.qualityBorder[item.quality] || ''}" data-inv-idx="${idx}" style="cursor:pointer">${item.icon}</div>`;
    }).join('');

    el.innerHTML = `
      <div style="font-size:11px;color:var(--text-dim);letter-spacing:2px;margin-bottom:8px">ITEMS (${inv.length})</div>
      <div class="inv-grid">${itemHTML || '<div class="text-dim" style="font-size:12px;grid-column:1/-1">Bag is empty</div>'}</div>
      ${mats.length ? `<div style="font-size:11px;color:var(--text-dim);letter-spacing:2px;margin:12px 0 6px">MATERIALS</div><div class="inv-grid">${matHTML}</div>` : ''}
    `;

    // Attach item tooltips and click-to-equip
    el.querySelectorAll('[data-inv-idx]').forEach(slotEl => {
      const idx = parseInt(slotEl.dataset.invIdx);
      const item = inv[idx];
      if (!item) return;
      addTooltip(slotEl, buildItemTooltip(item));
      slotEl.addEventListener('click', () => {
        RC.Engine.equipItem(item);
        renderInventory();
        notify(`Equipped: ${item.name}`);
      });
    });
  }

  function renderQuestLog() {
    const el = document.getElementById('quest-log-panel');
    if (!el) return;
    const char = RC.Engine.state.character;

    const active = char.questsActive.map(id => RC.DATA.quests.find(q => q.id === id)).filter(Boolean);
    const complete = char.questsComplete.map(id => RC.DATA.quests.find(q => q.id === id)).filter(Boolean);

    const renderQuest = (q, isDone) => {
      const objs = q.objectives.map(obj => {
        const cur = Math.min(char.questObjectives[obj.id] || 0, obj.needed);
        const done = cur >= obj.needed;
        return `<div class="quest-obj ${done || isDone ? 'done' : 'pending'}">${done || isDone ? '✓' : '○'} ${obj.text} (${cur}/${obj.needed})</div>`;
      }).join('');

      const rwds = [];
      if (q.rewards.xp) rwds.push(`${q.rewards.xp} XP`);
      if (q.rewards.gold) rwds.push(`${q.rewards.gold} Gold`);

      return `
        <div class="quest-entry" style="${isDone ? 'opacity:0.6' : ''}">
          <div class="quest-title">${isDone ? '✓ ' : ''}${q.title} <span style="font-size:10px;color:var(--text-dim)">[${q.category}]</span></div>
          <div class="quest-desc">${q.story || q.desc}</div>
          <div class="quest-objectives">${objs}</div>
          ${rwds.length ? `<div class="quest-reward">Rewards: ${rwds.join(' · ')}</div>` : ''}
        </div>
      `;
    };

    el.innerHTML = `
      ${active.length ? `<div class="tracker-title">ACTIVE (${active.length})</div>${active.map(q => renderQuest(q, false)).join('')}` : ''}
      ${complete.length ? `<div class="tracker-title" style="margin-top:16px">COMPLETED (${complete.length})</div>${complete.map(q => renderQuest(q, true)).join('')}` : ''}
      ${!active.length && !complete.length ? '<div class="text-dim">No quests yet.</div>' : ''}
    `;
  }

  function renderProfessions() {
    const el = document.getElementById('profession-panel');
    if (!el) return;
    const char = RC.Engine.state.character;
    const cls = RC.DATA.classes[char.classId];

    el.innerHTML = RC.DATA.professions.map(prof => {
      const owned = char.professions[prof.id];
      const suitable = prof.forRoles.includes(cls.role);
      const btnLabel = owned ? '✓ Learned' : (suitable ? 'Learn' : 'Wrong Class');
      const mats = Object.entries(char.materials || {});

      const recipesHTML = prof.recipes.map(r => {
        const canCraft = r.mats.every(m => (char.materials[m.mat] || 0) >= m.qty);
        const matsHTML = r.mats.map(m => {
          const mat = RC.DATA.materials.find(x => x.id === m.mat);
          const have = char.materials[m.mat] || 0;
          const ok = have >= m.qty;
          return `<span style="color:${ok ? 'var(--green)' : 'var(--red)'};">${mat?.icon || '?'} ${mat?.name || m.mat} (${have}/${m.qty})</span>`;
        }).join(', ');
        return `
          <div style="background:var(--bg-panel3);border:1px solid #2a2a3a;border-radius:4px;padding:8px;margin-top:6px">
            <div style="font-family:Cinzel,serif;font-size:12px;color:var(--gold)">${r.name} <span style="color:var(--text-dim)">ilvl ${r.ilvl}</span></div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Mats: ${matsHTML}</div>
            ${owned ? `<button class="btn-secondary" style="margin-top:6px;font-size:11px;padding:4px 10px;${canCraft ? '' : 'opacity:0.5'}" data-craft="${r.id}" data-prof="${prof.id}" ${canCraft ? '' : 'disabled'}>Craft</button>` : ''}
          </div>
        `;
      }).join('');

      return `
        <div style="margin-bottom:18px;background:var(--bg-panel3);border:1px solid #2a2a3a;border-radius:6px;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-family:Cinzel,serif;font-size:16px;color:var(--gold)">${prof.icon} ${prof.name}</div>
              <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${prof.desc}</div>
              <div style="font-size:11px;color:var(--border-gold2);margin-top:4px">For: ${prof.forRoles.join(', ')}</div>
            </div>
            <button class="btn-secondary" style="font-size:11px;padding:6px 12px;${owned || !suitable ? 'opacity:0.5;cursor:default' : ''}" data-learn="${prof.id}" ${owned || !suitable ? 'disabled' : ''}>${btnLabel}</button>
          </div>
          ${owned ? recipesHTML : ''}
        </div>
      `;
    }).join('');

    // Learn buttons
    el.querySelectorAll('[data-learn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const profId = btn.dataset.learn;
        if (RC.Engine.learnProfession(profId)) {
          notify(`Learned: ${RC.DATA.professions.find(p => p.id === profId)?.name}`);
          renderProfessions();
        }
      });
    });
  }

  // ═══════════════ COMBAT UI ═══════════════
  function initCombatUI() {
    const c = RC.Engine.state.combat;
    const char = RC.Engine.state.character;
    const cls = RC.DATA.classes[char.classId];

    // Boss name
    document.getElementById('boss-name').textContent = c.boss.name;
    document.getElementById('boss-level-tag').textContent = 'Level 73 Elite';

    // Player portrait & name
    document.getElementById('player-portrait').textContent = cls.icon;
    document.getElementById('combat-player-name').textContent = char.name;

    // Resource bar class
    const rBar = document.getElementById('player-resource-bar');
    if (rBar) {
      rBar.className = `resource-bar resource-${cls.resourceType}`;
    }

    // Companions
    renderCompanions();

    // Ability bar
    renderAbilityBar(cls);

    // Clear log
    document.getElementById('combat-log').innerHTML = '';
  }

  function renderCompanions() {
    const container = document.getElementById('companion-frames');
    if (!container) return;
    const c = RC.Engine.state.combat;
    container.innerHTML = '';

    Object.values(c.companions).forEach(comp => {
      const el = document.createElement('div');
      el.className = 'companion-frame';
      el.id = `comp-frame-${comp.role}`;

      const roleColors = { tank: '#4a6fa5', dps: '#8a2be2', healer: '#daa520' };
      el.innerHTML = `
        <div class="comp-role-tag" style="color:${roleColors[comp.role]}">${comp.role.toUpperCase()}</div>
        <div class="comp-name">${comp.icon} ${comp.name}</div>
        <div class="comp-bar"><div class="comp-hp-fill" id="comp-hp-${comp.role}" style="width:100%"></div></div>
        <div class="comp-status" id="comp-status-${comp.role}">${comp.status}</div>
        <div class="comp-action" id="comp-action-${comp.role}"></div>
      `;
      container.appendChild(el);
    });
  }

  function renderAbilityBar(cls) {
    const container = document.getElementById('abilities-row');
    if (!container) return;
    container.innerHTML = '';

    cls.abilities.forEach((ability, idx) => {
      const btn = document.createElement('button');
      btn.className = 'ability-btn';
      btn.id = `ability-btn-${idx}`;
      btn.dataset.abilityIdx = idx;

      const isOffGcd = !ability.gcd;
      btn.innerHTML = `
        <div class="ability-icon-text" style="filter:drop-shadow(0 0 4px ${ability.color})">${ability.icon}</div>
        <div class="ability-keybind">${ability.keybind}</div>
        <div class="ability-cost-badge">${ability.cost > 0 ? ability.cost + (ability.costType === 'mana_pct' ? '%' : '') : '—'}</div>
        <div class="ability-cd-overlay" id="ability-cd-${idx}"></div>
        ${isOffGcd ? '<div style="position:absolute;top:2px;right:3px;font-size:8px;color:#c8a951;letter-spacing:0">OFF</div>' : ''}
      `;

      btn.style.borderColor = ability.color + '88';
      btn.style.background = `linear-gradient(135deg, #0d0d1a, ${ability.color}22)`;

      addTooltip(btn, buildAbilityTooltip(ability));
      btn.addEventListener('click', () => RC.Engine.useAbility(idx));

      container.appendChild(btn);

      // Separator before off-gcd abilities
      if (idx === 3) {
        const sep = document.createElement('div');
        sep.className = 'ability-separator';
        container.appendChild(sep);
      }
    });
  }

  function buildAbilityTooltip(ability) {
    const costStr = ability.cost > 0
      ? `${ability.cost}${ability.costType === 'mana_pct' ? '% Mana' : ' Rage'}`
      : 'No cost';
    const cdStr = ability.cooldown > 0 ? `${ability.cooldown}s cooldown` : 'No cooldown';
    const gcdStr = ability.gcd ? 'Triggers GCD' : '<span style="color:var(--gold)">OFF GCD</span>';

    return `
      <div class="tt-name" style="color:${ability.color}">${ability.icon} ${ability.name}</div>
      <div class="tt-type">${ability.type.toUpperCase()} · ${ability.damageType || ability.type}</div>
      <div class="tt-desc">${ability.desc}</div>
      <div class="tt-divider"></div>
      <div class="tt-cost">${costStr} · ${cdStr}</div>
      <div class="tt-cost">${gcdStr}</div>
      <div class="tt-divider"></div>
      <div class="tt-flavor">${ability.tooltip}</div>
    `;
  }

  // ── Main combat render (called every frame) ──
  function renderCombat() {
    const c = RC.Engine.state.combat;
    if (!c) return;

    const char = RC.Engine.state.character;
    const cls = RC.DATA.classes[char.classId];
    const player = c.player;
    const boss = c.boss;

    // ── Boss HP ──
    const bossHPPct = boss.currentHP / boss.maxHP;
    const bossHPBar = document.getElementById('boss-hp-bar');
    const bossHPText = document.getElementById('boss-hp-text');
    if (bossHPBar) bossHPBar.style.width = (bossHPPct * 100).toFixed(1) + '%';
    if (bossHPText) bossHPText.textContent = `${boss.currentHP.toLocaleString()} / ${boss.maxHP.toLocaleString()}`;

    // Boss debuffs
    renderBuffRow('boss-debuffs', boss.debuffs, true);

    // ── Player HP / Resource ──
    const hpPct = player.currentHP / player.maxHP;
    const resPct = player.currentResource / player.maxResource;

    const hpBar = document.getElementById('player-hp-bar');
    const resBar = document.getElementById('player-resource-bar');
    const hpText = document.getElementById('player-hp-text');
    const resText = document.getElementById('player-resource-text');

    if (hpBar) hpBar.style.width = (hpPct * 100).toFixed(1) + '%';
    if (resBar) resBar.style.width = (resPct * 100).toFixed(1) + '%';
    if (hpText) hpText.textContent = `${Math.ceil(player.currentHP).toLocaleString()} / ${player.maxHP.toLocaleString()}`;
    if (resText) {
      if (cls.resourceType === 'mana') {
        resText.textContent = `${Math.floor(player.currentResource).toLocaleString()} / ${player.maxResource.toLocaleString()} MP`;
      } else {
        resText.textContent = `${Math.floor(player.currentResource)} / ${player.maxResource} RAGE`;
      }
    }

    // HP bar color changes at low HP
    if (hpBar) {
      if (hpPct < 0.25) hpBar.style.background = 'linear-gradient(90deg, #5a0000, #cc2020)';
      else if (hpPct < 0.5) hpBar.style.background = 'linear-gradient(90deg, #3a3a00, #ccaa00)';
      else hpBar.style.background = 'linear-gradient(90deg, #0a5a0a, #1aaa1a)';
    }

    // Player buffs/debuffs
    renderBuffRow('player-buffs', [...player.buffs, ...player.debuffs.map(d => ({ ...d, isDebuff: true }))]);

    // ── GCD bar ──
    const gcdFill = document.getElementById('gcd-fill');
    if (gcdFill) {
      const gcdPct = player.gcdRemaining > 0 ? (player.gcdRemaining / player.gcdMax) * 100 : 0;
      gcdFill.style.width = gcdPct.toFixed(1) + '%';
    }

    // ── Ability buttons ──
    cls.abilities.forEach((ability, idx) => {
      const btn = document.getElementById(`ability-btn-${idx}`);
      const cdOverlay = document.getElementById(`ability-cd-${idx}`);
      if (!btn || !cdOverlay) return;

      const cd = player.cooldowns[ability.id] || 0;
      const onGcd = ability.gcd && player.gcdRemaining > 0;
      const noResource = player.currentResource < calcCostFn(ability, player);
      const needsBuff = ability.requireBuff && !player.buffs.find(b => b.id === ability.requireBuff);

      const disabled = onGcd || cd > 0 || noResource || needsBuff || !!player.channeling;
      btn.classList.toggle('disabled', disabled);

      if (cd > 0) {
        cdOverlay.style.display = 'flex';
        cdOverlay.textContent = cd.toFixed(cd > 10 ? 0 : 1);
      } else if (onGcd) {
        cdOverlay.style.display = 'flex';
        cdOverlay.textContent = '';
        cdOverlay.style.background = 'rgba(0,0,0,0.4)';
      } else if (needsBuff) {
        cdOverlay.style.display = 'flex';
        cdOverlay.textContent = '?';
        cdOverlay.style.background = 'rgba(50,0,0,0.6)';
      } else {
        cdOverlay.style.display = 'none';
      }

      // Eclipse indicator for Voidreaver
      if (ability.buildsEclipse) {
        btn.title = `Eclipse: ${player.eclipseCount}/3`;
        if (player.eclipseCount >= 3) btn.style.boxShadow = '0 0 12px #a335ee';
        else btn.style.boxShadow = '';
      }
      if (ability.consumesEclipse && player.eclipseCount >= 3) {
        btn.style.boxShadow = '0 0 20px #ff00ff';
      }
    });

    // ── Companions ──
    Object.values(c.companions).forEach(comp => {
      const hpFill = document.getElementById(`comp-hp-${comp.role}`);
      const statusEl = document.getElementById(`comp-status-${comp.role}`);
      const actionEl = document.getElementById(`comp-action-${comp.role}`);

      if (hpFill) {
        const pct = comp.maxHP > 0 ? (comp.currentHP / comp.maxHP) * 100 : 0;
        hpFill.style.width = pct.toFixed(1) + '%';
        if (pct < 25) hpFill.style.background = '#aa1010';
        else if (pct < 50) hpFill.style.background = '#aa8800';
        else hpFill.style.background = '';
      }
      if (statusEl) statusEl.textContent = comp.status || '';
      if (actionEl) actionEl.textContent = comp.lastAction || '';
    });

    // ── Combat Log ──
    const logEl = document.getElementById('combat-log');
    if (logEl && c.log.length > 0) {
      logEl.innerHTML = c.log.slice(0, 60).map(entry => {
        const typeClass = {
          dmg: 'log-dmg', heal: 'log-heal', dot: 'log-dot',
          ability: 'log-ability', boss: 'log-boss', system: 'log-system',
          crit: 'log-crit'
        }[entry.type] || '';
        return `<div class="log-entry ${typeClass}"><span class="log-time">[${entry.time}]</span>${entry.msg}</div>`;
      }).join('');
    }

    // ── Info strip ──
    const infoEl = document.getElementById('combat-info-strip');
    if (infoEl) {
      const cls2 = RC.DATA.classes[char.classId];
      infoEl.innerHTML = `
        <div class="info-stat"><span class="info-stat-label">DPS:</span><span class="info-stat-val">${c.elapsed > 0 ? Math.floor(player.totalDmgDone / c.elapsed) : 0}</span></div>
        <div class="info-stat"><span class="info-stat-label">Boss HP:</span><span class="info-stat-val">${(bossHPPct * 100).toFixed(1)}%</span></div>
        <div class="info-stat"><span class="info-stat-label">Time:</span><span class="info-stat-val">${c.elapsed.toFixed(0)}s</span></div>
        ${cls2.role === 'healer' ? `<div class="info-stat"><span class="info-stat-label">HPS:</span><span class="info-stat-val">${c.elapsed > 0 ? Math.floor(player.totalHealDone / c.elapsed) : 0}</span></div>` : ''}
        ${player.eclipseCount > 0 ? `<div class="info-stat"><span class="info-stat-val" style="color:#a335ee">Eclipse: ${player.eclipseCount}/3</span></div>` : ''}
        ${player.channeling ? `<div class="info-stat"><span class="info-stat-val" style="color:#ffd700">Channeling: ${player.channeling.name} (${player.channeling.remaining.toFixed(1)}s)</span></div>` : ''}
      `;
    }
  }

  function calcCostFn(ability, player) {
    if (ability.costType === 'mana_pct') return Math.floor(player.maxResource * (ability.cost / 100));
    return ability.cost || 0;
  }

  function renderBuffRow(elementId, buffs, isDebuffs) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = buffs.map(b => {
      const cls = b.isDebuff ? 'debuff-icon' : 'buff-icon';
      const dur = b.remaining ? b.remaining.toFixed(0) + 's' : '';
      const label = b.stacks ? `${b.icon}<span class="buff-dur" style="color:#ff8">${b.stacks}×</span>` :
                               `${b.icon}<span class="buff-dur">${dur}</span>`;
      return `<div class="${cls}" title="${b.name}">${label}</div>`;
    }).join('');
  }

  function showCombatResult(isVictory) {
    // Result overlay shown before transitioning to loot/world
    if (!isVictory) {
      RC.UI.notify('You have been defeated...');
      setTimeout(() => RC.UI.showScreen('world'), 2500);
    }
  }

  // ═══════════════ LOOT SCREEN ═══════════════
  function renderLoot() {
    const boss = RC.Engine.state.defeatedLootBoss;
    const loot = RC.Engine.state.pendingLoot;

    document.getElementById('loot-verdict').textContent = 'VICTORY!';
    document.getElementById('loot-boss-name').textContent = boss?.name || '';
    document.getElementById('loot-xp-text').textContent = `+${boss?.xp || 0} XP`;

    const grid = document.getElementById('loot-grid');
    if (!grid) return;

    grid.innerHTML = loot.map((item, idx) => {
      if (item.isMaterial) {
        return `
          <div class="loot-item border-purple" data-loot-idx="${idx}">
            <div class="loot-item-header">
              <div class="loot-item-icon">${item.icon}</div>
              <div class="loot-item-name q-purple">${item.name}</div>
            </div>
            <div class="loot-item-body">
              <div class="loot-item-slot">Material × ${item.quantity || 1}</div>
              <div class="loot-item-stats text-dim">${item.desc || ''}</div>
            </div>
          </div>
        `;
      }

      const qBorder = RC.DATA.qualityBorder[item.quality] || 'border-white';
      const qClass = RC.DATA.qualityClass[item.quality] || 'q-white';
      const statsHTML = item.stats ? Object.entries(item.stats).slice(0, 4).map(([k, v]) =>
        `<div class="loot-item-stat"><span>${formatStatName(k)}</span><span>+${v}</span></div>`
      ).join('') : '';

      return `
        <div class="loot-item ${qBorder}" data-loot-idx="${idx}">
          <div class="loot-item-header">
            <div class="loot-item-icon">${item.icon}</div>
            <div class="loot-item-name ${qClass}">${item.name}</div>
          </div>
          <div class="loot-item-body">
            <div class="loot-item-slot">${capitalize(item.slot || '')}</div>
            <div class="loot-item-ilvl">Item Level ${item.ilvl}</div>
            <div class="loot-item-stats">${statsHTML}</div>
            ${item.effect ? `<div style="font-size:10px;color:#00ccff;margin-top:4px">${item.effect}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Tooltips on loot items
    grid.querySelectorAll('[data-loot-idx]').forEach(el => {
      const idx = parseInt(el.dataset.lootIdx);
      const item = loot[idx];
      if (item && !item.isMaterial) addTooltip(el, buildItemTooltip(item));
    });
  }

  // ═══════════════ ITEM TOOLTIP ═══════════════
  function buildItemTooltip(item) {
    const qClass = RC.DATA.qualityClass[item.quality] || 'q-white';
    const qName = RC.DATA.qualityName[item.quality] || 'Common';
    const statsHTML = item.stats ? Object.entries(item.stats).map(([k, v]) =>
      `<div class="tt-stat-row"><span class="tt-stat-name">${formatStatName(k)}</span><span class="tt-stat-val">+${v}</span></div>`
    ).join('') : '';

    // Compare with equipped
    const char = RC.Engine.state.character;
    const equipped = item.slot ? char?.equipment?.[item.slot] : null;
    const compareHTML = equipped ? `
      <div class="tt-divider"></div>
      <div style="font-size:10px;color:var(--text-dim)">Equipped: <span class="${RC.DATA.qualityClass[equipped.quality]}">${equipped.name}</span> (ilvl ${equipped.ilvl})</div>
    ` : '';

    return `
      <div class="tt-name ${qClass}">${item.icon} ${item.name}</div>
      <div class="tt-type">${qName} · ${capitalize(item.slot || '')} · ilvl ${item.ilvl || '?'}</div>
      <div class="tt-divider"></div>
      ${statsHTML}
      ${item.effect ? `<div class="tt-divider"></div><div style="color:#00ccff;font-size:11px">${item.effect}</div>` : ''}
      ${compareHTML}
      ${item.roles ? `<div class="tt-divider"></div><div style="font-size:10px;color:var(--text-dim)">For: ${item.roles.join(', ')}</div>` : ''}
    `;
  }

  // ═══════════════ TOOLTIP SYSTEM ═══════════════
  function addTooltip(el, html) {
    el.addEventListener('mouseenter', (e) => showTooltip(html, e));
    el.addEventListener('mousemove', (e) => moveTooltip(e));
    el.addEventListener('mouseleave', hideTooltip);
  }

  function showTooltip(html, e) {
    const tt = document.getElementById('rc-tooltip');
    if (!tt) return;
    tt.innerHTML = html;
    tt.classList.remove('hidden');
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const tt = document.getElementById('rc-tooltip');
    if (!tt || tt.classList.contains('hidden')) return;
    const x = Math.min(e.clientX + 14, window.innerWidth - tt.offsetWidth - 8);
    const y = Math.min(e.clientY + 14, window.innerHeight - tt.offsetHeight - 8);
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
  }

  function hideTooltip() {
    const tt = document.getElementById('rc-tooltip');
    if (tt) tt.classList.add('hidden');
  }

  // ═══════════════ NOTIFICATIONS ═══════════════
  let notifTimer = null;
  function notify(msg, duration = 3000) {
    const el = document.getElementById('rc-notification');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (notifTimer) clearTimeout(notifTimer);
    notifTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  // ═══════════════ HELPERS ═══════════════
  function formatStatName(key) {
    const names = {
      stamina: 'Stamina', strength: 'Strength', agility: 'Agility',
      intellect: 'Intellect', spirit: 'Spirit',
      attackPower: 'Attack Power', spellPower: 'Spell Power', healingPower: 'Healing Power',
      crit: 'Crit Rating', hit: 'Hit Rating', expertise: 'Expertise',
      armorPen: 'Armor Pen', defense: 'Defense', dodge: 'Dodge', parry: 'Parry',
      block: 'Block', blockValue: 'Block Value', mp5: 'MP5', haste: 'Haste',
      armor: 'Armor'
    };
    return names[key] || key;
  }

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }

  // ═══════════════ PUBLIC API ═══════════════
  return {
    showScreen, renderMenu, renderClassCards, renderWorld,
    renderCombat, renderLoot, initCombatUI,
    openModal, closeAllModals,
    showCombatResult,
    addTooltip, showTooltip, hideTooltip,
    notify,
    _selectedClass: null
  };

})();
