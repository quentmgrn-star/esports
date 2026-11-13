// Seed data for Convex, generated from the original prototype (index.html).
// dataStatus "real" / isExample false = taken from the league sites (UniBall, css.cat) on 12/11/2026.
// Everything marked example/isExample is placeholder content to be replaced by the captains: do not present it as real.
// Alumni contact details (emails, phones) are deliberately not seeded.

type Stats = Record<string, number>;
type SeedTeam = { slug: string; sport: string; name: string; squad: string; league?: string; club?: string; captain?: string; coach?: string; tryout?: string; source?: string; updated?: string; note?: string; dataStatus: string };
type SeedPlayer = { team: string; name: string; number?: number; position?: string; programme?: string; isCaptain: boolean; stats: Stats; isExample: boolean };
type SeedMatch = { team: string; date: string; time?: string; home: string; away: string; homeScore?: number; awayScore?: number; resultText?: string; venue: string; round?: string; isExample: boolean };
type SeedStanding = { team: string; columns: string[]; rows: { team: string; values: number[] }[]; note?: string; source: string; updated: string };
type SeedAlumnus = { firstName: string; lastName: string; nationality?: string; programme: string; gradYear: number; sports: string[]; exchange?: string; internship?: string; linkedin?: string; isExample: boolean };

export const SEASON = { label: "2026-27", isCurrent: true };
export const SPORTS = [
  {
    "slug": "football-7",
    "name": "Football 7"
  },
  {
    "slug": "futsal",
    "name": "Futsal"
  },
  {
    "slug": "basketball",
    "name": "Basketball"
  },
  {
    "slug": "volleyball",
    "name": "Volleyball"
  },
  {
    "slug": "padel",
    "name": "Padel"
  },
  {
    "slug": "rugby",
    "name": "Rugby"
  },
  {
    "slug": "tennis",
    "name": "Tennis"
  }
];
export const TEAMS: SeedTeam[] = [
  {
    "slug": "football7-men",
    "sport": "football-7",
    "name": "Football 7",
    "squad": "Men",
    "league": "UniBall Championship (Men's F7) · Elite",
    "club": "Esade FC",
    "captain": "Mika",
    "source": "UniBall (apuntamelo.com)",
    "updated": "12/11/2026",
    "dataStatus": "real",
    "note": "Only the league's top-3 rankings were in the saved page: Salva Lamas is 3rd for assists. Full player stats and matchday 1–7 results come next."
  },
  {
    "slug": "futsal-men",
    "sport": "futsal",
    "name": "Futsal",
    "squad": "Men",
    "league": "Catalunya University Futsal League · Division 1",
    "club": "Esade Futsal Men",
    "captain": "Leo Costa",
    "coach": "Pau Riera",
    "tryout": "Wednesday 18 Nov · 20:00 · Esade Pedralbes Campus",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype futsal data with sample goals, assists and discipline figures."
  },
  {
    "slug": "futsal-women",
    "sport": "futsal",
    "name": "Futsal",
    "squad": "Women",
    "league": "Catalunya University Futsal League · Women",
    "club": "Esade Futsal Women",
    "captain": "Clara Navarro",
    "coach": "Aina Soler",
    "tryout": "Thursday 19 Nov · 18:30 · Esade Pedralbes Campus",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype women's futsal data with fictional player names and sample match stats."
  },
  {
    "slug": "basketball-men",
    "sport": "basketball",
    "name": "Basketball",
    "squad": "Men",
    "league": "CSS · Bàsquet 1ª Lliga · 1ª Divisió",
    "club": "Esade Men's",
    "source": "css.cat",
    "updated": "12/11/2026",
    "dataStatus": "real",
    "note": "FT, 2P and 3P are shots made, from the league match sheets. The sheets don't list every basket: they add up to 187 of the team's 207 points."
  },
  {
    "slug": "basketball-women",
    "sport": "basketball",
    "name": "Basketball",
    "squad": "Women",
    "league": "Esade Student Basketball League · Women",
    "club": "Esade Basketball Women",
    "captain": "Inés Ferrer",
    "coach": "Marta Solé",
    "tryout": "Tuesday 17 Nov · 18:30 · Barcelona Sports Hub",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype women's basketball data with fictional box-score totals and player averages."
  },
  {
    "slug": "volleyball-men",
    "sport": "volleyball",
    "name": "Volleyball",
    "squad": "Men",
    "league": "Catalunya University Volleyball League · Men",
    "club": "Esade Volleyball Men",
    "captain": "Johan Andersson",
    "coach": "Marc Colom",
    "tryout": "Wednesday 18 Nov · 19:00 · Esade Pedralbes Campus",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype volleyball data with fictional rotation, attack and block statistics."
  },
  {
    "slug": "volleyball-women",
    "sport": "volleyball",
    "name": "Volleyball",
    "squad": "Women",
    "league": "Catalunya University Volleyball League · Women",
    "club": "Esade Volleyball Women",
    "captain": "Sophie Laurent",
    "coach": "Laura Esteve",
    "tryout": "Thursday 19 Nov · 19:00 · Esade Pedralbes Campus",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype women's volleyball data with fictional rotation, attack and block statistics."
  },
  {
    "slug": "volleyball-mixed",
    "sport": "volleyball",
    "name": "Volleyball",
    "squad": "Mixed",
    "league": "Esade Social Volleyball Cup · Mixed",
    "club": "Esade Volleyball Mixed",
    "captain": "Emma Johansson",
    "coach": "Johan Andersson",
    "tryout": "Wednesday 25 Nov · 19:00 · Esade Pedralbes Campus",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype mixed-volleyball data with fictional player names and sample tournament figures."
  },
  {
    "slug": "padel-men",
    "sport": "padel",
    "name": "Padel",
    "squad": "Men",
    "league": "Barcelona Student Padel Tour · Men",
    "club": "Esade Padel Men",
    "captain": "Javier Ruiz",
    "coach": "Sergi Blanch",
    "tryout": "Saturday 21 Nov · 11:00 · Vall d'Hebron Sports Centre",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype padel data with fictional pairings and sample match records."
  },
  {
    "slug": "padel-women",
    "sport": "padel",
    "name": "Padel",
    "squad": "Women",
    "league": "Barcelona Student Padel Tour · Women",
    "club": "Esade Padel Women",
    "captain": "Hannah Schmidt",
    "coach": "Marina Bosch",
    "tryout": "Saturday 21 Nov · 12:30 · Vall d'Hebron Sports Centre",
    "source": "Prototype match centre",
    "updated": "12/11/2026",
    "dataStatus": "example",
    "note": "Prototype women's padel data with fictional pairings and sample match records."
  },
  // Added 13/11/2026: one open squad per sport. Placeholder only: no league, captain, roster or results yet.
  {
    "slug": "rugby",
    "sport": "rugby",
    "name": "Rugby",
    "squad": "Open",
    "dataStatus": "example",
    "note": "New team. League, captain, roster and results to be added by the club."
  },
  {
    "slug": "tennis",
    "sport": "tennis",
    "name": "Tennis",
    "squad": "Open",
    "dataStatus": "example",
    "note": "New team. League, captain, roster and results to be added by the club."
  }
];
export const PLAYERS: SeedPlayer[] = [
  {
    "team": "football7-men",
    "name": "Mika",
    "isCaptain": true,
    "stats": {},
    "isExample": false
  },
  {
    "team": "football7-men",
    "name": "Salva Lamas",
    "number": 7,
    "isCaptain": false,
    "stats": {
      "Assists": 3
    },
    "isExample": false
  },
  {
    "team": "futsal-men",
    "name": "Leo Costa",
    "number": 1,
    "position": "Goalkeeper",
    "programme": "BBA · 4th year",
    "isCaptain": true,
    "stats": {
      "GP": 4,
      "Goals": 0,
      "Assists": 1,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Tomás Silva",
    "number": 9,
    "position": "Pivot",
    "programme": "BBA · 3rd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 7,
      "Assists": 2,
      "Yellow": 1,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Rafael Costa",
    "number": 5,
    "position": "Winger",
    "programme": "MSc Marketing · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 3,
      "Assists": 4,
      "Yellow": 1,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Nicolás Ferrer",
    "number": 8,
    "position": "Defender",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 1,
      "Assists": 2,
      "Yellow": 2,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Ethan Moore",
    "number": 11,
    "position": "Winger",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Goals": 2,
      "Assists": 1,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Bilal El Amrani",
    "number": 4,
    "position": "Defender",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 0,
      "Assists": 1,
      "Yellow": 1,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-men",
    "name": "Pablo Martín",
    "number": 12,
    "position": "Goalkeeper",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 2,
      "Goals": 0,
      "Assists": 0,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Clara Navarro",
    "number": 1,
    "position": "Goalkeeper",
    "programme": "BBA · 3rd year",
    "isCaptain": true,
    "stats": {
      "GP": 4,
      "Goals": 0,
      "Assists": 2,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Marta Pons",
    "number": 7,
    "position": "Pivot",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 6,
      "Assists": 3,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Amira Diallo",
    "number": 10,
    "position": "Winger",
    "programme": "MSc Finance · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 4,
      "Assists": 4,
      "Yellow": 1,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Julia Kim",
    "number": 4,
    "position": "Defender",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Goals": 1,
      "Assists": 1,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Nerea Gómez",
    "number": 8,
    "position": "Winger",
    "programme": "BBA · 4th year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 2,
      "Assists": 2,
      "Yellow": 1,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Isabel Costa",
    "number": 5,
    "position": "Defender",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Goals": 0,
      "Assists": 1,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "futsal-women",
    "name": "Aya Nakamura",
    "number": 12,
    "position": "Goalkeeper",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 2,
      "Goals": 0,
      "Assists": 0,
      "Yellow": 0,
      "Red": 0
    },
    "isExample": true
  },
  {
    "team": "basketball-men",
    "name": "Quentin Maigron",
    "number": 5,
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "PTS": 32,
      "PPG": 10.7,
      "FT": 1,
      "2P": 11,
      "3P": 3
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Diego Weis",
    "number": 11,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 28,
      "PPG": 7,
      "FT": 1,
      "2P": 12,
      "3P": 1
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Natan Miguel Viejo Evrard",
    "number": 1,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 27,
      "PPG": 6.8,
      "FT": 3,
      "2P": 9,
      "3P": 2
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Robin Basdevant",
    "number": 3,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 27,
      "PPG": 6.8,
      "FT": 2,
      "2P": 11,
      "3P": 1
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Federico Polese",
    "number": 1,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 18,
      "PPG": 4.5,
      "FT": 0,
      "2P": 9,
      "3P": 0
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Unai Gillet",
    "number": 6,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 18,
      "PPG": 4.5,
      "FT": 0,
      "2P": 6,
      "3P": 2
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Arsenii Kolobov",
    "number": 28,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 16,
      "PPG": 4,
      "FT": 0,
      "2P": 5,
      "3P": 2
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Viktor Velimir",
    "number": 12,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 11,
      "PPG": 2.8,
      "FT": 0,
      "2P": 4,
      "3P": 1
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Marc Oriol Serra Francès",
    "number": 24,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 8,
      "PPG": 2,
      "FT": 0,
      "2P": 4,
      "3P": 0
    },
    "isExample": false
  },
  {
    "team": "basketball-men",
    "name": "Jan Halbach",
    "number": 8,
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 2,
      "PPG": 0.5,
      "FT": 0,
      "2P": 1,
      "3P": 0
    },
    "isExample": false
  },
  {
    "team": "basketball-women",
    "name": "Inés Ferrer",
    "number": 8,
    "position": "Point guard",
    "programme": "BBA · 3rd year",
    "isCaptain": true,
    "stats": {
      "GP": 4,
      "PTS": 61,
      "REB": 18,
      "AST": 24,
      "STL": 11,
      "PPG": 15.3
    },
    "isExample": true
  },
  {
    "team": "basketball-women",
    "name": "Valentina Rossi",
    "number": 14,
    "position": "Shooting guard",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 54,
      "REB": 20,
      "AST": 12,
      "STL": 8,
      "PPG": 13.5
    },
    "isExample": true
  },
  {
    "team": "basketball-women",
    "name": "Maya Johnson",
    "number": 22,
    "position": "Small forward",
    "programme": "MSc Marketing · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 48,
      "REB": 33,
      "AST": 9,
      "STL": 6,
      "PPG": 12
    },
    "isExample": true
  },
  {
    "team": "basketball-women",
    "name": "Carla Puig",
    "number": 5,
    "position": "Power forward",
    "programme": "BBA · 4th year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "PTS": 36,
      "REB": 41,
      "AST": 5,
      "STL": 3,
      "PPG": 9
    },
    "isExample": true
  },
  {
    "team": "basketball-women",
    "name": "Sofia Mendes",
    "number": 30,
    "position": "Centre",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "PTS": 27,
      "REB": 36,
      "AST": 3,
      "STL": 2,
      "PPG": 9
    },
    "isExample": true
  },
  {
    "team": "basketball-women",
    "name": "Noa Benet",
    "number": 2,
    "position": "Guard",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "PTS": 19,
      "REB": 8,
      "AST": 10,
      "STL": 5,
      "PPG": 6.3
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Johan Andersson",
    "number": 6,
    "position": "Setter",
    "programme": "BBA · 4th year",
    "isCaptain": true,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 21,
      "Aces": 7,
      "Blocks": 5
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Pau Vidal",
    "number": 11,
    "position": "Outside hitter",
    "programme": "BBA · 3rd year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 74,
      "Aces": 9,
      "Blocks": 8
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Arjun Mehta",
    "number": 9,
    "position": "Opposite",
    "programme": "MSc Finance · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Sets": 15,
      "Points": 62,
      "Aces": 6,
      "Blocks": 11
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Matteo Rinaldi",
    "number": 3,
    "position": "Middle blocker",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 46,
      "Aces": 2,
      "Blocks": 16
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Karim El Idrissi",
    "number": 14,
    "position": "Libero",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 4,
      "Aces": 0,
      "Blocks": 0
    },
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "name": "Guillem Serra",
    "number": 2,
    "position": "Middle blocker",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Sets": 9,
      "Points": 25,
      "Aces": 1,
      "Blocks": 7
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Sophie Laurent",
    "number": 4,
    "position": "Setter",
    "programme": "BBA + Law · 3rd year",
    "isCaptain": true,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 19,
      "Aces": 8,
      "Blocks": 6
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Emma Johansson",
    "number": 12,
    "position": "Outside hitter",
    "programme": "BBA · 4th year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 81,
      "Aces": 12,
      "Blocks": 7
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Chloé Martin",
    "number": 8,
    "position": "Opposite",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 70,
      "Aces": 10,
      "Blocks": 13
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Nadia El Masri",
    "number": 1,
    "position": "Libero",
    "programme": "MSc Marketing · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 5,
      "Sets": 18,
      "Points": 3,
      "Aces": 0,
      "Blocks": 0
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Laura Kim",
    "number": 7,
    "position": "Middle blocker",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Sets": 14,
      "Points": 43,
      "Aces": 4,
      "Blocks": 18
    },
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "name": "Bea Ruiz",
    "number": 15,
    "position": "Outside hitter",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Sets": 10,
      "Points": 29,
      "Aces": 3,
      "Blocks": 4
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Emma Johansson",
    "number": 12,
    "position": "Outside hitter",
    "programme": "BBA · 4th year",
    "isCaptain": true,
    "stats": {
      "GP": 4,
      "Sets": 12,
      "Points": 34,
      "Aces": 6,
      "Blocks": 4
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Johan Andersson",
    "number": 6,
    "position": "Setter",
    "programme": "BBA · 4th year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Sets": 12,
      "Points": 14,
      "Aces": 4,
      "Blocks": 3
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Maya Johnson",
    "number": 22,
    "position": "Opposite",
    "programme": "MSc Marketing · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Sets": 12,
      "Points": 28,
      "Aces": 5,
      "Blocks": 7
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Nora Schmidt",
    "number": 3,
    "position": "Libero",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "GP": 4,
      "Sets": 12,
      "Points": 2,
      "Aces": 0,
      "Blocks": 0
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Guillem Serra",
    "number": 2,
    "position": "Middle blocker",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Sets": 9,
      "Points": 18,
      "Aces": 2,
      "Blocks": 6
    },
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "name": "Aina Soler",
    "number": 10,
    "position": "Outside hitter",
    "programme": "BBA · 3rd year",
    "isCaptain": false,
    "stats": {
      "GP": 3,
      "Sets": 9,
      "Points": 22,
      "Aces": 3,
      "Blocks": 2
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "Javier Ruiz",
    "number": 1,
    "position": "Right side",
    "programme": "BBA · 3rd year",
    "isCaptain": true,
    "stats": {
      "Matches": 9,
      "Won": 7,
      "Lost": 2,
      "Sets won": 15
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "Álex Navarro",
    "number": 2,
    "position": "Left side",
    "programme": "BBA · 4th year",
    "isCaptain": false,
    "stats": {
      "Matches": 8,
      "Won": 6,
      "Lost": 2,
      "Sets won": 13
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "Bruno Costa",
    "number": 3,
    "position": "Right side",
    "programme": "MSc Finance · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 7,
      "Won": 4,
      "Lost": 3,
      "Sets won": 10
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "David Lee",
    "number": 4,
    "position": "Left side",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 6,
      "Won": 4,
      "Lost": 2,
      "Sets won": 9
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "Pau Martín",
    "number": 5,
    "position": "Right side",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "Matches": 5,
      "Won": 3,
      "Lost": 2,
      "Sets won": 7
    },
    "isExample": true
  },
  {
    "team": "padel-men",
    "name": "Nico Vidal",
    "number": 6,
    "position": "Left side",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 4,
      "Won": 2,
      "Lost": 2,
      "Sets won": 5
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Hannah Schmidt",
    "number": 1,
    "position": "Right side",
    "programme": "BBA · 4th year",
    "isCaptain": true,
    "stats": {
      "Matches": 9,
      "Won": 8,
      "Lost": 1,
      "Sets won": 17
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Chloé Martin",
    "number": 2,
    "position": "Left side",
    "programme": "BBA · 2nd year",
    "isCaptain": false,
    "stats": {
      "Matches": 9,
      "Won": 8,
      "Lost": 1,
      "Sets won": 16
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Mina García",
    "number": 3,
    "position": "Right side",
    "programme": "MSc Marketing · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 7,
      "Won": 5,
      "Lost": 2,
      "Sets won": 11
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Léa Dubois",
    "number": 4,
    "position": "Left side",
    "programme": "BBA · 3rd year",
    "isCaptain": false,
    "stats": {
      "Matches": 7,
      "Won": 4,
      "Lost": 3,
      "Sets won": 10
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Ariadna Puig",
    "number": 5,
    "position": "Right side",
    "programme": "BBA · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 5,
      "Won": 3,
      "Lost": 2,
      "Sets won": 7
    },
    "isExample": true
  },
  {
    "team": "padel-women",
    "name": "Sara Costa",
    "number": 6,
    "position": "Left side",
    "programme": "MIM · 1st year",
    "isCaptain": false,
    "stats": {
      "Matches": 4,
      "Won": 2,
      "Lost": 2,
      "Sets won": 5
    },
    "isExample": true
  }
];
export const MATCHES: SeedMatch[] = [
  {
    "team": "football7-men",
    "date": "14/11/2026",
    "time": "17:00",
    "home": "EUBS",
    "away": "Esade FC",
    "venue": "Field A",
    "round": "Matchday 8",
    "isExample": false
  },
  {
    "team": "futsal-men",
    "date": "19 Nov",
    "home": "Esade",
    "away": "IQS Futsal",
    "resultText": "20:30",
    "venue": "Court 1 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "futsal-men",
    "date": "12 Nov",
    "home": "La Salle Futsal",
    "away": "Esade",
    "resultText": "L 2–4",
    "venue": "Court 2 · La Salle BCN",
    "isExample": true
  },
  {
    "team": "futsal-men",
    "date": "05 Nov",
    "home": "Esade",
    "away": "UAB Futsal",
    "resultText": "W 5–2",
    "venue": "Court 1 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "futsal-men",
    "date": "29 Oct",
    "home": "ESADE Business School",
    "away": "Esade",
    "resultText": "W 4–1",
    "venue": "Court 1 · ESADE Campus",
    "isExample": true
  },
  {
    "team": "futsal-women",
    "date": "21 Nov",
    "home": "Esade",
    "away": "Blanquerna FS",
    "resultText": "16:00",
    "venue": "Court 3 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "futsal-women",
    "date": "14 Nov",
    "home": "UIC Futsal",
    "away": "Esade",
    "resultText": "W 3–1",
    "venue": "Court 1 · UIC Barcelona",
    "isExample": true
  },
  {
    "team": "futsal-women",
    "date": "07 Nov",
    "home": "Esade",
    "away": "Sant Cugat FC",
    "resultText": "W 4–2",
    "venue": "Court 3 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "futsal-women",
    "date": "31 Oct",
    "home": "La Salle Women",
    "away": "Esade",
    "resultText": "D 2–2",
    "venue": "Court 2 · La Salle BCN",
    "isExample": true
  },
  {
    "team": "basketball-men",
    "date": "20/10/2026",
    "time": "21:00",
    "home": "Las amigas de Tomás",
    "away": "Esade Men's",
    "homeScore": 26,
    "awayScore": 60,
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 4",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "27/10/2026",
    "time": "21:00",
    "home": "SANTS TENTACIO",
    "away": "Esade Men's",
    "homeScore": 23,
    "awayScore": 32,
    "venue": "Jesús y Maria · Bàsquet Poli 2",
    "round": "Round 2",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "03/11/2026",
    "time": "21:00",
    "home": "PICK&RON",
    "away": "Esade Men's",
    "homeScore": 61,
    "awayScore": 59,
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 3",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "10/11/2026",
    "time": "22:00",
    "home": "Esade Men's",
    "away": "TOP",
    "homeScore": 56,
    "awayScore": 37,
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 1",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "17/11/2026",
    "time": "21:00",
    "home": "Esade Men's",
    "away": "FE NATURAL",
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 5",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "24/11/2026",
    "time": "21:00",
    "home": "TOP",
    "away": "Esade Men's",
    "venue": "Jesús y Maria · Bàsquet Poli 2",
    "round": "Round 6",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "01/12/2026",
    "time": "21:00",
    "home": "Esade Men's",
    "away": "SANTS TENTACIO",
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 7",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "15/12/2026",
    "time": "21:00",
    "home": "Esade Men's",
    "away": "PICK&RON",
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 8",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "12/01/2027",
    "time": "22:00",
    "home": "FE NATURAL",
    "away": "Esade Men's",
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 10",
    "isExample": false
  },
  {
    "team": "basketball-men",
    "date": "19/01/2027",
    "time": "22:00",
    "home": "Esade Men's",
    "away": "Las amigas de Tomás",
    "venue": "Thau Pedralbes · Voley - Baloncesto P2",
    "round": "Round 9",
    "isExample": false
  },
  {
    "team": "basketball-women",
    "date": "21 Nov",
    "home": "Esade",
    "away": "GBSB Global",
    "resultText": "12:00",
    "venue": "Court 2 · Barcelona Sports Hub",
    "isExample": true
  },
  {
    "team": "basketball-women",
    "date": "14 Nov",
    "home": "IQS Hoops",
    "away": "Esade",
    "resultText": "W 68–55",
    "venue": "Court 2 · IQS Campus",
    "isExample": true
  },
  {
    "team": "basketball-women",
    "date": "07 Nov",
    "home": "Esade",
    "away": "UAB Women",
    "resultText": "W 74–60",
    "venue": "Court 2 · Barcelona Sports Hub",
    "isExample": true
  },
  {
    "team": "basketball-women",
    "date": "31 Oct",
    "home": "ESADE Business School",
    "away": "Esade",
    "resultText": "L 59–64",
    "venue": "Court 1 · ESADE Campus",
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "date": "22 Nov",
    "home": "Esade",
    "away": "TBS United",
    "resultText": "11:00",
    "venue": "Court 1 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "date": "15 Nov",
    "home": "UAB Volleyball",
    "away": "Esade",
    "resultText": "W 3–1",
    "venue": "Court 1 · UAB Campus",
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "date": "08 Nov",
    "home": "Esade",
    "away": "IQS Volley",
    "resultText": "L 1–3",
    "venue": "Court 1 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-men",
    "date": "01 Nov",
    "home": "La Salle",
    "away": "Esade",
    "resultText": "W 3–0",
    "venue": "Court 2 · La Salle BCN",
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "date": "21 Nov",
    "home": "Esade",
    "away": "Blanquerna VB",
    "resultText": "10:00",
    "venue": "Court 2 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "date": "14 Nov",
    "home": "UIC Women",
    "away": "Esade",
    "resultText": "W 3–2",
    "venue": "Court 1 · UIC Barcelona",
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "date": "07 Nov",
    "home": "Esade",
    "away": "IQS Volley Women",
    "resultText": "W 3–0",
    "venue": "Court 2 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-women",
    "date": "31 Oct",
    "home": "La Salle Women",
    "away": "Esade",
    "resultText": "W 3–1",
    "venue": "Court 2 · La Salle BCN",
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "date": "25 Nov",
    "home": "Esade",
    "away": "IESE Mix",
    "resultText": "19:30",
    "venue": "Court 3 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "date": "18 Nov",
    "home": "ESADE Alumni Mix",
    "away": "Esade",
    "resultText": "W 2–1",
    "venue": "Court 2 · ESADE Campus",
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "date": "11 Nov",
    "home": "Esade",
    "away": "EADA Mix",
    "resultText": "L 1–2",
    "venue": "Court 3 · Esade Pedralbes Campus",
    "isExample": true
  },
  {
    "team": "volleyball-mixed",
    "date": "04 Nov",
    "home": "IESE Mix",
    "away": "Esade",
    "resultText": "W 2–0",
    "venue": "Court 1 · IESE Campus",
    "isExample": true
  },
  {
    "team": "padel-men",
    "date": "28 Nov",
    "home": "Esade",
    "away": "IESE Padel",
    "resultText": "15:00",
    "venue": "Padel Court 2 · Vall d'Hebron Sports Centre",
    "isExample": true
  },
  {
    "team": "padel-men",
    "date": "14 Nov",
    "home": "EADA Padel",
    "away": "Esade",
    "resultText": "W 6–4, 6–3",
    "venue": "Court 5 · EADA Campus",
    "isExample": true
  },
  {
    "team": "padel-men",
    "date": "31 Oct",
    "home": "Esade",
    "away": "IQS Padel",
    "resultText": "W 6–2, 4–6, 6–3",
    "venue": "Padel Court 2 · Vall d'Hebron Sports Centre",
    "isExample": true
  },
  {
    "team": "padel-men",
    "date": "17 Oct",
    "home": "UAB Padel",
    "away": "Esade",
    "resultText": "L 3–6, 6–4, 4–6",
    "venue": "Court 1 · UAB Campus",
    "isExample": true
  },
  {
    "team": "padel-women",
    "date": "25 Nov",
    "home": "Esade",
    "away": "EU Business School",
    "resultText": "18:30",
    "venue": "Padel Court 4 · Vall d'Hebron Sports Centre",
    "isExample": true
  },
  {
    "team": "padel-women",
    "date": "14 Nov",
    "home": "IESE Padel Women",
    "away": "Esade",
    "resultText": "W 6–1, 6–2",
    "venue": "Court 3 · IESE Campus",
    "isExample": true
  },
  {
    "team": "padel-women",
    "date": "01 Nov",
    "home": "Esade",
    "away": "ESADE Alumni Padel",
    "resultText": "W 6–4, 6–4",
    "venue": "Padel Court 4 · Vall d'Hebron Sports Centre",
    "isExample": true
  },
  {
    "team": "padel-women",
    "date": "18 Oct",
    "home": "UAB Padel Women",
    "away": "Esade",
    "resultText": "W 6–3, 3–6, 6–2",
    "venue": "Court 2 · UAB Campus",
    "isExample": true
  }
];
export const STANDINGS: SeedStanding[] = [
  {
    "team": "football7-men",
    "columns": [
      "Pts",
      "Played",
      "GD"
    ],
    "rows": [
      {
        "team": "Esade FC",
        "values": [
          18,
          7,
          20
        ]
      },
      {
        "team": "EUBS",
        "values": [
          15,
          7,
          12
        ]
      },
      {
        "team": "Sporting TBS FC",
        "values": [
          13,
          7,
          13
        ]
      },
      {
        "team": "TBS United FC",
        "values": [
          13,
          7,
          12
        ]
      },
      {
        "team": "GBSB Global",
        "values": [
          12,
          6,
          13
        ]
      },
      {
        "team": "Brasa FC",
        "values": [
          10,
          7,
          -4
        ]
      },
      {
        "team": "Borrachia Dortmund",
        "values": [
          10,
          6,
          -9
        ]
      },
      {
        "team": "C10 FC",
        "values": [
          3,
          7,
          -12
        ]
      },
      {
        "team": "Geneva BS",
        "values": [
          3,
          7,
          -16
        ]
      },
      {
        "team": "Barcelona College of Chiropractic",
        "values": [
          3,
          7,
          -29
        ]
      }
    ],
    "source": "UniBall (apuntamelo.com)",
    "updated": "12/11/2026"
  },
  {
    "team": "basketball-men",
    "columns": [
      "Played",
      "W",
      "L",
      "PF",
      "PA",
      "Diff"
    ],
    "rows": [
      {
        "team": "Esade Men's",
        "values": [
          4,
          3,
          1,
          207,
          147,
          60
        ]
      },
      {
        "team": "TOP",
        "values": [
          4,
          3,
          1,
          220,
          202,
          18
        ]
      },
      {
        "team": "PICK&RON",
        "values": [
          4,
          3,
          1,
          240,
          235,
          5
        ]
      },
      {
        "team": "SANTS TENTACIO",
        "values": [
          4,
          2,
          2,
          172,
          160,
          12
        ]
      },
      {
        "team": "FE NATURAL",
        "values": [
          5,
          2,
          3,
          220,
          236,
          -16
        ]
      },
      {
        "team": "Las amigas de Tomás",
        "values": [
          5,
          0,
          5,
          174,
          253,
          -79
        ]
      }
    ],
    "note": "Calculated from every result on the league page. The league's official table may break ties differently.",
    "source": "css.cat",
    "updated": "12/11/2026"
  }
];
export const ALUMNI: SeedAlumnus[] = [
  {
    "firstName": "Lucía",
    "lastName": "Ferrer",
    "nationality": "Spanish",
    "programme": "BBA",
    "gradYear": 2023,
    "sports": [
      "Football 7"
    ],
    "exchange": "University of Michigan · Ann Arbor, USA",
    "internship": "Partnerships intern · Football club",
    "linkedin": "linkedin.com/in/example-lucia",
    "isExample": true
  },
  {
    "firstName": "Marco",
    "lastName": "Bianchi",
    "nationality": "Italian",
    "programme": "BBA",
    "gradYear": 2022,
    "sports": [
      "Basketball"
    ],
    "exchange": "National University of Singapore · Singapore",
    "internship": "Business analyst intern · Sports data start-up",
    "linkedin": "linkedin.com/in/example-marco",
    "isExample": true
  },
  {
    "firstName": "Sophie",
    "lastName": "Laurent",
    "nationality": "French",
    "programme": "Double degree BBA + Law",
    "gradYear": 2024,
    "sports": [
      "Volleyball"
    ],
    "exchange": "McGill University · Montréal, Canada",
    "internship": "Legal intern · Sports law firm",
    "isExample": true
  },
  {
    "firstName": "Daniel",
    "lastName": "Okafor",
    "nationality": "Nigerian",
    "programme": "BBA",
    "gradYear": 2021,
    "sports": [
      "Football 7",
      "Futsal"
    ],
    "exchange": "Copenhagen Business School · Copenhagen, Denmark",
    "internship": "Brand intern · Sportswear brand",
    "linkedin": "linkedin.com/in/example-daniel",
    "isExample": true
  },
  {
    "firstName": "Hannah",
    "lastName": "Schmidt",
    "nationality": "German",
    "programme": "BBA",
    "gradYear": 2025,
    "sports": [
      "Padel"
    ],
    "exchange": "University of Sydney · Sydney, Australia",
    "internship": "Event operations intern · Tennis tournament organiser",
    "linkedin": "linkedin.com/in/example-hannah",
    "isExample": true
  },
  {
    "firstName": "Javier",
    "lastName": "Ruiz",
    "nationality": "Spanish",
    "programme": "BBA",
    "gradYear": 2020,
    "sports": [
      "Basketball"
    ],
    "exchange": "Bocconi University · Milan, Italy",
    "internship": "Summer analyst · Investment bank",
    "linkedin": "linkedin.com/in/example-javier",
    "isExample": true
  },
  {
    "firstName": "Emma",
    "lastName": "Johansson",
    "nationality": "Swedish",
    "programme": "BBA",
    "gradYear": 2024,
    "sports": [
      "Volleyball"
    ],
    "exchange": "University of Texas at Austin · Austin, USA",
    "internship": "Content intern · Sports media company",
    "isExample": true
  },
  {
    "firstName": "Tomás",
    "lastName": "Silva",
    "nationality": "Portuguese",
    "programme": "BBA",
    "gradYear": 2023,
    "sports": [
      "Futsal"
    ],
    "exchange": "HEC Montréal · Montréal, Canada",
    "internship": "Commercial intern · Football league",
    "linkedin": "linkedin.com/in/example-tomas",
    "isExample": true
  },
  {
    "firstName": "Chloé",
    "lastName": "Martin",
    "nationality": "Belgian",
    "programme": "BBA",
    "gradYear": 2025,
    "sports": [
      "Padel",
      "Volleyball"
    ],
    "exchange": "Fudan University · Shanghai, China",
    "internship": "Account intern · Sports sponsorship agency",
    "linkedin": "linkedin.com/in/example-chloe",
    "isExample": true
  }
];
