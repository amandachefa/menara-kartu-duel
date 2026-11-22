// deck.js — acak deterministik, bangun deck, ambil kartu, dan buang kartu.
// Satu tugas: semua urusan tumpukan kartu. Tidak ada logika giliran di sini.

// PRNG kecil deterministik (mulberry32) supaya ?shot=... selalu sama.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Acak array di tempat dengan rng yang diberikan.
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}

// Bangun deck baru dari definisi kartu: salinan + uid unik + acak.
export function buildDeck(definitions, makeCard, rng, ownerTag) {
  const deck = definitions.map((def, index) => makeCard(def, `${ownerTag}-${index}`));
  return shuffle(deck, rng);
}

// Ambil n kartu dari deck ke tangan; kalau deck habis, kocok ulang tumpukan buang.
export function drawCards(side, count) {
  for (let i = 0; i < count; i += 1) {
    if (side.hand.length >= 7) return; // tangan maksimal 7 kartu
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return; // benar-benar habis
      side.deck = shuffle(side.discard, side.rng);
      side.discard = [];
    }
    side.hand.push(side.deck.pop());
  }
}

// Buang satu kartu dari tangan ke tumpukan buang, kembalikan kartunya (atau null).
export function discardFromHand(side, uid) {
  const index = side.hand.findIndex((card) => card.uid === uid);
  if (index < 0) return null;
  const [card] = side.hand.splice(index, 1);
  side.discard.push(card);
  return card;
}
