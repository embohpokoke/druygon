// Druygon Pokemon Database
var IMG_BASE = 'images/pokemon/';
var POKEMON_DB = [
  // ROUTE 1 - Padang Hijau (Lv 1-5): Penjumlahan & Pengurangan
  { id: 'rattata', name: 'Rattata', emoji: '🐀', img: 'rattata.webp', type: 'Normal', rarity: 'common', baseHP: 40, attack: 25, catchRate: 0.7, route: 1, minLevel: 1 },
  { id: 'pidgey', name: 'Pidgey', emoji: '🐦', img: 'pidgey.webp', type: 'Terbang', rarity: 'common', baseHP: 35, attack: 20, catchRate: 0.7, route: 1, minLevel: 1 },
  { id: 'caterpie', name: 'Caterpie', emoji: '🐛', img: null, type: 'Serangga', rarity: 'common', baseHP: 30, attack: 15, catchRate: 0.7, route: 1, minLevel: 1 },
  { id: 'weedle', name: 'Weedle', emoji: '🐝', img: null, type: 'Serangga', rarity: 'common', baseHP: 32, attack: 18, catchRate: 0.7, route: 1, minLevel: 1 },
  { id: 'magikarp', name: 'Magikarp', emoji: '🐟', img: 'magikarp.webp', type: 'Air', rarity: 'common', baseHP: 38, attack: 10, catchRate: 0.7, route: 1, minLevel: 1 },
  { id: 'cleffa', name: 'Cleffa', emoji: '⭐', img: 'cleffa.webp', type: 'Peri', rarity: 'common', baseHP: 35, attack: 20, catchRate: 0.7, route: 1, minLevel: 2 },
  { id: 'eevee', name: 'Eevee', emoji: '✨', img: null, type: 'Normal', rarity: 'uncommon', baseHP: 50, attack: 35, catchRate: 0.4, route: 1, minLevel: 3 },
  { id: 'meowth', name: 'Meowth', emoji: '😺', img: null, type: 'Normal', rarity: 'uncommon', baseHP: 45, attack: 30, catchRate: 0.4, route: 1, minLevel: 3 },
  { id: 'pikachu', name: 'Pikachu', emoji: '⚡', img: 'pikachu.webp', type: 'Listrik', rarity: 'rare', baseHP: 55, attack: 50, catchRate: 0.15, route: 1, minLevel: 4 },

  // ROUTE 2 - Gua Batu (Lv 6-10): Perkalian & Pembagian
  { id: 'geodude', name: 'Geodude', emoji: '🪨', img: null, type: 'Batu', rarity: 'common', baseHP: 60, attack: 40, catchRate: 0.7, route: 2, minLevel: 6 },
  { id: 'zubat', name: 'Zubat', emoji: '🦇', img: null, type: 'Racun', rarity: 'common', baseHP: 50, attack: 35, catchRate: 0.7, route: 2, minLevel: 6 },
  { id: 'machop', name: 'Machop', emoji: '💪', img: 'machop.webp', type: 'Petarung', rarity: 'common', baseHP: 65, attack: 50, catchRate: 0.7, route: 2, minLevel: 6 },
  { id: 'sandshrew', name: 'Sandshrew', emoji: '🏜️', img: null, type: 'Tanah', rarity: 'common', baseHP: 55, attack: 38, catchRate: 0.7, route: 2, minLevel: 6 },
  { id: 'smeargle', name: 'Smeargle', emoji: '🎨', img: 'smeargle.webp', type: 'Normal', rarity: 'common', baseHP: 50, attack: 30, catchRate: 0.7, route: 2, minLevel: 7 },
  { id: 'onix', name: 'Onix', emoji: '🐍', img: null, type: 'Batu', rarity: 'uncommon', baseHP: 80, attack: 45, catchRate: 0.4, route: 2, minLevel: 8 },
  { id: 'haunter', name: 'Haunter', emoji: '👻', img: null, type: 'Hantu', rarity: 'uncommon', baseHP: 70, attack: 60, catchRate: 0.4, route: 2, minLevel: 8 },
  { id: 'alakazam', name: 'Alakazam', emoji: '🧠', img: 'alakazam.webp', type: 'Psikis', rarity: 'rare', baseHP: 75, attack: 80, catchRate: 0.15, route: 2, minLevel: 9 },

  // ROUTE 3 - Hutan Mistis (Lv 11-15): FPB & KPK
  { id: 'bulbasaur', name: 'Bulbasaur', emoji: '🌿', img: 'bulbasaur.webp', type: 'Rumput', rarity: 'common', baseHP: 70, attack: 55, catchRate: 0.7, route: 3, minLevel: 11 },
  { id: 'oddish', name: 'Oddish', emoji: '🌱', img: 'oddish.webp', type: 'Rumput', rarity: 'common', baseHP: 60, attack: 45, catchRate: 0.7, route: 3, minLevel: 11 },
  { id: 'bellsprout', name: 'Bellsprout', emoji: '🌾', img: null, type: 'Rumput', rarity: 'common', baseHP: 55, attack: 50, catchRate: 0.7, route: 3, minLevel: 11 },
  { id: 'charmander', name: 'Charmander', emoji: '🔥', img: 'charizard.webp', type: 'Api', rarity: 'uncommon', baseHP: 75, attack: 65, catchRate: 0.4, route: 3, minLevel: 12 },
  { id: 'squirtle', name: 'Squirtle', emoji: '💧', img: 'squirtle.webp', type: 'Air', rarity: 'uncommon', baseHP: 75, attack: 60, catchRate: 0.4, route: 3, minLevel: 12 },
  { id: 'jigglypuff', name: 'Jigglypuff', emoji: '🎀', img: 'jigglypuff.webp', type: 'Peri', rarity: 'uncommon', baseHP: 90, attack: 40, catchRate: 0.4, route: 3, minLevel: 13 },
  { id: 'lapras', name: 'Lapras', emoji: '🐋', img: null, type: 'Air', rarity: 'rare', baseHP: 100, attack: 75, catchRate: 0.15, route: 3, minLevel: 14 },
  { id: 'articuno', name: 'Articuno', emoji: '❄️', img: 'articuno.webp', type: 'Es', rarity: 'legendary', baseHP: 130, attack: 95, catchRate: 0.05, route: 3, minLevel: 15 },

  // ROUTE 4 - Puncak Naga (Lv 16+): Pecahan & Desimal
  { id: 'dratini', name: 'Dratini', emoji: '🐍✨', img: null, type: 'Naga', rarity: 'common', baseHP: 80, attack: 60, catchRate: 0.7, route: 4, minLevel: 16 },
  { id: 'growlithe', name: 'Growlithe', emoji: '🐕‍🦺', img: null, type: 'Api', rarity: 'common', baseHP: 75, attack: 65, catchRate: 0.7, route: 4, minLevel: 16 },
  { id: 'dragonair', name: 'Dragonair', emoji: '🐉', img: null, type: 'Naga', rarity: 'uncommon', baseHP: 95, attack: 80, catchRate: 0.4, route: 4, minLevel: 17 },
  { id: 'arcanine', name: 'Arcanine', emoji: '🦁', img: null, type: 'Api', rarity: 'uncommon', baseHP: 100, attack: 90, catchRate: 0.4, route: 4, minLevel: 18 },
  { id: 'zapdos', name: 'Zapdos', emoji: '⚡🦅', img: 'zapdos.webp', type: 'Listrik', rarity: 'legendary', baseHP: 130, attack: 100, catchRate: 0.05, route: 4, minLevel: 18 },
  { id: 'raikou', name: 'Raikou', emoji: '🐯⚡', img: 'raikou.webp', type: 'Listrik', rarity: 'legendary', baseHP: 135, attack: 105, catchRate: 0.05, route: 4, minLevel: 20 },
  { id: 'dragonite', name: 'Dragonite', emoji: '🐲', img: null, type: 'Naga', rarity: 'rare', baseHP: 120, attack: 110, catchRate: 0.15, route: 4, minLevel: 19 },
  { id: 'snorlax', name: 'Snorlax', emoji: '😴', img: null, type: 'Normal', rarity: 'rare', baseHP: 140, attack: 85, catchRate: 0.15, route: 4, minLevel: 20 },
  { id: 'mewtwo', name: 'Mewtwo', emoji: '🧠✨', img: 'mewtwo.webp', type: 'Psikis', rarity: 'legendary', baseHP: 150, attack: 130, catchRate: 0.05, route: 4, minLevel: 25 }
];

// Route information
var ROUTES = {
  1: {
    name: 'Padang Hijau',
    emoji: '🌾',
    description: 'Padang rumput tempat Pokemon pemula tinggal',
    mathTopic: 'Penjumlahan & Pengurangan',
    minLevel: 1,
    color: '#4CAF50'
  },
  2: {
    name: 'Gua Batu',
    emoji: '🪨',
    description: 'Gua gelap dengan Pokemon batu dan hantu',
    mathTopic: 'Perkalian & Pembagian',
    minLevel: 6,
    color: '#795548'
  },
  3: {
    name: 'Hutan Mistis',
    emoji: '🌿',
    description: 'Hutan lebat penuh Pokemon rumput dan api',
    mathTopic: 'FPB & KPK',
    minLevel: 11,
    color: '#66BB6A'
  },
  4: {
    name: 'Puncak Naga',
    emoji: '🏔️',
    description: 'Puncak gunung tertinggi, rumah Pokemon legendaris',
    mathTopic: 'Pecahan & Desimal',
    minLevel: 16,
    color: '#9C27B0'
  }
};

// Pokeball types
var POKEBALL_TYPES = {
  pokeball: { name: 'Pokeball', emoji: '⚪', img: 'pokeball-sm.png', modifier: 1, price: 50 },
  greatball: { name: 'Great Ball', emoji: '🔵', img: null, modifier: 1.5, price: 150 },
  ultraball: { name: 'Ultra Ball', emoji: '🟡', img: null, modifier: 2, price: 400 },
  masterball: { name: 'Master Ball', emoji: '🟣', img: null, modifier: 100, price: 2000 }
};

// Helper: get pokemon image URL or fallback to emoji
function getPokemonImg(pokemon) {
  if (pokemon.img) {
    return '<img src="' + IMG_BASE + pokemon.img + '" alt="' + pokemon.name + '" class="pokemon-sprite" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'">' +
           '<span style="display:none">' + pokemon.emoji + '</span>';
  }
  return '<span class="pokemon-emoji">' + pokemon.emoji + '</span>';
}

// Helper: get pokeball image or emoji
function getPokeballImg(ballType) {
  var ball = POKEBALL_TYPES[ballType];
  if (ball && ball.img) {
    return '<img src="' + IMG_BASE + ball.img + '" alt="' + ball.name + '" class="pokeball-sprite" style="width:32px;height:32px" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'">' +
           '<span style="display:none">' + ball.emoji + '</span>';
  }
  return '<span>' + (ball ? ball.emoji : '⚪') + '</span>';
}

// Helper functions
function getPokemonById(id) {
  return POKEMON_DB.find(function(p) { return p.id === id; });
}

function getPokemonByRoute(routeNum) {
  return POKEMON_DB.filter(function(p) { return p.route === routeNum; });
}

function getRandomPokemonFromRoute(routeNum, playerLevel) {
  var routePokemon = getPokemonByRoute(routeNum);

  // Filter by level
  var available = routePokemon.filter(function(p) { return p.minLevel <= playerLevel + 2; });

  if (available.length === 0) return null;

  // Weighted random based on rarity
  var weights = available.map(function(p) {
    switch(p.rarity) {
      case 'common': return 50;
      case 'uncommon': return 25;
      case 'rare': return 10;
      case 'legendary': return 1;
      default: return 30;
    }
  });

  var totalWeight = weights.reduce(function(a, b) { return a + b; }, 0);
  var random = Math.random() * totalWeight;

  for (var i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      var pokemon = Object.assign({}, available[i]);
      pokemon.level = Math.max(1, pokemon.minLevel + Math.floor(Math.random() * 3));
      return pokemon;
    }
  }

  var fallback = Object.assign({}, available[0]);
  fallback.level = available[0].minLevel;
  return fallback;
}

function calculateCatchChance(pokemon, ballType) {
  var baseRate = pokemon.catchRate;
  var ball = POKEBALL_TYPES[ballType];
  var ballModifier = ball ? ball.modifier : 1;
  var chance = Math.min(1, baseRate * ballModifier);
  return chance;
}

function attemptCatch(pokemon, ballType) {
  var chance = calculateCatchChance(pokemon, ballType);
  return Math.random() < chance;
}

// Expose to global
window.POKEMON_DB = POKEMON_DB;
window.ROUTES = ROUTES;
window.POKEBALL_TYPES = POKEBALL_TYPES;
window.IMG_BASE = IMG_BASE;
window.getPokemonImg = getPokemonImg;
window.getPokeballImg = getPokeballImg;
window.getPokemonById = getPokemonById;
window.getPokemonByRoute = getPokemonByRoute;
window.getRandomPokemonFromRoute = getRandomPokemonFromRoute;
window.calculateCatchChance = calculateCatchChance;
window.attemptCatch = attemptCatch;
