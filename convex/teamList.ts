// Team list shared by Convex (contact routing, captains) and the admin area.
// Keep in sync with TEAMS in components/legacy/site.js (public site).
export const TEAMS: { id: string; sport: string; squad: string }[] = [
  { id: "football7-men", sport: "Football 7", squad: "Men" },
  { id: "futsal-men", sport: "Futsal", squad: "Men" },
  { id: "futsal-women", sport: "Futsal", squad: "Women" },
  { id: "basketball-men", sport: "Basketball", squad: "Men" },
  { id: "basketball-women", sport: "Basketball", squad: "Women" },
  { id: "volleyball-men", sport: "Volleyball", squad: "Men" },
  { id: "volleyball-women", sport: "Volleyball", squad: "Women" },
  { id: "volleyball-mixed", sport: "Volleyball", squad: "Mixed" },
  { id: "padel-men", sport: "Padel", squad: "Men" },
  { id: "padel-women", sport: "Padel", squad: "Women" },
  { id: "rugby", sport: "Rugby", squad: "Open" },
  { id: "tennis", sport: "Tennis", squad: "Open" },
];
export const teamLabel = (id: string) => {
  const t = TEAMS.find((x) => x.id === id);
  return t ? `${t.sport} · ${t.squad}` : id;
};
export const sportOfTeam = (id: string) => TEAMS.find((t) => t.id === id)?.sport;
