// ai.js — otak lawan komputer: memilih niat (yang ditampilkan ke pemain) dan
// menyusun kartu yang dimainkan pada gilirannya.
// Satu tugas: keputusan AI saja. Tidak menyentuh DOM dan tidak mengubah state langsung.

// Tentukan niat AI untuk ronde ini. Niat ditampilkan ke pemain sebelum giliran AI,
// supaya pemain bisa membaca dan meng-counter.
export function decideIntent(ai, player, rng) {
  const aiLow = ai.hp <= 12;
  const playerLow = player.hp <= 10;
  const roll = rng();
  if (aiLow && roll < 0.55) return 'build';
  if (playerLow && roll < 0.6) return 'attack';
  if (ai.shield === 0 && roll < 0.2) return 'shield';
  if (roll < 0.18) return 'trap';
  if (roll < 0.55) return 'attack';
  if (roll < 0.75) return 'build';
  return 'shield';
}

// Susun daftar kartu yang akan dimainkan AI pada gilirannya, sesuai niatnya.
// Mengembalikan array uid kartu, berurutan. Kartu yang cocok dengan niat didahulukan;
// kalau energi tersisa dan ada kartu murah lain, AI memainkannya juga.
export function planAiTurn(ai, intent) {
  const plays = [];
  let energy = ai.energy;
  const hand = ai.hand.slice();

  const affordable = (type) =>
    hand.filter((card) => card.type === type && card.cost <= energy && !plays.includes(card.uid));

  const takeOne = (type) => {
    const candidates = affordable(type);
    if (candidates.length === 0) return false;
    // Pilih kartu termahal yang masih terjangkau (paling berdampak).
    candidates.sort((a, b) => b.value - a.value || b.cost - a.cost);
    const card = candidates[0];
    plays.push(card.uid);
    energy -= card.cost;
    return true;
  };

  // Mainkan 1-2 kartu sesuai niat.
  takeOne(intent);
  if (intent === 'attack') takeOne('attack');
  if (intent === 'build' && ai.hp < 24) takeOne('build');
  if (intent === 'shield') takeOne('shield');

  // Isi sisa energi dengan kartu murah apa pun (peluang 60% per kartu).
  const leftovers = hand
    .filter((card) => !plays.includes(card.uid) && card.cost <= energy)
    .sort((a, b) => b.value - a.value);
  for (const card of leftovers) {
    if (card.cost > energy) continue;
    // AI tidak membuang Jebakan sia-sia kalau sudah punya jebakan aktif.
    if (card.type === 'trap' && ai.trap > 0) continue;
    // AI tidak membangun kalau HP sudah penuh.
    if (card.type === 'build' && ai.hp >= ai.maxHp) continue;
    if (Math.random() < 0.6) {
      plays.push(card.uid);
      energy -= card.cost;
    }
  }
  return plays;
}
