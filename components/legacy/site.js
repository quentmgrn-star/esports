/* eslint-disable */
import { SPORT_IMAGES } from "@/lib/images";
// Ported from the original prototype script. Runs once on the client after the markup mounts.
export function initSite(backend) {

  "use strict";
  var EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var $ = function (id) { return document.getElementById(id); };
  var pub = $("public"), page = $("page"), hub = $("hub"), siteHead = $("top"), siteFoot = $("site-foot");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mono(w) { return '<svg class="mono" style="width:' + w + 'px" viewBox="0 0 132 72" aria-hidden="true"><use href="#es"/></svg>'; }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  var MATCH_DETAILS = {
    "football-7": { sport: "Football 7 · Men", teams: "EUBS vs Esade FC", date: "Saturday 14 November 2026", time: "17:00", location: "Field A", league: "UniBall Championship (Men's F7) · Elite · Matchday 8", status: "Upcoming · Away" },
    "basketball-women": { sport: "Basketball · Women", teams: "Esade vs GBSB Global", date: "Saturday 21 November 2026", time: "12:00", location: "Court 2, Barcelona Sports Hub", league: "Esade Student League · Women", status: "Upcoming · Home" },
    "volleyball-men": { sport: "Volleyball · Men", teams: "Esade vs TBS United", date: "Sunday 22 November 2026", time: "11:00", location: "Court 1, Esade Pedralbes Campus", league: "Catalunya University Volleyball League", status: "Upcoming · Home" },
    "padel-women": { sport: "Padel · Women", teams: "Esade vs EU Business School", date: "Wednesday 25 November 2026", time: "18:30", location: "Padel Court 4, Vall d’Hebron Sports Centre", league: "Barcelona Student Padel Tour", status: "Upcoming · Home" },
    "futsal-women-result": { sport: "Futsal · Women", teams: "Esade 4–2 Sant Cugat FC", date: "Saturday 7 November 2026", time: "16:00", location: "Court 3, Esade Pedralbes Campus", league: "Esade Student League · Women", status: "Final · Esade won 4–2" },
    "basketball-men": { sport: "Basketball · Men", teams: "Esade vs FE NATURAL", date: "Tuesday 17 November 2026", time: "21:00", location: "Thau Pedralbes · Voley - Baloncesto P2", league: "CSS · Bàsquet 1ª Lliga · 1ª Divisió (Round 5)", status: "Upcoming · Home" },
    "basketball-men-result": { sport: "Basketball · Men", teams: "Esade 56–37 TOP", date: "Tuesday 10 November 2026", time: "22:00", location: "Thau Pedralbes · Voley - Baloncesto P2", league: "CSS · Bàsquet 1ª Lliga · 1ª Divisió (Round 1)", status: "Final · Esade won 56–37" },
    "volleyball-women-result": { sport: "Volleyball · Women", teams: "Esade 2–1 ESADE Business School", date: "Wednesday 4 November 2026", time: "19:00", location: "Court 2, Esade Pedralbes Campus", league: "Catalunya University Volleyball League", status: "Final · Esade won 2–1" }
  };

  function openMatch(id) {
    var m = MATCH_DETAILS[id], modal = $("match-modal");
    if (!m || !modal) return;
    $("match-modal-sport").textContent = m.sport;
    $("match-modal-title").textContent = m.teams;
    $("match-modal-meta").textContent = m.date + " · " + m.time;
    $("match-modal-location").textContent = m.location;
    $("match-modal-league").textContent = m.league;
    $("match-modal-status").textContent = m.status;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeMatch() {
    var modal = $("match-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  // ================= Teams =================
  var TEAMS = [
    { id: "football7-men", name: "Football 7", squad: "Men", sport: "Football 7", budget: 4200, status: "agreed" },
    { id: "futsal-men", name: "Futsal", squad: "Men", sport: "Futsal", budget: 3400, status: "agreed" },
    { id: "futsal-women", name: "Futsal", squad: "Women", sport: "Futsal", budget: 3200, status: "agreed" },
    { id: "basketball-men", name: "Basketball", squad: "Men", sport: "Basketball", budget: 3400, status: "agreed" },
    { id: "basketball-women", name: "Basketball", squad: "Women", sport: "Basketball", budget: 3000, status: "review" },
    { id: "volleyball-men", name: "Volleyball", squad: "Men", sport: "Volleyball", budget: 2600, status: "agreed" },
    { id: "volleyball-women", name: "Volleyball", squad: "Women", sport: "Volleyball", budget: 2600, status: "agreed" },
    { id: "volleyball-mixed", name: "Volleyball", squad: "Mixed", sport: "Volleyball", budget: 2200, status: "draft" },
    { id: "padel-men", name: "Padel", squad: "Men", sport: "Padel", budget: 2000, status: "agreed" },
    { id: "padel-women", name: "Padel", squad: "Women", sport: "Padel", budget: 2000, status: "review" },
    // New sports (13/11/2026): one open squad each until the club decides on men's/women's teams. No budget, roster or results yet.
    { id: "rugby", name: "Rugby", squad: "Open", sport: "Rugby", budget: 0, status: "draft" },
    { id: "tennis", name: "Tennis", squad: "Open", sport: "Tennis", budget: 0, status: "draft" }
  ];
  var SPORTS = ["Football 7", "Futsal", "Basketball", "Volleyball", "Padel", "Rugby", "Tennis"];
  var POS = { "Football 7": ["Goalkeeper", "Defender", "Defender", "Midfielder", "Midfielder", "Forward", "Forward", "Midfielder"],
    Futsal: ["Goalkeeper", "Defender", "Winger", "Winger", "Pivot", "Defender", "Winger", "Pivot"],
    Basketball: ["Guard", "Guard", "Forward", "Forward", "Center", "Guard", "Forward", "Center"],
    Volleyball: ["Setter", "Outside hitter", "Outside hitter", "Middle blocker", "Middle blocker", "Opposite", "Libero", "Setter"],
    Padel: ["Right side", "Left side", "Right side", "Left side", "Right side", "Left side", "Right side", "Left side"],
    Rugby: ["Prop", "Hooker", "Lock", "Flanker", "Number 8", "Scrum-half", "Fly-half", "Centre", "Wing", "Full-back"],
    Tennis: ["Singles", "Doubles", "Singles", "Doubles", "Singles", "Doubles", "Singles", "Doubles"] };
  function team(id) { for (var i = 0; i < TEAMS.length; i++) if (TEAMS[i].id === id) return TEAMS[i]; }
  function tLabel(t) { return t.name + " · " + t.squad; }
  function tSquad(t) { return t.squad === "Men" ? "Men's team" : t.squad === "Women" ? "Women's team" : t.squad === "Open" ? "Open team" : "Mixed team"; }

  // Home grid
  $("teams-grid").innerHTML = TEAMS.map(function (t, i) {
    return '<li><a class="team" href="#team-' + t.id + '"><img class="team-img" src="' + SPORT_IMAGES[t.sport] + '" alt="" loading="lazy"><span class="num">' + String(i + 1).padStart(2, "0") + '</span><span class="name"><strong>' + esc(t.name) + "</strong><small>" + esc(tSquad(t)) + "</small></span></a></li>";
  }).join("");

  // ================= Alumni data (examples) =================
  var ALUMNI = [
    { id: "1", first: "Lucía", last: "Ferrer", nationality: "Spanish", programme: "BBA", grad: 2023, exUni: "University of Michigan", exCity: "Ann Arbor, USA", inCo: "Football club", inRole: "Partnerships intern", assos: "Esade Sports", sports: ["Football 7"], linkedin: "linkedin.com/in/example-lucia", interns: [["Sports marketing agency", "Marketing intern", "2021"]], phone: "+34 600 000 001", esade: "lucia.ferrer@esade.example", perso: "lucia.ferrer@example.com", active: false },
    { id: "2", first: "Marco", last: "Bianchi", nationality: "Italian", programme: "BBA", grad: 2022, exUni: "National University of Singapore", exCity: "Singapore", inCo: "Sports data start-up", inRole: "Business analyst intern", assos: "Esade Sports, Finance club", sports: ["Basketball"], linkedin: "linkedin.com/in/example-marco", interns: [], phone: "+39 300 000 002", esade: "marco.bianchi@esade.example", perso: "marco.b@example.com", active: false },
    { id: "3", first: "Sophie", last: "Laurent", nationality: "French", programme: "Double degree BBA + Law", grad: 2024, exUni: "McGill University", exCity: "Montréal, Canada", inCo: "Sports law firm", inRole: "Legal intern", assos: "Esade Sports", sports: ["Volleyball"], linkedin: "", interns: [["Event agency", "Operations intern", "2022"]], phone: "+33 6 00 00 00 03", esade: "sophie.laurent@esade.example", perso: "sophie.l@example.com", active: true },
    { id: "4", first: "Daniel", last: "Okafor", nationality: "Nigerian", programme: "BBA", grad: 2021, exUni: "Copenhagen Business School", exCity: "Copenhagen, Denmark", inCo: "Sportswear brand", inRole: "Brand intern", assos: "Esade Sports", sports: ["Football 7", "Futsal"], linkedin: "linkedin.com/in/example-daniel", interns: [], phone: "+44 7000 000004", esade: "daniel.okafor@esade.example", perso: "d.okafor@example.com", active: false },
    { id: "5", first: "Hannah", last: "Schmidt", nationality: "German", programme: "BBA", grad: 2025, exUni: "University of Sydney", exCity: "Sydney, Australia", inCo: "Tennis tournament organiser", inRole: "Event operations intern", assos: "Esade Sports", sports: ["Padel"], linkedin: "linkedin.com/in/example-hannah", interns: [["Consultancy", "Summer analyst", "2023"]], phone: "+49 150 0000005", esade: "hannah.schmidt@esade.example", perso: "", active: true },
    { id: "6", first: "Javier", last: "Ruiz", nationality: "Spanish", programme: "BBA", grad: 2020, exUni: "Bocconi University", exCity: "Milan, Italy", inCo: "Investment bank", inRole: "Summer analyst", assos: "Esade Sports", sports: ["Basketball"], linkedin: "linkedin.com/in/example-javier", interns: [], phone: "+34 600 000 006", esade: "javier.ruiz@esade.example", perso: "jruiz@example.com", active: false },
    { id: "7", first: "Emma", last: "Johansson", nationality: "Swedish", programme: "BBA", grad: 2024, exUni: "University of Texas at Austin", exCity: "Austin, USA", inCo: "Sports media company", inRole: "Content intern", assos: "Esade Sports", sports: ["Volleyball"], linkedin: "", interns: [], phone: "+46 70 000 0007", esade: "emma.johansson@esade.example", perso: "emma.j@example.com", active: false },
    { id: "8", first: "Tomás", last: "Silva", nationality: "Portuguese", programme: "BBA", grad: 2023, exUni: "HEC Montréal", exCity: "Montréal, Canada", inCo: "Football league", inRole: "Commercial intern", assos: "Esade Sports", sports: ["Futsal"], linkedin: "linkedin.com/in/example-tomas", interns: [["Retail group", "Sales intern", "2021"]], phone: "+351 900 000 008", esade: "tomas.silva@esade.example", perso: "", active: false },
    { id: "9", first: "Chloé", last: "Martin", nationality: "Belgian", programme: "BBA", grad: 2025, exUni: "Fudan University", exCity: "Shanghai, China", inCo: "Sports sponsorship agency", inRole: "Account intern", assos: "Esade Sports", sports: ["Padel", "Volleyball"], linkedin: "linkedin.com/in/example-chloe", interns: [], phone: "+32 470 00 00 09", esade: "chloe.martin@esade.example", perso: "chloe.m@example.com", active: true }
  ];
  ALUMNI.forEach(function (a, i) {
    a.example = true;
    a.headline = ["Sports marketing intern · FC Barcelona", "Business analyst · sports data start-up", "Law student · sports regulation", "Brand strategy intern · sportswear", "Event operations intern · tennis circuit", "Investment banking analyst", "Content intern · sports media", "Commercial intern · football league", "Account intern · sponsorship agency"][i] || (a.inRole + " · " + a.inCo);
    a.esadeRole = i === 0 ? "Football 7 · Former player" : i === 2 ? "Volleyball · Active member" : i === 8 ? "Padel · Volleyball · Active member" : "Esade Sports · Former member";
  });

  // ================= State =================
  var state = { user: null, me: null, expenses: null, captains: null, teamApplications: {}, teamInfo: {}, teamResults: {}, tasks: {}, nextId: 100, al: { q: "", sport: "All", year: "" }, hubFilter: "all", appFilter: "all", teamOpen: null };
  try {
    var s = JSON.parse(localStorage.getItem("es-site") || "null");
    if (s && s.v === 2) { state.user = s.user; state.me = s.me; state.expenses = s.expenses; state.captains = s.captains || null; state.teamApplications = s.teamApplications || {}; state.teamInfo = s.teamInfo || {}; state.teamResults = s.teamResults || {}; state.tasks = s.tasks || {}; state.nextId = s.nextId || 100; }
  } catch (e) {}
  function save() { try { localStorage.setItem("es-site", JSON.stringify({ v: 2, user: state.user, me: state.me, expenses: state.expenses, captains: state.captains, teamApplications: state.teamApplications, teamInfo: state.teamInfo, teamResults: state.teamResults, tasks: state.tasks, nextId: state.nextId })); } catch (e) {} }
  var HUB_ROLES = { captain: 1, board: 1, associate: 1, council: 1 };
  // Real admin login (Better Auth, /admin). undefined = still checking, null = not an admin, else { email, name }.
  // The Hub is only open to a signed-in admin; the role picker only previews what a captain, the Board or the Council sees.
  var admin;
  if (state.user && (HUB_ROLES[state.user.role] || state.user.role === "guest")) state.user = null; // roles from before the real login existed
  function signedIn() { return !!state.user && state.user.role === "alumni"; }
  function isHub() { return !!admin && !!state.user && HUB_ROLES[state.user.role]; }
  function allAlumni() { return state.me && state.me.verified !== false ? [state.me].concat(ALUMNI) : ALUMNI; }

  // ================= Header account area =================
  function adminBar() {
    if (!admin) return "";
    return '<a class="admin-badge" href="/admin" title="Signed in as ' + esc(admin.email) + ' · open the admin area"><i>Admin</i><span>' + esc(admin.name || admin.email.split("@")[0]) + '</span></a>' +
      '<a href="#hub-overview">Hub</a><button type="button" class="signout" data-signout>Sign out</button>';
  }
  function renderAcct() {
    var u = state.user, html;
    // Far right of the top bar: members sign-in, or the signed-in admin indicator.
    $("member").innerHTML = admin ? adminBar() : '<a class="member-signin" href="#signin" title="Captains, associates, Board and Student Council">Sign in</a>';
    if (u && u.role === "alumni") html = '<a href="' + (state.me ? "#alumni-me" : "#my-profile") + '">' + (state.me ? "My profile" : "Create profile") + "</a>" +
        '<a class="acct-chip" href="#alumni-signin" title="Alumni access"><i>' + (u.active ? "Alumni · Member" : "Alumni") + "</i><span>Switch</span></a>";
    else html = admin ? "" : '<a class="btn btn-blue" href="#apply-associate">Join</a>';
    $("acct").innerHTML = html;
  }

  // ================= Members (low-key, linked from the footer) =================
  // Public browsing never needs a login. This page is only for the people who run Esade Sports.
  function signinView() {
    var opts = TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("");
    return '<section class="band"><div class="wrap"><p class="eyebrow">Members</p><h1 class="display">Members<br>area.</h1><p>For captains, Board members, associates and the Student Council: requests, decisions and follow-up in one place. Visitors don\u2019t need an account, everything public is open.</p></div></section>' +
      '<section class="signin"><div class="wrap"><div class="access">' +
      (admin ?
        '<div class="acc"><p class="eyebrow">Signed in</p><strong>Esade Sports Hub</strong><p>You are signed in as ' + esc(admin.email) + '. Pick which view of the Hub to open.</p><div class="opts">' +
        '<label class="field" for="hub-role">View the Hub as<select id="hub-role"><option value="board">Board member</option><option value="captain">Team captain</option><option value="associate">Associate (department member)</option><option value="council">Student Council (Eva Morta)</option></select></label>' +
        '<label class="field" for="hub-team" id="hub-team-wrap" hidden>Team<select id="hub-team">' + opts + "</select></label></div>" +
        '<button class="btn btn-blue" data-go="hub">Open the Hub</button></div>'
      : '<div class="acc"><p class="eyebrow">Captains · Board · Associates</p><strong>Sign in to the Hub</strong><p>Expenses and budgets, team updates, try-out applications, department tasks and reports for the Student Council.</p>' +
        '<a class="btn btn-blue" href="/admin">' + (admin === undefined ? "Checking your login\u2026" : "Sign in") + '</a></div>') +
      '</div><p class="hint">Only accounts approved by the Board can sign in.</p></div></section>';
  }
  function bindSignin() {
    var role = $("hub-role"), wrap = $("hub-team-wrap");
    if (role) role.addEventListener("change", function () { wrap.hidden = role.value !== "captain"; });
    page.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!admin) return;
        state.user = { role: role.value, team: role.value === "captain" ? $("hub-team").value : null };
        save(); renderAcct(); go("hub-overview");
      });
    });
  }
  // Alumni access lives in the Alumni corner (simulated Esade login in this prototype).
  function alumniSigninView() {
    return '<section class="band"><div class="wrap"><p class="eyebrow">Alumni corner</p><h1 class="display">Alumni<br>sign in.</h1><p>Esade alumni and students get a profile and the contact details of alumni from their sport.</p></div></section>' +
      '<section class="signin"><div class="wrap"><div class="access">' +
      '<div class="acc"><p class="eyebrow">Esade login</p><strong>Alumni</strong>' +
      '<div class="opts" role="radiogroup" aria-label="Are you in a sports team or association today?">' +
      '<label class="radio"><input type="radio" name="act" id="act-yes" value="yes"><span><b>Currently in</b> an Esade sports team or association</span></label>' +
      '<label class="radio"><input type="radio" name="act" id="act-no" value="no" checked><span><b>Not currently in</b> a team or association</span></label></div>' +
      '<button class="btn btn-blue" id="alumni-go">Continue as alumni</button>' +
      (state.user && state.user.role === "alumni" ? '<button class="btn btn-ghost-navy" id="alumni-out">Sign out</button>' : "") + '</div>' +
      '</div><p class="hint">Prototype: this stands in for a real login with an Esade account.</p></div></section>';
  }
  function bindAlumniSignin() {
    $("alumni-go").addEventListener("click", function () {
      state.user = { role: "alumni", active: $("act-yes").checked }; save(); renderAcct(); toast("Signed in."); go(state.me ? "alumni" : "my-profile");
    });
    if ($("alumni-out")) $("alumni-out").addEventListener("click", function () { state.user = null; save(); renderAcct(); toast("Signed out."); go("alumni"); });
  }

  // ================= Team page =================
  // Real league data, read from the league page Quentin saved (UniBall, apuntamelo.com) on 12/11/2026
  var LEAGUE = {
    "football7-men": {
      league: "UniBall Championship (Men's F7) · Elite", short: "UniBall · Elite", source: "UniBall (apuntamelo.com)", updated: "12/11/2026", club: "Esade FC",
      cols: ["Pts", "Played", "GD"],
      table: [["Esade FC", 18, 7, 20], ["EUBS", 15, 7, 12], ["Sporting TBS FC", 13, 7, 13], ["TBS United FC", 13, 7, 12], ["GBSB Global", 12, 6, 13], ["Brasa FC", 10, 7, -4], ["Borrachia Dortmund", 10, 6, -9], ["C10 FC", 3, 7, -12], ["Geneva BS", 3, 7, -16], ["Barcelona College of Chiropractic", 3, 7, -29]],
      games: [{ date: "14/11/2026", time: "17:00", home: "EUBS", away: "Esade FC", score: null, venue: "Field A", round: "Matchday 8" }],
      gamesNote: "Matchdays 1–7 were not in the saved page, so their results are not shown yet.",
      players: [{ name: "Salva Lamas", no: 7, stat: { Assists: 3 } }],
      captain: "Mika",
      roster: [{ name: "Mika", no: null, captain: true }, { name: "Salva Lamas", no: 7 }],
      statsNote: "Only the league's top-3 rankings were in the saved page: Salva Lamas is 3rd for assists. Full player stats and matchday 1–7 results come next."
    },
    "basketball-men": {"league": "CSS · Bàsquet 1ª Lliga · 1ª Divisió", "short": "CSS · 1ª Divisió", "source": "css.cat", "updated": "12/11/2026", "club": "Esade Men's", "statCols": ["GP", "PTS", "PPG", "FT", "2P", "3P"], "cols": ["Played", "W", "L", "PF", "PA", "Diff"], "table": [["Esade Men's", 4, 3, 1, 207, 147, 60], ["TOP", 4, 3, 1, 220, 202, 18], ["PICK&RON", 4, 3, 1, 240, 235, 5], ["SANTS TENTACIO", 4, 2, 2, 172, 160, 12], ["FE NATURAL", 5, 2, 3, 220, 236, -16], ["Las amigas de Tomás", 5, 0, 5, 174, 253, -79]], "tableNote": "Calculated from every result on the league page. The league's official table may break ties differently.", "games": [{"date": "20/10/2026", "time": "21:00", "home": "Las amigas de Tomás", "away": "Esade Men's", "score": [26, 60], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 4"}, {"date": "27/10/2026", "time": "21:00", "home": "SANTS TENTACIO", "away": "Esade Men's", "score": [23, 32], "venue": "Jesús y Maria · Bàsquet Poli 2", "round": "Round 2"}, {"date": "03/11/2026", "time": "21:00", "home": "PICK&RON", "away": "Esade Men's", "score": [61, 59], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 3"}, {"date": "10/11/2026", "time": "22:00", "home": "Esade Men's", "away": "TOP", "score": [56, 37], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 1"}, {"date": "17/11/2026", "time": "21:00", "home": "Esade Men's", "away": "FE NATURAL", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 5"}, {"date": "24/11/2026", "time": "21:00", "home": "TOP", "away": "Esade Men's", "score": null, "venue": "Jesús y Maria · Bàsquet Poli 2", "round": "Round 6"}, {"date": "01/12/2026", "time": "21:00", "home": "Esade Men's", "away": "SANTS TENTACIO", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 7"}, {"date": "15/12/2026", "time": "21:00", "home": "Esade Men's", "away": "PICK&RON", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 8"}, {"date": "12/01/2027", "time": "22:00", "home": "FE NATURAL", "away": "Esade Men's", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 10"}, {"date": "19/01/2027", "time": "22:00", "home": "Esade Men's", "away": "Las amigas de Tomás", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 9"}], "players": [{"name": "Quentin Maigron", "no": 5, "stat": {"GP": 3, "PTS": 32, "PPG": "10.7", "FT": 1, "2P": 11, "3P": 3}}, {"name": "Diego Weis", "no": 11, "stat": {"GP": 4, "PTS": 28, "PPG": "7.0", "FT": 1, "2P": 12, "3P": 1}}, {"name": "Natan Miguel Viejo Evrard", "no": 1, "stat": {"GP": 4, "PTS": 27, "PPG": "6.8", "FT": 3, "2P": 9, "3P": 2}}, {"name": "Robin Basdevant", "no": 3, "stat": {"GP": 4, "PTS": 27, "PPG": "6.8", "FT": 2, "2P": 11, "3P": 1}}, {"name": "Federico Polese", "no": 1, "stat": {"GP": 4, "PTS": 18, "PPG": "4.5", "FT": 0, "2P": 9, "3P": 0}}, {"name": "Unai Gillet", "no": 6, "stat": {"GP": 4, "PTS": 18, "PPG": "4.5", "FT": 0, "2P": 6, "3P": 2}}, {"name": "Arsenii Kolobov", "no": 28, "stat": {"GP": 4, "PTS": 16, "PPG": "4.0", "FT": 0, "2P": 5, "3P": 2}}, {"name": "Viktor Velimir", "no": 12, "stat": {"GP": 4, "PTS": 11, "PPG": "2.8", "FT": 0, "2P": 4, "3P": 1}}, {"name": "Marc Oriol Serra Francès", "no": 24, "stat": {"GP": 4, "PTS": 8, "PPG": "2.0", "FT": 0, "2P": 4, "3P": 0}}, {"name": "Jan Halbach", "no": 8, "stat": {"GP": 4, "PTS": 2, "PPG": "0.5", "FT": 0, "2P": 1, "3P": 0}}], "roster": [{"name": "Quentin Maigron", "no": 5}, {"name": "Diego Weis", "no": 11}, {"name": "Natan Miguel Viejo Evrard", "no": 1}, {"name": "Robin Basdevant", "no": 3}, {"name": "Federico Polese", "no": 1}, {"name": "Unai Gillet", "no": 6}, {"name": "Arsenii Kolobov", "no": 28}, {"name": "Viktor Velimir", "no": 12}, {"name": "Marc Oriol Serra Francès", "no": 24}, {"name": "Jan Halbach", "no": 8}], "statsNote": "FT, 2P and 3P are shots made, from the league match sheets. The sheets don't list every basket: they add up to 187 of the team's 207 points."}
  };
  // Concrete prototype content for every squad. These are fictional presentation data, ready to be replaced by the captain database.
  var TEAM_DATA = {
    "football7-men": {},
    "futsal-men": {
      league: "Catalunya University Futsal League · Division 1", short: "Catalunya Futsal · D1", updated: "12/11/2026", club: "Esade Futsal Men", source: "Prototype match centre",
      next: { round: "Round 5", date: "Thu 19/11/2026", time: "20:30", venue: "Court 1 · Esade Pedralbes Campus", home: "Esade", away: "IQS Futsal" },
      record: { position: 3, total: 8, points: 9, played: 4, gd: 5 },
      captain: "Leo Costa", coach: "Pau Riera", tryout: "Wednesday 18 Nov · 20:00 · Esade Pedralbes Campus", staff: { finance: "Nora Schmidt", media: "Tomás Silva", operations: "Daniel Okafor" },
      roster: [
        { name: "Leo Costa", no: 1, position: "Goalkeeper", programme: "BBA · 4th year", captain: true, stat: { GP: 4, Goals: 0, Assists: 1, Yellow: 0, Red: 0 } },
        { name: "Tomás Silva", no: 9, position: "Pivot", programme: "BBA · 3rd year", stat: { GP: 4, Goals: 7, Assists: 2, Yellow: 1, Red: 0 } },
        { name: "Rafael Costa", no: 5, position: "Winger", programme: "MSc Marketing · 1st year", stat: { GP: 4, Goals: 3, Assists: 4, Yellow: 1, Red: 0 } },
        { name: "Nicolás Ferrer", no: 8, position: "Defender", programme: "BBA · 2nd year", stat: { GP: 4, Goals: 1, Assists: 2, Yellow: 2, Red: 0 } },
        { name: "Ethan Moore", no: 11, position: "Winger", programme: "MIM · 1st year", stat: { GP: 3, Goals: 2, Assists: 1, Yellow: 0, Red: 0 } },
        { name: "Bilal El Amrani", no: 4, position: "Defender", programme: "BBA · 1st year", stat: { GP: 4, Goals: 0, Assists: 1, Yellow: 1, Red: 0 } },
        { name: "Pablo Martín", no: 12, position: "Goalkeeper", programme: "BBA · 2nd year", stat: { GP: 2, Goals: 0, Assists: 0, Yellow: 0, Red: 0 } }
      ],
      schedule: [{ date: "19 Nov", side: "HOME", opponent: "vs IQS Futsal", venue: "Court 1 · Esade Pedralbes Campus", result: "20:30" }, { date: "12 Nov", side: "AWAY", opponent: "at La Salle Futsal", venue: "Court 2 · La Salle BCN", result: "L 2–4" }, { date: "05 Nov", side: "HOME", opponent: "vs UAB Futsal", venue: "Court 1 · Esade Pedralbes Campus", result: "W 5–2" }, { date: "29 Oct", side: "AWAY", opponent: "at ESADE Business School", venue: "Court 1 · ESADE Campus", result: "W 4–1" }],
      news: [{ kind: "Match preview", title: "Futsal Men target a fast start against IQS", date: "12 Nov 2026", summary: "After a tight away defeat, Esade return home looking to turn their high press into three points." }, { kind: "Training", title: "The finishing circuit behind Esade's quick attack", date: "06 Nov 2026", summary: "Coach Pau Riera has added a rapid transition block to every Thursday session." }, { kind: "Team news", title: "Tomás Silva leads the scoring chart", date: "02 Nov 2026", summary: "Seven goals in four matches have made the pivot the early standout of the men's campaign." }],
      records: ["Most goals in a match · Tomás Silva · 5", "Most assists in a season · Rafael Costa · 14", "Best season record · 2024–25 · 10–1–2", "Biggest win · Esade 9–1 UAB Futsal"],
      archives: [["2025–26", "Catalunya Futsal D1", "8–2–3", "3rd"], ["2024–25", "Catalunya Futsal D1", "10–1–2", "1st"]], statsNote: "Prototype futsal data with sample goals, assists and discipline figures."
    },
    "futsal-women": {
      league: "Catalunya University Futsal League · Women", short: "Catalunya Futsal · Women", updated: "12/11/2026", club: "Esade Futsal Women", source: "Prototype match centre",
      next: { round: "Round 5", date: "Sat 21/11/2026", time: "16:00", venue: "Court 3 · Esade Pedralbes Campus", home: "Esade", away: "Blanquerna FS" },
      record: { position: 2, total: 8, points: 10, played: 4, gd: 8 },
      captain: "Clara Navarro", coach: "Aina Soler", tryout: "Thursday 19 Nov · 18:30 · Esade Pedralbes Campus", staff: { finance: "Hannah Schmidt", media: "Lucía Ferrer", operations: "Sophie Laurent" },
      roster: [{ name: "Clara Navarro", no: 1, position: "Goalkeeper", programme: "BBA · 3rd year", captain: true, stat: { GP: 4, Goals: 0, Assists: 2, Yellow: 0, Red: 0 } }, { name: "Marta Pons", no: 7, position: "Pivot", programme: "BBA · 2nd year", stat: { GP: 4, Goals: 6, Assists: 3, Yellow: 0, Red: 0 } }, { name: "Amira Diallo", no: 10, position: "Winger", programme: "MSc Finance · 1st year", stat: { GP: 4, Goals: 4, Assists: 4, Yellow: 1, Red: 0 } }, { name: "Julia Kim", no: 4, position: "Defender", programme: "BBA · 1st year", stat: { GP: 3, Goals: 1, Assists: 1, Yellow: 0, Red: 0 } }, { name: "Nerea Gómez", no: 8, position: "Winger", programme: "BBA · 4th year", stat: { GP: 4, Goals: 2, Assists: 2, Yellow: 1, Red: 0 } }, { name: "Isabel Costa", no: 5, position: "Defender", programme: "MIM · 1st year", stat: { GP: 4, Goals: 0, Assists: 1, Yellow: 0, Red: 0 } }, { name: "Aya Nakamura", no: 12, position: "Goalkeeper", programme: "BBA · 2nd year", stat: { GP: 2, Goals: 0, Assists: 0, Yellow: 0, Red: 0 } }],
      schedule: [{ date: "21 Nov", side: "HOME", opponent: "vs Blanquerna FS", venue: "Court 3 · Esade Pedralbes Campus", result: "16:00" }, { date: "14 Nov", side: "AWAY", opponent: "at UIC Futsal", venue: "Court 1 · UIC Barcelona", result: "W 3–1" }, { date: "07 Nov", side: "HOME", opponent: "vs Sant Cugat FC", venue: "Court 3 · Esade Pedralbes Campus", result: "W 4–2" }, { date: "31 Oct", side: "AWAY", opponent: "at La Salle Women", venue: "Court 2 · La Salle BCN", result: "D 2–2" }],
      news: [{ kind: "Match report", title: "Esade Women answer back with a composed 4–2 win", date: "07 Nov 2026", summary: "A two-goal second half from Marta Pons keeps Esade within touching distance of first place." }, { kind: "Player spotlight", title: "Amira Diallo brings energy to every transition", date: "04 Nov 2026", summary: "The first-year finance student has already contributed four assists in a confident debut season." }, { kind: "Team news", title: "A new generation sets the tone", date: "27 Oct 2026", summary: "Seven players are in their first year at Esade, and the squad is building chemistry quickly." }],
      records: ["Most goals in a match · Marta Pons · 4", "Most assists in a season · Amira Diallo · 16", "Best season record · 2025–26 · 9–2–1", "Biggest win · Esade 7–0 UIC Futsal"],
      archives: [["2025–26", "Catalunya Futsal Women", "9–2–1", "2nd"], ["2024–25", "Catalunya Futsal Women", "7–3–2", "4th"]], statsNote: "Prototype women's futsal data with fictional player names and sample match stats."
    },
    "basketball-men": {},
    "basketball-women": {
      league: "Esade Student Basketball League · Women", short: "Esade Basketball · Women", updated: "12/11/2026", club: "Esade Basketball Women", source: "Prototype match centre",
      next: { round: "Game 5", date: "Sat 21/11/2026", time: "12:00", venue: "Court 2 · Barcelona Sports Hub", home: "Esade", away: "GBSB Global" },
      record: { position: 2, total: 8, points: 8, played: 4, gd: 26 },
      captain: "Inés Ferrer", coach: "Marta Solé", tryout: "Tuesday 17 Nov · 18:30 · Barcelona Sports Hub", staff: { finance: "Sophie Laurent", media: "Lucía Ferrer", operations: "Clara Navarro" },
      roster: [{ name: "Inés Ferrer", no: 8, position: "Point guard", programme: "BBA · 3rd year", captain: true, stat: { GP: 4, PTS: 61, REB: 18, AST: 24, STL: 11, PPG: 15.3 } }, { name: "Valentina Rossi", no: 14, position: "Shooting guard", programme: "BBA · 2nd year", stat: { GP: 4, PTS: 54, REB: 20, AST: 12, STL: 8, PPG: 13.5 } }, { name: "Maya Johnson", no: 22, position: "Small forward", programme: "MSc Marketing · 1st year", stat: { GP: 4, PTS: 48, REB: 33, AST: 9, STL: 6, PPG: 12.0 } }, { name: "Carla Puig", no: 5, position: "Power forward", programme: "BBA · 4th year", stat: { GP: 4, PTS: 36, REB: 41, AST: 5, STL: 3, PPG: 9.0 } }, { name: "Sofia Mendes", no: 30, position: "Centre", programme: "MIM · 1st year", stat: { GP: 3, PTS: 27, REB: 36, AST: 3, STL: 2, PPG: 9.0 } }, { name: "Noa Benet", no: 2, position: "Guard", programme: "BBA · 1st year", stat: { GP: 3, PTS: 19, REB: 8, AST: 10, STL: 5, PPG: 6.3 } }],
      schedule: [{ date: "21 Nov", side: "HOME", opponent: "vs GBSB Global", venue: "Court 2 · Barcelona Sports Hub", result: "12:00" }, { date: "14 Nov", side: "AWAY", opponent: "at IQS Hoops", venue: "Court 2 · IQS Campus", result: "W 68–55" }, { date: "07 Nov", side: "HOME", opponent: "vs UAB Women", venue: "Court 2 · Barcelona Sports Hub", result: "W 74–60" }, { date: "31 Oct", side: "AWAY", opponent: "at ESADE Business School", venue: "Court 1 · ESADE Campus", result: "L 59–64" }],
      news: [{ kind: "Game preview", title: "Basketball Women bring a four-game edge into GBSB clash", date: "18 Nov 2026", summary: "Inés Ferrer and Valentina Rossi are setting the pace as the team prepares for a top-two battle." }, { kind: "Player spotlight", title: "Maya Johnson makes the extra pass", date: "10 Nov 2026", summary: "The small forward has become the team's defensive anchor and a reliable transition creator." }, { kind: "Team news", title: "First-year players make an immediate impact", date: "31 Oct 2026", summary: "Sofia Mendes and Noa Benet have added size and pace to a squad with title ambitions." }],
      records: ["Most points in a game · Inés Ferrer · 27", "Most rebounds in a season · Sofia Mendes · 118", "Best season record · 2025–26 · 12–5", "Biggest win · Esade 88–39 UAB Women"],
      archives: [["2025–26", "Esade Student League", "12–5", "2nd"], ["2024–25", "Esade Student League", "8–9", "6th"]], statsNote: "Prototype women's basketball data with fictional box-score totals and player averages."
    },
    "volleyball-men": {
      league: "Catalunya University Volleyball League · Men", short: "Catalunya Volleyball · Men", updated: "12/11/2026", club: "Esade Volleyball Men", source: "Prototype match centre",
      next: { round: "Match 6", date: "Sun 22/11/2026", time: "11:00", venue: "Court 1 · Esade Pedralbes Campus", home: "Esade", away: "TBS United" },
      record: { position: 3, total: 8, points: 9, played: 5, gd: 4 },
      captain: "Johan Andersson", coach: "Marc Colom", tryout: "Wednesday 18 Nov · 19:00 · Esade Pedralbes Campus", staff: { finance: "Marco Bianchi", media: "Emma Johansson", operations: "Pau Vidal" },
      roster: [{ name: "Johan Andersson", no: 6, position: "Setter", programme: "BBA · 4th year", captain: true, stat: { GP: 5, Sets: 18, Points: 21, Aces: 7, Blocks: 5 } }, { name: "Pau Vidal", no: 11, position: "Outside hitter", programme: "BBA · 3rd year", stat: { GP: 5, Sets: 18, Points: 74, Aces: 9, Blocks: 8 } }, { name: "Arjun Mehta", no: 9, position: "Opposite", programme: "MSc Finance · 1st year", stat: { GP: 4, Sets: 15, Points: 62, Aces: 6, Blocks: 11 } }, { name: "Matteo Rinaldi", no: 3, position: "Middle blocker", programme: "BBA · 2nd year", stat: { GP: 5, Sets: 18, Points: 46, Aces: 2, Blocks: 16 } }, { name: "Karim El Idrissi", no: 14, position: "Libero", programme: "MIM · 1st year", stat: { GP: 5, Sets: 18, Points: 4, Aces: 0, Blocks: 0 } }, { name: "Guillem Serra", no: 2, position: "Middle blocker", programme: "BBA · 1st year", stat: { GP: 3, Sets: 9, Points: 25, Aces: 1, Blocks: 7 } }],
      schedule: [{ date: "22 Nov", side: "HOME", opponent: "vs TBS United", venue: "Court 1 · Esade Pedralbes Campus", result: "11:00" }, { date: "15 Nov", side: "AWAY", opponent: "at UAB Volleyball", venue: "Court 1 · UAB Campus", result: "W 3–1" }, { date: "08 Nov", side: "HOME", opponent: "vs IQS Volley", venue: "Court 1 · Esade Pedralbes Campus", result: "L 1–3" }, { date: "01 Nov", side: "AWAY", opponent: "at La Salle", venue: "Court 2 · La Salle BCN", result: "W 3–0" }],
      news: [{ kind: "Match report", title: "Volleyball Men close out UAB in four sets", date: "15 Nov 2026", summary: "A 16-block night from the middle blockers gave Esade the platform to win on the road." }, { kind: "Player spotlight", title: "Johan Andersson controls the tempo", date: "08 Nov 2026", summary: "The captain is turning first-ball quality into a faster, more aggressive Esade attack." }, { kind: "Training", title: "Block and transition: the work between matches", date: "30 Oct 2026", summary: "The team has made defensive transition a focus after a close opening month." }],
      records: ["Most points in a match · Pau Vidal · 24", "Most aces in a season · Pau Vidal · 31", "Best season record · 2024–25 · 13–3", "Biggest win · Esade 3–0 ESADE Business School"],
      archives: [["2025–26", "Catalunya Volleyball Men", "11–5", "3rd"], ["2024–25", "Catalunya Volleyball Men", "13–3", "1st"]], statsNote: "Prototype volleyball data with fictional rotation, attack and block statistics."
    },
    "volleyball-women": {
      league: "Catalunya University Volleyball League · Women", short: "Catalunya Volleyball · Women", updated: "12/11/2026", club: "Esade Volleyball Women", source: "Prototype match centre",
      next: { round: "Match 6", date: "Sat 21/11/2026", time: "10:00", venue: "Court 2 · Esade Pedralbes Campus", home: "Esade", away: "Blanquerna VB" },
      record: { position: 1, total: 8, points: 12, played: 5, gd: 8 },
      captain: "Sophie Laurent", coach: "Laura Esteve", tryout: "Thursday 19 Nov · 19:00 · Esade Pedralbes Campus", staff: { finance: "Inés Ferrer", media: "Chloé Martin", operations: "Marta Pons" },
      roster: [{ name: "Sophie Laurent", no: 4, position: "Setter", programme: "BBA + Law · 3rd year", captain: true, stat: { GP: 5, Sets: 18, Points: 19, Aces: 8, Blocks: 6 } }, { name: "Emma Johansson", no: 12, position: "Outside hitter", programme: "BBA · 4th year", stat: { GP: 5, Sets: 18, Points: 81, Aces: 12, Blocks: 7 } }, { name: "Chloé Martin", no: 8, position: "Opposite", programme: "BBA · 2nd year", stat: { GP: 5, Sets: 18, Points: 70, Aces: 10, Blocks: 13 } }, { name: "Nadia El Masri", no: 1, position: "Libero", programme: "MSc Marketing · 1st year", stat: { GP: 5, Sets: 18, Points: 3, Aces: 0, Blocks: 0 } }, { name: "Laura Kim", no: 7, position: "Middle blocker", programme: "BBA · 2nd year", stat: { GP: 4, Sets: 14, Points: 43, Aces: 4, Blocks: 18 } }, { name: "Bea Ruiz", no: 15, position: "Outside hitter", programme: "BBA · 1st year", stat: { GP: 3, Sets: 10, Points: 29, Aces: 3, Blocks: 4 } }],
      schedule: [{ date: "21 Nov", side: "HOME", opponent: "vs Blanquerna VB", venue: "Court 2 · Esade Pedralbes Campus", result: "10:00" }, { date: "14 Nov", side: "AWAY", opponent: "at UIC Women", venue: "Court 1 · UIC Barcelona", result: "W 3–2" }, { date: "07 Nov", side: "HOME", opponent: "vs IQS Volley Women", venue: "Court 2 · Esade Pedralbes Campus", result: "W 3–0" }, { date: "31 Oct", side: "AWAY", opponent: "at La Salle Women", venue: "Court 2 · La Salle BCN", result: "W 3–1" }],
      news: [{ kind: "Match report", title: "Volleyball Women defend first place in a five-set thriller", date: "14 Nov 2026", summary: "Emma Johansson finished with 22 points as Esade held its nerve in the deciding set." }, { kind: "Captain's note", title: "Sophie Laurent: consistency wins close sets", date: "09 Nov 2026", summary: "The captain explains how the group prepares for the small moments that decide a match." }, { kind: "Team news", title: "A deeper bench changes the season", date: "01 Nov 2026", summary: "Six different players have already led a set in points during Esade's unbeaten run." }],
      records: ["Most points in a match · Emma Johansson · 27", "Most aces in a season · Emma Johansson · 36", "Best season record · 2025–26 · 15–2", "Biggest win · Esade 3–0 UIC Women"],
      archives: [["2025–26", "Catalunya Volleyball Women", "15–2", "1st"], ["2024–25", "Catalunya Volleyball Women", "10–7", "4th"]], statsNote: "Prototype women's volleyball data with fictional rotation, attack and block statistics."
    },
    "volleyball-mixed": {
      league: "Esade Social Volleyball Cup · Mixed", short: "Esade Social Volleyball", updated: "12/11/2026", club: "Esade Volleyball Mixed", source: "Prototype match centre",
      next: { round: "Pool B", date: "Wed 25/11/2026", time: "19:30", venue: "Court 3 · Esade Pedralbes Campus", home: "Esade", away: "IESE Mix" },
      record: { position: 2, total: 6, points: 7, played: 4, gd: 3 },
      captain: "Emma Johansson", coach: "Johan Andersson", tryout: "Wednesday 25 Nov · 19:00 · Esade Pedralbes Campus", staff: { finance: "Leo Costa", media: "Maya Johnson", operations: "Clara Navarro" },
      roster: [{ name: "Emma Johansson", no: 12, position: "Outside hitter", programme: "BBA · 4th year", captain: true, stat: { GP: 4, Sets: 12, Points: 34, Aces: 6, Blocks: 4 } }, { name: "Johan Andersson", no: 6, position: "Setter", programme: "BBA · 4th year", stat: { GP: 4, Sets: 12, Points: 14, Aces: 4, Blocks: 3 } }, { name: "Maya Johnson", no: 22, position: "Opposite", programme: "MSc Marketing · 1st year", stat: { GP: 4, Sets: 12, Points: 28, Aces: 5, Blocks: 7 } }, { name: "Nora Schmidt", no: 3, position: "Libero", programme: "BBA · 2nd year", stat: { GP: 4, Sets: 12, Points: 2, Aces: 0, Blocks: 0 } }, { name: "Guillem Serra", no: 2, position: "Middle blocker", programme: "BBA · 1st year", stat: { GP: 3, Sets: 9, Points: 18, Aces: 2, Blocks: 6 } }, { name: "Aina Soler", no: 10, position: "Outside hitter", programme: "BBA · 3rd year", stat: { GP: 3, Sets: 9, Points: 22, Aces: 3, Blocks: 2 } }],
      schedule: [{ date: "25 Nov", side: "HOME", opponent: "vs IESE Mix", venue: "Court 3 · Esade Pedralbes Campus", result: "19:30" }, { date: "18 Nov", side: "AWAY", opponent: "at ESADE Alumni Mix", venue: "Court 2 · ESADE Campus", result: "W 2–1" }, { date: "11 Nov", side: "HOME", opponent: "vs EADA Mix", venue: "Court 3 · Esade Pedralbes Campus", result: "L 1–2" }, { date: "04 Nov", side: "AWAY", opponent: "at IESE Mix", venue: "Court 1 · IESE Campus", result: "W 2–0" }],
      news: [{ kind: "Tournament preview", title: "Mixed Volleyball prepare for a local derby", date: "20 Nov 2026", summary: "Esade and IESE meet in a deciding pool match where every set could change the standings." }, { kind: "Community", title: "The team where every level gets a rally", date: "12 Nov 2026", summary: "Students from seven programmes have found a competitive but welcoming weekly rhythm." }, { kind: "Behind the scenes", title: "The playlist that keeps Pool B moving", date: "06 Nov 2026", summary: "A short team profile on warm-ups, shared coaching and the group's post-match tradition." }],
      records: ["Most points in a match · Maya Johnson · 15", "Most aces in a season · Emma Johansson · 18", "Best season record · 2025–26 · 8–2", "Biggest win · Esade 2–0 EADA Mix"],
      archives: [["2025–26", "Esade Social Volleyball Cup", "8–2", "1st"], ["2024–25", "Esade Social Volleyball Cup", "6–4", "3rd"]], statsNote: "Prototype mixed-volleyball data with fictional player names and sample tournament figures."
    },
    "padel-men": {
      league: "Barcelona Student Padel Tour · Men", short: "Barcelona Padel Tour · Men", updated: "12/11/2026", club: "Esade Padel Men", source: "Prototype match centre",
      next: { round: "Tour Stop 4", date: "Sat 28/11/2026", time: "15:00", venue: "Padel Court 2 · Vall d'Hebron Sports Centre", home: "Esade", away: "IESE Padel" },
      record: { position: 3, total: 12, points: 18, played: 9, gd: 6 },
      captain: "Javier Ruiz", coach: "Sergi Blanch", tryout: "Saturday 21 Nov · 11:00 · Vall d'Hebron Sports Centre", staff: { finance: "Marco Bianchi", media: "Tomás Silva", operations: "Oliver Grant" },
      roster: [{ name: "Javier Ruiz", no: 1, position: "Right side", programme: "BBA · 3rd year", captain: true, stat: { Matches: 9, Won: 7, Lost: 2, "Sets won": 15 } }, { name: "Álex Navarro", no: 2, position: "Left side", programme: "BBA · 4th year", stat: { Matches: 8, Won: 6, Lost: 2, "Sets won": 13 } }, { name: "Bruno Costa", no: 3, position: "Right side", programme: "MSc Finance · 1st year", stat: { Matches: 7, Won: 4, Lost: 3, "Sets won": 10 } }, { name: "David Lee", no: 4, position: "Left side", programme: "MIM · 1st year", stat: { Matches: 6, Won: 4, Lost: 2, "Sets won": 9 } }, { name: "Pau Martín", no: 5, position: "Right side", programme: "BBA · 2nd year", stat: { Matches: 5, Won: 3, Lost: 2, "Sets won": 7 } }, { name: "Nico Vidal", no: 6, position: "Left side", programme: "BBA · 1st year", stat: { Matches: 4, Won: 2, Lost: 2, "Sets won": 5 } }],
      schedule: [{ date: "28 Nov", side: "HOME", opponent: "vs IESE Padel", venue: "Padel Court 2 · Vall d'Hebron Sports Centre", result: "15:00" }, { date: "14 Nov", side: "AWAY", opponent: "at EADA Padel", venue: "Court 5 · EADA Campus", result: "W 6–4, 6–3" }, { date: "31 Oct", side: "HOME", opponent: "vs IQS Padel", venue: "Padel Court 2 · Vall d'Hebron Sports Centre", result: "W 6–2, 4–6, 6–3" }, { date: "17 Oct", side: "AWAY", opponent: "at UAB Padel", venue: "Court 1 · UAB Campus", result: "L 3–6, 6–4, 4–6" }],
      news: [{ kind: "Tour report", title: "Ruiz and Navarro climb the Tour standings", date: "14 Nov 2026", summary: "A patient third-set comeback puts Esade's leading pair into the top three." }, { kind: "Pair spotlight", title: "The left-side/right-side partnership is clicking", date: "05 Nov 2026", summary: "Álex Navarro and Bruno Costa explain how they are building points around the glass." }, { kind: "Community", title: "Padel brings first-time competitors together", date: "22 Oct 2026", summary: "The men's squad has doubled its training group since the first open session in September." }],
      records: ["Most matches won in a season · Javier Ruiz · 18", "Most sets won · Álex Navarro · 31", "Best season record · 2025–26 · 17–4", "Biggest win · Esade 6–0 EADA Padel"],
      archives: [["2025–26", "Barcelona Padel Tour", "17–4", "2nd"], ["2024–25", "Barcelona Padel Tour", "11–8", "5th"]], statsNote: "Prototype padel data with fictional pairings and sample match records."
    },
    "padel-women": {
      league: "Barcelona Student Padel Tour · Women", short: "Barcelona Padel Tour · Women", updated: "12/11/2026", club: "Esade Padel Women", source: "Prototype match centre",
      next: { round: "Tour Stop 4", date: "Wed 25/11/2026", time: "18:30", venue: "Padel Court 4 · Vall d'Hebron Sports Centre", home: "Esade", away: "EU Business School" },
      record: { position: 1, total: 12, points: 22, played: 9, gd: 11 },
      captain: "Hannah Schmidt", coach: "Marina Bosch", tryout: "Saturday 21 Nov · 12:30 · Vall d'Hebron Sports Centre", staff: { finance: "Inés Ferrer", media: "Chloé Martin", operations: "Sophie Laurent" },
      roster: [{ name: "Hannah Schmidt", no: 1, position: "Right side", programme: "BBA · 4th year", captain: true, stat: { Matches: 9, Won: 8, Lost: 1, "Sets won": 17 } }, { name: "Chloé Martin", no: 2, position: "Left side", programme: "BBA · 2nd year", stat: { Matches: 9, Won: 8, Lost: 1, "Sets won": 16 } }, { name: "Mina García", no: 3, position: "Right side", programme: "MSc Marketing · 1st year", stat: { Matches: 7, Won: 5, Lost: 2, "Sets won": 11 } }, { name: "Léa Dubois", no: 4, position: "Left side", programme: "BBA · 3rd year", stat: { Matches: 7, Won: 4, Lost: 3, "Sets won": 10 } }, { name: "Ariadna Puig", no: 5, position: "Right side", programme: "BBA · 1st year", stat: { Matches: 5, Won: 3, Lost: 2, "Sets won": 7 } }, { name: "Sara Costa", no: 6, position: "Left side", programme: "MIM · 1st year", stat: { Matches: 4, Won: 2, Lost: 2, "Sets won": 5 } }],
      schedule: [{ date: "25 Nov", side: "HOME", opponent: "vs EU Business School", venue: "Padel Court 4 · Vall d'Hebron Sports Centre", result: "18:30" }, { date: "14 Nov", side: "AWAY", opponent: "at IESE Padel Women", venue: "Court 3 · IESE Campus", result: "W 6–1, 6–2" }, { date: "01 Nov", side: "HOME", opponent: "vs ESADE Alumni Padel", venue: "Padel Court 4 · Vall d'Hebron Sports Centre", result: "W 6–4, 6–4" }, { date: "18 Oct", side: "AWAY", opponent: "at UAB Padel Women", venue: "Court 2 · UAB Campus", result: "W 6–3, 3–6, 6–2" }],
      news: [{ kind: "Tour report", title: "Padel Women take control of the Tour", date: "14 Nov 2026", summary: "Hannah Schmidt and Chloé Martin have won eight of nine matches and lead the student circuit." }, { kind: "Pair spotlight", title: "Chloé Martin turns defence into attack", date: "07 Nov 2026", summary: "The left-side player has become one of the most consistent returners in the competition." }, { kind: "Team news", title: "A full training group for the first time", date: "24 Oct 2026", summary: "Two new pairs joined the squad this month, giving the captain more options for every Tour stop." }],
      records: ["Most matches won in a season · Hannah Schmidt · 19", "Most sets won · Chloé Martin · 34", "Best season record · 2025–26 · 18–3", "Biggest win · Esade 6–0 IESE Padel Women"],
      archives: [["2025–26", "Barcelona Padel Tour", "18–3", "1st"], ["2024–25", "Barcelona Padel Tour", "13–7", "3rd"]], statsNote: "Prototype women's padel data with fictional pairings and sample match records."
    }
  };
  function teamData(t) { return TEAM_DATA[t.id] || {}; }
  function sgn(n) { return n > 0 ? "+" + n : String(n); }
  function leagueTable(L) {
    var diffCol = L.cols.length - 1;
    return '<div class="tscroll"><table class="sched lt"><thead><tr><th class="r">Pos</th><th>Team</th>' + L.cols.map(function (c) { return '<th class="r">' + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
      L.table.map(function (r, i) { return '<tr' + (r[0] === L.club ? ' class="us"' : "") + '><td class="r num">' + (i + 1) + '</td><td class="opp">' + esc(r[0]) + "</td>" + r.slice(1).map(function (v, j) { return '<td class="r num">' + (j === 0 ? "<strong>" + v + "</strong>" : j === diffCol ? sgn(v) : v) + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div><p class="src">' + (L.tableNote ? "<span>" + esc(L.tableNote) + "</span> " : "") + "<span>Source: " + esc(L.source) + " · updated " + L.updated + "</span></p>";
  }
  function nextGame(L) { for (var i = 0; i < L.games.length; i++) if (!L.games[i].score) return L.games[i]; return null; }
  function nextStrip(t) {
    var L = LEAGUE[t.id], D = teamData(t), n = (L && L.games && nextGame(L)) || D.next;
    if (!n) return '<section class="tnext"><div class="wrap"><p class="eyebrow">Next game</p><p class="vs" style="margin:0">Esade <b>vs</b> the next opponent</p><span class="when">Date to be confirmed by the captain</span></div></section>';
    return '<section class="tnext"><div class="wrap"><p class="eyebrow">Next game · ' + n.round + '</p><p class="vs" style="margin:0">' + esc(n.home) + " <b>vs</b> " + esc(n.away) + '</p><span class="when">' + n.date + " · " + n.time + " · " + esc(n.venue) + "</span></div></section>";
  }
  function gamesTable(L, list) {
    return '<div class="tscroll"><table class="sched"><thead><tr><th>Date</th><th></th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>' +
      list.map(function (g) {
        var home = g.home === L.club, opp = home ? g.away : g.home, res = '<span class="muted">' + g.time + "</span>";
        if (g.score) { var us = home ? g.score[0] : g.score[1], them = home ? g.score[1] : g.score[0]; res = '<span class="res ' + (us > them ? "w" : "l") + '">' + (us > them ? "W" : "L") + " " + us + "–" + them + "</span>"; }
        return "<tr><td>" + g.date + '</td><td class="ha">' + (home ? "HOME" : "AWAY") + '</td><td class="opp">' + (home ? "vs " : "at ") + esc(opp) + "</td><td>" + esc(g.venue) + "</td><td>" + res + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function usRow(L) { for (var i = 0; i < L.table.length; i++) if (L.table[i][0] === L.club) return { pos: i + 1, r: L.table[i] }; }
  function recordCards(L) {
    var U = usRow(L), c = [["Position", U.pos + " / " + L.table.length]];
    if (L.cols[0] === "Pts") c.push(["Points", U.r[1]], ["Played", U.r[2]], ["Goal difference", sgn(U.r[3])]);
    else c.push(["Record", U.r[2] + "–" + U.r[3]], ["Points for", U.r[4]], ["Points against", U.r[5]]);
    return '<div class="record">' + c.map(function (x) { return '<div><span class="eyebrow">' + x[0] + "</span><strong>" + x[1] + "</strong></div>"; }).join("") + "</div>";
  }
  var STATCOLS = {
    Basketball: ["GP", "PTS", "REB", "AST", "STL", "PPG"], // real league sheets give FT/2P/3P instead: see LEAGUE[].statCols
    Futsal: ["GP", "Goals", "Assists", "Yellow", "Red"],
    "Football 7": ["GP", "Goals", "Assists", "Yellow", "Red"],
    Volleyball: ["GP", "Sets", "Points", "Aces", "Blocks"],
    Padel: ["Matches", "Won", "Lost", "Sets won"],
    Rugby: ["GP", "Tries", "Conversions", "Penalties", "Points"],
    Tennis: ["Matches", "Won", "Lost", "Sets won"]
  };
  var TEAM_TABS = [["home", "Overview"], ["roster", "Roster"], ["staff", "Staff"], ["schedule", "Schedule"], ["stats", "Stats"], ["news", "News"], ["join", "Join"]];
  var TEAM_MORE = [["archives", "Season archives"], ["records", "Record book"]];
  function parseTeam(h) {
    var rest = h.slice(5), hit = null;
    TEAMS.forEach(function (t) { if (rest === t.id || rest.indexOf(t.id + "-") === 0) hit = t; });
    if (!hit) return null;
    var tab = rest.slice(hit.id.length + 1) || "home";
    var ok = TEAM_TABS.concat(TEAM_MORE).some(function (x) { return x[0] === tab; });
    return { t: hit, tab: ok ? tab : "home" };
  }
  function th(t, tab) { return "#team-" + t.id + (tab === "home" ? "" : "-" + tab); }
  function rosterCards(t, n) {
    var pos = POS[t.sport] || ["Player"], out = [], D = teamData(t), L = LEAGUE[t.id], players = D.roster || (L && L.roster) || [];
    if (players.length) {
      out = players.slice(0, n || players.length).map(function (r, i) { return '<li class="player' + (r.captain || i === 0 ? " capt" : "") + '"><div class="ph2">' + esc(r.position || t.sport) + '<span class="no">' + (r.no != null ? r.no : "–") + '</span></div><div class="pi"><strong>' + esc(r.name) + "</strong><span>" + (r.captain ? "Captain · " : "") + esc(r.position || "Player") + " · " + esc(r.programme || (L && L.club) || t.sport) + "</span></div></li>"; });
      return '<ul class="roster">' + out.join("") + "</ul>";
    }
    for (var i = 0; i < n; i++) out.push('<li class="player' + (i === 0 ? " capt" : "") + '"><div class="ph2">' + esc(pos[i % pos.length]) + '<span class="no">' + String(i + 1).padStart(2, "0") + '</span></div><div class="pi"><strong>Esade squad player ' + (i + 1) + '</strong><span>' + esc(pos[i % pos.length]) + " · Esade Sports squad</span></div></li>");
    return '<ul class="roster">' + out.join("") + "</ul>";
  }
  function schedTable(t) {
    var D = teamData(t), rows = D.schedule || [];
    if (!rows.length) rows = [{ date: "Season schedule", side: "INFO", opponent: "Captain update pending", venue: "Esade Sports Hub", result: "To be announced" }];
    rows = rows.map(function (r) { return '<tr><td>' + esc(r.date) + '</td><td class="ha">' + esc(r.side) + '</td><td class="opp">' + esc(r.opponent) + '</td><td>' + esc(r.venue) + '</td><td>' + (r.result && /^(W|L|D)\b/.test(r.result) ? '<span class="res">' + esc(r.result) + '</span>' : '<span class="muted">' + esc(r.result) + '</span>') + '</td></tr>'; });
    return '<div class="tscroll"><table class="sched"><thead><tr><th>Date</th><th></th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>";
  }
  function newsList(t, n) {
    var D = teamData(t), stories = D.news || [], out = [];
    stories.slice(0, n || stories.length).forEach(function (story) { out.push('<li><div class="thumb" aria-hidden="true"></div><div><p class="eyebrow">' + esc(story.kind) + "</p><strong>" + esc(story.title) + "</strong><span>" + esc(story.date) + " · " + esc(story.summary) + "</span></div></li>"); });
    return '<ul class="news">' + out.join("") + "</ul>";
  }
  function sec(id, title, sub, body) { return '<section class="tsec" id="' + id + '"><header><h2>' + title + "</h2><span>" + sub + "</span></header>" + body + "</section>"; }
  function joinBlock(t) {
    var D = teamData(t);
    return '<div class="ways"><div class="tryout"><p class="eyebrow">Play</p><h3 class="display">Come to<br>try-outs.</h3><p>Next try-out: ' + esc(D.tryout || "Check the next club announcement") + '. Every level is welcome. Come and train with the squad.</p><a class="btn btn-solid-white" href="#apply-player-' + t.id + '">Sign up for try-outs</a></div>' +
      '<div class="tryout coach"><p class="eyebrow">Coach</p><h3 class="display">Volunteer as coach.</h3><p>Our coaches are volunteers. Esade student or not, if you have played or coached ' + esc(t.sport.toLowerCase()) + ', we would love your help.</p><a class="btn btn-ghost-navy" href="#apply-coach-' + t.id + '">Apply to coach</a></div></div>';
  }
  function statsTable(t) {
    var L = LEAGUE[t.id], cols = (L && L.statCols) || STATCOLS[t.sport] || ["GP"], rows = [], D = teamData(t), players = D.roster || (L && L.players) || [];
    players.forEach(function (pl) { rows.push('<tr><td class="pn"><span class="muted num">#' + (pl.no != null ? pl.no : "–") + "</span> " + esc(pl.name) + "</td>" + cols.map(function (c) { return '<td class="r num">' + (pl.stat && pl.stat[c] != null ? "<strong>" + esc(pl.stat[c]) + "</strong>" : "–") + "</td>"; }).join("") + "</tr>"); });
    if (!rows.length) rows.push('<tr><td class="pn">Squad totals</td>' + cols.map(function () { return '<td class="r num">–</td>'; }).join("") + "</tr>");
    return '<div class="tscroll"><table class="sched stats"><thead><tr><th>Player</th>' + cols.map(function (c) { return '<th class="r">' + c + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") +
      '</tbody></table></div>';
  }
  // Results the captain added in the Hub (manual mode). Shown on the public page straight away in this demo; in production after approval.
  function captainResults(t) {
    var list = (state.teamResults[t.id] || []).slice().reverse();
    if (!list.length) return "";
    return sec("t-capres", "Latest updates", "Added by the captain", '<div class="tscroll"><table class="sched"><thead><tr><th>Date</th><th></th><th>Opponent</th><th>Competition</th><th>Result</th></tr></thead><tbody>' +
      list.map(function (r) { return "<tr><td>" + esc(r.date) + '</td><td class="ha">' + esc((r.side || "").toUpperCase()) + '</td><td class="opp">' + (r.side === "Away" ? "at " : "vs ") + esc(r.opponent) + "</td><td>" + esc(r.competition || "") + "</td><td>" + (r.status === "Final" ? '<span class="res">' + esc(r.score) + "</span>" : '<span class="muted">' + esc(r.status) + (r.score ? " · " + esc(r.score) : "") + "</span>") + "</td></tr>"; }).join("") + "</tbody></table></div>");
  }
  function teamView(t, tab) {
    var others = TEAMS.filter(function (x) { return x.sport === t.sport && x.id !== t.id; });
    var nAl = ALUMNI.filter(function (a) { return a.sports.indexOf(t.sport) > -1; }).length + (state.me && state.me.sports.indexOf(t.sport) > -1 ? 1 : 0);
    var L = LEAGUE[t.id], D = teamData(t), U = L ? usRow(L) : null;
    var moreOn = TEAM_MORE.some(function (x) { return x[0] === tab; });
    var tabs = TEAM_TABS.map(function (x) { return '<a href="' + th(t, x[0]) + '"' + (x[0] === tab ? ' aria-current="page"' : "") + ">" + x[1] + "</a>"; }).join("") +
      '<details class="more"><summary' + (moreOn ? ' class="on"' : "") + '>More +</summary><div class="more-menu">' +
      TEAM_MORE.map(function (x) { return '<a href="' + th(t, x[0]) + '">' + x[1] + "</a>"; }).join("") +
      '<a href="#alumni" data-sport="' + esc(t.sport) + '">Former players (Alumni)</a></div></details>';
    var head = '<section class="thero"><img class="thero-img" src="' + SPORT_IMAGES[t.sport] + '" alt=""><div class="wrap">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="#home">Esade Sports</a><span>/</span><a href="#teams">Teams</a><span>/</span><span>' + esc(tLabel(t)) + "</span></nav>" +
      '<h1 class="display">' + esc(t.name) + ".<small>" + esc(tSquad(t)) + " · Season 2026–27</small></h1>" +
      (others.length ? '<div class="squads">' + others.map(function (o) { return '<a href="' + th(o, tab) + '">' + esc(tSquad(o)) + " →</a>"; }).join("") + "</div>" : "") +
      '</div></section><nav class="tabbar" aria-label="Team pages"><div class="wrap">' + tabs + "</div></nav>";
    var body = "";
    if (tab === "home") {
      body = captainResults(t) + (L ? sec("t-table", "League table", esc(L.league), leagueTable(L)) : sec("t-sched", "Latest results", '<a class="link-arrow" href="' + th(t, "schedule") + '">Full schedule →</a>', schedTable(t))) +
        sec("t-roster", "Roster", '<a class="link-arrow" href="' + th(t, "roster") + '">Full roster →</a>', rosterCards(t, 5)) +
        '<div class="tgrid">' + sec("t-news", "News", '<a class="link-arrow" href="' + th(t, "news") + '">All news →</a>', newsList(t, 2)) +
        sec("t-staff", "Who runs the team", "Students and volunteers", staffList(t)) + "</div>" +
        sec("t-try", "Join the team", "Two ways in", joinBlock(t)) +
        '<section class="tsec" id="t-alumni"><div class="alumni-strip"><p><strong>' + nAl + " alumni played " + esc(t.sport.toLowerCase()) + '</strong>Find them in the Alumni corner and get in touch.</p><a class="btn btn-ghost-navy" href="#alumni" data-sport="' + esc(t.sport) + '">See ' + esc(t.sport.toLowerCase()) + " alumni</a></div></section>";
    } else if (tab === "roster") {
      body = sec("t-roster", "Roster", "Season 2026–27 · kept up to date by the captain", rosterCards(t, 12));
    } else if (tab === "staff") {
      body = '<div class="tgrid">' + sec("t-staff", "Staff", "Students and volunteers", staffList(t)) +
        '<section class="tsec"><div class="tryout coach"><p class="eyebrow">Coach</p><h3 class="display">Volunteer as coach.</h3><p>Our coaches are volunteers. Esade student or not, if you have played or coached ' + esc(t.sport.toLowerCase()) + ', we would love your help.</p><a class="btn btn-ghost-navy" href="#apply-coach-' + t.id + '">Apply to coach</a></div></section></div>';
    } else if (tab === "schedule") {
      if (L && L.games) {
        body = recordCards(L) + sec("t-sched", "Schedule &amp; results", esc(L.league), gamesTable(L, L.games) + (L.gamesNote ? '<p class="src">' + esc(L.gamesNote) + "</p>" : "")) +
          captainResults(t) + sec("t-table", "League table", esc(L.short), leagueTable(L));
      } else {
        var rec = D.record || { position: "–", total: "–", points: "–", played: "–", gd: 0 };
        body = '<div class="record"><div><span class="eyebrow">Position</span><strong>' + rec.position + " / " + rec.total + '</strong></div><div><span class="eyebrow">Points</span><strong>' + rec.points + '</strong></div><div><span class="eyebrow">Played</span><strong>' + rec.played + '</strong></div><div><span class="eyebrow">Goal difference</span><strong>' + sgn(rec.gd) + "</strong></div></div>" +
          captainResults(t) + sec("t-sched", "Schedule &amp; results", esc(D.league || "Season 2026–27"), schedTable(t));
      }
    } else if (tab === "stats") {
      body = sec("t-stats", "Season stats", esc(D.short || (L && L.short) || "Season 2026–27") + " · updated " + esc(D.updated || (L && L.updated) || "this season"), statsTable(t)) + '<p class="muted" style="margin:0;font-size:13px">' + esc(D.statsNote || (L && L.statsNote) || "Prototype player statistics for this season.") + "</p>";
    } else if (tab === "news") {
      body = sec("t-news", "News", "From the team", newsList(t, 6));
    } else if (tab === "join") {
      body = sec("t-try", "Join the team", "Two ways in", joinBlock(t));
    } else if (tab === "archives") {
      var archives = D.archives || [];
      body = sec("t-arch", "Season archives", "Past seasons", '<div class="tscroll"><table class="sched"><thead><tr><th>Season</th><th>League</th><th>Record</th><th>Position</th><th></th></tr></thead><tbody>' +
        archives.map(function (a) { return '<tr><td class="opp">' + esc(a[0]) + "</td><td>" + esc(a[1]) + "</td><td>" + esc(a[2]) + "</td><td>" + esc(a[3]) + '</td><td class="r"><span class="muted">Archived</span></td></tr>'; }).join("") + "</tbody></table></div>") +
        '<p class="muted" style="margin:0;font-size:13px">Each season is kept with its roster, results and stats. Prototype archive data shown for presentation.</p>';
    } else if (tab === "records") {
      body = sec("t-rec", "Record book", "All-time team records", '<div class="staff">' + (D.records || ["Season highlight · Esade Sports squad", "Captain's award · selected by the team", "Best season record · prototype data", "Biggest win · prototype data"]).map(function (r) { var p = r.split(" · "); return "<div><span>" + esc(p[0]) + "</span><span>" + esc(p.slice(1).join(" · ")) + "</span></div>"; }).join("") + "</div>");
    }
    var info = state.teamInfo[t.id], about = info && (info.about || info.leagueUrl) ? '<div class="tinfo">' + (info.about ? "<p>" + esc(info.about) + "</p>" : "") + (info.leagueUrl ? '<a class="link-arrow" href="' + esc(info.leagueUrl) + '" target="_blank" rel="noopener">League page →</a>' : "") + "</div>" : "";
    var exNote = L ? "" : '<p class="exnote"><b>Example data</b> <span>Names, results and stats on this page are examples for the presentation. The captain replaces them with the real roster and results.</span></p>';
    return head + nextStrip(t) + '<section class="tbody"><div class="wrap">' + exNote + about + body + "</div></section>";
  }
  function staffList(t) {
    var D = t && teamData(t), L = t && LEAGUE[t.id], s = D.staff || {};
    return '<div class="staff"><div><span>Captain</span><span>' + esc(D.captain || (L && L.captain) || "Esade captain") + '</span></div><div><span>Coach</span><span>' + esc(D.coach || "Esade Sports coach") + '</span></div><div><span>Finance associate</span><span>' + esc(s.finance || "Finance associate") + '</span></div><div><span>Media &amp; Marketing associate</span><span>' + esc(s.media || "Media associate") + '</span></div><div><span>Operations associate</span><span>' + esc(s.operations || "Operations associate") + '</span></div></div>';
  }

  // ================= Join a team (player or coach) =================
  function applyView(h) {
    var m = h.match(/^apply-(player|coach)-(.+)$/), as = m ? m[1] : "player", tid = m && team(m[2]) ? m[2] : TEAMS[0].id;
    return '<section class="band"><div class="wrap"><p class="eyebrow">Join a team</p><h1 class="display">Play or<br>coach.</h1><p>Esade Sports teams are run by students. Players join through try-outs. Coaches are volunteers, and you do not need to be an Esade student to coach.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="aform" novalidate>' +
      '<div class="fsec"><h2>What would you like to do?</h2><div class="checks" role="radiogroup" aria-label="Join as">' +
      '<label for="as-player"><input type="radio" name="as" id="as-player" value="player"' + (as === "player" ? " checked" : "") + '>Play: sign up for try-outs</label>' +
      '<label for="as-coach"><input type="radio" name="as" id="as-coach" value="coach"' + (as === "coach" ? " checked" : "") + '>Coach the team</label></div>' +
      '<div class="fgrid"><label class="field" for="a-team">Team<select id="a-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === tid ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" +
      '<label class="field" for="a-esade">Are you an Esade student?<select id="a-esade"><option value="yes">Yes, I study at Esade</option><option value="no">No, I am not an Esade student</option></select></label></div></div>' +
      '<div class="fsec"><h2>About you</h2><div class="fgrid">' + fieldI("a-first", "First name", "", "required") + fieldI("a-last", "Last name", "", "required") + fieldI("a-email", "Email", "", 'type="email" required') + fieldI("a-phone", "Phone number", "", 'type="tel" required') +
      '<label class="field" for="a-prog" id="a-prog-wrap">Programme and year<input id="a-prog" placeholder="e.g. BBA, 2nd year"></label>' +
      '<label class="field" for="a-level">Your level<select id="a-level"><option>Beginner</option><option>Played at school or in a club</option><option>Played at a competitive level</option></select></label>' +
      '<label class="field full" for="a-exp" id="a-exp-wrap">Coaching experience<textarea id="a-exp" rows="3" placeholder="Teams or age groups you have coached, licences, how much time you can give each week"></textarea></label></div></div>' +
      '<p class="err" id="a-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit" id="a-submit">Send</button><span class="muted" style="font-size:13px">The captain gets back to you by email.</span></div></form>' +
      '<div class="locked" id="a-done" hidden><p class="eyebrow" style="color:var(--blue)">Sent</p><h2 id="a-done-h">Thanks, we have your details</h2><p id="a-done-p">The captain will contact you by email with the next steps.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  function applyAssociateView() {
    var opts = DEPTS.filter(function (d) { return d.id !== "board"; }).map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('');
    return '<section class="band"><div class="wrap"><p class="eyebrow">Esade Sports recruitment</p><h1 class="display">Join the<br>association.</h1><p>Apply to up to two departments. Rank your preferences, tell us what motivates you and share the work that helps us understand how you could contribute.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="assoc-form" novalidate>' +
      '<div class="fsec"><h2>Personal information</h2><div class="fgrid">' + fieldI("as-first", "First name", "", "required autocomplete=\"given-name\"") + fieldI("as-last", "Last name", "", "required autocomplete=\"family-name\"") + fieldI("as-email", "Esade email", "", 'type="email" required autocomplete="email"') + fieldI("as-phone", "Phone number", "", 'type="tel" required autocomplete="tel"') + fieldI("as-programme", "Programme", "", 'required list="as-progs" placeholder="BBA"') + '<datalist id="as-progs"><option value="BBA"><option value="Double degree BBA + Law"><option value="MSc"><option value="MBA"></datalist>' + '<label class="field" for="as-year">Year<select id="as-year" required><option value="">Choose your year</option>' + YEARS.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('') + '</select></label>' + fieldI("as-linkedin", "LinkedIn profile", "", 'type="url" placeholder="https://linkedin.com/in/..."') + '</div></div>' +
      '<div class="fsec"><h2>Department preferences</h2><p class="muted" style="margin:0">You may apply to a maximum of two departments. Preference 1 is your strongest choice.</p><div class="fgrid"><label class="field" for="as-pref1">Preference 1<select id="as-pref1" required><option value="">Choose a department</option>' + opts + '</select></label><label class="field" for="as-pref2">Preference 2 <small>(optional)</small><select id="as-pref2"><option value="">No second preference</option>' + opts + '</select></label></div><label class="field full" for="as-motivation">Why do you want to join Esade Sports and why these departments?<textarea id="as-motivation" rows="6" required placeholder="Tell us what motivates you, what you could contribute and why you ranked these departments."></textarea></label></div>' +
      '<div class="fsec"><h2>Application materials</h2><div class="fgrid"><label class="field" for="as-cv">CV <small>(PDF required)</small><input id="as-cv" type="file" accept="application/pdf,.pdf" required></label><label class="field" for="as-video">Short motivation video <small>(optional, MP4/MOV)</small><input id="as-video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov"></label></div><p class="muted" style="margin:10px 0 0;font-size:13px">Keep the video short: around 60–90 seconds. Explain who you are, why Esade Sports interests you and why your department preferences fit you.</p></div>' +
      '<div class="fsec"><label class="consent" for="as-redirect"><input type="checkbox" id="as-redirect" required><span>I understand that the Board may redirect my application to another department if it is a better fit for my profile and the association’s needs.</span></label><label class="consent" for="as-consent"><input type="checkbox" id="as-consent" required><span>I confirm that the information and documents submitted are accurate and may be reviewed by the Esade Sports recruitment team.</span></label></div>' +
      '<p class="err" id="as-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">Submit application</button><span class="muted" style="font-size:13px">Your application will be reviewed by the Board and relevant department Heads.</span></div></form>' +
      '<div class="locked" id="as-done" hidden><p class="eyebrow" style="color:var(--blue)">Application received</p><h2>Thanks for applying to Esade Sports</h2><p id="as-done-p">Your ranked preferences and application materials are ready for review.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  var YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Master's"];
  function deptName(id) { var n = ""; DEPTS.forEach(function (d) { if (d.id === id) n = d.name; }); return n; }
  function bindAssociateApply() {
    var f = $("assoc-form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var err = $("as-err"), cv = $("as-cv").files[0], video = $("as-video").files[0], p1 = $("as-pref1").value, p2 = $("as-pref2").value;
      if (!$("as-first").value.trim() || !$("as-last").value.trim() || !$("as-email").value.trim() || !$("as-phone").value.trim() || !$("as-programme").value.trim() || !$("as-year").value || !p1 || !$("as-motivation").value.trim() || !cv || !$("as-redirect").checked || !$("as-consent").checked) { err.textContent = "Please complete your personal information, rank at least one department, upload your CV and accept both acknowledgements."; err.hidden = false; return; }
      if (p1 === p2) { err.textContent = "Choose two different departments, or leave Preference 2 empty."; err.hidden = false; return; }
      if (cv && cv.type !== "application/pdf" && !/\.pdf$/i.test(cv.name)) { err.textContent = "Please upload your CV as a PDF."; err.hidden = false; return; }
      if (video && !/^video\/(mp4|quicktime)$/.test(video.type) && !/\.(mp4|mov)$/i.test(video.name)) { err.textContent = "Please upload the motivation video as an MP4 or MOV file."; err.hidden = false; return; }
      err.hidden = true;
      function done() { f.hidden = true; $("as-done").hidden = false; $("as-done-p").textContent = "Preference 1: " + deptName(p1) + (p2 ? ". Preference 2: " + deptName(p2) + "." : ".") + " The Board may redirect your application to another department if appropriate."; }
      if (!backend || !backend.submitAssociationApplication) { done(); return; }
      var btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Sending…";
      backend.submitAssociationApplication({
        firstName: $("as-first").value.trim(), lastName: $("as-last").value.trim(), email: $("as-email").value.trim(), phone: $("as-phone").value.trim(),
        programme: $("as-programme").value.trim(), year: $("as-year").value, linkedin: $("as-linkedin").value.trim() || undefined,
        pref1: deptName(p1), pref2: p2 ? deptName(p2) : undefined, motivation: $("as-motivation").value.trim(),
        acceptsRedirect: $("as-redirect").checked, confirmsAccuracy: $("as-consent").checked
      }, { cv: cv, video: video }).then(done, function (x) {
        console.error(x); btn.disabled = false; btn.textContent = "Submit application";
        err.textContent = "Your application could not be sent. Please check your connection and try again."; err.hidden = false;
      });
    });
  }
  function bindApply() {
    var f = $("aform"); if (!f) return;
    function sync() {
      var coach = $("as-coach").checked, esade = $("a-esade").value === "yes";
      $("a-exp-wrap").hidden = !coach; $("a-prog-wrap").hidden = !esade;
      $("a-level").parentNode.hidden = coach;
      $("a-submit").textContent = coach ? "Apply to coach" : "Sign up for try-outs";
    }
    f.addEventListener("change", sync); sync();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var miss = ["a-first", "a-last", "a-email", "a-phone"].filter(function (id) { return !$(id).value.trim(); });
      if (miss.length) { $("a-err").textContent = "Please fill in your name, email and phone number."; $("a-err").hidden = false; return; }
      var coach = $("as-coach").checked, t = team($("a-team").value);
      var folder = sportsApplicationsFolder(t.id), captain = captainForTeam(t.id);
      if (!state.teamApplications[folder]) state.teamApplications[folder] = [];
      state.teamApplications[folder].push({
        id: state.nextId++, folder: folder, team: t.id, teamLabel: tLabel(t), sport: t.sport, type: coach ? "Coaching application" : "Try-out application",
        first: $("a-first").value.trim(), last: $("a-last").value.trim(), email: $("a-email").value.trim(), phone: $("a-phone").value.trim(),
        esadeStudent: $("a-esade").value === "yes", programme: $("a-prog").value.trim(), level: coach ? "Coach applicant" : $("a-level").value,
        coachingExperience: $("a-exp").value.trim(), captain: captain ? captainName(captain) : "Board review", captainEmail: captain ? captain.email : "Board review", status: "New", createdAt: "2026-11-12"
      });
      save();
      if (backend && backend.submitTeamApplication) backend.submitTeamApplication({
        teamSlug: t.id, kind: coach ? "coach" : "tryout",
        firstName: $("a-first").value.trim(), lastName: $("a-last").value.trim(), email: $("a-email").value.trim(), phone: $("a-phone").value.trim(),
        esadeStudent: $("a-esade").value === "yes", programme: $("a-prog").value.trim() || undefined,
        level: coach ? undefined : $("a-level").value, coachingExperience: coach ? ($("a-exp").value.trim() || undefined) : undefined
      });
      f.hidden = true; $("a-done").hidden = false;
      $("a-done-h").textContent = coach ? "Thanks for offering to coach" : "You are signed up for try-outs";
      $("a-done-p").textContent = "Team: " + tLabel(t) + ". Your information is stored in the " + folder + " folder and routed to " + (captain ? captainName(captain) + " (" + captain.email + ")" : "the Board because this team has no active captain") + ".";
    });
  }

  // ================= Alumni =================
  function initials(a) { return esc((a.first || "?").charAt(0) + (a.last || "").charAt(0)); }
  function avatar(a) { return '<div class="av">' + (a.photo ? '<img src="' + a.photo + '" alt="">' : initials(a)) + "</div>"; }
  function alumniBand(extra) {
    return '<section class="band"><div class="wrap"><p class="eyebrow">Esade alumni network</p><h1 class="display">Once Esade,<br>always Esade.</h1><p>Search the Esade Sports alumni network like a professional directory. Anyone can browse profiles; sign in only when you want to create or edit your own profile or access consented contact details.</p>' + (extra || "") + "</div></section>";
  }
  function alumniView() {
    var years = []; allAlumni().forEach(function (a) { if (years.indexOf(a.grad) < 0) years.push(a.grad); }); years.sort(function (a, b) { return b - a; });
    var cta = state.me ? '<div class="ctas"><a class="btn btn-solid-white" href="#alumni-me">My profile</a><a class="btn btn-ghost-white" href="#my-profile">Edit profile</a></div>' : '<div class="ctas"><a class="btn btn-solid-white" href="#my-profile">Create your profile</a><a class="btn btn-ghost-white" href="#alumni-signin">Sign in</a></div>';
    return alumniBand(cta) + '<section class="al"><div class="wrap body">' +
      '<div class="filters"><label class="field" for="al-q">Search<input id="al-q" type="search" placeholder="Name, headline, programme, sport or role" value="' + esc(state.al.q) + '"></label>' +
      '<label class="field" for="al-year">Graduation year<select id="al-year"><option value="">All years</option>' + years.map(function (y) { return '<option' + (String(y) === state.al.year ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="sportbar" role="group" aria-label="Filter by sport">' + ["All"].concat(SPORTS).map(function (s) { return '<button class="sp" data-sp="' + s + '" aria-pressed="' + (state.al.sport === s) + '">' + s + "</button>"; }).join("") + "</div>" +
      '<p class="al-count" id="al-count"></p><ul class="cards" id="al-cards"></ul></div></section>';
  }
  function alumniFilter() {
    var q = state.al.q.trim().toLowerCase();
    return allAlumni().filter(function (a) {
      if (state.al.sport !== "All" && a.sports.indexOf(state.al.sport) < 0) return false;
      if (state.al.year && String(a.grad) !== state.al.year) return false;
      if (!q) return true;
      return [a.first, a.last, a.nationality, a.programme, a.exUni, a.exCity, a.inCo, a.inRole, a.assos, a.headline, a.esadeRole].concat(a.sports).concat(a.interns.map(function (x) { return x[0]; })).join(" ").toLowerCase().indexOf(q) > -1;
    });
  }
  function drawCards() {
    var list = alumniFilter(), el = $("al-cards");
    $("al-count").textContent = list.length + (list.length === 1 ? " alumnus" : " alumni") + (state.al.sport !== "All" ? " · " + state.al.sport : "");
    el.innerHTML = list.length ? list.map(function (a) {
      return '<li><a class="acard" href="#alumni-' + a.id + '"><div class="cover"></div><div class="in">' + avatar(a) +
        "<h3>" + esc(a.first + " " + a.last) + '</h3><span class="meta">' + esc(a.programme) + " · Class of " + a.grad + '</span><p class="headline">' + esc(a.headline) + "</p>" +
        '<div class="tags">' + a.sports.map(function (s) { return '<span class="tag2">' + esc(s) + "</span>"; }).join("") + (a.active ? '<span class="tag2 soft">Active member</span>' : "") + (a.id === "me" ? '<span class="tag2 soft">You</span>' : "") + (a.example ? '<span class="tag2 ex">Example</span>' : "") + "</div>" +
        '<div class="job"><b>Esade Sports</b>' + esc(a.esadeRole) + "</div></div></a></li>";
    }).join("") : '<li class="empty-state" style="grid-column:1/-1">No alumni match these filters. Try another sport or clear the search.</li>';
  }
  function profileView(a) {
    var rows = [];
    function crow(label, val, href) {
      if (!val) return;
      rows.push("<div><dt>" + label + "</dt><dd>" + (href ? '<a href="' + href + '" target="_blank" rel="noopener">' + esc(val) + "</a>" : esc(val)) + '</dd><button class="copybtn" data-copy="' + esc(val) + '">Copy</button></div>');
    }
    if (signedIn()) { crow("Phone", a.phone); crow("Esade email", a.esade); crow("Personal email", a.perso); }
    if (a.linkedin) crow("LinkedIn", a.linkedin, "https://" + a.linkedin.replace(/^https?:\/\//, ""));
    var interns = a.interns.filter(function (x) { return x[0]; });
    return '<section class="al"><div class="wrap body"><a class="back" href="#alumni">← Back to the Alumni corner</a><div class="prof"><article class="pcard"><div class="cover"></div><div class="head2">' + avatar(a) +
      "<h1>" + esc(a.first + " " + a.last) + '</h1><span class="sub2">' + esc(a.programme) + " · Class of " + a.grad + '</span><p class="headline" style="margin:8px 0 0">' + esc(a.headline) + "</p>" +
      '<div class="tags" style="margin-top:6px">' + a.sports.map(function (s) { return '<span class="tag2">' + esc(s) + "</span>"; }).join("") + (a.active ? '<span class="tag2 soft">Active member</span>' : "") + (a.example ? '<span class="tag2 ex">Example profile</span>' : "") + "</div>" +
      (a.id === "me" ? '<div style="margin-top:10px"><a class="btn btn-ghost-navy" href="#my-profile">Edit profile</a></div>' : "") + "</div>" +
      '<section class="psec"><h2>Esade Sports role</h2><div class="exp"><div class="ic">ES</div><div><strong>' + esc(a.esadeRole) + "</strong><span>Sports association connection</span></div></div></section>" +
      '<section class="psec"><h2>Sports at Esade</h2>' + a.sports.map(function (s) { return '<div class="exp"><div class="ic">' + s[0] + "</div><div><strong>" + esc(s) + "</strong><span>Esade Sports</span></div></div>"; }).join("") + "</section>" +
      '<section class="psec"><h2>Exchange</h2><div class="exp"><div class="ic">✈</div><div><strong>' + esc(a.exUni) + "</strong><span>" + esc(a.exCity) + "</span></div></div></section>" +
      '<section class="psec"><h2>Internships</h2><div class="exp"><div class="ic">4</div><div><strong>' + esc(a.inRole) + "</strong><span>" + esc(a.inCo) + " · 4th-year internship</span></div></div>" +
      interns.map(function (x) { return '<div class="exp"><div class="ic">' + esc(x[0][0]) + "</div><div><strong>" + esc(x[1]) + "</strong><span>" + esc(x[0]) + (x[2] ? " · " + esc(x[2]) : "") + "</span></div></div>"; }).join("") + "</section>" +
      '<section class="psec"><h2>Associations</h2><span>' + esc(a.assos) + "</span></section></article>" +
      '<aside class="contact"><p class="eyebrow">Get in touch</p><dl>' + rows.join("") + '</dl><p style="margin:0;font-size:12px;color:var(--on-navy-soft)">' + (signedIn() ? "Contact details are shown only with this person’s consent." : "Sign in with an Esade account to see consented contact details.") + '</p></aside></div></div></section>';
  }

  // Profile form
  var draftPhoto = null;
  function fieldI(id, label, val, attrs, full) { return '<label class="field' + (full ? " full" : "") + '" for="' + id + '">' + label + '<input id="' + id + '" value="' + esc(val || "") + '" ' + (attrs || "") + "></label>"; }
  function internRow(x, i) {
    return '<div class="intern-row" data-row="' + i + '">' + fieldI("ix-co-" + i, "Company", x[0], 'data-k="0"') + fieldI("ix-role-" + i, "Role", x[1], 'data-k="1"') + fieldI("ix-yr-" + i, "Year", x[2], 'data-k="2" inputmode="numeric"') + '<button type="button" class="rm" data-rm="' + i + '">Remove</button></div>';
  }
  function formView() {
    if (!signedIn()) return alumniBand() + '<section class="al"><div class="wrap body"><div class="locked"><h2>Sign in first</h2><p>Only Esade alumni and students can create a profile.</p><a class="btn btn-blue" href="#alumni-signin">Sign in</a></div></div></section>';
    var m = state.me || { first: "", last: "", nationality: "", programme: "BBA", grad: "", exUni: "", exCity: "", inCo: "", inRole: "", assos: "Esade Sports", sports: [], linkedin: "", interns: [], phone: "", esade: "", perso: "", photo: null };
    draftPhoto = m.photo || null;
    return '<section class="band"><div class="wrap"><p class="eyebrow">Alumni corner</p><h1 class="display">' + (state.me ? "Edit your<br>profile." : "Create your<br>profile.") + "</h1><p>Your profile lets other Esade alumni and students who played sport find you. Fields marked optional can stay empty.</p></div></section>" +
      '<section class="al"><div class="wrap body"><form class="pform" id="pform" novalidate>' +
      '<div class="fsec"><h2>About you</h2><div class="photo-row"><div class="av" id="ph-prev">' + (draftPhoto ? '<img src="' + draftPhoto + '" alt="">' : initials(m.first ? m : { first: "?", last: "" })) + '</div><label class="field" for="f-photo">Profile photo <small>(optional)</small><input id="f-photo" type="file" accept="image/*"></label></div>' +
      '<div class="fgrid">' + fieldI("f-first", "First name", m.first, "required autocomplete=\"given-name\"") + fieldI("f-last", "Last name", m.last, "required autocomplete=\"family-name\"") + fieldI("f-nat", "Nationality", m.nationality, "required") + "</div></div>" +
      '<div class="fsec"><h2>At Esade</h2><div class="fgrid">' + fieldI("f-prog", "Programme studied", m.programme, 'required list="progs"') + '<datalist id="progs"><option>BBA</option><option>Double degree BBA + Law</option><option>MSc</option><option>MBA</option></datalist>' +
      fieldI("f-grad", "Graduation year", m.grad, 'required type="number" min="1960" max="2035" inputmode="numeric"') +
      fieldI("f-exuni", "Exchange university", m.exUni, "required") + fieldI("f-excity", "Exchange city and country", m.exCity, "required") +
      fieldI("f-inco", "4th-year internship: company", m.inCo, "required") + fieldI("f-inrole", "4th-year internship: role", m.inRole, "required") +
      fieldI("f-assos", "Associations you joined", m.assos, 'required placeholder="Esade Sports, ..."', true) + "</div>" +
      '<div class="field">Sports you played at Esade<div class="checks" id="f-sports">' + SPORTS.map(function (s, i) { return '<label for="sp-' + i + '"><input type="checkbox" id="sp-' + i + '" value="' + s + '"' + (m.sports.indexOf(s) > -1 ? " checked" : "") + ">" + s + "</label>"; }).join("") + "</div></div></div>" +
      '<div class="fsec"><h2>Other internships during Esade <small>Optional</small></h2><div id="interns" style="display:grid;gap:12px">' + m.interns.map(internRow).join("") + '</div><button type="button" class="btn btn-ghost-navy" id="add-intern" style="justify-self:start">Add an internship</button></div>' +
      '<div class="fsec"><h2>Contact details <small>Visible to signed-in alumni and students</small></h2><div class="fgrid">' + fieldI("f-phone", "Phone number", m.phone, 'required type="tel" autocomplete="tel"') + fieldI("f-esade", "Esade email", m.esade, 'type="email"') + fieldI("f-perso", "Personal email", m.perso, 'type="email" autocomplete="email"') + fieldI("f-li", "LinkedIn <small>(optional)</small>", m.linkedin, 'placeholder="linkedin.com/in/..."') + "</div>" +
      '<label class="consent" for="f-consent"><input type="checkbox" id="f-consent"' + (state.me ? " checked" : "") + '><span>I agree that signed-in Esade alumni and students can see my profile and contact details. I can edit or delete my profile at any time.</span></label></div>' +
      '<p class="err" id="f-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">' + (state.me ? "Save changes" : "Publish my profile") + "</button>" + (state.me ? '<button type="button" class="btn btn-ghost-navy" id="del-prof">Delete my profile</button>' : "") + "</div></form></div></section>";
  }
  function readInterns() {
    var out = []; page.querySelectorAll("[data-row]").forEach(function (r) { var x = ["", "", ""]; r.querySelectorAll("input").forEach(function (i) { x[+i.getAttribute("data-k")] = i.value.trim(); }); out.push(x); }); return out;
  }
  function bindForm() {
    var f = $("pform"); if (!f) return;
    var interns = state.me ? state.me.interns.slice() : [];
    function redrawInterns() { $("interns").innerHTML = interns.map(internRow).join(""); page.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { interns = readInterns(); interns.splice(+b.getAttribute("data-rm"), 1); redrawInterns(); }); }); }
    redrawInterns();
    $("add-intern").addEventListener("click", function () { interns = readInterns(); interns.push(["", "", ""]); redrawInterns(); });
    $("f-photo").addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      var r = new FileReader(); r.onload = function () {
        var img = new Image(); img.onload = function () {
          var c = document.createElement("canvas"), s = 320, k = Math.min(img.width, img.height); c.width = c.height = s;
          c.getContext("2d").drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, s, s);
          draftPhoto = c.toDataURL("image/jpeg", .85); $("ph-prev").innerHTML = '<img src="' + draftPhoto + '" alt="">';
        }; img.src = r.result;
      }; r.readAsDataURL(file);
    });
    var del = $("del-prof"); if (del) del.addEventListener("click", function () { state.me = null; save(); renderAcct(); toast("Profile deleted."); go("alumni"); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (id) { return $(id).value.trim(); }, err = $("f-err");
      var sports = []; page.querySelectorAll("#f-sports input:checked").forEach(function (c) { sports.push(c.value); });
      var missing = [["f-first", "first name"], ["f-last", "last name"], ["f-nat", "nationality"], ["f-prog", "programme"], ["f-grad", "graduation year"], ["f-exuni", "exchange university"], ["f-excity", "exchange city"], ["f-inco", "internship company"], ["f-inrole", "internship role"], ["f-assos", "associations"], ["f-phone", "phone number"]].filter(function (x) { return !v(x[0]); }).map(function (x) { return x[1]; });
      if (!sports.length) missing.push("at least one sport");
      if (!v("f-esade") && !v("f-perso")) missing.push("an Esade or personal email");
      if (missing.length) { err.textContent = "Please add: " + missing.join(", ") + "."; err.hidden = false; return; }
      if (!$("f-consent").checked) { err.textContent = "Tick the consent box so other alumni can see your contact details."; err.hidden = false; return; }
      state.me = { id: "me", first: v("f-first"), last: v("f-last"), nationality: v("f-nat"), programme: v("f-prog"), grad: +v("f-grad"), exUni: v("f-exuni"), exCity: v("f-excity"), inCo: v("f-inco"), inRole: v("f-inrole"), assos: v("f-assos"), sports: sports, linkedin: v("f-li"), interns: readInterns().filter(function (x) { return x[0] || x[1]; }), phone: v("f-phone"), esade: v("f-esade"), perso: v("f-perso"), photo: draftPhoto, active: !!(state.user && state.user.active), verified: !!(state.me && state.me.verified !== false) };
      save(); renderAcct();
      if (state.me.verified) { toast("Profile updated."); go("alumni-me"); } else go("alumni-verify");
    });
  }

  // ================= Alumni email verification (demo of the real flow) =================
  function verifyView() {
    var m = state.me, mail = m ? (m.esade || m.perso) : "";
    if (m && m.verified) return '<section class="band"><div class="wrap"><p class="eyebrow">Alumni profile</p><h1 class="display">You are<br>verified.</h1><p>Your profile is registered and visible in the alumni search.</p><div class="ctas"><a class="btn btn-solid-white" href="#alumni-me">See my profile</a></div></div></section>';
    return '<section class="band"><div class="wrap"><p class="eyebrow">One last step</p><h1 class="display">Check your<br>inbox.</h1><p>' + (mail ? "We sent a verification link to <strong>" + esc(mail) + "</strong>. " : "") + 'Your profile stays private, and out of the alumni search, until you click the link. The link works once and expires after 24 hours.</p></div></section>' +
      '<section class="al"><div class="wrap body"><div class="locked"><p class="eyebrow" style="color:var(--blue)">Prototype</p><h2>No email is sent in this demo</h2><p>On the real site, the email arrives in a few seconds. Here, use the button to do what the link would do.</p>' +
      '<div class="form-actions"><button class="btn btn-blue" type="button" id="v-do">Open the verification link</button><button class="btn btn-ghost-navy" type="button" id="v-resend">Resend the email</button></div></div></div></section>';
  }
  function bindVerify() {
    var d = $("v-do"), r = $("v-resend"), sent = 0;
    if (d) d.addEventListener("click", function () { if (!state.me) { go("my-profile"); return; } state.me.verified = true; save(); toast("Email verified. Your profile is now registered."); go("alumni-me"); });
    if (r) r.addEventListener("click", function () { sent++; toast(sent > 2 ? "Please wait a few minutes before asking again." : "A new link is on its way."); r.disabled = sent > 2; });
  }
  function pendingNote() { return '<div class="wrap" style="padding-top:20px"><p class="exnote"><b>Waiting for verification</b> <span>Only you can see this profile until you click the link in your email. <a href="#alumni-verify">Verify now</a></span></p></div>'; }

  // ================= Privacy =================
  function privacyView() {
    var items = [
      ["What we collect", "Only what each form needs: your name, email and phone for try-outs and applications, and the profile fields you choose to fill in as an alumnus. LinkedIn, photo and extra internships are optional."],
      ["Who sees it", "Try-out and coaching applications go to the team captain. Association applications go to the Board and the relevant department Heads. Your alumni contact details are shown only to other alumni, and only if you tick the consent box."],
      ["Files", "CVs, motivation videos and expense receipts are kept in private storage, never on a public page."],
      ["How long we keep it", "Applications are deleted after the recruitment cycle. Former members can ask us to remove their profile at any time."],
      ["Your rights", "You can see, correct, export or delete your data. Write to esadesports@alumni.esade.edu and we reply within 30 days."],
      ["Cookies", "This site only stores your language and sign-in choice in your browser. No advertising or tracking cookies."]
    ];
    return '<section class="band"><div class="wrap"><p class="eyebrow">Privacy</p><h1 class="display">Your data,<br>your call.</h1><p>How Esade Sports handles personal data. This page will be checked against Esade\u2019s data-protection rules before launch.</p></div></section>' +
      '<section class="al"><div class="wrap body"><div class="staff privacy">' + items.map(function (x) { return "<div><span>" + x[0] + "</span><span>" + x[1] + "</span></div>"; }).join("") + '</div><p class="muted" style="margin:0;font-size:13px">Contact: <a href="mailto:esadesports@alumni.esade.edu">esadesports@alumni.esade.edu</a></p></div></section>';
  }

  // ================= Hub (department tracking) =================
  var BUDGET_STATUS = { agreed: ["ok", "Agreed with captain"], review: ["warn", "In review"], draft: ["bad", "Not agreed yet"] };
  var EXP_STATUS = { requested: ["warn", "Requested"], validated: ["info", "Validated by Finance"], paid: ["ok", "Paid"], rejected: ["bad", "Rejected"] };
  if (!state.captains) state.captains = [
    { id: 1, first: "Mika", last: "", email: "email to confirm", team: "football7-men", role: "Captain", programme: "MBA", start: "2026-09-01", active: true },
    { id: 2, first: "Clara", last: "Navarro", email: "clara.navarro@esade.edu", team: "futsal-women", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 3, first: "Leo", last: "Costa", email: "leo.costa@esade.edu", team: "futsal-men", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 4, first: "Sophie", last: "Laurent", email: "sophie.laurent@esade.edu", team: "volleyball-women", role: "Captain", programme: "BBA + Law", start: "2026-09-15", active: true },
    { id: 5, first: "Hannah", last: "Schmidt", email: "hannah.schmidt@esade.edu", team: "padel-women", role: "Captain", programme: "BBA", start: "2026-09-01", active: true }
  ];
  [
    { id: 6, first: "Marco", last: "Bianchi", email: "marco.bianchi@esade.edu", team: "basketball-men", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 7, first: "Inés", last: "Ferrer", email: "ines.ferrer@esade.edu", team: "basketball-women", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 8, first: "Johan", last: "Andersson", email: "johan.andersson@esade.edu", team: "volleyball-men", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 9, first: "Emma", last: "Johansson", email: "emma.johansson@esade.edu", team: "volleyball-mixed", role: "Captain", programme: "BBA", start: "2026-09-01", active: true },
    { id: 10, first: "Javier", last: "Ruiz", email: "javier.ruiz@esade.edu", team: "padel-men", role: "Captain", programme: "BBA", start: "2026-09-01", active: true }
  ].forEach(function (captain) { if (!state.captains.some(function (c) { return c.team === captain.team; })) state.captains.push(captain); });
  if (!state.expenses) state.expenses = [
    [1, "football7-men", "League registration fee", "League fees", 650, "Captain", "2026-10-02", "paid"], [2, "football7-men", "Match jerseys (14)", "Kit", 880, "Operations", "2026-10-09", "paid"],
    [3, "futsal-women", "League registration fee", "League fees", 650, "Captain", "2026-10-03", "paid"], [4, "futsal-women", "Referee fees, October", "Facilities", 240, "Captain", "2026-11-04", "validated"],
    [5, "basketball-men", "Court booking, try-outs", "Facilities", 300, "Operations", "2026-09-20", "paid"], [6, "basketball-men", "Away game travel", "Travel", 420, "Captain", "2026-11-08", "requested"],
    [7, "basketball-women", "Training balls (10)", "Material", 260, "Captain", "2026-11-06", "requested"], [8, "volleyball-men", "Tournament entry", "League fees", 500, "Operations", "2026-10-15", "paid"],
    [9, "volleyball-women", "Tournament entry", "League fees", 500, "Operations", "2026-10-15", "validated"], [10, "padel-men", "Court hire, league night", "Facilities", 360, "Captain", "2026-11-10", "requested"],
    [11, "volleyball-mixed", "Team shirts", "Kit", 540, "Captain", "2026-10-28", "paid"], [12, "futsal-men", "Futsal balls (10)", "Material", 310, "Operations", "2026-11-01", "validated"],
    [13, "padel-women", "Padel balls (24)", "Material", 150, "Captain", "2026-11-09", "requested"]
  ].map(function (r) { return { id: r[0], team: r[1], item: r[2], cat: r[3], amount: r[4], by: r[5], date: r[6], status: r[7] }; });
  var DEPTS = [
    { id: "board", name: "Board", head: "President + Vice-Presidents", size: "3", remit: "Oversees the association and owns the Student Council relationship.", tasks: [["Monthly check-in with the Student Council", "done"], ["Captains' meeting, all teams", "doing"], ["Semester budget report sign-off", "todo"]] },
    { id: "fin", name: "Finance", head: "Head of Finance", size: "2–3", remit: "Agrees budgets with captains, pays fees and expenses directly, prepares reports.", tasks: [["Agree remaining season budgets (4 teams)", "doing"], ["Pay validated expenses", "doing"], ["Draft semester report for the Council", "todo"]] },
    { id: "med", name: "Media & Marketing", head: "Head of Media & Marketing", size: "5–6", remit: "Runs every team's social media, covers games, results and try-outs.", tasks: [["Match-day posts for every home game", "doing"], ["Team intro reels (12 teams)", "todo"], ["Rebuild the Linktree", "done"]] },
    { id: "ops", name: "Operations", head: "Head of Operations", size: "5–6", remit: "Trainings, try-outs, bookings, friendlies, registrations, jerseys and travel.", tasks: [["Book spring try-out slots", "todo"], ["Order jerseys for Volleyball Mixed", "doing"], ["Tournament travel plan", "todo"]] },
    { id: "par", name: "Partnerships", head: "Head of Partnerships", size: "4–5", remit: "Sponsors for the teams first, partners for business events, Industry Platform.", tasks: [["Shortlist kit sponsors", "doing"], ["First sports-business talk: speaker", "todo"], ["Industry Platform: partner list", "todo"]] }
  ];
  DEPTS.forEach(function (d) { d.tasks.forEach(function (t, i) { if (!state.tasks[d.id + i]) state.tasks[d.id + i] = t[1]; }); });
  var TASK_STATUS = { todo: "To do", doing: "In progress", done: "Done" };
  var METRICS = [["Applications", "Number and diversity of applications"], ["Captains", "Captain satisfaction, surveyed each semester"], ["Events", "Sports-business events and attendance"], ["Income", "Sponsorship and partnership income"], ["Social", "Social media growth, for each team"], ["Reporting", "On-time, complete budget reports"], ["Industry", "Opportunities on the Industry Platform"]];
  var CAN = { captain: { submit: 1, all: 0, validate: 0, tasks: 0, reports: 0, captains: 0, teamEdit: 1, applications: 1 }, board: { submit: 1, all: 1, validate: 1, tasks: 1, reports: 1, captains: 1, teamEdit: 1, applications: 1 }, associate: { submit: 1, all: 1, validate: 0, tasks: 1, reports: 0, captains: 0, teamEdit: 0, applications: 0 }, council: { submit: 0, all: 1, validate: 0, tasks: 0, reports: 1, captains: 0, teamEdit: 0, applications: 0 } };
  function can(k) { return !!CAN[state.user.role][k]; }
  function visTeams() { return can("all") ? TEAMS : TEAMS.filter(function (t) { return t.id === state.user.team; }); }
  function totals(id) { var o = { paid: 0, pending: 0 }; state.expenses.forEach(function (e) { if (e.team !== id) return; if (e.status === "paid") o.paid += e.amount; else if (e.status !== "rejected") o.pending += e.amount; }); return o; }
  function captainForTeam(id) { for (var i = 0; i < state.captains.length; i++) if (state.captains[i].team === id && state.captains[i].active && state.captains[i].role === "Captain") return state.captains[i]; return null; }
  function captainName(c) { return c ? (c.first + (c.last ? " " + c.last : "")) : "Unassigned"; }
  function sportsApplicationsFolder(id) { return "Applications for sports/" + id; }
  function applicationsForTeam(id) { return state.teamApplications[sportsApplicationsFolder(id)] || []; }
  function visibleSportsApplications() {
    var out = [];
    Object.keys(state.teamApplications || {}).forEach(function (folder) {
      var id = folder.replace("Applications for sports/", "");
      if (can("all") || id === state.user.team) out = out.concat(state.teamApplications[folder] || []);
    });
    return out.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  function teamInfoFor(id) { return state.teamInfo[id] || { about: "", league: "", leagueUrl: "", venue: "", contact: "" }; }
  function teamResultsFor(id) { return state.teamResults[id] || []; }
  function pill(map, k) { return '<span class="pill ' + map[k][0] + '">' + map[k][1] + "</span>"; }
  function stat(k, v, s) { return '<div class="stat"><p class="eyebrow">' + k + '</p><span class="v num">' + v + "</span><small>" + s + "</small></div>"; }
  var HUBV = [["hub-overview", "Overview"], ["hub-teams", "Teams"], ["hub-team-editor", "Team editor"], ["hub-applications", "Sports applications"], ["hub-captains", "Captains"], ["hub-expenses", "Expenses"], ["hub-departments", "Departments"], ["hub-report", "Semester report"]];

  function hubShell(view, inner) {
    var pending = state.expenses.filter(function (e) { return e.status === "requested" && (can("all") || e.team === state.user.team); }).length;
    var nav = HUBV.filter(function (v) { return (v[0] !== "hub-report" || can("reports")) && (v[0] !== "hub-captains" || can("captains")) && (v[0] !== "hub-team-editor" || can("teamEdit")) && (v[0] !== "hub-applications" || can("applications")); }).map(function (v) {
      return '<a href="#' + v[0] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + (v[0] === "hub-teams" && !can("all") ? "My team" : v[1]) + (v[0] === "hub-expenses" && pending ? '<span class="count num">' + pending + "</span>" : "") + (v[0] === "hub-applications" && visibleSportsApplications().length ? '<span class="count num">' + visibleSportsApplications().length + "</span>" : "") + "</a>";
    }).join("");
    var u = state.user, who = u.role === "captain" ? "Captain · " + tLabel(team(u.team)) : u.role === "board" ? "Board member" : u.role === "associate" ? "Associate" : "Eva Morta · Student Council";
    return '<div class="app"><aside class="rail"><div class="top"><a class="lock" href="#home" aria-label="Back to Esade Sports home">' + mono(38) + '<span>ESADE SPORTS<br>HUB</span></a><div class="history" aria-label="Page navigation"><button type="button" data-history="back" aria-label="Go back">←</button><button type="button" data-history="forward" aria-label="Go forward">→</button></div>' +
      '<div class="who"><p class="eyebrow">Signed in as admin</p><strong>' + esc(admin.email) + "</strong><small>Viewing as " + esc(who) + " · " + (u.role === "council" ? "read-only" : u.role === "captain" ? "own team only" : u.role === "associate" ? "department member" : "full access") + '</small><a class="back-site" href="#signin">Change view</a><a class="back-site" href="#home">← Public site</a><button type="button" data-signout>Sign out</button>' + langSwitch() + '</div></div>' +
      '<nav aria-label="Hub">' + nav + "</nav></aside>" +
      '<main class="main"><div class="banner"><b>Prototype</b><span>Example figures and tasks. In the live version, access comes from an approved Esade login and data from a shared database.</span></div>' + inner + "</main></div>";
  }
  function expTable(list, compact) {
    if (!list.length) return '<p class="empty">Nothing here. Every request has been handled.</p>';
    return '<div class="table-wrap"><table><thead><tr><th>Date</th>' + (can("all") ? "<th>Team</th>" : "") + '<th>Expense</th><th class="r">Amount</th><th>Status</th>' + (can("validate") ? '<th class="r">Action</th>' : "") + "</tr></thead><tbody>" +
      list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (e) {
        var act = "";
        if (can("validate")) {
          if (e.status === "requested") act = '<button class="btn sm" data-act="validated" data-id="' + e.id + '">Validate</button> <button class="btn sm" data-act="rejected" data-id="' + e.id + '">Reject</button>';
          else if (e.status === "validated") act = '<button class="btn sm solid" data-act="paid" data-id="' + e.id + '">Mark paid</button>';
        }
        return '<tr><td class="num muted">' + e.date.slice(5).split("-").reverse().join("/") + "</td>" + (can("all") ? '<td class="tname">' + esc(tLabel(team(e.team))) + "</td>" : "") +
          "<td>" + esc(e.item) + (compact ? "" : '<br><small class="muted">' + esc(e.cat) + " · by " + esc(e.by) + "</small>") + '</td><td class="r num"><strong>' + EUR.format(e.amount) + "</strong></td><td>" + pill(EXP_STATUS, e.status) + "</td>" +
          (can("validate") ? '<td class="r" style="white-space:nowrap">' + act + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function hubOverview() {
    var ts = visTeams(), budget = 0, paid = 0, pend = 0;
    ts.forEach(function (t) { var o = totals(t.id); budget += t.budget; paid += o.paid; pend += o.pending; });
    var reqs = state.expenses.filter(function (e) { return e.status === "requested" && (can("all") || e.team === state.user.team); });
    var agreed = ts.filter(function (t) { return t.status === "agreed"; }).length;
    return '<div class="ph-head"><div><p class="eyebrow">Season 2026–27</p><h1 class="display">' + (can("all") ? "Overview." : esc(tLabel(team(state.user.team))) + ".") + "</h1><p>" + (can("all") ? "Where every team and department stands today." : "Your team's budget and expenses, handled by your Finance, Media and Operations associates.") + "</p></div></div>" +
      '<div class="grid-4">' + stat("Season budget", EUR.format(budget), can("all") ? ts.length + " teams" : "Agreed with you") + stat("Paid so far", EUR.format(paid), Math.round(paid / budget * 100) + "% of budget") +
      stat("Waiting", EUR.format(pend), reqs.length + " request" + (reqs.length === 1 ? "" : "s") + " to validate") + stat(can("all") ? "Budgets agreed" : "Budget", can("all") ? agreed + " / " + ts.length : BUDGET_STATUS[ts[0].status][1], can("all") ? "with captains" : "status") + "</div>" +
      '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Requests waiting for Finance</h2><a class="btn sm" href="#hub-expenses">All expenses</a></div>' + expTable(reqs, true) + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Departments</h2><a class="btn sm" href="#hub-departments">Open</a></div><table><tbody>' +
      DEPTS.map(function (d) { var done = d.tasks.filter(function (t, i) { return state.tasks[d.id + i] === "done"; }).length; return "<tr><td><strong>" + d.name + '</strong><br><small class="muted">' + d.head + '</small></td><td class="r num">' + done + " / " + d.tasks.length + ' <span class="muted">done</span></td></tr>'; }).join("") + "</tbody></table></section></div>";
  }
  function hubTeams() {
    var ts = visTeams();
    var open = state.teamOpen || (can("all") ? null : state.user.team), detail = "";
    if (open) {
      var t = team(open), o = totals(open);
      detail = '<section class="panel" id="team-detail"><div class="panel-head"><h2>' + esc(tLabel(t)) + "</h2>" + pill(BUDGET_STATUS, t.status) + "</div>" +
        '<div class="people">' + [["Captain", captainName(captainForTeam(open)), "Runs the team"], ["Finance associate", "[Name]", "Budget and payments"], ["Media associate", "[Name]", "Social media and coverage"], ["Operations associate", "[Name]", "Bookings, kit, travel"]].map(function (p) { return '<div class="person"><p class="eyebrow">' + p[0] + "</p><strong>" + esc(p[1]) + "</strong><small>" + p[2] + "</small></div>"; }).join("") + "</div>" +
        '<p class="muted" style="margin:0">Budget ' + EUR.format(t.budget) + " · paid " + EUR.format(o.paid) + " · waiting " + EUR.format(o.pending) + " · left " + EUR.format(Math.max(0, t.budget - o.paid - o.pending)) + "</p>" +
        expTable(state.expenses.filter(function (e) { return e.team === open; }), false) + "</section>";
    }
    return '<div class="ph-head"><div><p class="eyebrow">Teams</p><h1 class="display">' + (can("all") ? "Every team." : "My team.") + "</h1><p>Each official team has a season budget agreed with its captain, and three dedicated associates.</p></div></div>" +
      '<section class="panel"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Budget</th><th class="r">Agreed</th><th class="r">Paid</th><th>Used (paid + waiting)</th></tr></thead><tbody>' +
      ts.map(function (t) { var o = totals(t.id), p = Math.min(100, o.paid / t.budget * 100), q = Math.min(100 - p, o.pending / t.budget * 100);
        return '<tr class="click" data-hteam="' + t.id + '" tabindex="0"><td class="tname">' + esc(tLabel(t)) + "</td><td>" + pill(BUDGET_STATUS, t.status) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(o.paid) + '</td><td style="width:22%"><div class="bar"><i style="width:' + p + '%"></i><i class="pend" style="left:' + p + "%;width:" + q + '%"></i></div></td></tr>'; }).join("") +
      "</tbody></table></div>" + (can("all") ? '<p class="muted" style="margin:0;font-size:12px">Select a team to see its associates and expenses.</p>' : "") + "</section>" + detail;
  }
  function hubExpenses() {
    var list = state.expenses.filter(function (e) { return can("all") || e.team === state.user.team; });
    var shown = state.hubFilter === "all" ? list : list.filter(function (e) { return e.status === state.hubFilter; });
    var form = can("submit") ? '<section class="panel"><div class="panel-head"><h2>Request a payment</h2><span class="muted" style="font-size:12px">The association pays directly. No captain fronts money.</span></div><form class="form" id="req">' +
      (can("all") ? '<label for="r-team">Team<select id="r-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label for="r-item" style="grid-column:span 2">What is it for<input id="r-item" required placeholder="e.g. Referee fees, November"></label><label for="r-cat">Category<select id="r-cat"><option>League fees</option><option>Facilities</option><option>Kit</option><option>Material</option><option>Travel</option></select></label>' +
      '<label for="r-amt">Amount (€)<input id="r-amt" type="number" min="1" step="1" required inputmode="numeric" placeholder="0"></label><div><button class="btn solid" type="submit" style="width:100%">Send request</button></div></form></section>' : "";
    return '<div class="ph-head"><div><p class="eyebrow">Expenses</p><h1 class="display">Every euro, traced.</h1><p>Every expense is linked to a team, validated by the Finance associate and the Head of Finance, then paid by the association.</p></div><div class="flow" aria-label="How an expense moves"><span>Captain or Ops request</span><span>Finance validates</span><span>Association pays</span></div></div>' + form +
      '<section class="panel"><div class="chips" role="group" aria-label="Filter by status">' + [["all", "All"], ["requested", "Requested"], ["validated", "Validated"], ["paid", "Paid"], ["rejected", "Rejected"]].map(function (c) {
        var n = c[0] === "all" ? list.length : list.filter(function (e) { return e.status === c[0]; }).length;
        return '<button class="chip" data-filter="' + c[0] + '" aria-pressed="' + (state.hubFilter === c[0]) + '">' + c[1] + ' <span class="num">' + n + "</span></button>"; }).join("") + "</div>" + expTable(shown, false) + "</section>";
  }
  function hubTeamEditor() {
    var ts = visTeams(), selected = state.teamOpen || (can("all") ? ts[0].id : state.user.team), t = team(selected), info = teamInfoFor(selected), results = teamResultsFor(selected);
    var teamField = can("all") ? '<label for="ti-team">Team<select id="ti-team">' + ts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === selected ? ' selected' : '') + '>' + esc(tLabel(x)) + '</option>'; }).join('') + '</select></label>' : '<input type="hidden" id="ti-team" value="' + esc(selected) + '">';
    var rows = results.length ? results.slice().reverse().map(function (r) { return '<tr><td class="num">' + esc(r.date) + '</td><td class="opp">' + esc(r.opponent) + '</td><td>' + esc(r.side) + '</td><td class="num"><strong>' + esc(r.score) + '</strong></td><td>' + esc(r.status) + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="muted">No manual results yet.</td></tr>';
    return '<div class="ph-head"><div><p class="eyebrow">Captain workspace</p><h1 class="display">Team editor.</h1><p>Keep your team page current: team information, league source, venue and results. Manual updates are available immediately; live league syncing can be connected once the competition provides an API or approved feed.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Team information</h2><span class="muted">Visible on the public team page</span></div><form class="form" id="team-info-form">' + teamField + '<label style="grid-column:span 2">Short description<textarea id="ti-about" rows="2" placeholder="Who the team is and what the season is about">' + esc(info.about) + '</textarea></label><label>League or tournament<input id="ti-league" value="' + esc(info.league) + '" placeholder="League name"></label><label>League page URL<input id="ti-league-url" type="url" value="' + esc(info.leagueUrl) + '" placeholder="https://..."></label><label>Home venue<input id="ti-venue" value="' + esc(info.venue) + '" placeholder="Training venue"></label><label>Team contact email<input id="ti-contact" type="email" value="' + esc(info.contact) + '" placeholder="team@esade.edu"></label><div><button class="btn solid" type="submit">Save team information</button></div></form></section>' +
      '<section class="panel"><div class="panel-head"><h2>Quick result update</h2><span class="muted">Fast manual fallback</span></div><form class="form" id="match-form"><input type="hidden" id="m-team" value="' + esc(selected) + '"><label>Date<input id="m-date" type="date" required></label><label>Opponent<input id="m-opponent" required placeholder="Opponent"></label><label>Home or away<select id="m-side"><option>Home</option><option>Away</option></select></label><label>Score<input id="m-score" placeholder="3–1"></label><label>Competition<input id="m-comp" placeholder="League or tournament"></label><label>Status<select id="m-status"><option>Final</option><option>Pending</option><option>Postponed</option></select></label><div><button class="btn solid" type="submit">Add result</button></div></form><div class="table-wrap" style="margin-top:20px"><table><thead><tr><th>Date</th><th>Opponent</th><th>Location</th><th>Score</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>League connection</h2><span class="pill info">Manual mode active</span></div><p class="muted" style="margin:0">' + esc(tLabel(t)) + ' is ready for a league page URL now. Automatic live updates require a supported league API, feed or permission from the tournament provider. Until then, captains can update results here in seconds.</p></section>' + (can("all") ? syncPanel() : "");
  }
  // Board view: where each team's results come from
  function syncPanel() {
    var rows = TEAMS.map(function (t) {
      var L = LEAGUE[t.id], n = teamResultsFor(t.id).length, src, st;
      if (L) { src = L.source + " · saved page imported " + L.updated; st = '<span class="pill warn">Stale soon</span>'; }
      else { src = n ? n + " result" + (n === 1 ? "" : "s") + " added by the captain" : "No source yet"; st = n ? '<span class="pill info">Manual only</span>' : '<span class="pill bad">No data</span>'; }
      return '<tr><td class="tname">' + esc(tLabel(t)) + "</td><td>" + esc(src) + "</td><td>" + st + "</td></tr>";
    }).join("");
    return '<section class="panel"><div class="panel-head"><h2>Results sync status</h2><span class="muted">Board view</span></div><div class="table-wrap"><table><thead><tr><th>Team</th><th>Source</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="muted" style="margin:0;font-size:12px">No team is connected to an official feed yet. UniBall and css.cat data come from pages saved by hand; manual mode stays available for every team.</p></section>';
  }
  function sportsApplicationsTable(list) {
    if (!list.length) return '<p class="empty">No sports applications have been submitted for this folder yet.</p>';
    return '<div class="table-wrap"><table><thead><tr><th>Applicant</th>' + (can("all") ? "<th>Team</th>" : "") + '<th>Application</th><th>Programme / level</th><th>Received</th><th>Status</th></tr></thead><tbody>' + list.map(function (a) {
      return '<tr><td><strong>' + esc(a.first + " " + a.last) + '</strong><br><small class="muted">' + esc(a.email) + ' · ' + esc(a.phone) + '</small></td>' + (can("all") ? '<td class="tname">' + esc(a.teamLabel) + '</td>' : '') + '<td>' + esc(a.type) + '<br><small class="muted">' + esc(a.folder) + '</small></td><td>' + esc(a.programme || "Esade student") + '<br><small class="muted">' + esc(a.level || "Level not specified") + '</small></td><td class="num muted">' + esc(a.createdAt) + '</td><td><span class="pill info">' + esc(a.status || "New") + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function hubApplications() {
    var apps = visibleSportsApplications(), t = state.user.role === "captain" ? team(state.user.team) : null, recipient = t ? captainForTeam(t.id) : null;
    return '<div class="ph-head"><div><p class="eyebrow">Applications for sports</p><h1 class="display">Try-outs inbox.</h1><p>' + (t ? 'Applications for ' + esc(tLabel(t)) + ' are routed to you as captain.' : 'Board view across every sports application folder. Each captain sees only applications for their own team.') + '</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>' + (t ? 'Your team applications' : 'All team applications') + '</h2><span class="muted num">' + apps.length + ' received</span></div><p class="muted" style="margin:0 0 18px">Folder: <strong>' + esc(t ? sportsApplicationsFolder(t.id) : 'Applications for sports/*') + '</strong>' + (recipient ? ' · Captain recipient: <strong>' + esc(captainName(recipient)) + ' · ' + esc(recipient.email) + '</strong>' : '') + '</p>' + sportsApplicationsTable(apps) + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Routing rule</h2><span class="pill ok">Active in prototype</span></div><p class="muted" style="margin:0">When a student applies to a team, their try-out or coaching information is stored in that team’s Applications for sports folder and is visible to the active captain for that team. In production, this same event should also send the captain a notification email.</p></section>';
  }
  function hubCaptains() {
    var active = state.captains.filter(function (c) { return c.active; });
    var rows = active.map(function (c) {
      return '<tr><td><strong>' + esc(captainName(c)) + '</strong><br><small class="muted">' + esc(c.email) + '</small></td><td class="tname">' + esc(tLabel(team(c.team))) + '</td><td>' + esc(c.role) + '</td><td>' + esc(c.programme) + '</td><td class="num">' + esc(c.start) + '</td><td class="r"><button class="btn sm" data-captain-deactivate="' + c.id + '">Deactivate</button></td></tr>';
    }).join("");
    return '<div class="ph-head"><div><p class="eyebrow">Board workspace</p><h1 class="display">Captains.</h1><p>One current record for every team, with a clear owner, role and start date. This demo stores changes in this browser; production data should move to the shared database.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Active captains</h2><span class="muted">' + active.length + ' records</span></div><div class="table-wrap"><table><thead><tr><th>Captain</th><th>Team</th><th>Role</th><th>Programme</th><th>Since</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Add a captain</h2><span class="muted">Board only</span></div><form class="form" id="captain-form"><label>First name<input id="c-first" required placeholder="First name"></label><label>Last name<input id="c-last" required placeholder="Last name"></label><label>Email<input id="c-email" type="email" required placeholder="name@esade.edu"></label><label>Team<select id="c-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + '</option>'; }).join('') + '</select></label><label>Role<select id="c-role"><option>Captain</option><option>Vice-captain</option></select></label><label>Programme<input id="c-programme" required placeholder="BBA, MSc..."></label><div><button class="btn solid" type="submit">Add captain</button></div></form></section>';
  }
  function hubDepts() {
    return '<div class="ph-head"><div><p class="eyebrow">One Board, four departments</p><h1 class="display">Departments.</h1><p>Who leads each department, what it is responsible for, and where its work stands.' + (can("tasks") ? "" : " Read-only for your role.") + "</p></div></div>" +
      '<div class="dept-grid">' + DEPTS.map(function (d) {
        return '<section class="dept"><div class="dept-title"><h2>' + d.name + "</h2><small>" + d.size + ' people</small></div><div class="panel"><p style="margin:0"><strong>' + d.head + '</strong><br><span class="muted">' + d.remit + '</span></p><ul class="tasks">' +
          d.tasks.map(function (t, i) { var k = d.id + i, s = state.tasks[k];
            return "<li><span>" + esc(t[0]) + "</span>" + (can("tasks") ? '<select data-task="' + k + '" aria-label="Status of ' + esc(t[0]) + '">' + Object.keys(TASK_STATUS).map(function (o) { return '<option value="' + o + '"' + (o === s ? " selected" : "") + ">" + TASK_STATUS[o] + "</option>"; }).join("") + "</select>" : '<span class="pill ' + (s === "done" ? "ok" : s === "doing" ? "info" : "warn") + '">' + TASK_STATUS[s] + "</span>") + "</li>"; }).join("") + "</ul></div></section>";
      }).join("") + "</div>";
  }
  function hubReport() {
    var budget = 0, paid = 0; TEAMS.forEach(function (t) { budget += t.budget; paid += totals(t.id).paid; });
    return '<div class="ph-head"><div><p class="eyebrow">For the Student Council · Semester 1, 2026–27</p><h1 class="display">Semester report.</h1><p>The budget report shared with the Student Council every semester, and the seven metrics the association reports on. No targets at this stage.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Budget by team</h2><span class="muted num">' + EUR.format(paid) + " paid of " + EUR.format(budget) + '</span></div><div class="table-wrap"><table><thead><tr><th>Team</th><th class="r">Budget</th><th class="r">Paid</th><th class="r">Waiting</th><th class="r">Left</th></tr></thead><tbody>' +
      TEAMS.map(function (t) { var o = totals(t.id); return '<tr><td class="tname">' + esc(tLabel(t)) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(o.paid) + '</td><td class="r num">' + EUR.format(o.pending) + '</td><td class="r num">' + EUR.format(Math.max(0, t.budget - o.paid - o.pending)) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<section style="display:grid;gap:12px"><h2 style="margin:0;font-size:15px;font-weight:800">Seven metrics</h2><ul class="metrics">' + METRICS.map(function (m) { return '<li class="metric"><p class="eyebrow">' + m[0] + "</p><strong>—</strong><small>" + m[1] + "</small></li>"; }).join("") + '</ul><p class="muted" style="margin:0;font-size:12px">Metrics fill in once the association is running. Shown empty on purpose.</p></section>';
  }
  function bindHub() {
    hub.querySelectorAll("[data-history]").forEach(function (b) { b.addEventListener("click", function () {
      if (b.getAttribute("data-history") === "back") history.back(); else history.forward();
    }); });
    hub.querySelectorAll("[data-signout]").forEach(function (b) { b.addEventListener("click", function () {
      signOut();
    }); });
    hub.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () {
      var id = +b.getAttribute("data-id"), a = b.getAttribute("data-act");
      state.expenses.forEach(function (e) { if (e.id === id) e.status = a; }); save(); render();
      toast(a === "validated" ? "Validated. Ready to pay." : a === "paid" ? "Marked as paid." : "Request rejected."); }); });
    hub.querySelectorAll("[data-hteam]").forEach(function (r) {
      function open() { state.teamOpen = r.getAttribute("data-hteam"); render(); var d = $("team-detail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      r.addEventListener("click", open); r.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
    hub.querySelectorAll("[data-filter]").forEach(function (c) { c.addEventListener("click", function () { state.hubFilter = c.getAttribute("data-filter"); render(); }); });
    hub.querySelectorAll("[data-task]").forEach(function (s) { s.addEventListener("change", function () { state.tasks[s.getAttribute("data-task")] = s.value; save(); toast("Task updated."); }); });
    var f = $("req"); if (f) f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var amt = Math.round(+$("r-amt").value), item = $("r-item").value.trim(); if (!item || !(amt > 0)) return;
      state.expenses.push({ id: state.nextId++, team: $("r-team") ? $("r-team").value : state.user.team, item: item, cat: $("r-cat").value, amount: amt, by: state.user.role === "captain" ? "Captain" : state.user.role === "associate" ? "Associate" : "Board", date: "2026-11-12", status: "requested" });
      state.hubFilter = "all"; save(); render(); toast("Request sent to Finance.");
    });
    hub.querySelectorAll("[data-captain-deactivate]").forEach(function (b) { b.addEventListener("click", function () {
      var id = +b.getAttribute("data-captain-deactivate"); state.captains.forEach(function (c) { if (c.id === id) c.active = false; }); save(); render(); toast("Captain deactivated.");
    }); });
    var cf = $("captain-form"); if (cf) cf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      state.captains.push({ id: state.nextId++, first: $("c-first").value.trim(), last: $("c-last").value.trim(), email: $("c-email").value.trim(), team: $("c-team").value, role: $("c-role").value, programme: $("c-programme").value.trim(), start: "2026-11-12", active: true });
      save(); render(); toast("Captain added.");
    });
    var tif = $("team-info-form"); if (tif) tif.addEventListener("submit", function (ev) {
      ev.preventDefault(); var id = $("ti-team").value;
      state.teamInfo[id] = { about: $("ti-about").value.trim(), league: $("ti-league").value.trim(), leagueUrl: $("ti-league-url").value.trim(), venue: $("ti-venue").value.trim(), contact: $("ti-contact").value.trim() };
      state.teamOpen = id; save(); render(); toast("Team information saved.");
    });
    var mf = $("match-form"); if (mf) mf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var id = $("m-team").value;
      if (!state.teamResults[id]) state.teamResults[id] = [];
      state.teamResults[id].push({ date: $("m-date").value, opponent: $("m-opponent").value.trim(), side: $("m-side").value, score: $("m-score").value.trim(), status: $("m-status").value, competition: $("m-comp").value.trim() });
      if ($("m-status").value === "Final" && !$("m-score").value.trim()) { state.teamResults[id].pop(); toast("Add the score for a final result."); return; }
      state.teamOpen = id; save(); render(); toast("Result added.");
    });
  }

  function langSwitch() { return '<div class="lang" role="group" aria-label="Language">' + ["en", "ca", "es"].map(function (l) { return '<button type="button" data-lang="' + l + '" aria-pressed="' + (window.__lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("") + "</div>"; }
  // ================= Router =================
  function go(h) { if (location.hash.slice(1) === h) render(); else location.hash = h; }
  function show(which) {
    pub.hidden = which !== "pub"; page.hidden = which !== "page"; hub.hidden = which !== "hub";
    siteHead.hidden = which === "hub"; siteFoot.hidden = which === "hub";
  }
  function render() {
    var h = location.hash.slice(1), html = null;
    document.querySelector(".head").classList.remove("open");
    if (h.indexOf("hub-") === 0) {
      if (admin === undefined) { page.innerHTML = '<section class="band"><div class="wrap"><p class="eyebrow">Hub</p><h1 class="display">Checking your login…</h1></div></section>'; show("page"); return; }
      if (!admin) { location.replace("#signin"); return; }
      if (!isHub()) { state.user = { role: "board", team: null }; save(); renderAcct(); }
      if (h === "hub-report" && !can("reports")) h = "hub-overview";
      if (h === "hub-captains" && !can("captains")) h = "hub-overview";
      if (h === "hub-team-editor" && !can("teamEdit")) h = "hub-overview";
      if (h === "hub-applications" && !can("applications")) h = "hub-overview";
      var inner = h === "hub-teams" ? hubTeams() : h === "hub-team-editor" ? hubTeamEditor() : h === "hub-applications" ? hubApplications() : h === "hub-captains" ? hubCaptains() : h === "hub-expenses" ? hubExpenses() : h === "hub-departments" ? hubDepts() : h === "hub-report" ? hubReport() : hubOverview();
      hub.innerHTML = hubShell(h, inner); show("hub"); bindHub(); return;
    }
    if (h === "signin") html = signinView();
    else if (h === "alumni-signin") html = alumniSigninView();
    else if (h.indexOf("team-") === 0 && parseTeam(h)) { var pt = parseTeam(h); html = teamView(pt.t, pt.tab); }
    else if (h === "alumni") html = alumniView();
    else if (h === "apply-associate") html = applyAssociateView();
    else if (h === "apply" || h.indexOf("apply-") === 0) html = applyView(h);
    else if (h === "my-profile") html = formView();
    else if (h === "privacy") html = privacyView();
    else if (h === "alumni-verify") html = verifyView();
    else if (h.indexOf("alumni-") === 0) {
      var id = h.slice(7), a = null;
      if (id === "me" && state.me) a = state.me; else allAlumni().forEach(function (x) { if (x.id === id) a = x; });
      html = a ? (a.id === "me" && a.verified === false ? pendingNote() : "") + profileView(a) : alumniView();
    }
    if (html !== null) {
      page.innerHTML = html; show("page");
      if (h === "signin") bindSignin();
      if (h === "alumni-signin") bindAlumniSignin();
      if (h === "alumni") bindAlumni();
      if (h === "my-profile") bindForm();
      if (h === "alumni-verify") bindVerify();
      if (h === "apply-associate") bindAssociateApply();
      if (h === "apply" || h.indexOf("apply-") === 0) bindApply();
      page.querySelectorAll("[data-copy]").forEach(function (b) { b.addEventListener("click", function () {
        var v = b.getAttribute("data-copy");
        Promise.resolve().then(function () { return navigator.clipboard.writeText(v); }).then(function () { toast("Copied."); }, function () { var dd = b.previousElementSibling, r = document.createRange(); r.selectNodeContents(dd); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selected. Press Ctrl+C to copy."); });
      }); });
      page.querySelectorAll("[data-jump]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); var t = $(a.getAttribute("data-jump")); if (t) t.scrollIntoView({ behavior: "smooth" }); }); });
      page.querySelectorAll("[data-sport]").forEach(function (a) { a.addEventListener("click", function () { state.al.sport = a.getAttribute("data-sport"); }); });
      window.scrollTo(0, 0); return;
    }
    show("pub");
    var target = h && h !== "home" ? $(h) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }
  function bindAlumni() {
    if (!$("al-cards")) return;
    drawCards();
    $("al-q").addEventListener("input", function (e) { state.al.q = e.target.value; drawCards(); });
    $("al-year").addEventListener("change", function (e) { state.al.year = e.target.value; drawCards(); });
    page.querySelectorAll("[data-sp]").forEach(function (b) { b.addEventListener("click", function () {
      state.al.sport = b.getAttribute("data-sp"); page.querySelectorAll("[data-sp]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); drawCards(); }); });
  }

  // Header menu
  var head = document.querySelector(".head"), burger = $("burger");
  burger.addEventListener("click", function () { var o = head.classList.toggle("open"); burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Close menu" : "Open menu"); });
  // Home fixtures tabs
  var tabs = [["tab-up", "list-up"], ["tab-res", "list-res"]];
  tabs.forEach(function (p) { $(p[0]).addEventListener("click", function () { tabs.forEach(function (q) { var on = q[0] === p[0]; $(q[0]).setAttribute("aria-selected", on); $(q[1]).hidden = !on; }); }); });

  document.addEventListener("click", function (e) { document.querySelectorAll("details.more[open]").forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
  document.addEventListener("click", function (e) {
    var row = e.target.closest && e.target.closest(".match-button[data-match-id]");
    if (row) openMatch(row.getAttribute("data-match-id"));
    if (e.target.closest && e.target.closest("[data-match-close]")) closeMatch();
  });
  document.addEventListener("keydown", function (e) {
    var row = e.target.closest && e.target.closest(".match-button[data-match-id]");
    if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMatch(row.getAttribute("data-match-id")); }
    if (e.key === "Escape") closeMatch();
  });
  var pf = $("partner-form");
  pf.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!$("p-company").value.trim() || !$("p-name").value.trim() || !$("p-email").value.trim()) { $("p-err").hidden = false; return; }
    if (backend && backend.submitPartnerInquiry) backend.submitPartnerInquiry({
      company: $("p-company").value.trim(), name: $("p-name").value.trim(), email: $("p-email").value.trim(),
      interest: $("p-type").value, message: $("p-msg").value.trim() || undefined
    });
    var subject = "Esade Sports partnership proposal — " + $("p-company").value.trim();
    var body = "Company: " + $("p-company").value.trim() + "\nName: " + $("p-name").value.trim() + "\nWork email: " + $("p-email").value.trim() + "\nInterested in: " + $("p-type").value + "\n\n" + $("p-msg").value.trim();
    window.location.href = "mailto:esadesports@alumni.esade.edu?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    pf.hidden = true; $("p-done").hidden = false;
  });
  function signOut() {
    if (state.user && HUB_ROLES[state.user.role]) state.user = null;
    save();
    Promise.resolve(backend && backend.signOut ? backend.signOut() : null).catch(console.error);
    setAdmin(null); go("home"); toast("Signed out.");
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#member [data-signout]")) signOut();
  });
  function setAdmin(a) {
    if (a === admin || (a && admin && a.email === admin.email)) return;
    admin = a;
    if (!admin && state.user && HUB_ROLES[state.user.role]) { state.user = null; save(); }
    renderAcct();
    var h = location.hash.slice(1);
    if (h === "signin" || h.indexOf("hub-") === 0) render();
  }
  // Hero photo slideshow: auto-advances every 3.4 s, arrows/keys go back and forth, pauses on hover/focus, swipe on touch, still if reduced motion is on.
  (function () {
    var box = $("hero-slides"); if (!box) return;
    var slides = box.querySelectorAll(".slide"), dots = box.querySelectorAll("[data-slide]"), cur = 0, timer = null, paused = false;
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("on", k === cur); s.setAttribute("aria-hidden", k !== cur); });
      dots.forEach(function (d, k) { d.setAttribute("aria-pressed", k === cur); });
    }
    function start() { stop(); if (!still) timer = setInterval(function () { if (!paused && !document.hidden) show(cur + 1); }, 3400); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    dots.forEach(function (d) { d.addEventListener("click", function () { show(+d.getAttribute("data-slide")); start(); }); });
    box.querySelectorAll("[data-step]").forEach(function (b) { b.addEventListener("click", function () { show(cur + +b.getAttribute("data-step")); start(); }); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); show(cur + (e.key === "ArrowLeft" ? -1 : 1)); start(); }
    });
    box.addEventListener("mouseenter", function () { paused = true; });
    box.addEventListener("mouseleave", function () { paused = false; });
    box.addEventListener("focusin", function () { paused = true; });
    box.addEventListener("focusout", function () { paused = false; });
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { show(cur + (dx < 0 ? 1 : -1)); start(); }
    });
    start();
  })();
  window.addEventListener("hashchange", function () { state.teamOpen = null; render(); });
  renderAcct(); render();
  return { setAdmin: setAdmin };

}
