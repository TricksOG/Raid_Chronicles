/* ══════════════════════════════════════
   RAID CHRONICLES — GAME DATA
   Classes, Abilities, Items, Bosses, Quests
══════════════════════════════════════ */

window.RC = window.RC || {};

RC.DATA = {

  // ═══════════════ CLASSES ═══════════════
  classes: {

    stoneguard: {
      id: "stoneguard",
      name: "Stoneguard",
      role: "tank",
      icon: "🛡",
      color: "#4a6fa5",
      roleColor: "role-tank",
      description: "An ancient warrior bound to stone magic. Masters heavy plate armor and the art of holding the line.",
      lore: "Once a great commander, now bound by an ancient pact to the spirits of stone and earth. The Stoneguard stands where others fall, a bastion between darkness and the living.",
      roleFlavor: "Hold the line. Draw the fire. Never break.",
      resourceType: "rage",
      maxResource: 100,
      resourceLabel: "RAGE",
      // Base stats (before gear)
      base: {
        hp: 5500, armor: 8500, strength: 160, agility: 60, stamina: 220,
        intellect: 20, spirit: 25, attackPower: 380, spellPower: 0, healingPower: 0,
        crit: 5, hit: 8, expertise: 6.5, armorPen: 0,
        defense: 490, dodge: 15, parry: 12, block: 22, blockValue: 250,
        mp5: 0, thrMult: 2.0
      },
      abilities: [
        {
          id: "shield_slam", name: "Shield Slam", icon: "🛡", color: "#4a6fa5",
          desc: "Slam your shield into the enemy, dealing massive damage and generating immense threat.",
          tooltip: "Deals (AP × 0.3) + 500 damage. Generates 3× threat. Core rotation ability.",
          cost: 20, costType: "rage", gcd: true, cooldown: 0,
          type: "damage", damageType: "physical",
          baseDmg: 500, apScale: 0.3, threatMult: 3.0,
          keybind: "1"
        },
        {
          id: "devastate", name: "Devastate", icon: "⚔", color: "#8b4513",
          desc: "Strike the enemy, applying a stack of Sunder Armor. Reduces boss armor by 4% per stack, up to 5.",
          tooltip: "Deals (AP × 0.2) + 200 damage. Applies Sunder Armor (max 5 stacks = −20% armor).",
          cost: 15, costType: "rage", gcd: true, cooldown: 0,
          type: "damage", damageType: "physical",
          baseDmg: 200, apScale: 0.2, threatMult: 2.0,
          debuff: "sunder_armor", keybind: "2"
        },
        {
          id: "thunderclap", name: "Thunderclap", icon: "⚡", color: "#9370db",
          desc: "Slam the ground with thunderous force, slowing the boss's attack speed by 10% for 30 seconds.",
          tooltip: "AoE damage. Applies Thunderclap debuff (−10% boss attack speed) for 30s. 8s CD.",
          cost: 20, costType: "rage", gcd: true, cooldown: 8,
          type: "damage", damageType: "physical",
          baseDmg: 320, apScale: 0.15, threatMult: 1.5,
          debuff: "thunder_clapped", keybind: "3"
        },
        {
          id: "revenge", name: "Revenge", icon: "🔥", color: "#dc143c",
          desc: "A vicious counterattack, only available after you dodge or parry an attack.",
          tooltip: "Deals (AP × 0.4) + 800 damage. 2.5× threat. REQUIRES Revenge proc.",
          cost: 5, costType: "rage", gcd: true, cooldown: 0,
          type: "damage", damageType: "physical",
          baseDmg: 800, apScale: 0.4, threatMult: 2.5,
          requireBuff: "revenge_proc", keybind: "4"
        },
        {
          id: "shield_block", name: "Shield Block", icon: "🔰", color: "#2e8b57",
          desc: "Raise your shield, guaranteeing that your next 2 attacks will be blocked.",
          tooltip: "Guarantees next 2 blocks. 10s duration. OFF GCD. 10s CD.",
          cost: 0, costType: "rage", gcd: false, cooldown: 10,
          type: "defensive", buff: "shield_block", keybind: "5"
        },
        {
          id: "last_stand", name: "Last Stand", icon: "💪", color: "#ff6600",
          desc: "Rally your strength against death, temporarily increasing your maximum HP by 30%.",
          tooltip: "Increases max HP by 30% for 20s (and heals that amount). OFF GCD. 3min CD.",
          cost: 0, costType: "rage", gcd: false, cooldown: 180,
          type: "defensive", buff: "last_stand", keybind: "6"
        }
      ]
    },

    voidreaver: {
      id: "voidreaver",
      name: "Voidreaver",
      role: "dps",
      icon: "◈",
      color: "#8a2be2",
      roleColor: "role-dps",
      description: "A scholar who tapped into the void between worlds. Wields shadow and arcane magic with devastating efficiency.",
      lore: "They sought forbidden knowledge and found it waiting in the dark. Now they wield the void itself as a weapon, their mind fractured and refracted through the spaces between.",
      roleFlavor: "Knowledge is power. The void knows everything.",
      resourceType: "mana",
      maxResource: 100,
      resourceLabel: "MANA",
      base: {
        hp: 3200, armor: 2000, strength: 20, agility: 60, stamina: 120,
        intellect: 220, spirit: 90, attackPower: 0, spellPower: 380, healingPower: 0,
        crit: 15, hit: 9, expertise: 0, armorPen: 0,
        defense: 0, dodge: 5, parry: 0, block: 0, blockValue: 0,
        mp5: 35, thrMult: 1.0
      },
      maxMana: 8000,
      abilities: [
        {
          id: "void_bolt", name: "Void Bolt", icon: "◈", color: "#8a2be2",
          desc: "Hurl a bolt of pure void energy at the target. Builds the Eclipse counter.",
          tooltip: "Deals (SP × 0.8) + 300 shadow damage. Each cast builds Eclipse (3 → Empowered Surge). Costs 5% mana.",
          cost: 5, costType: "mana_pct", gcd: true, cooldown: 0,
          type: "damage", damageType: "shadow",
          baseDmg: 300, spScale: 0.8, buildsEclipse: true, keybind: "1"
        },
        {
          id: "shadow_agony", name: "Sw: Agony", icon: "💀", color: "#6a0dad",
          desc: "Afflict the target with a growing shadow curse, dealing damage every 3 seconds for 18 seconds.",
          tooltip: "DoT: (SP × 0.15) + 100 per tick every 3s for 18s. Refresh before expiry. 6% mana.",
          cost: 6, costType: "mana_pct", gcd: true, cooldown: 0,
          type: "dot", damageType: "shadow",
          baseDmg: 100, spScale: 0.15, duration: 18, tickInterval: 3,
          debuff: "shadow_agony", keybind: "2"
        },
        {
          id: "void_surge", name: "Void Surge", icon: "💥", color: "#9400d3",
          desc: "Unleash a massive surge of void energy. Empowered by Eclipse for +50% damage.",
          tooltip: "Deals (SP × 2.5) + 800 shadow dmg. Eclipse → +50% bonus dmg. 10% mana. 8s CD.",
          cost: 10, costType: "mana_pct", gcd: true, cooldown: 8,
          type: "damage", damageType: "shadow",
          baseDmg: 800, spScale: 2.5, consumesEclipse: true, eclipseBonus: 0.5,
          keybind: "3"
        },
        {
          id: "entropic_cascade", name: "Entropic Cascade", icon: "🌀", color: "#483d8b",
          desc: "Channel entropic void energy, dealing shadow damage in 3 waves over 3 seconds.",
          tooltip: "Channel 3s: 3 hits of (SP × 0.8) + 400 shadow dmg. 15% mana. 20s CD.",
          cost: 15, costType: "mana_pct", gcd: true, cooldown: 20,
          type: "channel", damageType: "shadow",
          baseDmg: 400, spScale: 0.8, ticks: 3, channelDuration: 3, keybind: "4"
        },
        {
          id: "dark_pact", name: "Dark Pact", icon: "🩸", color: "#8b0000",
          desc: "Sacrifice 20% of your current health to restore 30% mana.",
          tooltip: "Lose 20% current HP → gain 30% mana. OFF GCD. 2min CD.",
          cost: 0, costType: "none", gcd: false, cooldown: 120,
          type: "utility", hpCostPct: 0.2, manaGainPct: 0.3, keybind: "5"
        },
        {
          id: "void_torrent", name: "Void Torrent", icon: "🌑", color: "#2a0050",
          desc: "Open a sustained void rift, dealing massive shadow damage over 5 seconds.",
          tooltip: "Channel 5s: 5 hits of (SP × 1.2) + 600. 12% mana. 45s CD.",
          cost: 12, costType: "mana_pct", gcd: true, cooldown: 45,
          type: "channel", damageType: "shadow",
          baseDmg: 600, spScale: 1.2, ticks: 5, channelDuration: 5, keybind: "6"
        }
      ]
    },

    dawnbringer: {
      id: "dawnbringer",
      name: "Dawnbringer",
      role: "healer",
      icon: "✦",
      color: "#daa520",
      roleColor: "role-healer",
      description: "Touched by the light of a dying star, wielding celestial healing that mends body and spirit alike.",
      lore: "Once a devoted student of celestial motion, they were struck by the last light of a fallen star. Now that light lives in them, warm as dawn and terrible as the sun's full wrath.",
      roleFlavor: "No one falls while I draw breath.",
      resourceType: "mana",
      maxResource: 100,
      resourceLabel: "MANA",
      base: {
        hp: 3800, armor: 2500, strength: 20, agility: 40, stamina: 140,
        intellect: 260, spirit: 130, attackPower: 0, spellPower: 0, healingPower: 450,
        crit: 20, hit: 0, expertise: 0, armorPen: 0,
        defense: 0, dodge: 5, parry: 0, block: 0, blockValue: 0,
        mp5: 55, thrMult: 1.0
      },
      maxMana: 9000,
      abilities: [
        {
          id: "flash_mend", name: "Flash Mend", icon: "✚", color: "#ffd700",
          desc: "A burst of holy energy that instantly heals the target.",
          tooltip: "Instant heal: (HP × 0.8) + 400. Expensive but fast. 8% mana.",
          cost: 8, costType: "mana_pct", gcd: true, cooldown: 0,
          type: "heal", baseheal: 400, hpScale: 0.8, keybind: "1"
        },
        {
          id: "holy_renewal", name: "Holy Renewal", icon: "🌿", color: "#228b22",
          desc: "Blanket an ally in healing energy, restoring health every 3 seconds for 12 seconds.",
          tooltip: "HoT: (HP × 0.1) + 100 per tick every 3s for 12s (4 ticks). 6% mana.",
          cost: 6, costType: "mana_pct", gcd: true, cooldown: 0,
          type: "hot", baseheal: 100, hpScale: 0.1, duration: 12, tickInterval: 3,
          buff: "holy_renewal", keybind: "2"
        },
        {
          id: "chain_restoration", name: "Chain Restoration", icon: "⛓", color: "#4169e1",
          desc: "A healing wave that bounces between allies, healing up to 3 targets.",
          tooltip: "Heals tank + 2 companions for (HP × 1.2) + 600 each. 10% mana. 6s CD.",
          cost: 10, costType: "mana_pct", gcd: true, cooldown: 6,
          type: "heal", baseheal: 600, hpScale: 1.2, bounces: 2, keybind: "3"
        },
        {
          id: "celestial_ward", name: "Celestial Ward", icon: "🔮", color: "#9932cc",
          desc: "Envelop an ally in a celestial shield, absorbing incoming damage for 15 seconds.",
          tooltip: "Absorb shield: (HP × 1.5) + 800. 15s duration. 8% mana. 30s CD.",
          cost: 8, costType: "mana_pct", gcd: true, cooldown: 30,
          type: "shield", baseShield: 800, hpScale: 1.5, duration: 15,
          buff: "celestial_ward", keybind: "4"
        },
        {
          id: "light_surge", name: "Light Surge", icon: "☀", color: "#fff44f",
          desc: "An empowered burst of celestial light that massively heals a critically wounded ally.",
          tooltip: "Big heal: (HP × 2.0) + 1500. Prioritizes lowest HP. 12% mana. 15s CD.",
          cost: 12, costType: "mana_pct", gcd: true, cooldown: 15,
          type: "heal", baseheal: 1500, hpScale: 2.0, preferLowHP: true, keybind: "5"
        },
        {
          id: "divine_hymn", name: "Divine Hymn", icon: "🎵", color: "#fffacd",
          desc: "Channel a divine hymn, massively healing all allies over 8 seconds.",
          tooltip: "Channel 8s: heals ALL allies 4× for (HP × 0.5) + 1000. 20% mana. 5min CD.",
          cost: 20, costType: "mana_pct", gcd: true, cooldown: 300,
          type: "channel", baseheal: 1000, hpScale: 0.5, ticks: 4,
          channelDuration: 8, healsAll: true, keybind: "6"
        }
      ]
    }
  },

  // ═══════════════ GEAR SLOTS ═══════════════
  gearSlots: [
    { id: "head",      label: "Head",        icon: "🪖" },
    { id: "neck",      label: "Neck",        icon: "📿" },
    { id: "shoulders", label: "Shoulders",   icon: "🛡" },
    { id: "back",      label: "Back",        icon: "🧥" },
    { id: "chest",     label: "Chest",       icon: "⚔" },
    { id: "bracers",   label: "Bracers",     icon: "🔗" },
    { id: "hands",     label: "Hands",       icon: "🧤" },
    { id: "belt",      label: "Belt",        icon: "〰" },
    { id: "legs",      label: "Legs",        icon: "🦵" },
    { id: "boots",     label: "Boots",       icon: "👢" },
    { id: "ring1",     label: "Ring",        icon: "💍" },
    { id: "ring2",     label: "Ring",        icon: "💍" },
    { id: "trinket1",  label: "Trinket",     icon: "🔮" },
    { id: "trinket2",  label: "Trinket",     icon: "🔮" },
    { id: "weapon",    label: "Main Hand",   icon: "⚔" },
    { id: "offhand",   label: "Off Hand",    icon: "🛡" }
  ],

  // ═══════════════ ITEM DATABASE ═══════════════
  // quality: 0=grey, 1=white, 2=green, 3=blue, 4=purple, 5=orange
  // qualityNames: ['Poor','Common','Uncommon','Rare','Epic','Legendary']
  qualityClass: ['q-grey','q-white','q-green','q-blue','q-purple','q-orange'],
  qualityBorder: ['border-grey','border-white','border-green','border-blue','border-purple','border-orange'],
  qualityName: ['Poor','Common','Uncommon','Rare','Epic','Legendary'],

  // ═══════════════ POTIONS ═══════════════
  potions: [
    { id: 'pot_health_minor', name: 'Minor Health Potion', icon: '🧪', quality: 1,
      desc: 'Restores 20% of max HP. Grants +10% max HP for 15s.',
      restoreHPPct: 0.20, buffHP: 0.10, buffDuration: 15, cooldown: 60,
      tooltip: 'A rudimentary brew of regenerative herbs.' },
    { id: 'pot_mana_minor', name: 'Minor Mana Potion', icon: '💙', quality: 1,
      desc: 'Restores 20% of max mana. Grants +20 MP5 for 15s.',
      restoreManaPct: 0.20, buffMP5: 20, buffDuration: 15, cooldown: 60,
      tooltip: 'Distilled arcane residue. Tastes like static.' },
    { id: 'pot_health_major', name: 'Major Health Potion', icon: '❤️', quality: 2,
      desc: 'Restores 35% of max HP. Grants +15% max HP for 20s.',
      restoreHPPct: 0.35, buffHP: 0.15, buffDuration: 20, cooldown: 60,
      tooltip: 'A potent concoction drawn from ancient recipes.' },
    { id: 'pot_mana_major', name: 'Major Mana Potion', icon: '🔵', quality: 2,
      desc: 'Restores 35% of max mana. Grants +40 MP5 for 20s.',
      restoreManaPct: 0.35, buffMP5: 40, buffDuration: 20, cooldown: 60,
      tooltip: 'Compressed arcane energy in liquid form.' },
    { id: 'elixir_ferocity', name: 'Elixir of Ferocity', icon: '🔥', quality: 2,
      desc: 'Restores 15% HP and mana. Increases all damage by 10% for 25s.',
      restoreHPPct: 0.15, restoreManaPct: 0.15, buffDmgPct: 0.10, buffDuration: 25, cooldown: 60,
      tooltip: 'The rage of a dying star, bottled for your convenience.' },
    { id: 'elixir_fortitude', name: 'Elixir of Fortitude', icon: '💛', quality: 3,
      desc: 'Restores 25% HP. Reduces damage taken by 15% for 30s. Removes one debuff.',
      restoreHPPct: 0.25, buffDmgReduce: 0.15, buffCleanse: true, buffDuration: 30, cooldown: 60,
      tooltip: 'Forged from the essence of those who refused to fall.' },
  ],

  items: [
    // ── GRUNTLING DROPS (ilvl 12–18) ──
    { id: "i001", name: "Gruntling's Pauldrons",    icon: "🛡", slot: "shoulders", ilvl: 14, quality: 2, roles: ["tank"],
      stats: { stamina: 18, strength: 12, defense: 10, dodge: 5 } },
    { id: "i002", name: "Tattered Void Mantle",     icon: "🧣", slot: "shoulders", ilvl: 12, quality: 2, roles: ["dps","healer"],
      stats: { intellect: 15, stamina: 10, spellPower: 18, crit: 8 } },
    { id: "i003", name: "Ironhide Chestguard",      icon: "🦺", slot: "chest",     ilvl: 16, quality: 2, roles: ["tank"],
      stats: { stamina: 25, strength: 14, armor: 200, defense: 12 } },
    { id: "i004", name: "Void-Kissed Robe",         icon: "👘", slot: "chest",     ilvl: 14, quality: 2, roles: ["dps"],
      stats: { intellect: 22, stamina: 12, spellPower: 26, hit: 10 } },
    { id: "i005", name: "Dawn-Touched Vestments",   icon: "🥻", slot: "chest",     ilvl: 14, quality: 2, roles: ["healer"],
      stats: { intellect: 20, stamina: 12, healingPower: 32, mp5: 8 } },
    { id: "i006", name: "Gruntling's Signet",       icon: "💍", slot: "ring1",     ilvl: 12, quality: 2, roles: ["tank","dps","healer"],
      stats: { stamina: 12, strength: 8, crit: 6 } },
    { id: "i007", name: "Trinket of Brute Force",   icon: "🔮", slot: "trinket1",  ilvl: 14, quality: 2, roles: ["tank"],
      stats: { strength: 20, attackPower: 40 }, effect: "On use: +100 AP for 15s (2min CD)" },
    { id: "i008", name: "Shard of the Void",        icon: "🔷", slot: "trinket1",  ilvl: 14, quality: 2, roles: ["dps"],
      stats: { spellPower: 30, crit: 12 }, effect: "Passive: 5% chance on spell cast to deal 200 bonus shadow dmg" },
    { id: "i009", name: "Mending Stone",            icon: "💠", slot: "trinket1",  ilvl: 14, quality: 2, roles: ["healer"],
      stats: { healingPower: 40, mp5: 10 }, effect: "On use: Instantly restore 10% mana (3min CD)" },
    { id: "i010", name: "Gruntling's War Axe",      icon: "🪓", slot: "weapon",    ilvl: 15, quality: 2, roles: ["tank"],
      stats: { strength: 22, attackPower: 60, expertise: 5 } },
    { id: "i011", name: "Staff of Creeping Shadow", icon: "🪄", slot: "weapon",    ilvl: 15, quality: 2, roles: ["dps"],
      stats: { intellect: 18, spellPower: 50, hit: 12 } },
    { id: "i012", name: "Celestial Focus",          icon: "⭐", slot: "weapon",    ilvl: 15, quality: 2, roles: ["healer"],
      stats: { intellect: 18, healingPower: 55, mp5: 10 } },
    { id: "i013", name: "Stoneguard Shield",        icon: "🛡", slot: "offhand",   ilvl: 14, quality: 2, roles: ["tank"],
      stats: { stamina: 14, block: 12, blockValue: 80, defense: 8 } },

    // ── IRON SENTINEL DROPS (ilvl 26–32) ──
    { id: "i020", name: "Sentinel's Plate Helm",    icon: "⛑", slot: "head",      ilvl: 28, quality: 3, roles: ["tank"],
      stats: { stamina: 38, strength: 24, defense: 20, parry: 12 } },
    { id: "i021", name: "Helm of the Void Scholar", icon: "🎓", slot: "head",      ilvl: 26, quality: 3, roles: ["dps"],
      stats: { intellect: 35, spellPower: 45, crit: 18, hit: 10 } },
    { id: "i022", name: "Dawnweaver's Circlet",     icon: "👑", slot: "head",      ilvl: 26, quality: 3, roles: ["healer"],
      stats: { intellect: 32, healingPower: 55, mp5: 15, crit: 14 } },
    { id: "i023", name: "Sentinel's Gorget",        icon: "📿", slot: "neck",      ilvl: 28, quality: 3, roles: ["tank"],
      stats: { stamina: 28, strength: 18, defense: 15, dodge: 8 } },
    { id: "i024", name: "Pendant of Void Mastery",  icon: "🔵", slot: "neck",      ilvl: 28, quality: 3, roles: ["dps","healer"],
      stats: { intellect: 25, spellPower: 38, healingPower: 38, crit: 16 } },
    { id: "i025", name: "Ironforged Legplates",     icon: "🦿", slot: "legs",      ilvl: 30, quality: 3, roles: ["tank"],
      stats: { stamina: 45, strength: 28, armor: 280, defense: 18 } },
    { id: "i026", name: "Shadow-Woven Leggings",    icon: "🩳", slot: "legs",      ilvl: 28, quality: 3, roles: ["dps"],
      stats: { intellect: 38, spellPower: 52, crit: 20, hit: 15 } },
    { id: "i027", name: "Legwraps of Morning Light",icon: "🩲", slot: "legs",      ilvl: 28, quality: 3, roles: ["healer"],
      stats: { intellect: 36, healingPower: 62, mp5: 18, stamina: 20 } },
    { id: "i028", name: "Sentinel's Greatblade",    icon: "⚔", slot: "weapon",    ilvl: 32, quality: 3, roles: ["tank"],
      stats: { strength: 40, attackPower: 110, expertise: 10, armorPen: 5 } },
    { id: "i029", name: "Oblivion Conduit",         icon: "🪄", slot: "weapon",    ilvl: 32, quality: 3, roles: ["dps"],
      stats: { intellect: 30, spellPower: 95, hit: 18, crit: 12 } },
    { id: "i030", name: "Staff of the Dawn's Eye",  icon: "🌟", slot: "weapon",    ilvl: 32, quality: 3, roles: ["healer"],
      stats: { intellect: 28, healingPower: 100, mp5: 20, spirit: 25 } },
    { id: "i031", name: "Sentinel Core",            icon: "⚙", slot: "trinket2",  ilvl: 30, quality: 3, roles: ["tank"],
      stats: { defense: 25, stamina: 30 }, effect: "On use: +500 armor for 20s (2min CD)" },

    // ── VOIDTOUCHED ANCIENT DROPS (ilvl 42–50) ──
    { id: "i040", name: "Crown of the Ancient",     icon: "👑", slot: "head",      ilvl: 46, quality: 4, roles: ["tank"],
      stats: { stamina: 65, strength: 40, defense: 32, dodge: 18, parry: 14 } },
    { id: "i041", name: "Mantle of Void Communion", icon: "🎭", slot: "shoulders", ilvl: 44, quality: 4, roles: ["dps"],
      stats: { intellect: 58, spellPower: 82, crit: 28, hit: 18, armorPen: 0 } },
    { id: "i042", name: "Ancient's Breastplate",    icon: "🛡", slot: "chest",     ilvl: 48, quality: 4, roles: ["tank"],
      stats: { stamina: 78, strength: 48, armor: 450, defense: 28, block: 20 } },
    { id: "i043", name: "Robe of the Voidtouched",  icon: "🌌", slot: "chest",     ilvl: 46, quality: 4, roles: ["dps"],
      stats: { intellect: 70, spellPower: 100, crit: 30, hit: 20, haste: 12 } },
    { id: "i044", name: "Vestments of Dying Stars", icon: "💫", slot: "chest",     ilvl: 46, quality: 4, roles: ["healer"],
      stats: { intellect: 68, healingPower: 115, mp5: 28, crit: 22, spirit: 35 } },
    { id: "i045", name: "Band of the Ancient Soul", icon: "💍", slot: "ring2",     ilvl: 44, quality: 4, roles: ["tank","dps","healer"],
      stats: { intellect: 30, stamina: 40, spellPower: 50, healingPower: 50, crit: 20 } },
    { id: "i046", name: "Ancient's Voidblade",      icon: "🗡", slot: "weapon",    ilvl: 50, quality: 4, roles: ["dps"],
      stats: { intellect: 50, spellPower: 155, hit: 25, crit: 20 },
      effect: "Passive: Shadow spells have a 10% chance to deal 300 bonus void damage" },
    { id: "i047", name: "Sundering Bulwark",        icon: "🛡", slot: "offhand",   ilvl: 48, quality: 4, roles: ["tank"],
      stats: { stamina: 55, block: 28, blockValue: 160, defense: 22, parry: 15 } },
    { id: "i048", name: "Astral Conduit",           icon: "🌠", slot: "weapon",    ilvl: 50, quality: 4, roles: ["healer"],
      stats: { intellect: 45, healingPower: 165, mp5: 35, spirit: 45 },
      effect: "Passive: Heals have 5% chance to also apply a 500 absorb shield" }
  ],

  // ═══════════════ BOSSES ═══════════════
  bosses: [
    {
      id: "gruntling",
      name: "Gruntling the Unmerciful",
      icon: "👹",
      flavor: "A massive brute who guards the keep's outer gate",
      lore: "Once a simple soldier, Gruntling was transformed by dark energies into an unstoppable engine of destruction. He guards the gate to the Eternal Keep, and he has never let anyone pass.",
      ilvlReq: 0,
      ilvlDropMin: 12, ilvlDropMax: 18,
      drops: ["i001","i002","i003","i004","i005","i006","i007","i008","i009","i010","i011","i012","i013",
              "pot_health_minor","pot_health_minor","pot_mana_minor","pot_mana_minor"],
      numDrops: 4,
      xp: 500,
      stats: {
        maxHP: 400000, armor: 6000,
        autoAttackDmg: 800, autoAttackSpeed: 2.5,
        abilities: [
          { id: "cleave", name: "Cleave", icon: "⚔", timer: 8, cooldown: 8,
            desc: "A sweeping cleave that hits multiple targets.", dmg: 1200, type: "physical",
            warning: "Gruntling raises his weapon!" },
          { id: "crushing_blow", name: "Crushing Blow", icon: "💥", timer: 18, cooldown: 18,
            desc: "A devastating blow that ignores some armor.", dmg: 2000, type: "physical", armorPen: 50,
            warning: "Gruntling winds up for a CRUSHING BLOW!" },
          { id: "battle_cry", name: "Battle Cry", icon: "📯", timer: 30, cooldown: 30,
            desc: "Rallies himself, increasing damage by 20% for 10s.", dmg: 0, type: "buff",
            buff: "enraged", buffDuration: 10, buffDmgMult: 1.2,
            warning: "Gruntling lets out a BATTLE CRY!" }
        ]
      }
    },
    {
      id: "iron_sentinel",
      name: "Iron Sentinel Mark VII",
      icon: "🤖",
      flavor: "An ancient war golem of devastating power",
      lore: "Constructed in an age of terrible wars, the Iron Sentinel was sealed away when its masters fell. Now reactivated by dark forces, it carries out its original directive: destroy all intruders.",
      ilvlReq: 14,
      ilvlDropMin: 26, ilvlDropMax: 32,
      drops: ["i020","i021","i022","i023","i024","i025","i026","i027","i028","i029","i030","i031",
              "pot_health_major","pot_mana_major","elixir_ferocity"],
      numDrops: 4,
      xp: 1200,
      stats: {
        maxHP: 1000000, armor: 9500,
        autoAttackDmg: 1600, autoAttackSpeed: 2.2,
        abilities: [
          { id: "cannon_barrage", name: "Cannon Barrage", icon: "💣", timer: 10, cooldown: 10,
            desc: "Fires a barrage of arcane cannon shots.", dmg: 2200, type: "magic",
            warning: "CANNON BARRAGE incoming!" },
          { id: "iron_stomp", name: "Iron Stomp", icon: "🦶", timer: 20, cooldown: 20,
            desc: "Shakes the earth, stunning all for 2 seconds.", dmg: 1800, type: "physical", stunDur: 2,
            warning: "Iron Sentinel rears back for IRON STOMP!" },
          { id: "overclock", name: "Overclock", icon: "⚡", timer: 35, cooldown: 35,
            desc: "Overclocks its attack speed by 50% for 8s.", dmg: 0, type: "buff",
            buff: "overclocked", buffDuration: 8, buffAttackSpeedMult: 0.5,
            warning: "Iron Sentinel begins OVERCLOCKING!" },
          { id: "shield_matrix", name: "Shield Matrix", icon: "🔰", timer: 50, cooldown: 50,
            desc: "Projects an energy shield absorbing 20000 damage for 6s.", dmg: 0, type: "shield",
            shieldAmt: 20000, shieldDur: 6,
            warning: "Iron Sentinel activates SHIELD MATRIX!" }
        ]
      },
      phaseAt: 0.5,
      phaseMessage: "Iron Sentinel enters EMERGENCY PROTOCOL! Attack speed increased!"
    },
    {
      id: "voidtouched_ancient",
      name: "The Voidtouched Ancient",
      icon: "🌑",
      flavor: "A primordial creature consumed by void corruption",
      lore: "It walked this world before memory. When the void first seeped through, it was first to touch it — and first to be consumed. Now it is neither tree nor void, but something far worse: a bridge.",
      ilvlReq: 26,
      ilvlDropMin: 42, ilvlDropMax: 50,
      drops: ["i040","i041","i042","i043","i044","i045","i046","i047","i048",
              "elixir_ferocity","elixir_fortitude","pot_health_major","pot_mana_major"],
      numDrops: 4,
      xp: 3000,
      stats: {
        maxHP: 2500000, armor: 12000,
        autoAttackDmg: 2800, autoAttackSpeed: 2.0,
        abilities: [
          { id: "void_pulse", name: "Void Pulse", icon: "🌀", timer: 8, cooldown: 8,
            desc: "Radiates a pulse of void energy, dealing shadow damage.", dmg: 3500, type: "magic",
            warning: "The Ancient pulses with VOID ENERGY!" },
          { id: "entangling_roots", name: "Entangling Roots", icon: "🌿", timer: 15, cooldown: 15,
            desc: "Roots the tank, making them unable to dodge for 4s.", dmg: 1200, type: "physical",
            debuff: "rooted", debuffDur: 4,
            warning: "ENTANGLING ROOTS burst from the ground!" },
          { id: "void_corruption", name: "Void Corruption", icon: "☠", timer: 22, cooldown: 22,
            desc: "Marks a player with void corruption — a powerful DoT.", dmg: 1000, dotDmg: 800,
            dotInterval: 2, dotDur: 12, type: "magic",
            warning: "The Ancient marks a target with VOID CORRUPTION!" },
          { id: "reality_fracture", name: "Reality Fracture", icon: "💥", timer: 45, cooldown: 45,
            desc: "Splits reality, dealing massive damage to all.", dmg: 6000, type: "magic",
            warning: "The Ancient tears REALITY ITSELF!" }
        ]
      },
      phaseAt: 0.4,
      phaseMessage: "The Voidtouched Ancient ASCENDS! All damage increased by 30%!"
    },
    {
      id: "the_herald",
      name: "The Herald of Oblivion",
      icon: "👁",
      flavor: "The keep's dark master — a fragment of the void given form",
      lore: "It came through when reality tore. It does not destroy because it hates — it destroys because destruction is its nature. To face it is to face the end of all things.",
      ilvlReq: 42,
      ilvlDropMin: 60, ilvlDropMax: 70,
      drops: [],
      numDrops: 4,
      xp: 8000,
      stats: {
        maxHP: 6000000, armor: 16000,
        autoAttackDmg: 5000, autoAttackSpeed: 1.8,
        abilities: [
          { id: "oblivion_beam", name: "Oblivion Beam", icon: "☄", timer: 8, cooldown: 8,
            desc: "A focused beam of pure oblivion energy.", dmg: 6000, type: "magic",
            warning: "OBLIVION BEAM channeling!" },
          { id: "void_eruption", name: "Void Eruption", icon: "🌋", timer: 18, cooldown: 18,
            desc: "The ground erupts with void energy.", dmg: 8000, type: "magic",
            warning: "VOID ERUPTION imminent!" },
          { id: "oblivion_mark", name: "Mark of Oblivion", icon: "🔺", timer: 30, cooldown: 30,
            desc: "Marks a target — they take 50% more damage for 10s.", dmg: 0, type: "debuff",
            debuff: "marked_oblivion", debuffDur: 10, dmgTakenInc: 0.5,
            warning: "The Herald places its MARK!" },
          { id: "absolute_zero", name: "Absolute Zero", icon: "❄", timer: 60, cooldown: 60,
            desc: "The herald freezes all time — 4s stun, then massive hit.", dmg: 15000, type: "magic",
            stunDur: 4, warning: "ABSOLUTE ZERO — TIME STOPS!" }
        ]
      },
      phaseAt: 0.5,
      phaseMessage: "The Herald reaches FULL POWER — all abilities empowered by 50%!"
    }
  ],

  // ═══════════════ QUESTS ═══════════════
  quests: [
    {
      id: "q001",
      title: "First Blood",
      category: "main",
      desc: "The Eternal Keep stands between you and your destiny. Begin by slaying its outer guardian.",
      story: "The gates of the Eternal Keep have stood closed for a thousand years. Gruntling the Unmerciful guards them — a beast of pure fury. Your journey begins with his defeat.",
      objectives: [
        { id: "q001_o1", text: "Defeat Gruntling the Unmerciful", type: "kill", target: "gruntling", needed: 1, current: 0 }
      ],
      rewards: { xp: 500, gold: 50, items: [] },
      prerequisite: null, chainNext: "q002"
    },
    {
      id: "q002",
      title: "Gearing for the Long War",
      category: "main",
      desc: "You can't face what's inside the keep in this state. Equip yourself properly.",
      story: "The outer guardian has fallen. But deeper in the keep wait horrors that will break you if you aren't prepared. Equip yourself with the spoils of your victory.",
      objectives: [
        { id: "q002_o1", text: "Equip items in 8 gear slots", type: "gear_slots", needed: 8, current: 0 },
        { id: "q002_o2", text: "Reach Item Level 12", type: "ilvl", needed: 12, current: 0 }
      ],
      rewards: { xp: 600, gold: 80, items: [] },
      prerequisite: "q001", chainNext: "q003"
    },
    {
      id: "q003",
      title: "The Iron Awakening",
      category: "main",
      desc: "Deep in the keep, an ancient war machine stirs. The Iron Sentinel must be destroyed.",
      story: "The keep's automated defenses have come online. Iron Sentinel Mark VII was built to be unstoppable — to guard secrets that must never reach the outside world. Those secrets are now yours to claim.",
      objectives: [
        { id: "q003_o1", text: "Defeat the Iron Sentinel", type: "kill", target: "iron_sentinel", needed: 1, current: 0 }
      ],
      rewards: { xp: 1500, gold: 200, items: [] },
      prerequisite: "q002", chainNext: "q004"
    },
    {
      id: "q004",
      title: "Into the Deep Dark",
      category: "main",
      desc: "The iron golem has fallen. The keep's inner sanctum awaits — and something ancient sleeps within.",
      story: "You found the golem's core logs. Something came through from the void centuries ago and took root in the keep's heart. The Voidtouched Ancient is not evil — it is simply the void, embodied and ancient.",
      objectives: [
        { id: "q004_o1", text: "Defeat the Voidtouched Ancient", type: "kill", target: "voidtouched_ancient", needed: 1, current: 0 },
        { id: "q004_o2", text: "Reach Item Level 26", type: "ilvl", needed: 26, current: 0 }
      ],
      rewards: { xp: 3500, gold: 500, items: [] },
      prerequisite: "q003", chainNext: "q005"
    },
    {
      id: "q005",
      title: "The Herald of Oblivion",
      category: "main",
      desc: "The Ancient's death revealed the truth: something vast and terrible awaits at the keep's core.",
      story: "When the Ancient fell, the void it had been holding back began to pour through. You saw it take shape — a Herald, a fragment of pure oblivion. This is why the keep was sealed. This is what you must destroy.",
      objectives: [
        { id: "q005_o1", text: "Defeat the Herald of Oblivion", type: "kill", target: "the_herald", needed: 1, current: 0 },
        { id: "q005_o2", text: "Reach Item Level 42", type: "ilvl", needed: 42, current: 0 }
      ],
      rewards: { xp: 10000, gold: 2000, items: [] },
      prerequisite: "q004", chainNext: null
    },
    // Repeatable / side quests
    {
      id: "q010",
      title: "Veteran of the Keep",
      category: "challenge",
      desc: "Prove your dedication by slaying each boss multiple times.",
      objectives: [
        { id: "q010_o1", text: "Defeat any boss (5×)", type: "kill_any", needed: 5, current: 0 }
      ],
      rewards: { xp: 2000, gold: 300, items: [] },
      prerequisite: "q001", chainNext: null, repeatable: false
    },
    {
      id: "q011",
      title: "A Craft Awakens",
      category: "profession",
      desc: "Learn a crafting profession to enhance your power.",
      objectives: [
        { id: "q011_o1", text: "Learn a Profession", type: "profession", needed: 1, current: 0 }
      ],
      rewards: { xp: 400, gold: 50, items: [] },
      prerequisite: null, chainNext: null
    }
  ],

  // ═══════════════ PROFESSIONS ═══════════════
  professions: [
    {
      id: "blacksmithing",
      name: "Blacksmithing",
      icon: "⚒",
      desc: "Forge powerful plate armor and weapons from raw materials.",
      forRoles: ["tank"],
      recipes: [
        { id: "bs001", name: "Reinforced Pauldrons", ilvl: 20, slot: "shoulders",
          quality: 3, stats: { stamina: 30, strength: 20, defense: 15 },
          mats: [{ mat: "iron_ore", qty: 10 }, { mat: "dark_stone", qty: 3 }] },
        { id: "bs002", name: "Titan's Breastplate", ilvl: 28, slot: "chest",
          quality: 3, stats: { stamina: 45, strength: 28, armor: 300, defense: 20 },
          mats: [{ mat: "iron_ore", qty: 18 }, { mat: "dark_stone", qty: 6 }, { mat: "void_essence", qty: 2 }] }
      ]
    },
    {
      id: "arcane_weaving",
      name: "Arcane Weaving",
      icon: "🌀",
      desc: "Weave shadow and arcane energies into powerful cloth armor.",
      forRoles: ["dps"],
      recipes: [
        { id: "aw001", name: "Shadow-Stitched Robe", ilvl: 22, slot: "chest",
          quality: 3, stats: { intellect: 35, spellPower: 40, crit: 15 },
          mats: [{ mat: "void_cloth", qty: 12 }, { mat: "shadow_thread", qty: 4 }] },
        { id: "aw002", name: "Mantle of Whispers", ilvl: 30, slot: "shoulders",
          quality: 3, stats: { intellect: 42, spellPower: 58, hit: 14, crit: 18 },
          mats: [{ mat: "void_cloth", qty: 20 }, { mat: "shadow_thread", qty: 8 }, { mat: "void_essence", qty: 3 }] }
      ]
    },
    {
      id: "light_scribing",
      name: "Light Scribing",
      icon: "📜",
      desc: "Inscribe celestial patterns into cloth and accessories to enhance healing.",
      forRoles: ["healer"],
      recipes: [
        { id: "ls001", name: "Celestial Vestments", ilvl: 22, slot: "chest",
          quality: 3, stats: { intellect: 32, healingPower: 48, mp5: 12 },
          mats: [{ mat: "void_cloth", qty: 10 }, { mat: "starlight_ink", qty: 5 }] },
        { id: "ls002", name: "Dawnscribe Mantle", ilvl: 30, slot: "shoulders",
          quality: 3, stats: { intellect: 40, healingPower: 65, mp5: 18, spirit: 20 },
          mats: [{ mat: "void_cloth", qty: 16 }, { mat: "starlight_ink", qty: 8 }, { mat: "void_essence", qty: 2 }] }
      ]
    }
  ],

  // ═══════════════ MATERIALS ═══════════════
  materials: [
    { id: "iron_ore",     name: "Iron Ore",      icon: "⛏", desc: "Heavy dark ore, foundational for blacksmithing." },
    { id: "dark_stone",   name: "Dark Stone",    icon: "🪨", desc: "Stone touched by void energy, used for reinforcement." },
    { id: "void_cloth",   name: "Void Cloth",    icon: "🕸", desc: "Cloth woven from shadow-touched fibers." },
    { id: "shadow_thread",name: "Shadow Thread", icon: "🧵", desc: "Thread spun from concentrated shadow essence." },
    { id: "starlight_ink",name: "Starlight Ink", icon: "✨", desc: "Ink infused with fallen-star energy." },
    { id: "void_essence", name: "Void Essence",  icon: "💜", desc: "Crystallized void energy, dropped by powerful foes." }
  ],

  // ═══════════════ STAT FORMULAS ═══════════════
  // Based on TBC/Wrath blend
  formulas: {
    // Rating conversions (Wrath-era)
    critRating:    22.1,   // rating per 1% crit
    hitRating:     26.23,  // rating per 1% hit
    expertiseRating: 8.19, // rating per 1 expertise
    hasteRating:   32.79,  // rating per 1% haste
    defenseRating: 4.92,   // rating per 1 defense

    // Stat → secondary
    // 1 Strength  = 2 AP (for plate wearers), 1 AP for others
    // 1 Agility   = 1 AP + some crit
    // 1 Intellect = mana pool + crit (for casters)
    // 1 Stamina   = 10 HP

    staminaToHP: 10,
    intellectToMana: 15,
    strengthToAP: 2,       // for Stoneguard
    agilityToAP: 1,
    agilityToCrit: 0.05,   // % per agility
    intellectToCrit: 0.03, // % per intellect (casters)

    // GCD
    baseGCD: 1.5,

    // Armor damage reduction: DR = Armor / (Armor + 467.5 * BossLevel - 22167.5)
    armorReductionBossLevel: 73,

    // Crit damage bonus
    spellCritMult: 1.5,
    physicalCritMult: 2.0,

    // Dodge/parry from dodge/parry rating (Wrath)
    dodgeRating: 18.92,
    parryRating: 18.92,
  },

  // AI companion archetypes (used when player is a different role)
  aiCompanions: {
    tank: {
      name: "Theron",
      title: "the Stoneguard",
      icon: "🛡",
      color: "role-tank",
      baseHP: 18000,
      actionInterval: 1.5,
      threatPerAction: 2000
    },
    dps: {
      name: "Vex",
      title: "the Voidreaver",
      icon: "◈",
      color: "role-dps",
      baseHP: 6000,
      actionInterval: 1.8,
      dpsPerAction: 1200
    },
    dps2: {
      name: "Kira",
      title: "the Deadeye",
      icon: "🏹",
      color: "role-dps",
      baseHP: 5500,
      actionInterval: 2.0,
      dpsPerAction: 1100
    },
    healer: {
      name: "Lyria",
      title: "the Dawnbringer",
      icon: "✦",
      color: "role-healer",
      baseHP: 6000,
      actionInterval: 1.8,
      healPerAction: 1200
    }
  }

}; // end RC.DATA
