/* eslint-disable */
// All Esade Sports community events: home Events cards, the "All events" page and the full calendar.
// price is required on every event: "Free", or the amount / donation (e.g. "Minimum donation €3").
// example: true = placeholder, shown with an "Example" tag until the real details are confirmed.
export const EVENTS = [
  {
    id: "off-track-5k", title: "Off Track", kind: "Charity run · 5K", organiser: "IPEA × BCN Globals",
    date: "2026-11-14", time: "12:00", place: "Time Out Market Barcelona (run along Barceloneta Beach)",
    price: "Minimum donation €3", priceNote: "Give as much as you like.",
    tagline: "The run's on you. The afterparty's on us.",
    summary: "A 5K charity run along Barceloneta Beach to raise funds for Esperança Walk.",
    details: "Esperança Walk is a volunteer initiative that prepares and distributes meals to people experiencing homelessness in Barcelona. Every euro raised helps provide more meals. Run it, jog it or walk it: all levels are welcome, so bring your friends.",
    signup: "https://forms.gle/XHEv7HkK4a9jgkLv8", example: false,
  },
  {
    id: "world-cup", title: "World Cup", kind: "Football tournament", organiser: "Esade Sports",
    date: "2027-02-06", time: "10:00", place: "UniBall Elite · Barcelona", price: "Free",
    summary: "A football tournament open to all Esade students.", details: "Format and sign-ups to be confirmed.", example: true,
  },
  {
    id: "padel-tour", title: "Padel Tour", kind: "Padel tournament", organiser: "Esade Sports",
    date: "2027-02-20", time: "12:00", place: "Vall d'Hebron Sports Centre", price: "Free",
    summary: "A padel tournament open to all levels.", details: "Format and sign-ups to be confirmed.", example: true,
  },
  {
    id: "talks-panels", title: "Talks & panels", kind: "Sports business talk", organiser: "Esade Sports",
    date: "2027-03-04", time: "18:30", place: "Esade campus (room to be confirmed)", price: "Free",
    summary: "A talk, panel or workshop with people from the sports industry.", details: "Speaker to be confirmed.", example: true,
  },
];
