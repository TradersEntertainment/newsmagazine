/**
 * All player-facing copy lives here so another language can be added later.
 * Tone (§14.6): dry, measured, faintly official — a municipal clerk.
 * No exclamation marks, no emoji.
 */
const money = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat('tr-TR');

export const STR = {
  appName: 'Kadastro',

  format: {
    money: (value: number): string => `₺${money.format(Math.round(value))}`,
    count: (value: number): string => plain.format(Math.round(value)),
  },

  empty: {
    noRoads: 'Henüz yol yok. Bir hat çiz, gerisi kendiliğinden gelir.',
    noZones: 'Bölge boyanmamış. Yolun kenarını konuta ayır.',
  },

  tools: {
    road: 'yol',
    erase: 'sil',
    undo: 'geri al',
    roadSheetTitle: 'Yol tipi',
  },

  road: {
    path: 'Patika',
    stone: 'Taş yol',
    asphalt: 'Asfalt',
    boulevard: 'Bulvar',
    highway: 'Otoyol',
    metro: 'Metro hattı',
  },

  /** Locked entries always show what opens them (§1: no hidden locks). */
  lockedAt: (era: string): string => `${era} çağında açılır`,

  draft: {
    /** "₺2.340 · 26 kare" */
    cost: (amount: number, tiles: number): string =>
      `${money.format(Math.round(amount))} ₺ · ${plain.format(tiles)} kare`,
    truncated: 'para yetmiyor',
    erase: (tiles: number) => `${plain.format(tiles)} kare siliniyor`,
  },

  camera: {
    hint: 'İki parmakla haritayı gez, yaklaştır.',
    readout: (x: number, y: number, zoom: number): string =>
      `${x.toFixed(0)}, ${y.toFixed(0)} · ${zoom.toFixed(2)}×`,
  },

  terrain: {
    water: 'Su',
    marsh: 'Bataklık',
    plain: 'Ova',
    forest: 'Orman',
    hill: 'Tepe',
    rock: 'Kayalık',
  },

  era: {
    founding: 'Kuruluş',
    village: 'Köy',
    town: 'Kasaba',
    city: 'Şehir',
    metro: 'Büyükşehir',
    metropolis: 'Metropol',
    megacity: 'Megakent',
  },

  chronicle: {
    /** "8 sa 12 dk yoktun" */
    away: (hours: number, minutes: number): string =>
      hours === 0 ? `${minutes} dk yoktun` : `${hours} sa ${minutes} dk yoktun`,
    back: 'Şehre dön',
  },

  system: {
    offlineReady: 'Oyun çevrimdışı çalışmaya hazır.',
    saveCorrupt: 'Kayıt okunamadı. Temiz bir şehirle başlanabilir.',
    nothingToUndo: 'Geri alınacak bir şey yok.',
  },
} as const;
