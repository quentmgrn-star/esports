// Generic sports photos from Unsplash (free Unsplash License). Swap for Esade Sports' own photos when available.
const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const HERO_IMAGE = u("photo-1721924885411-a65796c8af48"); // team huddle on a football pitch

export const SPORT_IMAGES: Record<string, string> = {
  "Football 7": u("photo-1630420598913-44208d36f9af"),
  Futsal: u("photo-1763775594018-4a84eeadd83d"),
  Basketball: u("photo-1713427508624-48731fbe2461"),
  Volleyball: u("photo-1547347298-4074fc3086f0"),
  Padel: u("photo-1657704358775-ed705c7388d2"),
  Rugby: u("photo-1485426337939-af69cf101909"), // Quino Al
  Tennis: u("photo-1761156896753-f68418033fb9"), // Naveen Ketterer
};
