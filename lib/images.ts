// Generic sports photos from Unsplash (free Unsplash License). Swap for Esade Sports' own photos when available.
const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const HERO_IMAGE = u("photo-1721924885411-a65796c8af48"); // team huddle on a football pitch

// Placeholder in the Esade Sports colours (navy, blue slanted plate, ES monogram) for a sport without a photo yet.
const BRAND_PLATE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><rect width="1600" height="1000" fill="#000B3D"/><path d="M0 1000 L1600 1000 L1600 760 L260 1000 Z" fill="#0308A0"/><g transform="translate(640 330) scale(5) skewX(-12)" fill="none" stroke-linejoin="miter" stroke-linecap="square"><path d="M30 12 H14 V40 H30 M14 26 H27" stroke="#FFFFFF" stroke-width="6"/><path d="M52 12 H38 V26 H50 V40 H36" stroke="#FFFFFF" stroke-width="8"/><path d="M52 12 H38 V26 H50 V40 H36" stroke="#000B3D" stroke-width="3"/></g></svg>',
  );

export const SPORT_IMAGES: Record<string, string> = {
  "Football 7": u("photo-1630420598913-44208d36f9af"),
  Futsal: u("photo-1763775594018-4a84eeadd83d"),
  Basketball: u("photo-1713427508624-48731fbe2461"),
  Volleyball: u("photo-1547347298-4074fc3086f0"),
  Padel: u("photo-1657704358775-ed705c7388d2"),
  Rugby: u("photo-1485426337939-af69cf101909"), // Quino Al
  Tennis: u("photo-1761156896753-f68418033fb9"), // Naveen Ketterer
  Cheerleading: BRAND_PLATE, // no photo yet: Esade Sports plate until the team sends one
};
