import { WelcomeUser } from './types';

export const CARD_SIZE = 120;
export const CARD_GAP = 16;
export const ITEM_SIZE = CARD_SIZE + CARD_GAP;
export const BASE_SPEED = 0.5;

const ROLES = [
  'Product Lead', 'Founder', 'Senior Engineer', 'UX Designer',
  'Angel Investor', 'Solutions Architect', 'Growth Marketer',
  'Full Stack Dev', 'Product Manager', 'CTO', 'Creative Director',
  'Data Scientist', 'Brand Strategist', 'Tech Lead'
];

const NAMES = [
  "Alex Rivera", "Jordan Lee", "Casey Smith", "Morgan Chen", "Taylor Kim",
  "Jamie Doe", "Riley Das", "Cameron White", "Quinn Brown", "Avery Davis",
  "Sarah Chen", "Michael Scott", "Jessica Davis", "David Miller", "Emily Wilson",
  "James Moore", "Olivia Taylor", "Daniel Anderson", "Sophia Thomas", "Matthew Jackson",
  "Isabella White", "Andrew Harris", "Mia Martin", "Joshua Thompson", "Charlotte Garcia",
  "Joseph Martinez", "Amelia Robinson", "William Clark", "Harper Rodriguez", "Alexander Lewis",
  "Evelyn Lee", "Ryan Walker", "Abigail Hall", "Jacob Allen", "Elizabeth Young",
  "Benjamin King", "Sofia Wright", "Jack Scott", "Avery Torres", "Luke Nguyen",
  "Chloe Hill", "Jayden Flores", "Ella Green", "Gabriel Adams", "Victoria Baker",
  "Isaac Nelson", "Grace Carter", "Anthony Mitchell", "Zoey Perez", "Dylan Roberts",
  "Penelope Turner", "Lincoln Phillips", "Riley Campbell", "Christopher Parker", "Nora Evans",
  "Caleb Edwards", "Lily Collins", "Nathan Stewart", "Hannah Sanchez", "Isaiah Morris"
];

/**
 * Clothing colors: mix of deep, mid, and brighter tones so outfits feel varied
 * (still mostly saturated so they read on a white card — avoid near-white shirt fills).
 * Use `#hex` so editors show color swatches; `dicebearHex()` strips `#` for the API.
 */
const CLOTHES_COLORS = [
  // Deep / classic
 '#283593', '#4527a0', '#6a1b9a', '#880e4f',
'#b71c1c', '#d32f2f', '#d84315', '#ef6c00',
'#2e7d32', '#1b5e20', '#00695c',
'#00838f', '#1565c0', '#01579b',
'#37474f', '#546e7a',
'#212121', '#1e3a5f',
'#5d1a1a', '#4e342e', '#5199e4'
] as const;

/** All Avataaars clothing types (DiceBear 7.x). */
const CLOTHING = [
  'blazerAndShirt',
  'blazerAndSweater',
  'collarAndSweater',
  'graphicShirt',
  'hoodie',
  'overall',
  'shirtCrewNeck',
  'shirtVNeck'
] as const;

/** Expanded hairstyles / headwear — strong silhouettes, good variety vs neighbors. */
const TOPS = [
  'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'dreads01',
  'fro', 'froBand', 'hat', 'longButNotTooLong', 'miaWallace', 'shaggyMullet', 'shavedSides',
  'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'straight01', 'straight02',
  'straightAndStrand', 'theCaesar', 'theCaesarAndSidePart', 'frizzle', 'shaggy'
] as const;

/**
 * Hair colors: black, brown, blonde, ginger/red, auburn, strawberry, grey — DiceBear hex palette + extras.
 */
const HAIR_COLORS = [
  // Black / near-black
  '212121', '2c1b18',
  // Dark / medium brown
  '3e2723', '4a312c', '5d4037', '724133', '4e342e',
  // Lighter brown / chestnut
  'a55728', 'b58143',
  // Blonde / honey / sandy
  'd6b370',
  // Ginger / red / auburn
  'c93305',
] as const;

const SKIN_COLORS = ['d08b5b', 'edb98a', 'ffdbb4'] as const;

const MOUTH_POOL = 'default,eating,smile,twinkle,tongue';
const EYES_POOL = 'default,side,wink,happy';
const EYEBROWS_POOL = 'default,defaultNatural,raisedExcited,raisedExcitedNatural,upDownNatural';
const ACCESSORIES_POOL = 'prescription01,prescription02,round';

/** Intentionally no facial hair — use probability 0 (do not send empty facialHair params). */
const FACIAL_HAIR_PROBABILITY = 0;

/** Used when `graphicShirt` is chosen (DiceBear 7.x). Facial hair stays off separately. */
const CLOTHING_GRAPHICS = '';

type OutfitSig = `${string}|${string}`;

function pick<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)] as T[number];
}

/** DiceBear expects hex without `#`; source literals may use `#` for editor color previews. */
function dicebearHex(hex: string): string {
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

function outfitSignature(clothing: string, clothesColor: string): OutfitSig {
  return `${clothing}|${clothesColor}`;
}

interface AvatarSlotOptions {
  seed: string;
  clothing: string;
  clothesColor: string;
  top: string;
  hairColor: string;
  skinColor: string;
}

function buildAvatarUrl(o: AvatarSlotOptions): string {
  const params = new URLSearchParams();
  params.append('seed', o.seed);
  params.append('clothing', o.clothing);
  params.append('clothesColor', dicebearHex(o.clothesColor));
  params.append('top', o.top);
  params.append('hairColor', o.hairColor);
  params.append('skinColor', o.skinColor);
  params.append('mouth', MOUTH_POOL);
  params.append('eyes', EYES_POOL);
  params.append('eyebrows', EYEBROWS_POOL);
  params.append('accessories', ACCESSORIES_POOL);
  params.append(
    'accessoriesColor',
    '262e33,3c4f5c,25557c,1a237e,37474f,212121,4a148c,880e4f,004d40,5d4037'
  );
  params.append('accessoriesProbability', '30');
  params.append('facialHairProbability', String(FACIAL_HAIR_PROBABILITY));
  params.append('clothingGraphic', CLOTHING_GRAPHICS);
  params.append(
    'hatColor',
    '262e33,37474f,212121,25557c,1b3039,004d40,33691e'
  );
  return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
}

/**
 * Build a row of users so adjacent cards never share:
 * - the same clothing type (`clothing`),
 * - the same clothing color (`clothesColor`),
 * - the same clothing + clothesColor outfit (redundant guard),
 * - or the same hairstyle (`top`)
 * (runs once at module load — no marquee cost).
 */
function generateDistinctNeighborRow(
  count: number,
  rowKey: string,
  nameOffset: number
): WelcomeUser[] {
  const users: WelcomeUser[] = [];
  let prevSig: OutfitSig | null = null;
  let prevTop: string | null = null;
  let prevClothesColor: string | null = null;
  let prevClothing: string | null = null;

  for (let i = 0; i < count; i++) {
    let clothing = pick(CLOTHING);
    let clothesColor = pick(CLOTHES_COLORS);
    let top = pick(TOPS);
    let attempts = 0;
    while (
      prevSig !== null &&
      prevTop !== null &&
      prevClothesColor !== null &&
      prevClothing !== null &&
      (outfitSignature(clothing, clothesColor) === prevSig ||
        top === prevTop ||
        clothesColor === prevClothesColor ||
        clothing === prevClothing) &&
      attempts < 300
    ) {
      clothing = pick(CLOTHING);
      clothesColor = pick(CLOTHES_COLORS);
      top = pick(TOPS);
      attempts++;
    }
    prevSig = outfitSignature(clothing, clothesColor);
    prevTop = top;
    prevClothesColor = clothesColor;
    prevClothing = clothing;

    const hairColor = pick(HAIR_COLORS);
    const skinColor = pick(SKIN_COLORS);
    const seed = `${rowKey}-${i}-${Math.random().toString(36).slice(2, 11)}`;

    users.push({
      id: `${rowKey}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: NAMES[(i + nameOffset) % NAMES.length],
      role: ROLES[(i + (rowKey === 'bottom' ? 3 : 0)) % ROLES.length],
      age: Math.floor(Math.random() * (45 - 22 + 1) + 22),
      image: buildAvatarUrl({ seed, clothing, clothesColor, top, hairColor, skinColor }),
      similarity: Math.floor(Math.random() * (99 - 75 + 1) + 66),
    });
  }

  return users;
}

export const INITIAL_COUNT = 30;

export const MOCK_USERS_TOP = generateDistinctNeighborRow(INITIAL_COUNT, 'top', 0);

export const MOCK_USERS_BOTTOM = generateDistinctNeighborRow(INITIAL_COUNT, 'bottom', 15);
