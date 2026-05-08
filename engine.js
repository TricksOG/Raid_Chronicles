/* ══════════════════════════════════════
   RAID CHRONICLES — GAME ENGINE
   State, Combat Loop, AI, Loot, Saves
══════════════════════════════════════ */

RC.Engine = (() => {

  // ═══════════════ STATE ═══════════════
  let state = {
    screen: "menu",
    character: null,
    combat: null,
    pendingLoot: [],
    defeatedLootBoss: null
  };

  // ═══════════════ SAVE / LOAD ═══════════════
  const SAVE_KEY = "rc_save_v1";

  function save() {
    if (!state.character) return;
    try {
      const s = {
        character: state.character,
        version: 1
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch(e) { console.warn("Save failed", e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.version !== 1) return null;
      return s.character;
    } catch(e) { return null; }
  }

  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

  function deleteSave() { localStorage.removeItem(SAVE_KEY); }

  // ═══════════════ CHARACTER CREATION ═══════════════
  function createCharacter(classId, name) {
    const cls = RC.DATA.classes[classId];
    if (!cls) return null;

    const char = {
      name: name.trim() || "Champion",
      classId,
      totalKills: 0,
      bossKills: {},   // bossId -> count
      totalXP: 0,
      gold: 0,
      // Gear: slot -> item object or null
      equipment: {},
      // Bag inventory
      inventory: [],
      // Professions
      professions: {},
      // Materials
      materials: {},
      // Quest state
      questsActive: [],
      questsComplete: [],
      questObjectives: {},   // qid_oid -> current value
    };

    // Initialize equipment slots
    RC.DATA.gearSlots.forEach(s => char.equipment[s.id] = null);

    // Initialize quest objectives
    RC.DATA.quests.forEach(q => {
      q.objectives.forEach(o => {
        char.questObjectives[o.id] = 0;
      });
    });

    // Auto-start first quest
    if (!char.questsActive.includes("q001")) {
      char.questsActive.push("q001");
    }
    if (!char.questsActive.includes("q011")) {
      char.questsActive.push("q011");
    }

    state.character = char;
    recalcStats();
    save();
    return char;
  }

  // ═══════════════ STAT CALCULATION ═══════════════
  function recalcStats() {
    const char = state.character;
    if (!char) return;
    const cls = RC.DATA.classes[char.classId];
    const f = RC.DATA.formulas;

    // Start from base
    const s = { ...cls.base };

    // Add gear stats
    RC.DATA.gearSlots.forEach(slot => {
      const item = char.equipment[slot.id];
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([k, v]) => {
          s[k] = (s[k] || 0) + v;
        });
      }
    });

    // Derived stats
    s.maxHP = (s.hp || 0) + (s.stamina || 0) * f.staminaToHP;

    // Mana
    if (cls.resourceType === "mana") {
      s.maxMana = (cls.maxMana || 9000) + (s.intellect || 0) * f.intellectToMana;
    }

    // Attack Power
    if (char.classId === "stoneguard") {
      s.totalAP = (s.attackPower || 0) + (s.strength || 0) * f.strengthToAP + (s.agility || 0) * f.agilityToAP;
    } else {
      s.totalAP = s.attackPower || 0;
    }

    // Spell Power / Healing Power
    s.totalSP = s.spellPower || 0;
    s.totalHP_stat = s.healingPower || 0;

    // Crit chance
    s.totalCrit = (s.crit || 0) + (s.agility || 0) * f.agilityToCrit;
    if (cls.resourceType === "mana") {
      s.totalCrit += (s.intellect || 0) * f.intellectToCrit;
    }

    // GCD (Haste reduces it, min 1.0s)
    const hasteReduction = (s.haste || 0) / 100;
    s.gcdTime = Math.max(1.0, f.baseGCD * (1 - hasteReduction));

    // Armor damage reduction vs boss level 73
    const bossLevel = 73;
    const armor = s.armor || 0;
    s.armorDR = armor / (armor + 467.5 * bossLevel - 22167.5);
    s.armorDR = Math.max(0, Math.min(0.75, s.armorDR)); // cap at 75%

    // Item level (average of equipped items)
    const equippedItems = RC.DATA.gearSlots
      .map(sl => char.equipment[sl.id])
      .filter(Boolean);
    s.avgIlvl = equippedItems.length > 0
      ? Math.floor(equippedItems.reduce((a, i) => a + i.ilvl, 0) / equippedItems.length)
      : 0;
    s.equippedCount = equippedItems.length;

    char.stats = s;
    return s;
  }

  function getAverageIlvl() {
    const char = state.character;
    if (!char || !char.stats) return 0;
    return char.stats.avgIlvl || 0;
  }

  // ═══════════════ COMBAT INITIALIZATION ═══════════════
  function startCombat(bossId) {
    const bossData = RC.DATA.bosses.find(b => b.id === bossId);
    if (!bossData) return false;

    const char = state.character;
    const cls = RC.DATA.classes[char.classId];
    const stats = char.stats;

    // Build combat state
    state.combat = {
      bossId,
      active: true,
      elapsed: 0,
      log: [],
      healTarget: "tank", // which companion the healer is focused on; "player" = self

      boss: {
        id: bossId,
        name: bossData.name,
        maxHP: bossData.stats.maxHP,
        currentHP: bossData.stats.maxHP,
        armor: bossData.stats.armor,
        autoAttackDmg: bossData.stats.autoAttackDmg,
        autoAttackSpeed: bossData.stats.autoAttackSpeed,
        autoAttackTimer: bossData.stats.autoAttackSpeed,
        abilities: bossData.stats.abilities.map(a => ({
          ...a, timer: a.timer, maxTimer: a.cooldown
        })),
        buffs: [],   // boss buffs (e.g. battle_cry)
        debuffs: [], // boss debuffs (sunder_armor stack etc)
        phaseTriggered: false,
        bossData
      },

      player: {
        maxHP: stats.maxHP,
        currentHP: stats.maxHP,
        maxResource: cls.resourceType === "mana" ? stats.maxMana : 100,
        currentResource: cls.resourceType === "mana" ? stats.maxMana : 20, // start rage at 20
        resourceType: cls.resourceType,
        gcdRemaining: 0,
        gcdMax: stats.gcdTime,
        cooldowns: {}, // abilityId -> remaining seconds
        buffs: [],
        debuffs: [],
        channeling: null, // { abilityId, remaining, tickTimer, ticks, totalTicks }
        eclipseCount: 0,  // for Voidreaver
        threat: 0,
        totalDmgDone: 0,
        totalHealDone: 0,
        totalDmgTaken: 0
      },

      companions: buildCompanions(cls.role, bossData),
      victory: false,
      defeat: false,
      endTimer: 0
    };

    addLog(`⚔ You engage ${bossData.name}!`, "system");
    addLog("Combat has begun!", "system");

    return true;
  }

  function buildCompanions(playerRole, bossData) {
    // Party: Tank + DPS + DPS2 + Healer, player fills one slot
    const allRoles = ["tank", "dps", "dps2", "healer"];
    const needRoles = allRoles.filter(r => {
      if (r === "dps2") return true; // always include second DPS
      return r !== playerRole;
    });
    const comps = {};
    const scaleMult = bossData.stats.maxHP / 400000; // scale to new Gruntling baseline

    needRoles.forEach(role => {
      const archetype = RC.DATA.aiCompanions[role];
      comps[role] = {
        role,
        name: archetype.name,
        title: archetype.title,
        icon: archetype.icon,
        maxHP: Math.floor(archetype.baseHP * (1 + scaleMult * 0.5)),
        currentHP: Math.floor(archetype.baseHP * (1 + scaleMult * 0.5)),
        actionTimer: archetype.actionInterval,
        actionInterval: archetype.actionInterval,
        buffs: [],
        status: "Fighting...",
        lastAction: "",
        threat: role === "tank" ? 999999 : 0,
        totalDmgDone: 0,
        totalHealDone: 0,
        scaleMult,
        archetype
      };
    });
    return comps;
  }

  // ═══════════════ MAIN COMBAT UPDATE ═══════════════
  let lastTimestamp = null;
  let rafId = null;

  function startGameLoop() {
    function loop(ts) {
      if (lastTimestamp === null) lastTimestamp = ts;
      const dt = Math.min((ts - lastTimestamp) / 1000, 0.1); // cap delta at 100ms
      lastTimestamp = ts;

      if (state.combat && state.combat.active) {
        updateCombat(dt);
        RC.UI.renderCombat();
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopGameLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastTimestamp = null;
  }

  function updateCombat(dt) {
    const c = state.combat;
    if (!c || !c.active) return;
    c.elapsed += dt;

    const player = c.player;
    const boss = c.boss;

    // ── GCD ──
    if (player.gcdRemaining > 0) player.gcdRemaining = Math.max(0, player.gcdRemaining - dt);

    // ── Cooldowns ──
    Object.keys(player.cooldowns).forEach(id => {
      player.cooldowns[id] = Math.max(0, player.cooldowns[id] - dt);
    });

    // ── Player Buffs ──
    player.buffs = player.buffs.filter(b => {
      b.remaining -= dt;
      return b.remaining > 0;
    });

    // ── Player Debuffs ──
    player.debuffs = player.debuffs.filter(d => {
      d.remaining -= dt;
      if (d.type === "dot" && d.tickTimer !== undefined) {
        d.tickTimer -= dt;
        if (d.tickTimer <= 0) {
          d.tickTimer += d.tickInterval;
          const dmg = d.dmgPerTick || 200;
          applyDamageToPlayer(dmg, "magic", "debuff");
          addLog(`${d.name} sears you for ${dmg} damage`, "dot");
        }
      }
      return d.remaining > 0;
    });

    // ── Boss Debuffs ──
    boss.debuffs = boss.debuffs.filter(d => {
      d.remaining -= dt;
      if (d.type === "dot" && d.tickTimer !== undefined) {
        d.tickTimer -= dt;
        if (d.tickTimer <= 0) {
          d.tickTimer += d.tickInterval;
          const dmg = d.dmgPerTick || 100;
          const actual = Math.floor(dmg * (1 - boss.armorDR || 0));
          boss.currentHP = Math.max(0, boss.currentHP - actual);
          addLog(`${d.name} ticks ${actual} on the boss`, "dot");
        }
      }
      return d.remaining > 0;
    });

    // ── Boss Buffs ──
    boss.buffs = boss.buffs.filter(b => { b.remaining -= dt; return b.remaining > 0; });

    // ── Mana Regen ──
    if (player.resourceType === "mana") {
      player.manaRegenTimer = (player.manaRegenTimer || 0) + dt;
      if (player.manaRegenTimer >= 2) {
        player.manaRegenTimer -= 2;
        const mp5perTick = (state.character.stats.mp5 || 80) * 2 / 5;
        player.currentResource = Math.min(player.maxResource, player.currentResource + mp5perTick);
      }
    }

    // ── Rage Passive ──
    if (player.resourceType === "rage") {
      // Rage stays in combat; slight passive decay
      player.rageCombatTimer = (player.rageCombatTimer || 0) + dt;
      if (player.rageCombatTimer >= 1) {
        player.rageCombatTimer -= 1;
        // Small passive rage gen from being in combat
        if (Math.random() < 0.3) {
          player.currentResource = Math.min(player.maxResource, player.currentResource + 3);
        }
      }
    }

    // ── Channeling ──
    if (player.channeling) {
      const ch = player.channeling;
      ch.remaining -= dt;
      ch.tickTimer -= dt;

      if (ch.tickTimer <= 0 && ch.ticks < ch.totalTicks) {
        ch.ticks++;
        ch.tickTimer += ch.channelDuration / ch.totalTicks;
        const ability = RC.DATA.classes[state.character.classId].abilities.find(a => a.id === ch.abilityId);
        if (ability) {
          if (ability.type === "channel" && ability.damageType) {
            const dmg = calcSpellDamage(ability.baseDmg, ability.spScale || 0);
            const { actual, isCrit } = applyDamageToBoss(dmg, "magic");
            addLog(`${ability.name}: ${actual}${isCrit ? " ✦CRIT!" : ""}`, "dmg");
          } else if (ability.healsAll) {
            healAll(ability, "channel tick");
          }
        }
      }

      if (ch.remaining <= 0) {
        addLog(`${ch.name} finishes`, "system");
        player.channeling = null;
      }
    }

    // ── Boss Auto Attack ──
    boss.autoAttackTimer -= dt;
    if (boss.autoAttackTimer <= 0) {
      boss.autoAttackTimer = boss.autoAttackSpeed;
      performBossAutoAttack();
    }

    // ── Boss Abilities ──
    boss.abilities.forEach(ability => {
      ability.timer -= dt;
      if (ability.timer <= 0) {
        ability.timer = ability.maxTimer;
        performBossAbility(ability);
      }
    });

    // ── HoT Ticks ──
    processHoTs(dt);

    // ── AI Companions ──
    Object.values(c.companions).forEach(comp => {
      if (comp.currentHP <= 0) return;
      comp.buffs = comp.buffs.filter(b => { b.remaining -= dt; return b.remaining > 0; });
      comp.actionTimer -= dt;
      if (comp.actionTimer <= 0) {
        comp.actionTimer = comp.actionInterval;
        performAIAction(comp);
      }
    });

    // ── Boss Phase ──
    const bossData = boss.bossData;
    if (bossData.phaseAt && !boss.phaseTriggered) {
      if (boss.currentHP / boss.maxHP <= bossData.phaseAt) {
        boss.phaseTriggered = true;
        addLog(`🔴 ${bossData.phaseMessage}`, "boss");
        boss.autoAttackDmg = Math.floor(boss.autoAttackDmg * 1.3);
      }
    }

    // ── Win / Lose ──
    if (boss.currentHP <= 0 && !c.victory && !c.defeat) {
      boss.currentHP = 0;
      c.active = false;
      c.victory = true;
      handleVictory();
    }

    if (player.currentHP <= 0 && !c.defeat && !c.victory) {
      player.currentHP = 0;
      c.active = false;
      c.defeat = true;
      addLog("💀 You have been slain...", "boss");
      setTimeout(() => {
        RC.UI.showCombatResult(false);
      }, 1500);
    }
  }

  // ═══════════════ BOSS ACTIONS ═══════════════
  function performBossAutoAttack() {
    const c = state.combat;
    const boss = c.boss;
    const player = c.player;

    // Determine target: tank companion holds aggro unless player is WAY ahead in threat
    const tank = c.companions["tank"];
    const playerRole = RC.DATA.classes[state.character.classId].role;

    let targetIsPlayer = true;
    if (playerRole === "tank") {
      // Player IS the tank — boss always attacks player
      targetIsPlayer = true;
    } else if (tank && tank.currentHP > 0) {
      // Tank companion holds aggro unless player has 3x more threat (pulled aggro)
      targetIsPlayer = player.threat > tank.threat * 3;
    }

    let dmg = boss.autoAttackDmg;

    // Boss buffs
    boss.buffs.forEach(b => {
      if (b.id === "enraged") dmg = Math.floor(dmg * b.dmgMult);
      if (b.id === "overclocked") dmg = Math.floor(dmg * 0.7); // lower per-hit but faster
    });

    if (targetIsPlayer) {
      const playerRole = RC.DATA.classes[state.character.classId].role;
      let mitigation = 0;

      // Tank uses armor mitigation
      if (playerRole === "tank") {
        mitigation = state.character.stats.armorDR || 0;
        // Check dodge
        const dodgeChance = (state.character.stats.dodge || 0) / 100;
        if (Math.random() < dodgeChance) {
          addLog(`Boss attacks — you DODGE!`, "ability");
          // Grant Revenge proc for Stoneguard
          if (state.character.classId === "stoneguard") {
            grantBuff(player.buffs, { id: "revenge_proc", name: "Revenge!", icon: "🔥", remaining: 5, duration: 5 });
          }
          // Rage from dodge
          if (player.resourceType === "rage") {
            player.currentResource = Math.min(player.maxResource, player.currentResource + 15);
          }
          return;
        }
        // Check parry
        const parryChance = (state.character.stats.parry || 0) / 100;
        if (Math.random() < parryChance) {
          addLog(`Boss attacks — you PARRY!`, "ability");
          if (state.character.classId === "stoneguard") {
            grantBuff(player.buffs, { id: "revenge_proc", name: "Revenge!", icon: "🔥", remaining: 5, duration: 5 });
          }
          if (player.resourceType === "rage") {
            player.currentResource = Math.min(player.maxResource, player.currentResource + 10);
          }
          return;
        }
        // Shield block active?
        const shieldBlock = player.buffs.find(b => b.id === "shield_block");
        if (shieldBlock) {
          shieldBlock.charges = (shieldBlock.charges || 2) - 1;
          const blockVal = state.character.stats.blockValue || 200;
          dmg = Math.max(0, dmg - blockVal);
          addLog(`You BLOCK ${blockVal} damage!`, "ability");
          if (shieldBlock.charges <= 0) {
            player.buffs = player.buffs.filter(b => b.id !== "shield_block");
          }
        }
      }

      // Armor mitigation
      dmg = Math.floor(dmg * (1 - mitigation));

      // Rage from taking damage
      if (player.resourceType === "rage") {
        const rageGain = Math.floor(dmg / 200);
        player.currentResource = Math.min(player.maxResource, player.currentResource + rageGain);
      }

      applyDamageToPlayer(dmg, "physical", "boss-auto");
      addLog(`${boss.name} hits you for ${dmg}`, "boss");
    } else {
      // Boss attacks tank companion
      const reducedDmg = Math.floor(dmg * 0.6); // tank companion soaks more
      tank.currentHP = Math.max(0, tank.currentHP - reducedDmg);
      tank.lastAction = `Took ${reducedDmg} dmg!`;
      addLog(`${boss.name} hits ${tank.name} for ${reducedDmg}`, "boss");

      // Tank companion triggers healer AI immediately if low
      if (tank.currentHP / tank.maxHP < 0.5) {
        const healer = c.companions["healer"];
        if (healer && healer.currentHP > 0) {
          const heal = Math.floor(healer.archetype.healPerAction * (1 + healer.scaleMult * 0.5));
          tank.currentHP = Math.min(tank.maxHP, tank.currentHP + heal);
          healer.lastAction = `Emergency heal: +${heal}`;
        }
      }
    }
  }

  function performBossAbility(ability) {
    const c = state.combat;
    const boss = c.boss;
    addLog(`⚠ ${boss.name}: ${ability.warning || ability.name}!`, "boss");

    if (ability.type === "physical" || ability.type === "magic") {
      let dmg = ability.dmg || 0;
      // Empowered in phase 2
      if (boss.phaseTriggered) dmg = Math.floor(dmg * 1.3);

      // Does it stun?
      if (ability.stunDur) {
        addLog(`You are stunned for ${ability.stunDur}s!`, "boss");
        c.player.gcdRemaining = Math.max(c.player.gcdRemaining, ability.stunDur);
      }

      // Deal damage — directed attacks hit tank companion if player is not the tank
      const playerRole = RC.DATA.classes[state.character.classId].role;
      const tankComp = c.companions["tank"];
      const directedHitsTank = playerRole !== "tank" && tankComp && tankComp.currentHP > 0
        && ability.id !== "void_corruption" && ability.id !== "oblivion_mark"; // some mechanics target non-tanks

      if (directedHitsTank) {
        const tankMitigated = Math.floor(dmg * 0.55); // tank companion has armor
        tankComp.currentHP = Math.max(0, tankComp.currentHP - tankMitigated);
        tankComp.lastAction = `Tanked ${ability.name}: -${tankMitigated}`;
        addLog(`${ability.name} hits ${tankComp.name} for ${tankMitigated}!`, "boss");
      } else {
        const mitigated = playerRole === "tank" ? Math.floor(dmg * (1 - (state.character.stats.armorDR || 0))) : dmg;
        applyDamageToPlayer(mitigated, ability.type, "boss-ability");
        addLog(`${ability.name} hits you for ${mitigated}!`, "boss");
      }

      // Also hits companions for some abilities (cleave-type)
      if (ability.id === "cleave" || ability.id === "reality_fracture") {
        // Cleave hits player too — but reduced if not the tank
        const splashPct = playerRole === "tank" ? 0 : 0.15; // healers/DPS only get 15% splash
        if (splashPct > 0) {
          const splashDmg = Math.floor(dmg * splashPct);
          applyDamageToPlayer(splashDmg, ability.type, "boss-ability");
          if (splashDmg > 0) addLog(`${ability.name} splashes you for ${splashDmg}`, "boss");
        }
        Object.values(c.companions).forEach(comp => {
          if (comp.currentHP > 0) {
            const compDmg = Math.floor(dmg * (comp.role === "tank" ? 0.5 : 0.15));
            comp.currentHP = Math.max(0, comp.currentHP - compDmg);
          }
        });
      }

      // Boss applies debuff
      if (ability.debuff === "rooted") {
        c.player.gcdRemaining = Math.max(c.player.gcdRemaining, ability.debuffDur || 3);
      }

      // Void corruption DoT
      if (ability.dotDmg) {
        const dot = {
          id: "void_corruption", name: "Void Corruption", icon: "☠",
          type: "dot", damageType: "magic",
          remaining: ability.dotDur || 12,
          duration: ability.dotDur || 12,
          tickInterval: ability.dotInterval || 2,
          tickTimer: ability.dotInterval || 2,
          dmgPerTick: ability.dotDmg || 500
        };
        c.player.debuffs = c.player.debuffs.filter(d => d.id !== "void_corruption");
        c.player.debuffs.push(dot);
      }
    }

    if (ability.type === "buff") {
      grantBuff(boss.buffs, {
        id: ability.buff, name: ability.name, icon: ability.icon,
        remaining: ability.buffDuration, duration: ability.buffDuration,
        dmgMult: ability.buffDmgMult || 1
      });
    }

    if (ability.type === "shield") {
      grantBuff(boss.buffs, {
        id: "boss_shield", name: "Shield Matrix", icon: "🔰",
        remaining: ability.shieldDur || 6, duration: ability.shieldDur || 6,
        absorbLeft: ability.shieldAmt || 20000
      });
      addLog(`Boss shields itself for ${(ability.shieldAmt || 20000).toLocaleString()}!`, "boss");
    }

    if (ability.type === "debuff" && ability.debuff === "marked_oblivion") {
      addLog("You are marked — taking 50% more damage for 10s!", "boss");
      grantBuff(c.player.debuffs, {
        id: "marked_oblivion", name: "Mark of Oblivion", icon: "🔺",
        remaining: ability.debuffDur || 10, duration: ability.debuffDur || 10,
        dmgTakenMult: 1.5
      });
    }
  }

  // ═══════════════ AI COMPANIONS ═══════════════
  function performAIAction(comp) {
    const c = state.combat;
    const player = c.player;
    const boss = c.boss;

    if (comp.role === "tank") {
      // Tank AI: Generate threat, take some hits, use defensives
      const threat = Math.floor(comp.archetype.threatPerAction * (1 + comp.scaleMult * 0.3));
      comp.threat += threat;
      comp.lastAction = `Holds aggro (+${threat} threat)`;
      comp.status = `Tanking ${boss.name}`;
      // Self-heal to stay up — tanks are sturdy
      if (comp.currentHP / comp.maxHP < 0.85) {
        const selfHeal = Math.floor(comp.maxHP * 0.06);
        comp.currentHP = Math.min(comp.maxHP, comp.currentHP + selfHeal);
      }
    }

    if (comp.role === "dps" || comp.role === "dps2") {
      // DPS AI: Deal damage to boss
      const dmgAmt = Math.floor(comp.archetype.dpsPerAction * (1 + comp.scaleMult * 0.4) * (0.85 + Math.random() * 0.3));
      boss.currentHP = Math.max(0, boss.currentHP - dmgAmt);
      comp.threat += Math.floor(dmgAmt * 0.5);
      comp.totalDmgDone = (comp.totalDmgDone || 0) + dmgAmt;
      comp.lastAction = `Deals ${dmgAmt} damage`;
      comp.status = `DPS: ${Math.floor(dmgAmt / comp.actionInterval)}/s`;
      addLog(`${comp.name} hits for ${dmgAmt}`, "companion-dmg");
    }

    if (comp.role === "healer") {
      const healAmt = Math.floor(comp.archetype.healPerAction * (1 + comp.scaleMult * 0.4) * (0.9 + Math.random() * 0.2));
      const tank = c.companions["tank"];
      const playerRole = RC.DATA.classes[state.character.classId].role;

      const tankHPPct = tank && tank.currentHP > 0 ? tank.currentHP / tank.maxHP : 1;
      const playerHPPct = player.currentHP / player.maxHP;

      // If player is the healer, they are squishy — heal them more urgently
      const playerHealThreshold = playerRole === "healer" ? 0.85 : 0.70;
      const playerUrgent = playerHPPct < playerHealThreshold;
      const tankUrgent = tankHPPct < 0.80;

      if (playerUrgent && (!tankUrgent || playerHPPct < tankHPPct)) {
        // Player needs healing more urgently
        const actual = Math.min(player.maxHP - player.currentHP, healAmt);
        player.currentHP += actual;
        comp.totalHealDone = (comp.totalHealDone || 0) + actual;
        comp.lastAction = `Healed you for ${actual}`;
        comp.status = `Healing party`;
        if (actual > 0) addLog(`${comp.name} heals you for ${actual}`, "heal");
      } else if (tankUrgent && tank && tank.currentHP > 0) {
        const actual = Math.min(tank.maxHP - tank.currentHP, healAmt);
        tank.currentHP += actual;
        comp.totalHealDone = (comp.totalHealDone || 0) + actual;
        comp.lastAction = `Healed ${tank.name} for ${actual}`;
        comp.status = `Healing tank`;
        addLog(`${comp.name} heals ${tank.name} for ${actual}`, "companion-heal");
      } else if (playerHPPct < 0.98) {
        const actual = Math.min(player.maxHP - player.currentHP, Math.floor(healAmt * 0.5));
        player.currentHP += actual;
        comp.totalHealDone = (comp.totalHealDone || 0) + actual;
        comp.lastAction = `Topped you off: +${actual}`;
        comp.status = `Healing party`;
        if (actual > 0) addLog(`${comp.name} heals you for ${actual}`, "heal");
      } else {
        comp.lastAction = "Maintaining...";
        comp.status = "Watching...";
      }
    }
  }

  // ═══════════════ PLAYER ABILITIES ═══════════════
  function useAbility(abilityIndex) {
    const c = state.combat;
    if (!c || !c.active) return false;

    const player = c.player;
    const char = state.character;
    const cls = RC.DATA.classes[char.classId];
    const ability = cls.abilities[abilityIndex];
    if (!ability) return false;

    // Check GCD
    if (ability.gcd && player.gcdRemaining > 0) {
      addLog("On GCD...", "system");
      return false;
    }

    // Check cooldown
    if ((player.cooldowns[ability.id] || 0) > 0) {
      const rem = player.cooldowns[ability.id].toFixed(1);
      addLog(`${ability.name} on cooldown (${rem}s)`, "system");
      return false;
    }

    // Check if channeling
    if (player.channeling) {
      addLog("Already channeling!", "system");
      return false;
    }

    // Check requires buff
    if (ability.requireBuff) {
      const hasBuff = player.buffs.find(b => b.id === ability.requireBuff);
      if (!hasBuff) {
        addLog(`${ability.name} not available (requires ${ability.requireBuff})`, "system");
        return false;
      }
    }

    // Check resource cost
    const cost = calculateCost(ability, player);
    if (player.currentResource < cost) {
      const label = player.resourceType === "mana" ? "mana" : "rage";
      addLog(`Not enough ${label}!`, "system");
      return false;
    }

    // Deduct cost
    player.currentResource -= cost;

    // Apply GCD
    if (ability.gcd) player.gcdRemaining = player.gcdMax;

    // Apply cooldown
    if (ability.cooldown > 0) player.cooldowns[ability.id] = ability.cooldown;

    // Remove requireBuff if consumed
    if (ability.requireBuff) {
      player.buffs = player.buffs.filter(b => b.id !== ability.requireBuff);
    }

    // Execute ability
    executeAbility(ability, player);

    return true;
  }

  function calculateCost(ability, player) {
    if (ability.costType === "rage") return ability.cost;
    if (ability.costType === "mana_pct") {
      return Math.floor(player.maxResource * (ability.cost / 100));
    }
    return 0;
  }

  function executeAbility(ability, player) {
    const c = state.combat;
    const boss = c.boss;
    const stats = state.character.stats;

    if (ability.type === "damage") {
      let dmg = 0;
      if (ability.apScale) {
        dmg = calcPhysicalDamage(ability.baseDmg || 0, ability.apScale || 0);
      } else if (ability.spScale) {
        dmg = calcSpellDamage(ability.baseDmg || 0, ability.spScale || 0);
      }

      // Eclipse bonus
      if (ability.consumesEclipse && player.eclipseCount >= 3) {
        dmg = Math.floor(dmg * (1 + (ability.eclipseBonus || 0.5)));
        player.eclipseCount = 0;
        addLog("✦ ECLIPSE consumed!", "ability");
      }

      const { actual, isCrit } = applyDamageToBoss(dmg, ability.damageType || "physical", ability.threatMult || 1);
      addLog(`${ability.name}: ${actual}${isCrit ? " ✦CRIT!" : ""}`, isCrit ? "crit" : "dmg");

      // Apply debuff
      if (ability.debuff) applyDebuffToBoss(ability);
    }

    if (ability.type === "dot") {
      const dot = {
        id: ability.debuff || ability.id,
        name: ability.name,
        icon: ability.icon,
        type: "dot",
        remaining: ability.duration,
        duration: ability.duration,
        tickInterval: ability.tickInterval,
        tickTimer: ability.tickInterval,
        dmgPerTick: Math.floor((ability.baseDmg || 100) + (stats.totalSP || 0) * (ability.spScale || 0))
      };
      // Refresh or apply
      boss.debuffs = boss.debuffs.filter(d => d.id !== dot.id);
      boss.debuffs.push(dot);
      addLog(`${ability.name} applied (${dot.dmgPerTick}/tick)`, "dmg");
    }

    if (ability.type === "heal") {
      const amt = calcHealAmount(ability.baseheal || 0, ability.hpScale || 0);

      if (ability.bounces) {
        // Chain heal — hits heal target first, then bounces
        const targets = getHealTargets(ability.bounces + 1);
        targets.forEach(t => {
          const healAmt = Math.floor(amt * (0.5 + 0.5 * Math.random()));
          if (t === "player") {
            player.currentHP = Math.min(player.maxHP, player.currentHP + healAmt);
          } else if (c.companions[t]) {
            c.companions[t].currentHP = Math.min(c.companions[t].maxHP, c.companions[t].currentHP + healAmt);
          }
        });
        addLog(`${ability.name}: ${amt} bouncing heal`, "heal");
        player.totalHealDone += amt;
      } else {
        // Direct heal — goes to selected heal target
        const healTarget = c.healTarget || "player";
        const targetComp = healTarget !== "player" ? c.companions[healTarget] : null;

        if (targetComp && targetComp.currentHP > 0) {
          const actual = Math.min(targetComp.maxHP - targetComp.currentHP, amt);
          targetComp.currentHP += actual;
          addLog(`${ability.name}: ${actual} on ${targetComp.name}`, "heal");
          player.totalHealDone += actual;
        } else {
          player.currentHP = Math.min(player.maxHP, player.currentHP + amt);
          addLog(`${ability.name}: ${amt}`, "heal");
          player.totalHealDone += amt;
        }
      }
    }

    if (ability.type === "hot") {
      const tickHeal = Math.floor((ability.baseheal || 100) + (stats.totalHP_stat || stats.totalSP || 0) * (ability.hpScale || 0));
      const buff = {
        id: ability.buff || ability.id,
        name: ability.name,
        icon: ability.icon,
        type: "hot",
        remaining: ability.duration,
        duration: ability.duration,
        tickInterval: ability.tickInterval,
        tickTimer: ability.tickInterval,
        healPerTick: tickHeal,
        isHot: true
      };
      player.buffs = player.buffs.filter(b => b.id !== buff.id);
      player.buffs.push(buff);
      addLog(`${ability.name}: +${tickHeal} every ${ability.tickInterval}s`, "heal");

      // Process HoT ticks in player buff update
    }

    if (ability.type === "shield") {
      const shieldAmt = Math.floor((ability.baseShield || 800) + (stats.totalHP_stat || 0) * (ability.hpScale || 0));
      // Apply to tank if it's a healer using it on tank
      const tank = c.companions["tank"];
      if (tank && tank.currentHP > 0) {
        grantBuff(tank.buffs, { id: "celestial_ward", name: "Celestial Ward", icon: "🔮",
          remaining: ability.duration || 15, duration: ability.duration || 15, absorbLeft: shieldAmt });
        addLog(`${ability.name}: ${shieldAmt} absorb on ${tank.name}`, "heal");
      } else {
        grantBuff(player.buffs, { id: "celestial_ward", name: "Celestial Ward", icon: "🔮",
          remaining: ability.duration || 15, duration: ability.duration || 15, absorbLeft: shieldAmt });
        addLog(`${ability.name}: ${shieldAmt} absorb on yourself`, "heal");
      }
    }

    if (ability.type === "channel") {
      player.channeling = {
        abilityId: ability.id,
        name: ability.name,
        remaining: ability.channelDuration,
        channelDuration: ability.channelDuration,
        tickTimer: ability.channelDuration / ability.ticks,
        ticks: 0,
        totalTicks: ability.ticks,
        ability
      };
      addLog(`Channeling ${ability.name}...`, "ability");
    }

    if (ability.type === "defensive") {
      if (ability.buff === "shield_block") {
        grantBuff(player.buffs, { id: "shield_block", name: "Shield Block", icon: "🔰",
          remaining: 10, duration: 10, charges: 2 });
        addLog("Shield Block: Next 2 attacks blocked!", "ability");
      }
      if (ability.buff === "last_stand") {
        const bonus = Math.floor(player.maxHP * 0.3);
        player.maxHP += bonus;
        player.currentHP = Math.min(player.maxHP, player.currentHP + bonus);
        grantBuff(player.buffs, { id: "last_stand", name: "Last Stand", icon: "💪",
          remaining: 20, duration: 20, bonusHP: bonus });
        addLog(`Last Stand! +${bonus} max HP for 20s`, "ability");
        setTimeout(() => {
          if (state.combat && state.combat.active) {
            state.combat.player.maxHP -= bonus;
            state.combat.player.currentHP = Math.min(state.combat.player.currentHP, state.combat.player.maxHP);
          }
        }, 20000);
      }
    }

    if (ability.type === "utility" && ability.id === "dark_pact") {
      const hpLoss = Math.floor(player.currentHP * (ability.hpCostPct || 0.2));
      const manaGain = Math.floor(player.maxResource * (ability.manaGainPct || 0.3));
      player.currentHP -= hpLoss;
      player.currentResource = Math.min(player.maxResource, player.currentResource + manaGain);
      addLog(`Dark Pact: −${hpLoss} HP, +${manaGain} mana`, "ability");
    }

    // Eclipse builder
    if (ability.buildsEclipse) {
      player.eclipseCount = (player.eclipseCount || 0) + 1;
      if (player.eclipseCount >= 3) {
        addLog("✦ ECLIPSE ready — Void Surge empowered!", "ability");
      }
    }

    // Rage from ability use (stoneguard rage generators)
    if (player.resourceType === "rage") {
      player.rageCombatTimer = 3; // reset decay timer
    }
  }

  // ── HoT processing (called in update) ──
  function processHoTs(dt) {
    const player = state.combat.player;
    player.buffs.forEach(b => {
      if (b.isHot) {
        b.tickTimer = (b.tickTimer || b.tickInterval) - dt;
        if (b.tickTimer <= 0) {
          b.tickTimer += b.tickInterval;
          const heal = b.healPerTick || 0;
          player.currentHP = Math.min(player.maxHP, player.currentHP + heal);
          player.totalHealDone += heal;
          addLog(`${b.name} heals ${heal}`, "heal");
        }
      }
    });
  }

  // ═══════════════ DAMAGE / HEAL CALCS ═══════════════
  function calcPhysicalDamage(base, apScale) {
    const ap = state.character.stats.totalAP || 0;
    return Math.floor(base + ap * apScale);
  }

  function calcSpellDamage(base, spScale) {
    const sp = state.character.stats.totalSP || 0;
    return Math.floor(base + sp * spScale);
  }

  function calcHealAmount(base, hpScale) {
    const hp = state.character.stats.totalHP_stat || 0;
    return Math.floor(base + hp * hpScale);
  }

  function applyDamageToBoss(rawDmg, dmgType, threatMult) {
    const c = state.combat;
    const boss = c.boss;
    const stats = state.character.stats;
    let dmg = rawDmg;

    // Boss shield absorption
    const shield = boss.buffs.find(b => b.id === "boss_shield");
    if (shield) {
      const absorbed = Math.min(shield.absorbLeft, dmg);
      shield.absorbLeft -= absorbed;
      dmg -= absorbed;
      if (shield.absorbLeft <= 0) {
        boss.buffs = boss.buffs.filter(b => b.id !== "boss_shield");
        addLog("Boss shield broken!", "ability");
      }
      if (dmg <= 0) return { actual: 0, isCrit: false };
    }

    // Physical armor reduction
    if (dmgType === "physical") {
      const sunderStacks = (boss.debuffs.find(d => d.id === "sunder_armor") || {}).stacks || 0;
      const sunderReduction = sunderStacks * 0.04;
      const effectiveArmor = boss.armor * (1 - sunderReduction) * (1 - (stats.armorPen || 0) / 100);
      const bossLevel = 73;
      const dr = effectiveArmor / (effectiveArmor + 467.5 * bossLevel - 22167.5);
      dmg = Math.floor(dmg * (1 - Math.max(0, Math.min(0.75, dr))));
    }

    // Crit
    const critChance = (stats.totalCrit || 0) / 100;
    const isCrit = Math.random() < critChance;
    if (isCrit) {
      const critMult = dmgType === "physical" ? 2.0 : 1.5;
      dmg = Math.floor(dmg * critMult);
    }

    // Thunderclap debuff reduces boss attack speed (already applied elsewhere)
    // Hit chance check (if hit is below cap, some can miss)
    const hitChance = Math.min(1, (stats.hit || 0) / 100 + (dmgType === "physical" ? 0 : 0.01));
    if (Math.random() > hitChance + 0.82) { // base 82% before hit stat
      addLog(`${dmgType === "magic" ? "Spell" : "Attack"} resisted!`, "system");
      return { actual: 0, isCrit: false };
    }

    boss.currentHP = Math.max(0, boss.currentHP - dmg);

    // Threat
    const thr = Math.floor(dmg * (threatMult || 1));
    c.player.threat = (c.player.threat || 0) + thr;
    c.player.totalDmgDone += dmg;

    return { actual: dmg, isCrit };
  }

  function applyDamageToPlayer(rawDmg, dmgType, source) {
    const player = state.combat.player;
    let dmg = rawDmg;

    // Mark of Oblivion
    const mark = player.debuffs.find(d => d.id === "marked_oblivion");
    if (mark) dmg = Math.floor(dmg * (mark.dmgTakenMult || 1.5));

    // Celestial Ward absorb
    const ward = player.buffs.find(b => b.id === "celestial_ward");
    if (ward) {
      const absorbed = Math.min(ward.absorbLeft, dmg);
      ward.absorbLeft -= absorbed;
      dmg -= absorbed;
      if (ward.absorbLeft <= 0) player.buffs = player.buffs.filter(b => b.id !== "celestial_ward");
    }

    player.currentHP = Math.max(0, player.currentHP - dmg);
    player.totalDmgTaken += dmg;
  }

  function applyDebuffToBoss(ability) {
    const boss = state.combat.boss;
    if (ability.debuff === "sunder_armor") {
      const existing = boss.debuffs.find(d => d.id === "sunder_armor");
      if (existing) {
        existing.stacks = Math.min(5, (existing.stacks || 1) + 1);
        existing.remaining = 30;
      } else {
        boss.debuffs.push({ id: "sunder_armor", name: "Sunder Armor", icon: "🔻",
          type: "stat", remaining: 30, duration: 30, stacks: 1 });
      }
    }
    if (ability.debuff === "thunder_clapped") {
      boss.debuffs = boss.debuffs.filter(d => d.id !== "thunder_clapped");
      boss.debuffs.push({ id: "thunder_clapped", name: "Thunderclapped", icon: "⚡",
        type: "stat", remaining: 30, duration: 30 });
      // Slow boss attack speed effect
      state.combat.boss.autoAttackSpeed = state.combat.boss.autoAttackSpeed * 1.1;
    }
    if (ability.debuff === "shadow_agony") {
      // Handled in executeAbility dot section
    }
  }

  // ═══════════════ HELPERS ═══════════════
  function grantBuff(buffArray, buff) {
    const existing = buffArray.find(b => b.id === buff.id);
    if (existing) {
      existing.remaining = buff.remaining;
      if (buff.absorbLeft) existing.absorbLeft = buff.absorbLeft;
    } else {
      buffArray.push({ ...buff });
    }
  }

  function getHealTargets(count) {
    const targets = ["player"];
    const compRoles = Object.keys(state.combat.companions);
    compRoles.forEach(r => {
      if (targets.length < count) targets.push(r);
    });
    return targets;
  }

  function healAll(ability, source) {
    const player = state.combat.player;
    const stats = state.character.stats;
    const amt = Math.floor((ability.baseheal || 1000) + (stats.totalHP_stat || 0) * (ability.hpScale || 0.5));
    player.currentHP = Math.min(player.maxHP, player.currentHP + amt);
    Object.values(state.combat.companions).forEach(comp => {
      comp.currentHP = Math.min(comp.maxHP, comp.currentHP + Math.floor(amt * 0.8));
    });
    addLog(`Divine Hymn heals all for ~${amt}`, "heal");
  }

  function addLog(msg, type) {
    const c = state.combat;
    if (!c) return;
    const time = c.elapsed.toFixed(1);
    c.log.unshift({ msg, type, time });
    if (c.log.length > 100) c.log.pop();
  }

  // ═══════════════ VICTORY / DEFEAT ═══════════════
  function handleVictory() {
    const c = state.combat;
    const char = state.character;
    const bossData = RC.DATA.bosses.find(b => b.id === c.bossId);

    addLog(`⚔ ${bossData.name} has been defeated!`, "system");

    // Track kills
    char.bossKills[c.bossId] = (char.bossKills[c.bossId] || 0) + 1;
    char.totalKills++;

    // XP
    const xp = bossData.xp || 500;
    char.totalXP += xp;
    addLog(`+${xp} XP gained`, "system");

    // Generate loot
    const loot = generateLoot(bossData);
    state.pendingLoot = loot;
    state.defeatedLootBoss = bossData;

    // Update quest progress
    updateQuestProgress("kill", c.bossId);
    updateQuestProgress("kill_any", c.bossId);

    save();

    setTimeout(() => {
      RC.UI.showScreen("loot");
      RC.UI.renderLoot();
    }, 2000);
  }

  function generateLoot(bossData) {
    const { drops, numDrops, ilvlDropMin, ilvlDropMax } = bossData;
    const charRole = RC.DATA.classes[state.character.classId].role;
    const loot = [];

    // Split drops into gear and potions
    const potionDropIds = drops.filter(id => RC.DATA.potions.find(p => p.id === id));
    const gearDropIds = drops.filter(id => !potionDropIds.includes(id));

    // Filter gear appropriate for this class role
    const eligible = RC.DATA.items.filter(item =>
      gearDropIds.includes(item.id) &&
      (item.roles.includes(charRole) || item.roles.includes("all"))
    );
    const available = eligible.length > 0 ? eligible : RC.DATA.items.filter(i => gearDropIds.includes(i.id));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const gearCount = Math.min(Math.max((numDrops || 2) - 1, 1), shuffled.length);
    for (let i = 0; i < gearCount; i++) loot.push({ ...shuffled[i] });

    // Always drop 1 random potion from the pool
    if (potionDropIds.length > 0) {
      const potId = potionDropIds[Math.floor(Math.random() * potionDropIds.length)];
      const potData = RC.DATA.potions.find(p => p.id === potId);
      if (potData) loot.push({ ...potData, isPotion: true, quantity: Math.floor(Math.random() * 2) + 1 });
    }

    // Bonus: small chance for materials drop
    const mats = RC.DATA.materials;
    if (Math.random() < 0.6) {
      const mat = mats[Math.floor(Math.random() * mats.length)];
      loot.push({ ...mat, isMaterial: true, quantity: Math.floor(Math.random() * 4) + 1 });
    }

    return loot;
  }

  // ═══════════════ LOOT MANAGEMENT ═══════════════
  function takeItem(item) {
    const char = state.character;
    if (item.isMaterial) {
      char.materials[item.id] = (char.materials[item.id] || 0) + (item.quantity || 1);
      return;
    }
    if (item.isPotion) {
      // Stack potions in inventory (up to 5 of each)
      const existing = char.inventory.find(i => i && i.id === item.id && i.isPotion);
      if (existing) {
        existing.quantity = Math.min(5, (existing.quantity || 1) + (item.quantity || 1));
      } else {
        char.inventory.push({ ...item });
      }
      save();
      return;
    }
    // Check if better than equipped
    const currentEquipped = char.equipment[item.slot];
    if (!currentEquipped || item.ilvl > currentEquipped.ilvl) {
      if (currentEquipped) char.inventory.push(currentEquipped);
      char.equipment[item.slot] = item;
    } else {
      char.inventory.push(item);
    }
    recalcStats();
    updateQuestProgress("gear_slots", null);
    updateQuestProgress("ilvl", null);
    save();
  }

  function takeAllLoot() {
    state.pendingLoot.forEach(item => takeItem(item));
    state.pendingLoot = [];
    save();
  }

  function equipItem(item) {
    const char = state.character;
    const current = char.equipment[item.slot];
    if (current) char.inventory.push(current);
    char.equipment[item.slot] = item;
    char.inventory = char.inventory.filter(i => i !== item);
    recalcStats();
    save();
  }

  // ═══════════════ QUEST SYSTEM ═══════════════
  function updateQuestProgress(type, target) {
    const char = state.character;
    let changed = false;

    char.questsActive.forEach(qid => {
      const quest = RC.DATA.quests.find(q => q.id === qid);
      if (!quest) return;

      quest.objectives.forEach(obj => {
        if (obj.type !== type) return;
        if (type === "kill" && obj.target !== target) return;
        if (type === "kill_any") {
          char.questObjectives[obj.id] = (char.questObjectives[obj.id] || 0) + 1;
          changed = true;
        } else if (type === "kill") {
          char.questObjectives[obj.id] = (char.questObjectives[obj.id] || 0) + 1;
          changed = true;
        } else if (type === "gear_slots") {
          char.questObjectives[obj.id] = char.stats.equippedCount;
          changed = true;
        } else if (type === "ilvl") {
          char.questObjectives[obj.id] = char.stats.avgIlvl;
          changed = true;
        } else if (type === "profession") {
          char.questObjectives[obj.id] = Object.keys(char.professions).length;
          changed = true;
        }
      });

      // Check completion
      if (isQuestComplete(quest, char)) {
        completeQuest(quest, char);
      }
    });

    if (changed) save();
  }

  function isQuestComplete(quest, char) {
    return quest.objectives.every(obj => {
      const current = char.questObjectives[obj.id] || 0;
      return current >= obj.needed;
    });
  }

  function completeQuest(quest, char) {
    if (char.questsComplete.includes(quest.id)) return;
    char.questsActive = char.questsActive.filter(id => id !== quest.id);
    char.questsComplete.push(quest.id);

    // Rewards
    char.totalXP += quest.rewards.xp || 0;
    char.gold += quest.rewards.gold || 0;

    RC.UI.notify(`Quest Complete: ${quest.title}!`);

    // Chain next quest
    if (quest.chainNext) {
      const next = RC.DATA.quests.find(q => q.id === quest.chainNext);
      if (next && !char.questsActive.includes(next.id) && !char.questsComplete.includes(next.id)) {
        char.questsActive.push(next.id);
        RC.UI.notify(`New Quest: ${next.title}`);
      }
    }
    save();
  }

  function learnProfession(profId) {
    const char = state.character;
    if (char.professions[profId]) return false;
    char.professions[profId] = { level: 1, xp: 0 };
    updateQuestProgress("profession", null);
    save();
    return true;
  }

  // ═══════════════ FLEE ═══════════════
  function setHealTarget(targetId) {
    if (state.combat) state.combat.healTarget = targetId;
  }

  function flee() {
    const c = state.combat;
    if (!c) return;
    c.active = false;
    addLog("You flee from battle!", "system");
    setTimeout(() => RC.UI.showScreen("world"), 500);
  }

  function usePotion(potionId) {
    const c = state.combat;
    const char = state.character;
    if (!c || !c.active) return false;

    const potion = RC.DATA.potions.find(p => p.id === potionId);
    if (!potion) return false;

    // Check cooldown
    const cdKey = `pot_cd_${potionId}`;
    if ((c.player.cooldowns[cdKey] || 0) > 0) {
      addLog(`${potion.name} is on cooldown!`, "system");
      return false;
    }

    // Check inventory
    const invSlot = char.inventory.findIndex(i => i && i.id === potionId);
    if (invSlot === -1) {
      addLog(`You don't have ${potion.name}!`, "system");
      return false;
    }

    const player = c.player;

    // Restore HP
    if (potion.restoreHPPct) {
      const amt = Math.floor(player.maxHP * potion.restoreHPPct);
      player.currentHP = Math.min(player.maxHP, player.currentHP + amt);
      addLog(`${potion.icon} ${potion.name}: +${amt} HP`, "heal");
    }
    // Restore Mana
    if (potion.restoreManaPct) {
      const amt = Math.floor(player.maxResource * potion.restoreManaPct);
      player.currentResource = Math.min(player.maxResource, player.currentResource + amt);
      addLog(`${potion.icon} ${potion.name}: +${amt} Mana`, "heal");
    }
    // Apply buff
    if (potion.buffDuration) {
      const buff = { id: potionId + "_buff", name: potion.name, icon: potion.icon,
        remaining: potion.buffDuration, duration: potion.buffDuration,
        buffHP: potion.buffHP, buffMP5: potion.buffMP5,
        buffDmgPct: potion.buffDmgPct, buffDmgReduce: potion.buffDmgReduce };
      player.buffs = player.buffs.filter(b => b.id !== buff.id);
      player.buffs.push(buff);
    }

    // Set cooldown (shared 60s potion cooldown)
    RC.DATA.potions.forEach(p => {
      c.player.cooldowns[`pot_cd_${p.id}`] = potion.cooldown || 60;
    });

    // Remove one from inventory
    char.inventory.splice(invSlot, 1);
    addLog(`Used ${potion.name}!`, "system");
    return true;
  }

  // ═══════════════ PUBLIC API ═══════════════
  return {
    get state() { return state; },
    save, load, hasSave, deleteSave,
    createCharacter,
    recalcStats, getAverageIlvl,
    startCombat, startGameLoop, stopGameLoop,
    useAbility, usePotion, setHealTarget, flee,
    processHoTs,
    takeItem, takeAllLoot, equipItem,
    updateQuestProgress,
    learnProfession,
    addLog
  };

})();
