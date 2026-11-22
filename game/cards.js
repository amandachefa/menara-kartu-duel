// cards.js — data semua kartu Menara Kartu: jenis, warna, ikon, cost, nilai, teks.
// Satu tugas: definisi kartu dan daftar deck dasar. Tidak ada logika giliran di sini.

export const CARD_TYPES = {
  attack: {
    key: 'attack',
    label: 'Serang',
    color: '#c0392b',
    dark: '#7b241c',
    light: '#fdedec',
    icon: 'sword',
    intentVerb: 'Menyerang',
  },
  shield: {
    key: 'shield',
    label: 'Perisai',
    color: '#2471a3',
    dark: '#154360',
    light: '#eaf2f8',
    icon: 'shield',
    intentVerb: 'Bertahan',
  },
  build: {
    key: 'build',
    label: 'Bangun',
    color: '#1e8449',
    dark: '#145a32',
    light: '#eafaf1',
    icon: 'brick',
    intentVerb: 'Membangun',
  },
  trap: {
    key: 'trap',
    label: 'Jebakan',
    color: '#b7950b',
    dark: '#7d6608',
    light: '#fef9e7',
    icon: 'bolt',
    intentVerb: 'Memasang jebakan',
  },
};

// value = damage untuk Serang/Jebakan, block untuk Perisai, heal untuk Bangun.
// Teks kartu dibuat pendek supaya muat dua baris di kartu (original, bukan dari game lain).
export const CARD_DEFS = [
  // ---- Serang (merah, pedang) ----
  { name: 'Tebasan Pedang', type: 'attack', cost: 1, value: 3, text: '3 damage ke lawan.' },
  { name: 'Tusukan Cepat', type: 'attack', cost: 1, value: 3, text: '3 damage ke lawan.' },
  { name: 'Panah Api', type: 'attack', cost: 2, value: 5, text: '5 damage ke lawan.' },
  { name: 'Hantaman Batu', type: 'attack', cost: 2, value: 5, text: '5 damage ke lawan.' },
  { name: 'Dua Tebasan', type: 'attack', cost: 2, value: 4, text: '4 damage ke lawan.' },
  { name: 'Lempar Kapak', type: 'attack', cost: 2, value: 5, text: '5 damage ke lawan.' },
  { name: 'Tombak Badai', type: 'attack', cost: 3, value: 6, text: '6 damage ke lawan.' },
  { name: 'Pukulan Palu', type: 'attack', cost: 3, value: 7, text: '7 damage ke lawan.' },
  // ---- Perisai (biru, tameng) ----
  { name: 'Tameng Kayu', type: 'shield', cost: 1, value: 4, text: 'Tahan 4 damage.' },
  { name: 'Perisai Kecil', type: 'shield', cost: 1, value: 4, text: 'Tahan 4 damage.' },
  { name: 'Dinding Perisai', type: 'shield', cost: 2, value: 6, text: 'Tahan 6 damage.' },
  { name: 'Tameng Besi', type: 'shield', cost: 2, value: 7, text: 'Tahan 7 damage.' },
  { name: 'Benteng Sementara', type: 'shield', cost: 2, value: 6, text: 'Tahan 6 damage.' },
  // ---- Bangun (hijau, bata) ----
  { name: 'Pasang Bata', type: 'build', cost: 1, value: 3, text: 'Pulihkan 3 HP.' },
  { name: 'Semen Cepat', type: 'build', cost: 1, value: 3, text: 'Pulihkan 3 HP.' },
  { name: 'Perbaiki Atap', type: 'build', cost: 2, value: 5, text: 'Pulihkan 5 HP.' },
  { name: 'Tukang Siaga', type: 'build', cost: 2, value: 5, text: 'Pulihkan 5 HP.' },
  { name: 'Fondasi Kuat', type: 'build', cost: 2, value: 4, text: 'Pulihkan 4 HP.' },
  { name: 'Tambah Lantai', type: 'build', cost: 3, value: 7, text: 'Pulihkan 7 HP.' },
  // ---- Jebakan (kuning, petir) ----
  { name: 'Ranjau Petir', type: 'trap', cost: 2, value: 6, text: 'Lawan yang menyerang kena 6 damage.' },
  { name: 'Perangkap Duri', type: 'trap', cost: 2, value: 6, text: 'Lawan yang menyerang kena 6 damage.' },
  { name: 'Jebakan Lubang', type: 'trap', cost: 2, value: 5, text: 'Lawan yang menyerang kena 5 damage.' },
  { name: 'Petir Tersembunyi', type: 'trap', cost: 2, value: 6, text: 'Lawan yang menyerang kena 6 damage.' },
  { name: 'Kawat Berduri', type: 'trap', cost: 2, value: 5, text: 'Lawan yang menyerang kena 5 damage.' },
];

// Satu kartu di tangan/deck: salinan definisi + id unik.
export function makeCard(def, uid) {
  return { uid, name: def.name, type: def.type, cost: def.cost, value: def.value, text: def.text };
}

// Daftar definisi deck lengkap (24 kartu). Dipakai deck.js untuk membangun deck.
export function deckDefinitions() {
  return CARD_DEFS.slice();
}
