// render.js — semua tampilan DOM: ikon SVG, kartu, menara, bar HP, log, overlay,
// angka damage melayang, dan confetti kemenangan.
// Satu tugas: menggambar state ke layar. Tidak ada aturan main di sini.

import { CARD_TYPES } from './cards.js';

// Ikon SVG sederhana digambar sendiri (original, tanpa aset eksternal).
const ICON_PATHS = {
  sword:
    '<path d="M14 3 L21 10 L19 12 L12 5 Z" /><path d="M11 6 L4 13 L6 15 L13 8 Z" /><rect x="3" y="13" width="3" height="8" rx="1" transform="rotate(45 4.5 17)" />',
  shield:
    '<path d="M12 2 L20 5 V11 C20 17 16.5 21 12 22 C7.5 21 4 17 4 11 V5 Z" /><path d="M12 5 L17 7 V11 C17 15 15 18 12 19 C9 18 7 15 7 11 V7 Z" fill="none" stroke="#fff" stroke-width="1.4" />',
  brick:
    '<rect x="3" y="4" width="18" height="5" rx="1" /><rect x="3" y="11" width="8" height="5" rx="1" /><rect x="13" y="11" width="8" height="5" rx="1" /><rect x="3" y="18" width="18" height="5" rx="1" opacity="0.85" />',
  bolt: '<path d="M13 2 L5 13 H11 L9 22 L19 10 H13 Z" />',
  tower:
    '<path d="M7 21 V9 H5 V4 H9 V6 H11 V4 H13 V6 H15 V4 H19 V9 H17 V21 Z" /><rect x="9" y="13" width="6" height="8" rx="2" fill="#3d2b1f" />',
  heart: '<path d="M12 21 C6 15 3 11 3 7.5 C3 4.5 5.5 2.5 8 2.5 C10 2.5 11.5 3.8 12 5 C12.5 3.8 14 2.5 16 2.5 C18.5 2.5 21 4.5 21 7.5 C21 11 18 15 12 21 Z" />',
  boltSmall: '<path d="M13 2 L5 13 H11 L9 22 L19 10 H13 Z" />',
};

export function iconSvg(kind, size = 24) {
  const path = ICON_PATHS[kind] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${path}</svg>`;
}

// Satu elemen kartu (tangan pemain). opts: { playable, selected, onClick, index }
export function cardElement(card, opts = {}) {
  const type = CARD_TYPES[card.type];
  const el = document.createElement('div');
  el.className = `card card-${card.type}`;
  if (opts.playable) el.classList.add('playable');
  if (opts.selected) el.classList.add('selected');
  el.dataset.uid = card.uid;
  el.dataset.index = String(opts.index ?? 0);
  el.style.setProperty('--card-color', type.color);
  el.style.setProperty('--card-dark', type.dark);
  el.style.setProperty('--card-light', type.light);
  el.innerHTML = `
    <div class="card-cost" title="Biaya energi">${card.cost}</div>
    <div class="card-icon">${iconSvg(type.icon, 34)}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-value">${card.value}</div>
    <div class="card-type">${type.label}</div>
    <div class="card-text">${card.text}</div>
    <div class="card-key">${opts.index != null ? opts.index + 1 : ''}</div>`;
  if (opts.onClick) el.addEventListener('click', () => opts.onClick(card));
  return el;
}

// Kartu tertutup (tangan lawan).
export function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card card-back';
  el.innerHTML = `<div class="card-back-icon">${iconSvg('tower', 30)}</div><div class="card-back-label">MENARA<br>KARTU</div>`;
  return el;
}

// Gambar menara + bar HP untuk satu sisi ('player' atau 'enemy').
export function towerElement(side, label, isPlayer) {
  const wrap = document.createElement('div');
  wrap.className = `tower ${isPlayer ? 'tower-player' : 'tower-enemy'}`;
  const hpPct = Math.max(0, Math.round((side.hp / side.maxHp) * 100));
  const shieldLine = side.shield > 0 ? `<div class="tower-shield">${iconSvg('shield', 16)} Perisai ${side.shield}</div>` : '';
  const trapLine = side.trap > 0 ? `<div class="tower-trap">${iconSvg('bolt', 16)} Jebakan aktif (${side.trap})</div>` : '';
  wrap.innerHTML = `
    <div class="tower-label">${label}</div>
    <div class="tower-art">${iconSvg('tower', 64)}</div>
    <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%"></div></div>
    <div class="hp-text"><span class="hp-heart">${iconSvg('heart', 16)}</span> ${side.hp} / ${side.maxHp} HP</div>
    ${shieldLine}${trapLine}`;
  return wrap;
}

// Angka damage/heal melayang di atas target (elemen DOM).
export function floatText(container, text, kind) {
  const el = document.createElement('div');
  el.className = `float-text float-${kind}`;
  el.textContent = text;
  container.appendChild(el);
  window.setTimeout(() => el.remove(), 1400);
}

// Confetti sederhana untuk layar menang (kotak warna-warni jatuh).
export function launchConfetti(container, count = 90) {
  const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    piece.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    piece.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    container.appendChild(piece);
    window.setTimeout(() => piece.remove(), 5000);
  }
}
