// main.js — orkestrasi game Menara Kartu — Duel Benteng.
// Satu tugas: state, alur giliran, kombo, dan mode screenshot (?shot=...).
// Aturan kartu ada di cards.js, deck di deck.js, AI di ai.js, tampilan di render.js.

import { CARD_TYPES, deckDefinitions, makeCard } from './cards.js';
import { makeRng, buildDeck, drawCards, discardFromHand } from './deck.js';
import { decideIntent, planAiTurn } from './ai.js';
import { iconSvg, cardElement, cardBackElement, towerElement, floatText, launchConfetti } from './render.js';

const MAX_HP = 30;
const HAND_START = 5;
const HAND_MAX = 7;

// Mode instan (tanpa animasi/delay) untuk screenshot deterministik ?shot=...
const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const INSTANT = SHOT !== null;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, INSTANT ? 0 : ms));
}

function newSide(tag, rng) {
  return {
    tag,
    hp: MAX_HP,
    maxHp: MAX_HP,
    energy: 0,
    maxEnergy: 3,
    shield: 0,
    trap: 0,
    hand: [],
    deck: [],
    discard: [],
    rng,
    lastPlayed: null,
    playedShieldThisTurn: false,
    playedBuildThisTurn: false,
  };
}

const state = {
  phase: 'title', // title | battle | win | lose
  round: 1,
  turn: 'player',
  busy: false,
  player: null,
  enemy: null,
  aiIntent: null,
  log: [],
  seed: 1,
};

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const elRound = $('round-label');
const elEnergy = $('energy-label');
const elEnergyPips = $('energy-pips');
const elTowerPlayer = $('tower-player');
const elTowerEnemy = $('tower-enemy');
const elIntent = $('intent-box');
const elLog = $('log-list');
const elEnemyHand = $('enemy-hand');
const elPlayerHand = $('player-hand');
const elCenterCard = $('center-card');
const elCenterStage = $('center-stage');
const elEndTurn = $('btn-end-turn');
const elOverlayTitle = $('overlay-title');
const elOverlayWin = $('overlay-win');
const elOverlayLose = $('overlay-lose');

// ---- Log ----
function addLog(text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
  renderLog();
}

function renderLog() {
  elLog.innerHTML = state.log.map((line) => `<li>${line}</li>`).join('');
}

// ---- Render ----
function renderHud() {
  elRound.textContent = `Ronde ${state.round}`;
  const p = state.player;
  elEnergy.textContent = `Energi ${p.energy} / ${p.maxEnergy}`;
  let pips = '';
  for (let i = 0; i < p.maxEnergy; i += 1) {
    pips += `<span class="pip${i < p.energy ? ' pip-on' : ''}"></span>`;
  }
  elEnergyPips.innerHTML = pips;
  elEndTurn.disabled = state.phase !== 'battle' || state.turn !== 'player' || state.busy;
}

function renderTowers() {
  elTowerPlayer.replaceChildren(towerElement(state.player, 'MENARAMU', true));
  elTowerEnemy.replaceChildren(towerElement(state.enemy, 'MENARA LAWAN', false));
}

function renderIntent() {
  if (!state.aiIntent || state.phase !== 'battle') {
    elIntent.innerHTML = '<div class="intent-empty">Lawan sedang berpikir…</div>';
    return;
  }
  const type = CARD_TYPES[state.aiIntent];
  const hint =
    state.aiIntent === 'attack'
      ? 'Siapkan Perisai atau Jebakan!'
      : state.aiIntent === 'trap'
        ? 'Hati-hati menyerang!'
        : state.aiIntent === 'build'
          ? 'Serang sebelum ia pulih!'
          : 'Serang saja, ia sedang bertahan.';
  elIntent.innerHTML = `
    <div class="intent-title">NIAT LAWAN</div>
    <div class="intent-body" style="--intent-color:${type.color}">
      <span class="intent-icon">${iconSvg(type.icon, 30)}</span>
      <span class="intent-verb">${type.intentVerb}</span>
    </div>
    <div class="intent-hint">${hint}</div>`;
}

function renderHands() {
  elEnemyHand.replaceChildren();
  state.enemy.hand.forEach(() => elEnemyHand.appendChild(cardBackElement()));

  elPlayerHand.replaceChildren();
  state.player.hand.forEach((card, index) => {
    const playable =
      state.phase === 'battle' && state.turn === 'player' && !state.busy && card.cost <= state.player.energy;
    const el = cardElement(card, {
      playable,
      index,
      onClick: (clicked) => {
        if (playable) void playCard(clicked.uid);
      },
    });
    elPlayerHand.appendChild(el);
  });
}

function renderAll() {
  renderHud();
  renderTowers();
  renderIntent();
  renderHands();
  renderLog();
}

// ---- Aturan main ----
function maxEnergyForRound(round) {
  return Math.min(2 + round, 10);
}

function dealDamage(target, amount) {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const through = amount - absorbed;
  target.hp = Math.max(0, target.hp - through);
  return { absorbed, through };
}

function showCenterCard(card, who) {
  elCenterCard.replaceChildren();
  const type = CARD_TYPES[card.type];
  const chip = document.createElement('div');
  chip.className = 'center-played';
  chip.style.setProperty('--card-color', type.color);
  chip.style.setProperty('--card-dark', type.dark);
  chip.style.setProperty('--card-light', type.light);
  chip.innerHTML = `
    <span class="center-played-who">${who === 'player' ? 'Kamu memainkan:' : 'Lawan memainkan:'}</span>
    <span class="center-played-icon">${iconSvg(type.icon, 26)}</span>
    <span class="center-played-name">${card.name}</span>
    <span class="center-played-value">${card.value}</span>
    <span class="center-played-type">${type.label}</span>`;
  elCenterCard.appendChild(chip);
  elCenterStage.classList.remove('pop');
  void elCenterStage.offsetWidth; // restart animasi
  elCenterStage.classList.add('pop');
}

// Terapkan efek satu kartu. Dipakai pemain dan AI.
async function resolveCard(attacker, defender, card) {
  const who = attacker.tag === 'player' ? 'Kamu' : 'Lawan';
  const foeName = defender.tag === 'player' ? 'menaramu' : 'menara lawan';
  discardFromHand(attacker, card.uid);
  showCenterCard(card, attacker.tag);

  if (card.type === 'attack') {
    let dmg = card.value;
    let combo = false;
    if (attacker.lastPlayed === 'attack') {
      dmg += 3;
      combo = true;
    }
    const result = dealDamage(defender, dmg);
    const towerEl = defender.tag === 'player' ? elTowerPlayer : elTowerEnemy;
    floatText(towerEl, `-${result.through}`, 'damage');
    addLog(
      `${who} menyerang ${dmg}${combo ? ' (KOMBO +3!)' : ''} — ${result.absorbed > 0 ? `perisai menahan ${result.absorbed}, ` : ''}${result.through} damage ke ${foeName}.`,
    );
    // Jebakan lawan menyambar penyerang.
    if (defender.trap > 0) {
      const trapDmg = defender.trap;
      defender.trap = 0;
      attacker.hp = Math.max(0, attacker.hp - trapDmg);
      const atkTowerEl = attacker.tag === 'player' ? elTowerPlayer : elTowerEnemy;
      floatText(atkTowerEl, `-${trapDmg} jebakan!`, 'trap');
      addLog(`Jebakan petir menyambar ${who} — ${trapDmg} damage!`);
    }
  } else if (card.type === 'shield') {
    attacker.shield += card.value;
    const towerEl = attacker.tag === 'player' ? elTowerPlayer : elTowerEnemy;
    floatText(towerEl, `+${card.value} perisai`, 'shield');
    addLog(`${who} memasang perisai ${card.value}.`);
    attacker.playedShieldThisTurn = true;
  } else if (card.type === 'build') {
    let heal = card.value;
    let bonus = false;
    if (attacker.playedShieldThisTurn) {
      heal += 2;
      bonus = true;
    }
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    const towerEl = attacker.tag === 'player' ? elTowerPlayer : elTowerEnemy;
    floatText(towerEl, `+${attacker.hp - before} HP`, 'heal');
    addLog(`${who} membangun menara +${attacker.hp - before} HP${bonus ? ' (KOMBO Perisai+Bangun +2!)' : ''}.`);
    attacker.playedBuildThisTurn = true;
  } else if (card.type === 'trap') {
    attacker.trap = card.value;
    addLog(`${who} memasang jebakan petir (${card.value} damage).`);
  }

  attacker.lastPlayed = card.type;
  renderAll();
  await sleep(450);
  checkEnd();
}

// ---- Giliran ----
function startPlayerTurn() {
  const p = state.player;
  state.turn = 'player';
  p.maxEnergy = maxEnergyForRound(state.round);
  p.energy = p.maxEnergy;
  p.shield = 0; // perisai kadaluarsa di awal giliranmu
  p.lastPlayed = null;
  p.playedShieldThisTurn = false;
  p.playedBuildThisTurn = false;
  drawCards(p, 2);
  state.aiIntent = decideIntent(state.enemy, p, state.enemy.rng);
  addLog(`Ronde ${state.round} — giliranmu. Energi ${p.energy}.`);
  renderAll();
}

async function playCard(uid) {
  if (state.phase !== 'battle' || state.turn !== 'player' || state.busy) return;
  const card = state.player.hand.find((c) => c.uid === uid);
  if (!card || card.cost > state.player.energy) return;
  state.busy = true;
  state.player.energy -= card.cost;
  await resolveCard(state.player, state.enemy, card);
  state.busy = false;
  renderAll();
}

async function endTurn() {
  if (state.phase !== 'battle' || state.turn !== 'player' || state.busy) return;
  state.busy = true;
  state.turn = 'enemy';
  renderAll();
  await sleep(500);

  const ai = state.enemy;
  ai.maxEnergy = maxEnergyForRound(state.round);
  ai.energy = ai.maxEnergy;
  ai.shield = 0; // perisai lawan kadaluarsa di awal gilirannya
  ai.lastPlayed = null;
  ai.playedShieldThisTurn = false;
  ai.playedBuildThisTurn = false;
  drawCards(ai, 2);
  addLog(`Giliran lawan — energi ${ai.energy}.`);
  renderAll();
  await sleep(500);

  const plan = planAiTurn(ai, state.aiIntent);
  for (const uid of plan) {
    if (state.phase !== 'battle') break;
    const card = ai.hand.find((c) => c.uid === uid);
    if (!card || card.cost > ai.energy) continue;
    ai.energy -= card.cost;
    await resolveCard(ai, state.player, card);
  }

  // Jebakanmu kadaluarsa kalau tidak terpicu selama giliran lawan.
  if (state.phase === 'battle' && state.player.trap > 0) {
    state.player.trap = 0;
    addLog('Jebakanmu padam tanpa terpicu.');
  }

  state.busy = false;
  if (state.phase !== 'battle') {
    renderAll();
    return;
  }
  state.round += 1;
  startPlayerTurn();
}

function checkEnd() {
  if (state.phase !== 'battle') return;
  if (state.enemy.hp <= 0) {
    state.phase = 'win';
    showOverlay('win');
  } else if (state.player.hp <= 0) {
    state.phase = 'lose';
    showOverlay('lose');
  }
  renderAll();
}

function showOverlay(kind) {
  elOverlayTitle.classList.toggle('hidden', kind !== 'title');
  elOverlayWin.classList.toggle('hidden', kind !== 'win');
  elOverlayLose.classList.toggle('hidden', kind !== 'lose');
  if (kind === 'win') launchConfetti(elOverlayWin, 100);
}

function hideOverlays() {
  elOverlayTitle.classList.add('hidden');
  elOverlayWin.classList.add('hidden');
  elOverlayLose.classList.add('hidden');
}

// ---- Mulai game ----
function startGame(seed) {
  const rng = makeRng(seed);
  state.seed = seed;
  state.round = 1;
  state.log = [];
  state.phase = 'battle';
  state.turn = 'player';
  state.busy = false;
  state.player = newSide('player', makeRng(seed + 101));
  state.enemy = newSide('enemy', makeRng(seed + 202));
  state.player.deck = buildDeck(deckDefinitions(), makeCard, state.player.rng, 'p');
  state.enemy.deck = buildDeck(deckDefinitions(), makeCard, state.enemy.rng, 'e');
  drawCards(state.player, HAND_START);
  drawCards(state.enemy, HAND_START);
  elCenterCard.replaceChildren();
  elCenterStage.classList.remove('pop');
  hideOverlays();
  startPlayerTurn();
  addLog('Duel dimulai! Hancurkan menara lawan sebelum menaramu runtuh.');
  renderAll();
}

// ---- Mode screenshot deterministik (?shot=...) ----
function handFromNames(names, tag) {
  return names.map((name, i) => {
    const def = deckDefinitions().find((d) => d.name === name);
    return makeCard(def, `${tag}-shot-${i}`);
  });
}

function applyShotMode() {
  if (!SHOT) return;
  if (SHOT === 'title') {
    // Meja kosong di belakang layar judul.
    state.player = newSide('player', makeRng(1));
    state.enemy = newSide('enemy', makeRng(2));
    state.player.deck = buildDeck(deckDefinitions(), makeCard, state.player.rng, 'p');
    state.enemy.deck = buildDeck(deckDefinitions(), makeCard, state.enemy.rng, 'e');
    drawCards(state.player, HAND_START);
    drawCards(state.enemy, HAND_START);
    state.phase = 'title';
    showOverlay('title');
    renderAll();
    return;
  }
  if (SHOT === 'battle') {
    const seed = Number(params.get('seed') || '1');
    startGame(seed);
    // Snapshot tengah permainan yang sama setiap kali (deterministik).
    state.round = 3;
    state.player.hp = 24;
    state.enemy.hp = 21;
    state.player.maxEnergy = 5;
    state.player.energy = 4;
    state.enemy.shield = 5;
    state.player.trap = 0;
    state.enemy.trap = 0;
    state.player.hand = handFromNames(
      ['Pukulan Palu', 'Tameng Besi', 'Perbaiki Atap', 'Ranjau Petir', 'Tusukan Cepat'],
      'p',
    );
    state.enemy.hand = handFromNames(
      ['Panah Api', 'Tameng Kayu', 'Pasang Bata', 'Tombak Badai', 'Jebakan Lubang'],
      'e',
    );
    state.aiIntent = 'attack';
    state.log = [
      'Lawan menyerang 5 — perisai menahan 3, 2 damage.',
      'Kamu membangun +5 HP (KOMBO Perisai+Bangun +2!).',
      'Ronde 3 — giliranmu. Energi 5.',
    ];
    showCenterCard(
      { uid: 'p-shot-0', name: 'Pukulan Palu', type: 'attack', cost: 3, value: 7, text: '7 damage ke menara lawan.' },
      'player',
    );
    renderAll();
    return;
  }
  if (SHOT === 'win') {
    startGame(1);
    state.enemy.hp = 0;
    state.phase = 'win';
    showOverlay('win');
    renderAll();
    return;
  }
  if (SHOT === 'lose') {
    startGame(1);
    state.player.hp = 0;
    state.phase = 'lose';
    showOverlay('lose');
    renderAll();
    return;
  }
}

// ---- Input ----
elEndTurn.addEventListener('click', () => void endTurn());
$('btn-start').addEventListener('click', () => startGame(Math.floor(Math.random() * 100000) + 1));
$('btn-restart-win').addEventListener('click', () => startGame(Math.floor(Math.random() * 100000) + 1));
$('btn-restart-lose').addEventListener('click', () => startGame(Math.floor(Math.random() * 100000) + 1));

document.addEventListener('keydown', (event) => {
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    startGame(Math.floor(Math.random() * 100000) + 1);
    return;
  }
  if ((state.phase === 'win' || state.phase === 'lose') && event.key === 'Enter') {
    startGame(Math.floor(Math.random() * 100000) + 1);
    return;
  }
  if (state.phase !== 'battle' || state.turn !== 'player' || state.busy) return;
  if (event.key >= '1' && event.key <= '5') {
    const index = Number(event.key) - 1;
    const card = state.player.hand[index];
    if (card) void playCard(card.uid);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    void endTurn();
  }
});

// ---- Boot ----
if (SHOT) {
  applyShotMode();
} else {
  // Layar judul di atas meja contoh.
  state.player = newSide('player', makeRng(1));
  state.enemy = newSide('enemy', makeRng(2));
  state.player.deck = buildDeck(deckDefinitions(), makeCard, state.player.rng, 'p');
  state.enemy.deck = buildDeck(deckDefinitions(), makeCard, state.enemy.rng, 'e');
  drawCards(state.player, HAND_START);
  drawCards(state.enemy, HAND_START);
  state.phase = 'title';
  showOverlay('title');
  renderAll();
}
