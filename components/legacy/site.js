/* eslint-disable */
import { SPORT_IMAGES } from "@/lib/images";
import { BOARD_BLOCK } from "./markup";
import { GAMES } from "./games";
import { EVENTS } from "./events";
// Ported from the original prototype script. Runs once on the client after the markup mounts.
export function initSite(backend, tools) {

  "use strict";
  var EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var $ = function (id) { return document.getElementById(id); };
  var REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var pub = $("public"), page = $("page"), hub = $("hub"), siteHead = $("top"), siteFoot = $("site-foot");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mono(w) { return '<svg class="mono" style="width:' + w + 'px" viewBox="0 0 132 72" aria-hidden="true"><use href="#es"/></svg>'; }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  // ================= Games (one source: components/legacy/games.js) =================
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function gDate(g) { var p = g.date.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function gameById(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }
  function gTeams(g) { return g.score ? g.home + " " + g.score + " " + g.away : g.home + " vs " + g.away; }
  function gLong(g) { var d = gDate(g); return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function gShort(g) { var d = gDate(g); return DAYS[d.getDay()].slice(0, 3) + " " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  function gStatus(g) {
    if (!g.score) return "Upcoming · " + g.side;
    var sc = g.score.split("–"), esadeHome = g.home.indexOf("Esade") === 0, us = +(esadeHome ? sc[0] : sc[1]), them = +(esadeHome ? sc[1] : sc[0]);
    return "Final · " + (us > them ? "Esade won " : us < them ? "Esade lost " : "Draw ") + g.score;
  }
  function gameRow(g) {
    return '<li class="row match-button" data-match-id="' + g.id + '" role="button" tabindex="0" aria-label="View ' + esc(g.sport) + ' match details"><span class="when"><b>' + gShort(g) + "</b>" + (g.score ? "Final" : g.time) + '</span><span class="match"><span class="sport">' + esc(g.sport) + (g.example ? ' <em class="ex">Example</em>' : "") + '</span><div class="teamsline">' + esc(gTeams(g)) + '</div><span class="where">' + esc(g.venue) + "</span></span>" + (g.score ? '<span class="score">' + esc(g.score) + "</span>" : '<span class="tag">' + g.side + "</span>") + "</li>";
  }
  // Home lists: upcoming = no score yet (soonest first), results = played (latest first).
  (function () {
    var up = GAMES.filter(function (g) { return !g.score; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var res = GAMES.filter(function (g) { return g.score; }).sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    if ($("list-up")) $("list-up").innerHTML = up.slice(0, 5).map(gameRow).join("");
    if ($("list-res")) $("list-res").innerHTML = res.slice(0, 5).map(gameRow).join("");
  })();

  // ================= Events (one source: components/legacy/events.js) =================
  function upcomingEvents() {
    var today = ymd(new Date());
    return EVENTS.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  }
  function eWhen(e) { return gLong(e) + " · " + e.time; }
  function eTitleHtml(e) { var w = e.title.split(" "); return esc(w.length > 1 ? w.slice(0, -1).join(" ") : w[0]) + (w.length > 1 ? "<br>" + esc(w[w.length - 1]) : "") + "."; }
  function eventCard(e) {
    return '<article class="event"><div class="title"><p class="eyebrow">' + esc(e.kind) + (e.example ? ' · <em class="ex">Example</em>' : "") + '</p><h3 class="display">' + eTitleHtml(e) + "</h3></div>" +
      '<dl><div><dt>When</dt><dd>' + esc(gShort(e)) + " · " + e.time + '</dd></div><div><dt>Where</dt><dd>' + esc(e.place) + '</dd></div><div><dt>Price</dt><dd><b class="price">' + esc(e.price) + "</b></dd></div></dl>" +
      '<p>' + esc(e.summary) + ' <a class="link-arrow" href="#all-events">Details →</a></p></article>';
  }
  if ($("events") && $("events").querySelector(".events")) $("events").querySelector(".events").innerHTML = upcomingEvents().slice(0, 3).map(eventCard).join("");
  function eventsView() {
    var list = upcomingEvents();
    return '<section class="band"><div class="wrap"><p class="eyebrow">Events</p><h1 class="display">All<br>events.</h1><p>Runs, tournaments, talks and get-togethers in the Esade Sports community. Everyone is welcome: check the price and sign up below.</p></div></section>' +
      '<section class="sec ev-sec"><div class="wrap"><ol class="ev-list">' + (list.length ? list.map(function (e) {
        return '<li class="ev" id="ev-' + e.id + '"><div class="ev-date"><b>' + gDate(e).getDate() + "</b><span>" + MONTHS[gDate(e).getMonth()].slice(0, 3) + "</span><small>" + e.time + "</small></div>" +
          '<div class="ev-body"><p class="eyebrow">' + esc(e.kind) + (e.example ? ' · <em class="ex">Example</em>' : "") + '</p><h2 class="ev-title">' + esc(e.title) + "</h2>" +
          (e.tagline ? '<p class="ev-tag">' + esc(e.tagline) + "</p>" : "") + "<p>" + esc(e.summary) + "</p>" + (e.details ? '<p class="muted">' + esc(e.details) + "</p>" : "") +
          '<dl class="ev-facts"><div><dt>When</dt><dd>' + esc(eWhen(e)) + '</dd></div><div><dt>Where</dt><dd>' + esc(e.place) + '</dd></div><div><dt>Organised by</dt><dd>' + esc(e.organiser) + '</dd></div><div><dt>Price</dt><dd><b class="price">' + esc(e.price) + "</b>" + (e.priceNote ? " · " + esc(e.priceNote) : "") + "</dd></div></dl>" +
          (e.signup ? '<a class="btn btn-blue" href="' + esc(e.signup) + '" target="_blank" rel="noopener noreferrer">Sign up</a>' : '<span class="muted" style="font-size:13px">Sign-ups open soon.</span>') + "</div></li>";
      }).join("") : '<li class="muted">No upcoming events yet.</li>') + "</ol></div></section>";
  }

  // .ics file for "Add to calendar" (2-hour slot, Europe/Madrid local time).
  function icsFor(g) {
    var d = g.date.replace(/-/g, ""), t = g.time.replace(":", "") + "00", h = +g.time.slice(0, 2) + 2;
    var end = String(Math.min(h, 23)).padStart(2, "0") + g.time.slice(3) + "00";
    var clean = function (x) { return String(x).replace(/[,;\\]/g, "\\$&"); };
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Esade Sports//Games//EN", "BEGIN:VEVENT", "UID:" + g.id + "@esadesports", "DTSTAMP:" + d + "T000000Z",
      "DTSTART;TZID=Europe/Madrid:" + d + "T" + t, "DTEND;TZID=Europe/Madrid:" + d + "T" + end, "SUMMARY:" + clean(g.sport + ": " + g.home + " vs " + g.away),
      "LOCATION:" + clean(g.venue), "DESCRIPTION:" + clean(g.competition), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }
  function openMatch(id) {
    var g = gameById(id), modal = $("match-modal");
    if (!g || !modal) return;
    $("match-modal-sport").textContent = g.sport + (g.example ? " · Example" : "");
    $("match-modal-title").textContent = gTeams(g);
    $("match-modal-meta").textContent = gLong(g) + " · " + g.time;
    $("match-modal-location").textContent = g.venue;
    $("match-modal-league").textContent = g.competition;
    $("match-modal-status").textContent = gStatus(g);
    var ics = $("match-modal-ics");
    if (ics) {
      ics.hidden = !!g.score;
      if (!g.score) { ics.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(icsFor(g)); ics.setAttribute("download", "esade-sports-" + g.id + ".ics"); }
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  // ================= Full calendar (#calendar) =================
  var cal = { month: null, view: "month", team: "" };
  function calendarView() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    if (!cal.month) {
      var next = GAMES.filter(function (g) { return gDate(g) >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
      cal.month = next ? new Date(gDate(next).getFullYear(), gDate(next).getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
    }
    var y = cal.month.getFullYear(), m = cal.month.getMonth();
    var games = GAMES.filter(function (g) { return !cal.team || g.team === cal.team; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var teamsWithGames = TEAMS.filter(function (t) { return GAMES.some(function (g) { return g.team === t.id; }); });
    var head = '<section class="band"><div class="wrap"><p class="eyebrow">Game schedules</p><h1 class="display">Full<br>calendar.</h1><p>Every Esade Sports game on the website: date, time, place and result. Games marked Example are placeholders until captains add the real ones.</p></div></section>';
    var bar = '<div class="cal-bar"><div class="cal-nav"><button type="button" class="btn btn-ghost-navy sm" data-cal="prev" aria-label="Previous month">←</button><h2 class="cal-title">' + MONTHS[m] + " " + y + '</h2><button type="button" class="btn btn-ghost-navy sm" data-cal="next" aria-label="Next month">→</button><button type="button" class="btn btn-ghost-navy sm" data-cal="today">Today</button></div>' +
      '<div class="cal-tools"><label class="field" for="cal-team">Team<select id="cal-team"><option value="">All teams</option>' + teamsWithGames.map(function (t) { return '<option value="' + t.id + '"' + (cal.team === t.id ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" +
      '<div class="cal-toggle" role="group" aria-label="View"><button type="button" data-calview="month" aria-pressed="' + (cal.view === "month") + '">Month</button><button type="button" data-calview="list" aria-pressed="' + (cal.view === "list") + '">List</button></div></div></div>';
    var body;
    if (cal.view === "list") {
      var inMonth = games.filter(function (g) { var d = gDate(g); return d.getFullYear() === y && d.getMonth() === m; });
      body = inMonth.length ? '<ul class="rows cal-list">' + inMonth.map(gameRow).join("") + "</ul>" : '<p class="muted cal-empty">No games this month.</p>';
    } else {
      var first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7)), cells = "";
      for (var k = 0; k < 42; k++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k), key = ymd(d);
        if (k === 35 && d.getMonth() !== m) break;
        var dayGames = games.filter(function (g) { return g.date === key; });
        var dayEvents = cal.team ? [] : EVENTS.filter(function (e) { return e.date === key; });
        cells += '<div class="cal-day' + (d.getMonth() !== m ? " out" : "") + (d.getTime() === today.getTime() ? " today" : "") + '"><span class="cal-num">' + d.getDate() + "</span>" +
          dayGames.map(function (g) { return '<button type="button" class="cal-game' + (g.score ? " played" : "") + '" data-match-id="' + g.id + '"><b>' + (g.score ? g.score : g.time) + "</b> " + esc(g.sport) + (g.example ? " <em>Ex.</em>" : "") + "</button>"; }).join("") +
          dayEvents.map(function (e) { return '<a class="cal-game cal-event" href="#all-events"><b>' + e.time + "</b> " + esc(e.title) + "</a>"; }).join("") + "</div>";
      }
      body = '<div class="cal-grid" role="grid"><div class="cal-wd">Mon</div><div class="cal-wd">Tue</div><div class="cal-wd">Wed</div><div class="cal-wd">Thu</div><div class="cal-wd">Fri</div><div class="cal-wd">Sat</div><div class="cal-wd">Sun</div>' + cells + "</div>";
    }
    return head + '<section class="sec cal-sec"><div class="wrap">' + bar + body + '<p class="muted cal-note"><span class="cal-key"></span> Games: click one for details and to add it to your own calendar. <span class="cal-key ev"></span> Community events.</p></div></section>';
  }
  function bindCalendar() {
    page.querySelectorAll("[data-cal]").forEach(function (b) { b.addEventListener("click", function () {
      var a = b.getAttribute("data-cal"), t = new Date();
      cal.month = a === "today" ? new Date(t.getFullYear(), t.getMonth(), 1) : new Date(cal.month.getFullYear(), cal.month.getMonth() + (a === "next" ? 1 : -1), 1);
      render();
    }); });
    page.querySelectorAll("[data-calview]").forEach(function (b) { b.addEventListener("click", function () { cal.view = b.getAttribute("data-calview"); render(); }); });
    $("cal-team").addEventListener("change", function (e) { cal.team = e.target.value; render(); });
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
    return '<li><a class="team" href="#team-' + t.id + '"><img class="team-img" src="' + SPORT_IMAGES[t.sport] + '" alt="" loading="lazy"><span class="name"><strong>' + esc(t.name) + "</strong><small>" + esc(tSquad(t)) + "</small></span></a></li>";
  }).join("");

  // ================= Alumni data (examples) =================
  var ALUMNI = [
    { id: "1", first: "Lucía", last: "Ferrer", nationality: "Spanish", programme: "BBA", grad: 2023, exUni: "University of Michigan", exDomain: "umich.edu", exCity: "Ann Arbor, USA", inCo: "Football club", inRole: "Partnerships intern", assos: "Esade Sports", sports: ["Football 7"], linkedin: "linkedin.com/in/example-lucia", interns: [["Sports marketing agency", "Marketing intern", "2021"]], phone: "+34 600 000 001", esade: "lucia.ferrer@esade.example", perso: "lucia.ferrer@example.com", active: false },
    { id: "2", first: "Marco", last: "Bianchi", nationality: "Italian", programme: "BBA", grad: 2022, exUni: "National University of Singapore", exDomain: "nus.edu.sg", exCity: "Singapore", inCo: "Sports data start-up", inRole: "Business analyst intern", assos: "Esade Sports, Finance club", sports: ["Basketball"], linkedin: "linkedin.com/in/example-marco", interns: [], phone: "+39 300 000 002", esade: "marco.bianchi@esade.example", perso: "marco.b@example.com", active: false },
    { id: "3", first: "Sophie", last: "Laurent", nationality: "French", programme: "Double degree BBA + Law", grad: 2024, exUni: "McGill University", exDomain: "mcgill.ca", exCity: "Montréal, Canada", inCo: "Sports law firm", inRole: "Legal intern", assos: "Esade Sports", sports: ["Volleyball"], linkedin: "", interns: [["Event agency", "Operations intern", "2022"]], phone: "+33 6 00 00 00 03", esade: "sophie.laurent@esade.example", perso: "sophie.l@example.com", active: true },
    { id: "4", first: "Daniel", last: "Okafor", nationality: "Nigerian", programme: "BBA", grad: 2021, exUni: "Copenhagen Business School", exDomain: "cbs.dk", exCity: "Copenhagen, Denmark", inCo: "Sportswear brand", inRole: "Brand intern", assos: "Esade Sports", sports: ["Football 7", "Futsal"], linkedin: "linkedin.com/in/example-daniel", interns: [], phone: "+44 7000 000004", esade: "daniel.okafor@esade.example", perso: "d.okafor@example.com", active: false },
    { id: "5", first: "Hannah", last: "Schmidt", nationality: "German", programme: "BBA", grad: 2025, exUni: "University of Sydney", exDomain: "sydney.edu.au", exCity: "Sydney, Australia", inCo: "Tennis tournament organiser", inRole: "Event operations intern", assos: "Esade Sports", sports: ["Padel"], linkedin: "linkedin.com/in/example-hannah", interns: [["Consultancy", "Summer analyst", "2023"]], phone: "+49 150 0000005", esade: "hannah.schmidt@esade.example", perso: "", active: true },
    { id: "6", first: "Javier", last: "Ruiz", nationality: "Spanish", programme: "BBA", grad: 2020, exUni: "Bocconi University", exDomain: "unibocconi.it", exCity: "Milan, Italy", inCo: "Investment bank", inRole: "Summer analyst", assos: "Esade Sports", sports: ["Basketball"], linkedin: "linkedin.com/in/example-javier", interns: [], phone: "+34 600 000 006", esade: "javier.ruiz@esade.example", perso: "jruiz@example.com", active: false },
    { id: "7", first: "Emma", last: "Johansson", nationality: "Swedish", programme: "BBA", grad: 2024, exUni: "University of Texas at Austin", exDomain: "utexas.edu", exCity: "Austin, USA", inCo: "Sports media company", inRole: "Content intern", assos: "Esade Sports", sports: ["Volleyball"], linkedin: "", interns: [], phone: "+46 70 000 0007", esade: "emma.johansson@esade.example", perso: "emma.j@example.com", active: false },
    { id: "8", first: "Tomás", last: "Silva", nationality: "Portuguese", programme: "BBA", grad: 2023, exUni: "HEC Montréal", exDomain: "hec.ca", exCity: "Montréal, Canada", inCo: "Football league", inRole: "Commercial intern", assos: "Esade Sports", sports: ["Futsal"], linkedin: "linkedin.com/in/example-tomas", interns: [["Retail group", "Sales intern", "2021"]], phone: "+351 900 000 008", esade: "tomas.silva@esade.example", perso: "", active: false },
    { id: "9", first: "Chloé", last: "Martin", nationality: "Belgian", programme: "BBA", grad: 2025, exUni: "Fudan University", exDomain: "fudan.edu.cn", exCity: "Shanghai, China", inCo: "Sports sponsorship agency", inRole: "Account intern", assos: "Esade Sports", sports: ["Padel", "Volleyball"], linkedin: "linkedin.com/in/example-chloe", interns: [], phone: "+32 470 00 00 09", esade: "chloe.martin@esade.example", perso: "chloe.m@example.com", active: true }
  ];
  ALUMNI.forEach(function (a, i) {
    a.example = true;
    a.headline = ["Sports marketing intern · FC Barcelona", "Business analyst · sports data start-up", "Law student · sports regulation", "Brand strategy intern · sportswear", "Event operations intern · tennis circuit", "Investment banking analyst", "Content intern · sports media", "Commercial intern · football league", "Account intern · sponsorship agency"][i] || (a.inRole + " · " + a.inCo);
    a.esadeRole = i === 0 ? "Football 7 · Former player" : i === 2 ? "Volleyball · Active member" : i === 8 ? "Padel · Volleyball · Active member" : "Esade Sports · Former member";
  });

  // ================= State =================
  var state = { user: null, me: null, expenses: null, captains: null, teamApplications: {}, teamInfo: {}, teamResults: {}, tasks: {}, checkups: [], rosters: {}, deckNotes: {}, nextId: 100, al: { q: "", sport: "All", year: "" }, hubFilter: "all", appFilter: "all", teamOpen: null };
  try {
    var s = JSON.parse(localStorage.getItem("es-site") || "null");
    if (s && s.v === 2) { state.user = s.user && s.user.role === "alumni" ? null : s.user; state.expenses = s.expenses; state.captains = s.captains || null; state.teamApplications = s.teamApplications || {}; state.teamInfo = s.teamInfo || {}; state.teamResults = s.teamResults || {}; state.tasks = s.tasks || {}; state.newTasks = s.newTasks || []; state.checkups = s.checkups || []; state.rosters = s.rosters || {}; state.deckNotes = s.deckNotes || {}; state.ideas = s.ideas || null; state.nextId = s.nextId || 100; }
  } catch (e) {}
  function save() { try { localStorage.setItem("es-site", JSON.stringify({ v: 2, user: state.user, expenses: state.expenses, captains: state.captains, teamApplications: state.teamApplications, teamInfo: state.teamInfo, teamResults: state.teamResults, tasks: state.tasks, newTasks: state.newTasks, checkups: state.checkups, rosters: state.rosters, ideas: state.ideas, deckNotes: state.deckNotes, nextId: state.nextId })); } catch (e) {} }
  // Hub views (same rules as convex/roles.ts; permissions table in README.md):
  //   admin / exec (president, VPs): everything · viewer (Student Council, Eva Morta): everything, read-only
  //   head: their department for every team · associate: their department, their teams · captain: their team(s)
  var HUB_ROLES = { admin: 1, exec: 1, head: 1, associate: 1, captain: 1, viewer: 1 };
  // Real admin login (Better Auth, /admin). undefined = still checking, null = not an admin, else { email, name }.
  // The Hub is only open to a signed-in admin; the role picker only previews what a captain, the Board or the Council sees.
  var admin;
  if (state.user && (HUB_ROLES[state.user.role] || state.user.role === "guest")) state.user = null; // roles from before the real login existed
  function isHub() { return !!(admin || captain) && !!state.user && HUB_ROLES[state.user.role]; }
  // Approved profiles from Convex (no email/phone), then the example profiles.
  var REAL = [];
  function allAlumni() { return REAL.concat(ALUMNI); }
  function fromConvex(p) {
    var a = { id: "p" + p._id, first: p.first, last: p.last, nationality: p.nationality, programme: p.programme, grad: p.grad, sports: p.sports || [],
      exUni: p.exUni, exDomain: p.exDomain, exCity: p.exCity, inCo: p.inCo, inDomain: p.inDomain, inRole: p.inRole, linkedin: p.linkedin || "", photo: p.photo || null,
      interns: (p.interns || []).map(function (x) { return [x.co, x.role, x.year || "", x.domain || ""]; }),
      assocs: (p.assocs || []).map(function (x) { return [x.name, x.domain || ""]; }) };
    a.assos = a.assocs.map(function (x) { return x[0]; }).join(", ");
    a.headline = p.headline || (p.inRole + " · " + p.inCo);
    a.esadeRole = p.esadeRole || a.sports.join(" · ") + " · Esade Sports";
    return a;
  }
  function loadAlumni() {
    if (!backend || !backend.listAlumni) return;
    Promise.resolve(backend.listAlumni()).then(function (rows) {
      REAL = (rows || []).map(fromConvex);
      var h = location.hash.slice(1);
      if (h === "alumni" || h.indexOf("alumni-") === 0 || h.indexOf("team-") === 0) render();
    }, console.error);
  }

  // ================= Header account area =================
  var captain = null; // signed-in captain (not admin): badge + inbox link, no Hub
  function adminBar() {
    if (captain) return '<a class="admin-badge" href="/admin" title="Signed in as ' + esc(captain.email) + ' · open the members area"><i>' + esc(captain.label || "Member") + '</i><span>' + esc(captain.name || captain.email.split("@")[0]) + '</span></a>' +
      '<a href="#hub-overview">Hub</a><a href="/admin">Members area</a><button type="button" class="signout" data-signout>Sign out</button>';
    if (!admin) return "";
    return '<a class="admin-badge" href="/admin" title="Signed in as ' + esc(admin.email) + ' · open the admin area"><i>Admin</i><span>' + esc(admin.name || admin.email.split("@")[0]) + '</span></a>' +
      '<a href="#hub-overview">Hub</a><button type="button" class="signout" data-signout>Sign out</button>';
  }
  // The Industry Platform preview is for the Eva Morta / Student Council presentation: admins and
  // view-only accounts see it; students (and admins demoing the student view) don't.
  var demoPublic = false;
  function industryVisibility() {
    var el = $("industry"); if (!el) return;
    el.hidden = !((admin && !demoPublic) || (captain && captain.scope && captain.scope.viewer));
  }
  function renderAcct() {
    industryVisibility();
    var u = state.user, html;
    // Far right of the top bar: members sign-in, or the signed-in admin indicator.
    $("member").innerHTML = admin || captain ? adminBar() : '<a class="member-signin" href="#signin" title="Captains, associates, Board and Student Council">Sign in</a>';
    html = admin ? "" : '<a class="btn btn-blue" href="#apply-associate">Join</a>';
    $("acct").innerHTML = html;
  }

  // ================= Members (low-key, linked from the footer) =================
  // Public browsing never needs a login. This page is only for the people who run Esade Sports.
  function signinView() {
    return '<section class="band"><div class="wrap"><p class="eyebrow">Members</p><h1 class="display">Members<br>area.</h1><p>For captains, Board members, associates and the Student Council: requests, decisions and follow-up in one place. Visitors don\u2019t need an account, everything public is open.</p></div></section>' +
      '<section class="signin"><div class="wrap"><div class="access">' +
      (admin || captain ? hubPicker() + (captain && !admin ? requestBlock() : "")
      : '<div class="acc"><p class="eyebrow">Captains · Board · Associates</p><strong>Sign in to the Hub</strong><p>Expenses and budgets, team updates, try-out applications, department tasks and reports for the Student Council.</p>' +
        '<a class="btn btn-blue" href="/admin">' + (admin === undefined ? "Checking your login\u2026" : "Sign in") + '</a></div>' + requestBlock()) +
      '</div><p class="hint">Only accounts approved by the Board can sign in.</p>' +
      (admin ? '<div class="members-board">' + BOARD_BLOCK + '</div>' : "") + '</div></section>';
  }
  // "Request access": becomes a request that the right person approves in /admin
  // (associates: their head of department; captains: the Board). Board positions are added by the admin.
  var REQ_DEPTS = ["Finance", "Media & Marketing", "Operations", "Partnerships", "IT"]; // same as convex/roles.ts
  function requestBlock() {
    return '<form class="acc req" id="req-form" novalidate><p class="eyebrow">New here?</p><strong>Request access</strong><p>Associates and captains: send a request. Once it is approved, sign in with the same email to create your account.</p>' +
      '<div class="fgrid">' + fieldI("rq-name", "Full name", "", 'required autocomplete="name"') + fieldI("rq-email", "Esade email", "", 'required type="email" autocomplete="email" placeholder="name@alumni.esade.edu"') +
      '<label class="field" for="rq-role">I am<select id="rq-role"><option value="associate">An associate of a department</option><option value="captain">A team captain</option></select></label>' +
      '<label class="field" for="rq-dept" id="rq-dept-wrap">Department<select id="rq-dept">' + REQ_DEPTS.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="field" id="rq-teams-wrap"><span id="rq-teams-label">Team(s) you work with</span><div class="checks">' + TEAMS.map(function (t, i) { return '<label for="rq-t-' + i + '"><input type="checkbox" id="rq-t-' + i + '" value="' + t.id + '">' + esc(tLabel(t)) + "</label>"; }).join("") + "</div></div>" +
      '<label class="field full" for="rq-note">Note <small>(optional)</small><textarea id="rq-note" rows="2" maxlength="500" placeholder="E.g. elected captain in October"></textarea></label>' +
      '<input type="text" id="rq-website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<p class="err" id="rq-err" hidden></p><button class="btn btn-blue" type="submit" id="rq-send">Send request</button></form>';
  }
  function bindRequest() {
    var f = $("req-form"); if (!f) return;
    var role = $("rq-role");
    role.addEventListener("change", function () { var c = role.value === "captain"; $("rq-dept-wrap").hidden = c; $("rq-teams-label").textContent = c ? "Your team(s)" : "Team(s) you work with"; });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("rq-err"), name = $("rq-name").value.trim(), email = $("rq-email").value.trim(), teams = [];
      page.querySelectorAll("#rq-teams-wrap input:checked").forEach(function (c) { teams.push(c.value); });
      var msg = !name || !email ? "Please add your name and email." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : !teams.length ? "Choose at least one team." : "";
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      var btn = $("rq-send"); btn.disabled = true; btn.textContent = "Sending…";
      function done() { f.innerHTML = '<p class="eyebrow">Request sent</p><strong>Thank you</strong><p>' + (role.value === "captain" ? "The Board" : "The head of " + esc($("rq-dept") ? $("rq-dept").value : "your department")) + " will review your request. Once approved, sign in with " + esc(email) + " to create your account.</p>"; }
      var data = { name: name, email: email, role: role.value, department: role.value === "captain" ? undefined : $("rq-dept").value, teams: teams, note: $("rq-note").value.trim() || undefined, website: $("rq-website").value || undefined };
      if (!backend || !backend.requestAccess) { done(); return; }
      Promise.resolve(backend.requestAccess(data)).then(done, function (x) {
        console.error(x); btn.disabled = false; btn.textContent = "Send request";
        var m2 = String((x && x.message) || "").match(/ConvexError: ([^\n]*)/);
        err.textContent = (x && typeof x.data === "string") ? x.data : m2 ? m2[1] : "Your request could not be sent. Please try again."; err.hidden = false;
      });
    });
  }
  // Which Hub view to open. Admins pick any role (to test what others see); others pick among their own roles.
  function hubPicker() {
    var me = admin || captain, views = allowedViews(), opts = TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("");
    var body = admin
      ? '<label class="field" for="hub-role">View the Hub as<select id="hub-role"><option value="admin">Admin (full access)</option><option value="exec">President / Vice-president</option><option value="head">Head of department</option><option value="associate">Associate</option><option value="captain">Team captain</option><option value="viewer">Student Council (Eva Morta), view only</option></select></label>' +
        '<label class="field" for="hub-dept" id="hub-dept-wrap" hidden>Department<select id="hub-dept">' + DEPTS.filter(function (d) { return d.id !== "board"; }).map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + "</option>"; }).join("") + "</select></label>" +
        '<label class="field" for="hub-team" id="hub-team-wrap" hidden>Team<select id="hub-team">' + opts + "</select></label>"
      : views.length > 1 ? '<label class="field" for="hub-view">Open the Hub as<select id="hub-view">' + views.map(function (v, i) { return '<option value="' + i + '">' + esc(viewLabel(v)) + "</option>"; }).join("") + "</select></label>"
      : '<p>' + (views[0] ? "You will see the Hub as " + esc(viewLabel(views[0])) + "." : "Your role is still being set up.") + "</p>";
    return '<div class="acc"><p class="eyebrow">Signed in</p><strong>Esade Sports Hub</strong><p>You are signed in as ' + esc(me.email) + (captain && captain.label ? " (" + esc(captain.label) + ")" : "") + '.</p><div class="opts">' + body + "</div>" +
      (views.length ? '<button class="btn btn-blue" data-go="hub">Open the Hub</button>' : "") + ' <a class="btn btn-ghost-navy" href="/admin">Members area</a></div>';
  }
  function bindSignin() {
    bindRequest();
    var role = $("hub-role");
    function sync() { if (!role) return; var r = role.value; $("hub-dept-wrap").hidden = r !== "head" && r !== "associate"; $("hub-team-wrap").hidden = r !== "associate" && r !== "captain"; }
    if (role) { role.addEventListener("change", sync); sync(); }
    page.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = null;
        if (admin && role) { var r = role.value; v = { role: r }; if (r === "head" || r === "associate") v.dept = $("hub-dept").value; if (r === "associate" || r === "captain") v.teams = [$("hub-team").value]; }
        else { var vs = allowedViews(); v = vs[$("hub-view") ? +$("hub-view").value : 0]; }
        if (!v || !viewAllowed(v)) return;
        state.user = v; save(); renderAcct(); go("hub-overview");
      });
    });
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
    var nAl = ALUMNI.filter(function (a) { return a.sports.indexOf(t.sport) > -1; }).length + REAL.filter(function (a) { return a.sports.indexOf(t.sport) > -1; }).length;
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
    var info = teamInfoFor(t.id), facts = [];
    if (info.league) facts.push(["League", info.league + (info.leagueUrl ? "" : ""), info.leagueUrl]);
    if (info.venue || info.venueAddress) facts.push(["Training venue", [info.venue, info.venueAddress].filter(Boolean).join(" · ")]);
    if (info.contact) facts.push(["Team contact", info.contact, "mailto:" + info.contact]);
    var about = info.about || facts.length || info.leagueUrl ? '<div class="tinfo">' + (info.about ? "<p>" + esc(info.about) + "</p>" : "") +
      (facts.length ? '<dl class="tfacts">' + facts.map(function (f) { return "<div><dt>" + f[0] + "</dt><dd>" + (f[2] ? '<a href="' + esc(f[2]) + '"' + (f[2].indexOf("http") === 0 ? ' target="_blank" rel="noopener"' : "") + ">" + esc(f[1]) + "</a>" : esc(f[1])) + "</dd></div>"; }).join("") + "</dl>" : "") +
      (info.leagueUrl && !info.league ? '<a class="link-arrow" href="' + esc(info.leagueUrl) + '" target="_blank" rel="noopener">League page →</a>' : "") + "</div>" : "";
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
      '<div class="fsec"><h2>About you</h2><div class="fgrid">' + fieldI("a-first", "First name", "", "required") + fieldI("a-last", "Last name", "", "required") + fieldI("a-email", "Email", "", 'type="email" required') + phoneField("a-phone", "Phone number", true) +
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
      '<div class="fsec"><h2>Personal information</h2><div class="fgrid">' + fieldI("as-first", "First name", "", "required autocomplete=\"given-name\"") + fieldI("as-last", "Last name", "", "required autocomplete=\"family-name\"") + fieldI("as-email", "Esade email", "", 'type="email" required autocomplete="email"') + phoneField("as-phone", "Phone number", true) + fieldI("as-programme", "Programme", "", 'required list="as-progs" placeholder="BBA"') + '<datalist id="as-progs"><option value="BBA"><option value="Double degree BBA + Law"><option value="MSc"><option value="MBA"></datalist>' + '<label class="field" for="as-year">Year<select id="as-year" required><option value="">Choose your year</option>' + YEARS.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('') + '</select></label>' + fieldI("as-linkedin", "LinkedIn profile", "", 'type="url" placeholder="https://linkedin.com/in/..."') + '</div></div>' +
      '<div class="fsec"><h2>Department preferences</h2><p class="muted" style="margin:0">You may apply to a maximum of two departments. Preference 1 is your strongest choice.</p><div class="fgrid"><label class="field" for="as-pref1">Preference 1<select id="as-pref1" required><option value="">Choose a department</option>' + opts + '</select></label><label class="field" for="as-pref2">Preference 2 <small>(optional)</small><select id="as-pref2"><option value="">No second preference</option>' + opts + '</select></label></div><label class="field full" for="as-motivation">Why do you want to join Esade Sports and why these departments?<textarea id="as-motivation" rows="6" required placeholder="Tell us what motivates you, what you could contribute and why you ranked these departments."></textarea></label></div>' +
      '<div class="fsec"><h2>Application materials</h2><div class="fgrid"><label class="field" for="as-cv">CV <small>(PDF required)</small><input id="as-cv" type="file" accept="application/pdf,.pdf" required></label><label class="field" for="as-video">Motivation video <small>(optional)</small><input id="as-video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov"></label></div><p class="muted" style="margin:10px 0 0;font-size:13px">Video: MP4 or MOV, around 60–90 seconds. Explain who you are, why Esade Sports interests you and why your department preferences fit you.</p></div>' +
      '<div class="fsec"><label class="consent" for="as-redirect"><input type="checkbox" id="as-redirect" required><span>I understand that the Board may redirect my application to another department if it is a better fit for my profile and the association’s needs.</span></label><label class="consent" for="as-consent"><input type="checkbox" id="as-consent" required><span>I confirm that the information and documents submitted are accurate and may be reviewed by the Esade Sports recruitment team.</span></label></div>' +
      '<p class="err" id="as-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">Submit application</button><span class="muted" style="font-size:13px">Your application will be reviewed by the Board and relevant department Heads.</span></div></form>' +
      '<div class="locked" id="as-done" hidden><p class="eyebrow" style="color:var(--blue)">Application received</p><h2>Thanks for applying to Esade Sports</h2><p id="as-done-p">Your ranked preferences and application materials are ready for review.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  // ================= Contact form (footer "Contact") =================
  var CONTACT_TOPICS = ["Question", "Suggestion", "Feedback or complaint", "Try-outs", "Coaching", "Partnership or business", "Alumni", "Other"];
  function contactView() {
    return '<section class="band"><div class="wrap"><p class="eyebrow">Contact</p><h1 class="display">Get in<br>touch.</h1><p>A question, a suggestion or an idea? Send us a message and the right person at Esade Sports will get back to you by email.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="contact-form" novalidate>' +
      '<div class="fsec"><h2>Your message</h2><div class="fgrid">' +
      '<label class="field" for="ct-topic">What is your message about?<select id="ct-topic" required><option value="">Choose a topic</option>' + CONTACT_TOPICS.map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("") + "</select></label>" +
      '<label class="field" for="ct-sport">Sport (optional)<select id="ct-sport"><option value="">Not about a specific sport</option>' + SPORTS.map(function (sp) { return '<option value="' + esc(sp) + '">' + esc(sp) + "</option>"; }).join("") + "</select></label>" +
      fieldI("ct-subject", "Subject", "", 'required maxlength="150"', true) +
      '<label class="field full" for="ct-message">Message<textarea id="ct-message" rows="7" maxlength="2000" required placeholder="Write your message here"></textarea><small class="muted" id="ct-count">0 / 2000</small></label>' +
      "</div></div>" +
      '<div class="fsec"><h2>Your details</h2><div class="fgrid">' + fieldI("ct-name", "Name", "", 'required maxlength="100" autocomplete="name"') + fieldI("ct-email", "Email", "", 'type="email" required maxlength="200" autocomplete="email"') + phoneField("ct-phone", "Phone number", false) + "</div>" +
      '<div class="hp" aria-hidden="true"><label for="ct-website">Website<input id="ct-website" tabindex="-1" autocomplete="off"></label></div></div>' +
      '<div class="fsec"><label class="consent" for="ct-consent"><input type="checkbox" id="ct-consent" required><span>I have read the <a href="#privacy">privacy policy</a> and agree that Esade Sports uses my details to answer this message.</span></label></div>' +
      '<p class="err" id="ct-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">Send message</button><span class="muted" style="font-size:13px">We usually reply within a few days.</span></div></form>' +
      '<div class="locked" id="ct-done" hidden><p class="eyebrow" style="color:var(--blue)">Message sent</p><h2>Thanks for your message</h2><p>We have received it and will reply by email.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  function bindContact() {
    var f = $("contact-form"); if (!f) return;
    var msg = $("ct-message"), count = $("ct-count");
    msg.addEventListener("input", function () { count.textContent = msg.value.length + " / 2000"; });
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var err = $("ct-err");
      function fail(t) { err.textContent = t; err.hidden = false; }
      var email = $("ct-email").value.trim();
      if (!$("ct-topic").value || !$("ct-subject").value.trim() || !msg.value.trim() || !$("ct-name").value.trim() || !email) return fail("Please fill in every required field.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
      var ctPhone = phoneValue("ct-phone", false);
      if (ctPhone.error) return fail(ctPhone.error);
      if (!$("ct-consent").checked) return fail("Please accept the privacy policy.");
      err.hidden = true;
      function done() { f.hidden = true; $("ct-done").hidden = false; window.scrollTo(0, 0); }
      if (!backend || !backend.submitContactMessage) { done(); return; }
      var btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Sending…";
      backend.submitContactMessage({
        topic: $("ct-topic").value, sport: $("ct-sport").value || undefined, subject: $("ct-subject").value.trim(), message: msg.value.trim(),
        name: $("ct-name").value.trim(), email: email, phone: ctPhone.value || undefined, consent: true, website: $("ct-website").value || undefined
      }).then(done, function (x) {
        console.error(x); btn.disabled = false; btn.textContent = "Send message";
        var m = x && x.data ? String(x.data) : "";
        fail(m || "Your message could not be sent. Please check your connection and try again.");
      });
    });
  }
  var YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Master's"];
  function deptName(id) { var n = ""; DEPTS.forEach(function (d) { if (d.id === id) n = d.name; }); return n; }
  function bindAssociateApply() {
    var f = $("assoc-form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var err = $("as-err"), cv = $("as-cv").files[0], video = $("as-video").files[0], p1 = $("as-pref1").value, p2 = $("as-pref2").value;
      if (!$("as-first").value.trim() || !$("as-last").value.trim() || !$("as-email").value.trim() || !$("as-programme").value.trim() || !$("as-year").value || !p1 || !$("as-motivation").value.trim() || !cv || !$("as-redirect").checked || !$("as-consent").checked) { err.textContent = "Please complete your personal information, rank at least one department, upload your CV and accept both acknowledgements."; err.hidden = false; return; }
      var asPhone = phoneValue("as-phone", true);
      if (asPhone.error) { err.textContent = asPhone.error; err.hidden = false; return; }
      if (p1 === p2) { err.textContent = "Choose two different departments, or leave Preference 2 empty."; err.hidden = false; return; }
      if (cv && cv.type !== "application/pdf" && !/\.pdf$/i.test(cv.name)) { err.textContent = "Please upload your CV as a PDF."; err.hidden = false; return; }
      if (video && !/^video\/(mp4|quicktime)$/.test(video.type) && !/\.(mp4|mov)$/i.test(video.name)) { err.textContent = "Please upload the motivation video as an MP4 or MOV file."; err.hidden = false; return; }
      err.hidden = true;
      function done() { f.hidden = true; $("as-done").hidden = false; $("as-done-p").textContent = "Preference 1: " + deptName(p1) + (p2 ? ". Preference 2: " + deptName(p2) + "." : ".") + " The Board may redirect your application to another department if appropriate."; }
      if (!backend || !backend.submitAssociationApplication) { done(); return; }
      var btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Sending…";
      backend.submitAssociationApplication({
        firstName: $("as-first").value.trim(), lastName: $("as-last").value.trim(), email: $("as-email").value.trim(), phone: phoneValue("as-phone", true).value,
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
      var miss = ["a-first", "a-last", "a-email", "a-phone-num"].filter(function (id) { return !$(id).value.trim(); });
      if (miss.length) { $("a-err").textContent = "Please fill in your name, email and phone number."; $("a-err").hidden = false; return; }
      var aPhone = phoneValue("a-phone", true);
      if (aPhone.error) { $("a-err").textContent = aPhone.error; $("a-err").hidden = false; return; }
      var coach = $("as-coach").checked, t = team($("a-team").value);
      var folder = sportsApplicationsFolder(t.id), captain = captainForTeam(t.id);
      if (!state.teamApplications[folder]) state.teamApplications[folder] = [];
      state.teamApplications[folder].push({
        id: state.nextId++, folder: folder, team: t.id, teamLabel: tLabel(t), sport: t.sport, type: coach ? "Coaching application" : "Try-out application",
        first: $("a-first").value.trim(), last: $("a-last").value.trim(), email: $("a-email").value.trim(), phone: aPhone.value,
        esadeStudent: $("a-esade").value === "yes", programme: $("a-prog").value.trim(), level: coach ? "Coach applicant" : $("a-level").value,
        coachingExperience: $("a-exp").value.trim(), captain: captain ? captainName(captain) : "Board review", captainEmail: captain ? captain.email : "Board review", status: "New", createdAt: "2026-11-12"
      });
      save();
      function done() {
        f.hidden = true; $("a-done").hidden = false;
        $("a-done-h").textContent = coach ? "Thanks for offering to coach" : "You are signed up for try-outs";
        $("a-done-p").textContent = "Team: " + tLabel(t) + ". Your information is stored in the " + folder + " folder and routed to " + (captain ? captainName(captain) + " (" + captain.email + ")" : "the Board because this team has no active captain") + ".";
      }
      if (!backend || !backend.submitTeamApplication) { done(); return; }
      var btn = $("a-submit"), label = btn.textContent; btn.disabled = true; btn.textContent = "Sending…";
      backend.submitTeamApplication({
        teamSlug: t.id, kind: coach ? "coach" : "tryout",
        firstName: $("a-first").value.trim(), lastName: $("a-last").value.trim(), email: $("a-email").value.trim(), phone: aPhone.value,
        esadeStudent: $("a-esade").value === "yes", programme: ($("a-esade").value === "yes" && $("a-prog").value.trim()) || undefined,
        level: coach ? undefined : $("a-level").value, coachingExperience: coach ? ($("a-exp").value.trim() || undefined) : undefined
      }).then(done, function (x) {
        console.error(x); btn.disabled = false; btn.textContent = label;
        $("a-err").textContent = "Your sign-up could not be sent. Please check your connection and try again."; $("a-err").hidden = false;
      });
    });
  }

  // ================= Alumni =================
  function initials(a) { return esc((a.first || "?").charAt(0) + (a.last || "").charAt(0)); }
  function avatar(a) { return '<div class="av">' + (a.photo ? '<img src="' + a.photo + '" alt="">' : initials(a)) + "</div>"; }
  function alumniBand(extra) {
    return '<section class="band"><div class="wrap"><p class="eyebrow">Esade alumni network</p><h1 class="display">A community<br>beyond sports.</h1><p>Part of an Esade alumni network ranked #6 by the Financial Times. Search the Esade Sports alumni network like a professional directory. Anyone can browse profiles. Alumni add their own profile, and it appears once the Esade Sports team has checked it.</p>' + (extra || "") + "</div></section>";
  }
  // Graduation years: 1991 up to next year's class, newest first.
  function gradYears() { var out = [], top = new Date().getFullYear() + 1; for (var y = top; y >= 1991; y--) out.push(y); return out; }
  // LinkedIn-style logo tiles. Organisation logos load from our own /api/logo route (by website
  // domain); if there is no domain or no logo, the tile shows the organisation's initials.
  var SPORT_ICON = { "Football 7": "⚽", Futsal: "⚽", Basketball: "🏀", Volleyball: "🏐", Padel: "🎾", Rugby: "🏉", Tennis: "🎾" };
  function cleanDomain(d) { return String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#\s]/)[0]; }
  function orgInitials(n) { var w = String(n || "?").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(function (x) { return x && !/^(of|the|de|la|el|and|at|y|i|du|des)$/i.test(x); }); return esc(((w[0] || "?").charAt(0) + (w[1] ? w[1].charAt(0) : "")).toUpperCase()); }
  function logo(name, domain) {
    var d = cleanDomain(domain), m = '<span class="lg-mono">' + orgInitials(name) + "</span>";
    return '<div class="lg">' + m + (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? '<img src="/api/logo?d=' + d + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</div>";
  }
  function esLogo(sport) { return '<div class="lg lg-es">' + mono(30) + (sport && SPORT_ICON[sport] ? '<span class="lg-badge" aria-hidden="true">' + SPORT_ICON[sport] + "</span>" : "") + "</div>"; }
  function isES(n) { return /^esade sports$/i.test(String(n || "").trim()); }
  function assocList(a) { return (a.assocs && a.assocs.length ? a.assocs : String(a.assos || "").split(",").map(function (x) { return [x.trim(), ""]; })).filter(function (x) { return x[0]; }); }
  function expRow(tile, title, line, meta) { return '<div class="exp">' + tile + "<div><strong>" + esc(title) + "</strong>" + (line ? "<span>" + esc(line) + "</span>" : "") + (meta ? '<span class="m">' + esc(meta) + "</span>" : "") + "</div></div>"; }
  function alumniView() {
    var years = gradYears();
    var cta = '<div class="ctas"><a class="btn btn-solid-white" href="#my-profile">Add your profile</a></div>';
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
        '<div class="tags">' + a.sports.map(function (s) { return '<span class="tag2">' + esc(s) + "</span>"; }).join("") + (a.active ? '<span class="tag2 soft">Active member</span>' : "") + (a.example ? '<span class="tag2 ex">Example</span>' : "") + "</div>" +
        '<div class="job"><b>Esade Sports</b>' + esc(a.esadeRole) + "</div></div></a></li>";
    }).join("") : '<li class="empty-state" style="grid-column:1/-1">No alumni match these filters. Try another sport or clear the search.</li>';
  }
  function profileView(a) {
    var rows = [];
    function crow(label, val, href) {
      if (!val) return;
      rows.push("<div><dt>" + label + "</dt><dd>" + (href ? '<a href="' + href + '" target="_blank" rel="noopener">' + esc(val) + "</a>" : esc(val)) + '</dd><button class="copybtn" data-copy="' + esc(val) + '">Copy</button></div>');
    }
    if (a.linkedin) crow("LinkedIn", a.linkedin, "https://" + a.linkedin.replace(/^https?:\/\//, ""));
    var interns = a.interns.filter(function (x) { return x[0]; });
    return '<section class="al"><div class="wrap body"><a class="back" href="#alumni">← Back to the Alumni corner</a><div class="prof"><article class="pcard"><div class="cover"></div><div class="head2">' + avatar(a) +
      "<h1>" + esc(a.first + " " + a.last) + '</h1><span class="sub2">' + esc(a.programme) + " · Class of " + a.grad + '</span><p class="headline" style="margin:8px 0 0">' + esc(a.headline) + "</p>" +
      '<div class="tags" style="margin-top:6px">' + a.sports.map(function (s) { return '<span class="tag2">' + esc(s) + "</span>"; }).join("") + (a.active ? '<span class="tag2 soft">Active member</span>' : "") + (a.example ? '<span class="tag2 ex">Example profile</span>' : "") + "</div>" +
      "</div>" +
      '<section class="psec"><h2>Esade Sports role</h2>' + expRow(esLogo(), a.esadeRole || "Member", "Esade Sports", "") + "</section>" +
      '<section class="psec"><h2>Sports at Esade</h2>' + a.sports.map(function (s) { return expRow(esLogo(s), s, "Esade Sports", ""); }).join("") + "</section>" +
      '<section class="psec"><h2>Exchange</h2>' + expRow(logo(a.exUni, a.exDomain), a.exUni, "Exchange semester", a.exCity) + "</section>" +
      '<section class="psec"><h2>Internships</h2>' + expRow(logo(a.inCo, a.inDomain), a.inRole, a.inCo, "4th-year internship") +
      interns.map(function (x) { return expRow(logo(x[0], x[3]), x[1] || x[0], x[1] ? x[0] : "", x[2] || ""); }).join("") + "</section>" +
      '<section class="psec"><h2>Associations</h2>' + assocList(a).map(function (x) { return expRow(isES(x[0]) ? esLogo() : logo(x[0], x[1]), x[0], isES(x[0]) ? "Sports association" : "Association", ""); }).join("") + "</section></article>" +
      '<aside class="contact"><p class="eyebrow">Get in touch</p>' + (rows.length ? "<dl>" + rows.join("") + "</dl>" : "") + '<p style="margin:0 0 14px;font-size:13px;color:var(--on-navy-soft)">Email and phone numbers stay private. To reach this person, send us a message and the Esade Sports team will pass it on.</p><a class="btn btn-solid-white" href="#contact">Send a message</a></aside></div></div></section>';
  }

  // Profile form
  var draftPhoto = null;
  // Phone with country code (Spain first), stored as E.164 (+34600000000). Same field on the contact,
  // association and try-out/coach forms.
  var COUNTRIES = [["ES","Spain","34"],["DZ","Algeria","213"],["AD","Andorra","376"],["AR","Argentina","54"],["AU","Australia","61"],["AT","Austria","43"],["BE","Belgium","32"],["BO","Bolivia","591"],["BR","Brazil","55"],["BG","Bulgaria","359"],["CA","Canada","1"],["CL","Chile","56"],["CN","China","86"],["CO","Colombia","57"],["CR","Costa Rica","506"],["HR","Croatia","385"],["CY","Cyprus","357"],["CZ","Czech Republic","420"],["CI","Côte d'Ivoire","225"],["DK","Denmark","45"],["DO","Dominican Republic","1"],["EC","Ecuador","593"],["EG","Egypt","20"],["EE","Estonia","372"],["FI","Finland","358"],["FR","France","33"],["DE","Germany","49"],["GR","Greece","30"],["GT","Guatemala","502"],["HK","Hong Kong","852"],["HU","Hungary","36"],["IS","Iceland","354"],["IN","India","91"],["ID","Indonesia","62"],["IE","Ireland","353"],["IL","Israel","972"],["IT","Italy","39"],["JP","Japan","81"],["JO","Jordan","962"],["KE","Kenya","254"],["KW","Kuwait","965"],["LV","Latvia","371"],["LB","Lebanon","961"],["LT","Lithuania","370"],["LU","Luxembourg","352"],["MY","Malaysia","60"],["MT","Malta","356"],["MX","Mexico","52"],["MC","Monaco","377"],["MA","Morocco","212"],["NL","Netherlands","31"],["NZ","New Zealand","64"],["NG","Nigeria","234"],["NO","Norway","47"],["PK","Pakistan","92"],["PA","Panama","507"],["PY","Paraguay","595"],["PE","Peru","51"],["PH","Philippines","63"],["PL","Poland","48"],["PT","Portugal","351"],["PR","Puerto Rico","1"],["QA","Qatar","974"],["RO","Romania","40"],["RU","Russia","7"],["SA","Saudi Arabia","966"],["SN","Senegal","221"],["RS","Serbia","381"],["SG","Singapore","65"],["SK","Slovakia","421"],["SI","Slovenia","386"],["ZA","South Africa","27"],["KR","South Korea","82"],["SE","Sweden","46"],["CH","Switzerland","41"],["TW","Taiwan","886"],["TH","Thailand","66"],["TN","Tunisia","216"],["TR","Turkey","90"],["UA","Ukraine","380"],["AE","United Arab Emirates","971"],["GB","United Kingdom","44"],["US","United States","1"],["UY","Uruguay","598"],["VE","Venezuela","58"],["VN","Vietnam","84"]];
  function flag(cc) { return String.fromCodePoint.apply(null, cc.split("").map(function (c) { return 127397 + c.charCodeAt(0); })); }
  function phoneField(id, label, required) {
    return '<div class="field phone-field"><label for="' + id + '-num">' + label + (required ? "" : " (optional)") + '</label><div class="phone-row">' +
      '<select id="' + id + '-cc" aria-label="Country code">' + COUNTRIES.map(function (c) { return '<option value="' + c[0] + '">' + flag(c[0]) + " " + esc(c[1]) + " +" + c[2] + "</option>"; }).join("") + "</select>" +
      '<input id="' + id + '-num" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="600 000 000"' + (required ? " required" : "") + "></div>" +
      '<small class="hint">If we contact you by phone, it will be via WhatsApp.</small></div>';
  }
  // Returns { value: "+34600000000" | "", error: "" | message }.
  function phoneValue(id, required) {
    var raw = $(id + "-num").value.trim(), cc = $(id + "-cc").value, dial = "";
    COUNTRIES.forEach(function (c) { if (c[0] === cc) dial = c[2]; });
    if (!raw) return { value: "", error: required ? "Please enter your phone number." : "" };
    var digits = raw.replace(/[^0-9+]/g, "");
    if (digits.indexOf("+") === 0) digits = digits.slice(1); // typed with its own +code
    else if (digits.indexOf("00") === 0) digits = digits.slice(2);
    else digits = dial + digits.replace(/^0+/, "");
    digits = digits.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return { value: "", error: "Please enter a valid phone number." };
    return { value: "+" + digits, error: "" };
  }
  function fieldI(id, label, val, attrs, full) { return '<label class="field' + (full ? " full" : "") + '" for="' + id + '">' + label + '<input id="' + id + '" value="' + esc(val || "") + '" ' + (attrs || "") + "></label>"; }
  function internRow(x, i) {
    return '<div class="intern-row" data-row="' + i + '">' + fieldI("ix-co-" + i, "Company", x[0], 'data-k="0"') + fieldI("ix-role-" + i, "Role", x[1], 'data-k="1"') + fieldI("ix-yr-" + i, "Year", x[2], 'data-k="2" inputmode="numeric"') + fieldI("ix-dom-" + i, "Website <small>(for the logo)</small>", x[3], 'data-k="3" placeholder="company.com"') + '<button type="button" class="rm" data-rm="' + i + '">Remove</button></div>';
  }
  function assocRow(x, i) {
    return '<div class="intern-row assoc-row" data-arow="' + i + '">' + fieldI("as-n-" + i, "Association", x[0], 'data-k="0"') + fieldI("as-d-" + i, "Website <small>(optional)</small>", x[1], 'data-k="1" placeholder="association.org"') + '<button type="button" class="rm" data-arm="' + i + '">Remove</button></div>';
  }
  function formView() {
    var m = { programme: "BBA", sports: [], interns: [], assocs: [["Esade Sports", ""]] };
    draftPhoto = null;
    return '<section class="band"><div class="wrap"><p class="eyebrow">Alumni corner</p><h1 class="display">Add your<br>profile.</h1><p>Share what you did at Esade and since, so other Esade alumni and students who played sport can find you. The Esade Sports team checks each profile before it appears in the directory. Your email and phone stay private.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="pform" novalidate>' +
      '<div class="fsec"><h2>About you</h2><div class="photo-row"><div class="av" id="ph-prev">?</div><label class="field" for="f-photo">Profile photo <small>(optional)</small><input id="f-photo" type="file" accept="image/*"></label></div>' +
      '<div class="fgrid">' + fieldI("f-first", "First name", "", "required autocomplete=\"given-name\"") + fieldI("f-last", "Last name", "", "required autocomplete=\"family-name\"") + fieldI("f-nat", "Nationality", "", "required") +
      fieldI("f-headline", "What you do now <small>(optional)</small>", "", 'placeholder="Brand manager · sportswear company"') + "</div></div>" +
      '<div class="fsec"><h2>At Esade</h2><div class="fgrid">' + fieldI("f-prog", "Programme studied", m.programme, 'required list="progs"') + '<datalist id="progs"><option>BBA</option><option>Double degree BBA + Law</option><option>MSc</option><option>MBA</option></datalist>' +
      '<label class="field" for="f-grad">Graduation year<select id="f-grad" required><option value="">Choose a year</option>' + gradYears().map(function (y) { return "<option>" + y + "</option>"; }).join("") + "</select></label>" +
      fieldI("f-role", "Your role at Esade Sports <small>(optional)</small>", "", 'placeholder="Captain, Football 7"', true) +
      fieldI("f-exuni", "Exchange university", "", 'required placeholder="University of Michigan"') + fieldI("f-excity", "Exchange city and country", "", "required") +
      fieldI("f-exdom", "Exchange university website <small>(for the logo, optional)</small>", "", 'placeholder="umich.edu"', true) +
      fieldI("f-inco", "4th-year internship: company", "", "required") + fieldI("f-inrole", "4th-year internship: role", "", "required") +
      fieldI("f-indom", "Company website <small>(for the logo, optional)</small>", "", 'placeholder="company.com"', true) + "</div>" +
      '<div class="field full">Associations you joined<div id="assocs" style="display:grid;gap:12px"></div><button type="button" class="btn btn-ghost-navy" id="add-assoc" style="justify-self:start">Add an association</button></div>' +
      '<div class="field">Sports you played at Esade<div class="checks" id="f-sports">' + SPORTS.map(function (s, i) { return '<label for="sp-' + i + '"><input type="checkbox" id="sp-' + i + '" value="' + s + '">' + s + "</label>"; }).join("") + "</div></div></div>" +
      '<div class="fsec"><h2>Other internships and jobs <small>Optional</small></h2><div id="interns" style="display:grid;gap:12px"></div><button type="button" class="btn btn-ghost-navy" id="add-intern" style="justify-self:start">Add an internship</button></div>' +
      '<div class="fsec"><h2>Contact details <small>Email and phone are only seen by the Esade Sports team</small></h2><div class="fgrid">' + fieldI("f-email", "Email", "", 'required type="email" autocomplete="email"') + phoneField("f-phone", "Phone number", false) + fieldI("f-li", "LinkedIn <small>(optional, shown on your profile)</small>", "", 'placeholder="linkedin.com/in/..."', true) + "</div>" +
      '<input type="text" id="f-website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<label class="consent" for="f-consent"><input type="checkbox" id="f-consent"><span>I agree that my profile (without my email and phone) is shown on the Esade Sports website once approved. To change or remove it later, I can write to esadesports@alumni.esade.edu.</span></label></div>' +
      '<p class="err" id="f-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit" id="f-submit">Send my profile</button></div></form></div></section>';
  }
  function readRows(attr, n) {
    var out = []; page.querySelectorAll("[" + attr + "]").forEach(function (r) { var x = []; for (var k = 0; k < n; k++) x.push(""); r.querySelectorAll("input").forEach(function (i) { x[+i.getAttribute("data-k")] = i.value.trim(); }); out.push(x); }); return out;
  }
  function readInterns() { return readRows("data-row", 4); }
  function readAssocs() { return readRows("data-arow", 2); }
  function bindForm() {
    var f = $("pform"); if (!f) return;
    var interns = [];
    function redrawInterns() { $("interns").innerHTML = interns.map(internRow).join(""); page.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { interns = readInterns(); interns.splice(+b.getAttribute("data-rm"), 1); redrawInterns(); }); }); }
    redrawInterns();
    $("add-intern").addEventListener("click", function () { interns = readInterns(); interns.push(["", "", "", ""]); redrawInterns(); });
    var assocs = [["Esade Sports", ""]];
    function redrawAssocs() { $("assocs").innerHTML = assocs.map(assocRow).join(""); page.querySelectorAll("[data-arm]").forEach(function (b) { b.addEventListener("click", function () { assocs = readAssocs(); assocs.splice(+b.getAttribute("data-arm"), 1); redrawAssocs(); }); }); }
    redrawAssocs();
    $("add-assoc").addEventListener("click", function () { assocs = readAssocs(); assocs.push(["", ""]); redrawAssocs(); });
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
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (id) { return $(id).value.trim(); }, err = $("f-err");
      var sports = []; page.querySelectorAll("#f-sports input:checked").forEach(function (c) { sports.push(c.value); });
      var assocRows = readAssocs().filter(function (x) { return x[0]; });
      var missing = [["f-first", "first name"], ["f-last", "last name"], ["f-nat", "nationality"], ["f-prog", "programme"], ["f-grad", "graduation year"], ["f-exuni", "exchange university"], ["f-excity", "exchange city"], ["f-inco", "internship company"], ["f-inrole", "internship role"], ["f-email", "email"]].filter(function (x) { return !v(x[0]); }).map(function (x) { return x[1]; });
      if (!assocRows.length) missing.push("at least one association");
      if (!sports.length) missing.push("at least one sport");
      if (missing.length) { err.textContent = "Please add: " + missing.join(", ") + "."; err.hidden = false; return; }
      var ph = phoneValue("f-phone", false);
      if (ph.error) { err.textContent = ph.error; err.hidden = false; return; }
      if (!$("f-consent").checked) { err.textContent = "Tick the consent box so your profile can be shown."; err.hidden = false; return; }
      err.hidden = true;
      var data = { first: v("f-first"), last: v("f-last"), nationality: v("f-nat"), programme: v("f-prog"), grad: +v("f-grad"), sports: sports,
        esadeRole: v("f-role") || undefined, headline: v("f-headline") || undefined,
        exUni: v("f-exuni"), exDomain: cleanDomain(v("f-exdom")) || undefined, exCity: v("f-excity"), inCo: v("f-inco"), inDomain: cleanDomain(v("f-indom")) || undefined, inRole: v("f-inrole"),
        interns: readInterns().filter(function (x) { return x[0] || x[1]; }).map(function (x) { return { co: x[0], role: x[1], year: x[2] || undefined, domain: cleanDomain(x[3]) || undefined }; }),
        assocs: assocRows.map(function (x) { return { name: x[0], domain: cleanDomain(x[1]) || undefined }; }),
        linkedin: v("f-li") || undefined, photo: draftPhoto || undefined, email: v("f-email"), phone: ph.value || undefined, consent: true, website: v("f-website") || undefined };
      var btn = $("f-submit"); btn.disabled = true; btn.textContent = "Sending…";
      function done() {
        page.innerHTML = '<section class="band"><div class="wrap"><p class="eyebrow">Alumni corner</p><h1 class="display">Thank<br>you.</h1><p>We received your profile. It will appear in the alumni directory once the Esade Sports team has checked it, usually within a few days.</p><div class="ctas"><a class="btn btn-solid-white" href="#alumni">Back to the Alumni corner</a></div></div></section>';
        window.scrollTo(0, 0);
      }
      if (!backend || !backend.submitAlumniProfile) { done(); return; }
      Promise.resolve(backend.submitAlumniProfile(data)).then(done, function (x) {
        console.error(x); btn.disabled = false; btn.textContent = "Send my profile";
        var msg = String((x && x.data) || (x && x.message) || ""); var m2 = msg.match(/ConvexError: (.*)/);
        err.textContent = (x && typeof x.data === "string") ? x.data : m2 ? m2[1] : "Your profile could not be sent. Please check your connection and try again."; err.hidden = false;
      });
    });
  }

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
  // Older saved prototype rows: give them a budget line (department) and a decision history.
  state.expenses.forEach(function (e) {
    if (!e.dept) e.dept = e.cat === "Media" || e.cat === "Promotion" ? "Media & Marketing" : "Operations";
    if (!e.history) {
      var at = Date.parse(e.date + "T10:00:00Z"); e.history = [{ action: "requested", by: e.by, at: at }];
      if (e.status !== "requested") e.history.push({ action: e.status === "paid" ? "validated" : e.status, by: e.decidedBy || "Finance associate (example)", at: at + 86400000, reason: e.reason });
      if (e.status === "paid") e.history.push({ action: "paid", by: "Head of Finance (example)", at: at + 3 * 86400000 });
    }
  });
  if (!state.ideas) state.ideas = [
    { id: 901, team: "basketball-men", kind: "Friendly game", text: "Friendly against another Barcelona business school before the league restarts in January.", status: "researching", opsNote: "Two schools contacted; waiting for a date. Court hire about €150.", estimate: 150, by: "Captain (example)", at: Date.parse("2026-11-03T10:00:00Z") },
    { id: 902, team: "volleyball-mixed", kind: "Jerseys / kit", text: "New jerseys with numbers for the spring tournament.", status: "new", by: "Captain (example)", at: Date.parse("2026-11-09T10:00:00Z") }
  ];
  var DEPTS = [
    { id: "board", name: "Board", head: "President + Vice-Presidents", size: "3", remit: "Oversees the association and owns the Student Council relationship.", tasks: [["Monthly check-in with the Student Council", "done"], ["Captains' meeting, all teams", "doing"], ["Semester budget report sign-off", "todo"]] },
    { id: "fin", name: "Finance", head: "Head of Finance", size: "2–3", remit: "Holds each team's budget, split between Operations and Marketing. Validates and pays expenses, researches prices to negotiate costs, prepares the reports.", tasks: [["Agree each team's budget split (Operations / Marketing)", "doing"], ["Negotiate court-hire prices for the spring", "todo"], ["Pay validated expenses", "doing"], ["Draft semester report for the Council", "todo"]] },
    { id: "med", name: "Media & Marketing", head: "Head of Media & Marketing", size: "5–6", remit: "Runs every team's media accounts, and the communication and promotion of games and events.", tasks: [["Match-day posts for every home game", "doing"], ["Promote the spring tournament", "todo"], ["Team intro reels (12 teams)", "todo"], ["Rebuild the Linktree", "done"]] },
    { id: "ops", name: "Operations", head: "Head of Operations", size: "5–6", remit: "Works with the captains: captains suggest, Operations researches and organises. Tournaments, friendlies, jerseys, logistics, training and league facilities.", tasks: [["Research a friendly for Basketball Men (captain's idea)", "doing"], ["Order jerseys for Volleyball Mixed", "doing"], ["Book spring try-out slots", "todo"], ["Tournament travel plan", "todo"]] },
    { id: "par", name: "Partnerships", head: "Head of Partnerships", size: "4–5", remit: "Sponsors for the teams first, partners for business events, Industry Platform.", tasks: [["Shortlist kit sponsors", "doing"], ["First sports-business talk: speaker", "todo"], ["Industry Platform: partner list", "todo"]] },
    { id: "it", name: "IT", head: "Head of IT", size: "2–3", remit: "The website, the Hub, member accounts, data and the tools every department uses.", tasks: [["Keep team pages and results up to date", "doing"], ["Excel and PowerPoint exports for check-ups", "done"], ["Back up the data at the end of each semester", "todo"]] }
  ];
  DEPTS.forEach(function (d) { d.tasks.forEach(function (t, i) { if (!state.tasks[d.id + i]) state.tasks[d.id + i] = t[1]; }); });
  var TASK_STATUS = { todo: "To do", doing: "In progress", done: "Done" };
  if (!state.newTasks) state.newTasks = [];
  // Example people for the prototype (who leads each department, which associate covers which teams).
  var ALL_IDS = TEAMS.map(function (t) { return t.id; });
  var DEPT_PEOPLE = {
    board: { head: "Alex Moreau", headRole: "President", associates: [["Clara Vidal", ALL_IDS, "Vice-president"], ["Tom Becker", ALL_IDS, "Vice-president"]] },
    fin: { head: "Laura Gómez", associates: [["Pablo Ruiz", ["football7-men", "futsal-men", "futsal-women", "basketball-men"]], ["Nina Weber", ["basketball-women", "volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Omar Haddad", ["padel-men", "padel-women", "rugby", "tennis"]]] },
    med: { head: "Julia Rossi", associates: [["Lucas Martin", ["football7-men", "futsal-men", "futsal-women"]], ["Mia Novak", ["basketball-men", "basketball-women", "rugby"]], ["Sara Lindqvist", ["volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Diego Alves", ["padel-men", "padel-women", "tennis"]]] },
    ops: { head: "Marc Puig", associates: [["Elena Costa", ["football7-men", "futsal-men", "futsal-women"]], ["Hugo Petit", ["basketball-men", "basketball-women", "rugby"]], ["Aisha Khan", ["volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Leo Fischer", ["padel-men", "padel-women", "tennis"]]] },
    par: { head: "Sofia Bianco", associates: [["Ivan Horvat", ALL_IDS], ["Chloé Dubois", ALL_IDS], ["Noah Smith", ALL_IDS]] },
    it: { head: "Daniel Kim", associates: [["Marta Soler", ALL_IDS], ["Yuki Tanaka", ALL_IDS]] }
  };
  // Who works on each of the starting tasks (index into [head, associates...]).
  var TASK_OWNER = { board0: 0, board1: 1, board2: 0, fin0: 0, fin1: 2, fin2: 3, fin3: 1, med0: 1, med1: 0, med2: 3, med3: 2, ops0: 2, ops1: 3, ops2: 1, ops3: 4, par0: 1, par1: 0, par2: 3, it0: 1, it1: 0, it2: 2 };
  function deptPeople(id) { var p = DEPT_PEOPLE[id]; return p ? [p.head].concat(p.associates.map(function (a) { return a[0]; })) : []; }
  function assocFor(deptId, teamId) { var p = DEPT_PEOPLE[deptId], n = ""; if (p) p.associates.forEach(function (a) { if (!n && a[1].indexOf(teamId) > -1) n = a[0]; }); return n; }
  function deptTasks(d) {
    var ppl = deptPeople(d.id);
    return d.tasks.map(function (t, i) { var k = d.id + i; return { key: k, title: t[0], owner: ppl[TASK_OWNER[k] || 0] || "", status: state.tasks[k] || t[1] }; })
      .concat(state.newTasks.filter(function (x) { return x.dept === d.id; }).map(function (x) { return { key: "n" + x.id, title: x.title, owner: x.owner, status: state.tasks["n" + x.id] || "todo" }; }));
  }
  // Only the Board adds tasks: a head for their own department, the president / VPs (and admins) for any.
  function canAddTask(deptId) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "head" && u.dept === deptId)); }
  function canSetTask(deptId) { var u = hv(); return can("tasks") && (u.role === "admin" || u.role === "exec" || u.dept === deptId); }
  // Name of the person whose view this is (example data).
  function myName() {
    var u = hv();
    if (u.role === "head") return (DEPT_PEOPLE[u.dept] || {}).head || "Head";
    if (u.role === "associate") return assocFor(u.dept, (u.teams || [])[0]) || "Associate";
    if (u.role === "captain") return captainName(captainForTeam(firstTeam()));
    if (u.role === "exec") return DEPT_PEOPLE.board.head;
    return "Admin";
  }
  function myRoleText() { var u = hv(); return u.role === "head" ? "Head of " + deptName(u.dept) : u.role === "associate" ? deptName(u.dept) + " associate" : u.role === "exec" ? "President" : u.role === "admin" ? "Admin" : u.role === "captain" ? "Captain" : ""; }
  var METRICS = [["Applications", "Number and diversity of applications"], ["Captains", "Captain satisfaction, surveyed each semester"], ["Events", "Sports-business events and attendance"], ["Income", "Sponsorship and partnership income"], ["Social", "Social media growth, for each team"], ["Reporting", "On-time, complete budget reports"], ["Industry", "Opportunities on the Industry Platform"]];
  var DEPT_ID = { "Finance": "fin", "Media & Marketing": "med", "Operations": "ops", "Partnerships": "par", "IT": "it" };
  function hv() { return state.user; }
  function hFull() { var r = hv().role; return r === "admin" || r === "exec" || r === "viewer"; }
  function hRO() { return hv().role === "viewer"; }
  function hDept(d) { var u = hv(); return hFull() || ((u.role === "head" || u.role === "associate") && u.dept === d); }
  function teamOk(id) { var u = hv(); return hFull() || u.role === "head" || (u.teams || []).indexOf(id) > -1; }
  function can(k) {
    var u = hv(), r = u.role, ro = hRO();
    if (k === "all") return hFull() || r === "head";
    if (k === "expenses") return true; // the ledger: each person sees their own scope (seeExp)
    if (k === "money") return hDept("fin") || r === "captain"; // budgets on the overview and team pages
    if (k === "submit") return !ro && (r === "admin" || r === "exec" || r === "captain" || ["fin", "ops", "med"].indexOf(u.dept) > -1);
    if (k === "ideas") return hDept("ops") || hDept("fin") || r === "captain";
    if (k === "checkups") return true;
    if (k === "validate") return !ro && (r === "admin" || r === "exec" || ((r === "head" || r === "associate") && u.dept === "fin"));
    if (k === "pay") return !ro && (r === "admin" || r === "exec" || (r === "head" && u.dept === "fin"));
    if (k === "applications") return hDept("ops") || r === "captain";
    if (k === "teamEdit") return !ro && (r === "admin" || r === "exec" || hDept("med") || r === "captain");
    if (k === "captains") return hFull() || (r === "head" && u.dept === "ops");
    if (k === "reports") return true; // weekly / monthly / semester, each person for their own scope
    if (k === "depts") return r !== "captain";
    if (k === "tasks") return !ro && r !== "captain";
    return false;
  }
  function visTeams() { return TEAMS.filter(function (t) { return teamOk(t.id); }); }
  function visDepts() { var u = hv(); return DEPTS.filter(function (d) { return hFull() || (d.id !== "board" && d.id === u.dept); }); }
  function firstTeam() { var t = visTeams()[0]; return t ? t.id : TEAMS[0].id; }
  function teamsText(ids) { return (ids || []).map(function (id) { var t = team(id); return t ? tLabel(t) : id; }).join(", "); }
  function viewLabel(u) {
    return u.role === "admin" ? "Admin · full access" : u.role === "exec" ? "President / Vice-president · everything" : u.role === "head" ? "Head of " + deptName(u.dept) + " · every team" :
      u.role === "associate" ? "Associate · " + deptName(u.dept) + " · " + teamsText(u.teams) : u.role === "captain" ? "Captain · " + teamsText(u.teams) : "Eva Morta · Student Council · view only";
  }
  // Views a signed-in person may open. Admins can preview every view; others only their own role(s).
  function allowedViews() {
    var out = [], sc = captain && captain.scope;
    if (admin) {
      out.push({ role: "admin" }, { role: "exec" });
      DEPTS.forEach(function (d) { if (d.id !== "board") out.push({ role: "head", dept: d.id }); });
      DEPTS.forEach(function (d) { if (d.id !== "board") out.push({ role: "associate", dept: d.id, teams: [TEAMS[0].id] }); });
      out.push({ role: "captain", teams: [TEAMS[0].id] }, { role: "viewer" });
      return out;
    }
    if (!sc) return out;
    if (sc.exec) out.push({ role: "exec" });
    (sc.heads || []).forEach(function (d) { if (DEPT_ID[d]) out.push({ role: "head", dept: DEPT_ID[d] }); });
    (sc.assoc || []).forEach(function (x) { if (DEPT_ID[x.department]) out.push({ role: "associate", dept: DEPT_ID[x.department], teams: x.teams }); });
    if ((sc.teams || []).length) out.push({ role: "captain", teams: sc.teams });
    if (sc.viewer) out.push({ role: "viewer" });
    return out;
  }
  // Prototype demo (admins only): switch perspective in one click to show how each person sees the Hub.
  // It only changes this preview; real data access is checked in Convex for the signed-in account.
  var DEMO = [
    ["student", "1 · Student (public website)"],
    ["exec", "2 · Board: President / Vice-president", { role: "exec" }],
    ["head-fin", "2 · Board: Head of Finance (all teams)", { role: "head", dept: "fin" }],
    ["head-ops", "2 · Board: Head of Operations (all teams)", { role: "head", dept: "ops" }],
    ["head-it", "2 · Board: Head of IT", { role: "head", dept: "it" }],
    ["assoc-ops", "3 · Associate: Operations, Basketball Women", { role: "associate", dept: "ops", teams: ["basketball-women"] }],
    ["assoc", "3 · Associate: Finance, Basketball Women", { role: "associate", dept: "fin", teams: ["basketball-women"] }],
    ["captain", "4 · Captain: Basketball Women", { role: "captain", teams: ["basketball-women"] }],
    ["viewer", "Student Council (Eva Morta), view only", { role: "viewer" }],
    ["admin", "Admin (back to full access)", { role: "admin" }]
  ];
  function demoKey(u) { var k = ""; DEMO.forEach(function (d) { if (d[2] && d[2].role === u.role && d[2].dept === u.dept && (d[2].teams || []).join() === (u.teams || []).join()) k = d[0]; }); return k; }
  function demoBar(u) {
    var k = demoKey(u);
    return '<div class="banner demo"><b>Prototype demo</b><span>Viewing as <strong>' + esc(viewLabel(u)) + "</strong> (example data).</span>" +
      '<label class="demo-as">Demo as<select id="demo-as">' + (k ? "" : '<option value="" selected>Custom view</option>') + DEMO.map(function (d) { return '<option value="' + d[0] + '"' + (d[0] === k ? " selected" : "") + ">" + esc(d[1]) + "</option>"; }).join("") + "</select></label>" +
      (u.role !== "admin" ? '<button type="button" class="btn sm" data-demo="admin">Back to admin</button>' : "") + "</div>";
  }
  function setDemo(key) {
    if (!admin) return; // demo mode is for signed-in admins only
    var d = null; DEMO.forEach(function (x) { if (x[0] === key) d = x; });
    if (!d) return;
    demoPublic = key === "student"; industryVisibility();
    if (key === "student") { go("home"); toast("Public website: what every student sees. Use Hub in the top bar to come back."); return; }
    state.user = JSON.parse(JSON.stringify(d[2])); state.teamOpen = null; save(); renderAcct();
    if (location.hash === "#hub-overview") render(); else go("hub-overview");
  }
  function viewAllowed(u) {
    if (!u || !HUB_ROLES[u.role]) return false;
    if (admin) return true;
    return allowedViews().some(function (v) { return v.role === u.role && v.dept === u.dept && (v.teams || []).join() === (u.teams || []).join(); });
  }
  function totals(id) { var o = { paid: 0, pending: 0 }; allExp().forEach(function (e) { if (e.team !== id) return; if (e.status === "paid") o.paid += e.amount; else if (e.status !== "rejected") o.pending += e.amount; }); return o; }
  function captainForTeam(id) { for (var i = 0; i < state.captains.length; i++) if (state.captains[i].team === id && state.captains[i].active && state.captains[i].role === "Captain") return state.captains[i]; return null; }
  function captainName(c) { return c ? (c.first + (c.last ? " " + c.last : "")) : "Unassigned"; }
  function sportsApplicationsFolder(id) { return "Applications for sports/" + id; }
  function applicationsForTeam(id) { return state.teamApplications[sportsApplicationsFolder(id)] || []; }
  function visibleSportsApplications() {
    var out = [];
    Object.keys(state.teamApplications || {}).forEach(function (folder) {
      var id = folder.replace("Applications for sports/", "");
      if (teamOk(id)) out = out.concat(state.teamApplications[folder] || []);
    });
    return out.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  // Team information: saved in Convex from the Team editor (public fields only on the website).
  var TEAM_INFO = {};
  function teamInfoFor(id) { return TEAM_INFO[id] || state.teamInfo[id] || {}; }
  function loadTeamInfo() {
    if (!backend || !backend.listTeamInfo) return Promise.resolve();
    return Promise.resolve(backend.listTeamInfo()).then(function (rows) {
      TEAM_INFO = {}; (rows || []).forEach(function (r) { TEAM_INFO[r.teamId] = r; });
      var h = location.hash.slice(1); if (h.indexOf("team-") === 0) render();
    }, console.error);
  }
  function teamResultsFor(id) { return state.teamResults[id] || []; }
  function pill(map, k) { return '<span class="pill ' + map[k][0] + '">' + map[k][1] + "</span>"; }
  function stat(k, v, s) { return '<div class="stat"><p class="eyebrow">' + k + '</p><span class="v num">' + v + "</span><small>" + s + "</small></div>"; }
  var HUBV = [["hub-overview", "Overview"], ["hub-teams", "Teams"], ["hub-team-editor", "Team editor"], ["hub-applications", "Sports applications"], ["hub-captains", "Captains"], ["hub-ideas", "Ideas & logistics"], ["hub-expenses", "Expenses ledger"], ["hub-departments", "Departments"], ["hub-report", "Reports"]];

  function hubShell(view, inner) {
    var pending = visExp().filter(canDecideE).length, newIdeas = can("ideas") ? visIdeas().filter(function (i) { return i.status === "new"; }).length : 0;
    var nav = HUBV.filter(function (v) { return (v[0] !== "hub-expenses" || can("expenses")) && (v[0] !== "hub-departments" || can("depts")) && (v[0] !== "hub-report" || can("reports")) && (v[0] !== "hub-captains" || can("captains")) && (v[0] !== "hub-team-editor" || can("teamEdit")) && (v[0] !== "hub-applications" || can("applications")) && (v[0] !== "hub-ideas" || can("ideas")); }).map(function (v) {
      return '<a href="#' + v[0] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + (v[0] === "hub-teams" && !can("all") ? "My team" : v[1]) + (v[0] === "hub-expenses" && pending ? '<span class="count num">' + pending + "</span>" : "") + (v[0] === "hub-ideas" && newIdeas ? '<span class="count num">' + newIdeas + "</span>" : "") + (v[0] === "hub-applications" && visibleSportsApplications().length ? '<span class="count num">' + visibleSportsApplications().length + "</span>" : "") + "</a>";
    }).join("");
    var u = state.user, me = admin || captain, multi = !!admin || allowedViews().length > 1;
    return '<div class="app"><aside class="rail"><div class="top"><a class="lock" href="#home" aria-label="Back to Esade Sports home">' + mono(38) + '<span>ESADE SPORTS<br>HUB</span></a><div class="history" aria-label="Page navigation"><button type="button" data-history="back" aria-label="Go back">←</button><button type="button" data-history="forward" aria-label="Go forward">→</button></div>' +
      '<div class="who"><p class="eyebrow">Signed in' + (admin ? " as admin" : "") + '</p><strong>' + esc(me.email) + "</strong><small>Viewing as " + esc(viewLabel(u)) + (hRO() ? " · read-only" : "") + "</small>" + (multi ? '<a class="back-site" href="#signin">Change view</a>' : "") + '<a class="back-site" href="#home">← Public site</a><button type="button" data-signout>Sign out</button>' + langSwitch() + '</div></div>' +
      '<nav aria-label="Hub">' + nav + "</nav></aside>" +
      '<main class="main">' + (admin ? demoBar(u) : '<div class="banner"><b>Prototype</b><span>Example figures and tasks. In the live version, access comes from an approved Esade login and data from a shared database.</span></div>') + inner + "</main></div>";
  }
  // People responsible for a team in each department (captain view, team detail).
  function teamContacts(teamId) {
    return [["fin", "Finance"], ["med", "Media & Marketing"], ["ops", "Operations"], ["par", "Partnerships"]].map(function (d) {
      return [d[1], assocFor(d[0], teamId) || "To be assigned", "Head: " + DEPT_PEOPLE[d[0]].head];
    });
  }
  function contactsPanel(teamId) {
    return '<section class="panel"><div class="panel-head"><h2>Who looks after your team</h2><span class="muted" style="font-size:12px">Example names</span></div><div class="people">' +
      teamContacts(teamId).map(function (p) { return '<div><p class="eyebrow">' + esc(p[0]) + "</p><strong>" + esc(p[1]) + '</strong><small class="muted">' + esc(p[2]) + "</small></div>"; }).join("") + "</div></section>";
  }
  function tasksPanel(deptId) {
    var d = null; DEPTS.forEach(function (x) { if (x.id === deptId) d = x; }); if (!d) return "";
    var ts = deptTasks(d), open = ts.filter(function (t) { return t.status !== "done"; }).length;
    return '<section class="panel"><div class="panel-head"><h2>' + esc(d.name) + ' tasks</h2><a class="btn sm" href="#hub-departments" data-dept-open="' + d.id + '">Open department</a></div><p class="muted" style="margin:0 0 8px;font-size:13px">' + open + " open · " + (ts.length - open) + " done</p><ul class=\"tasks\">" +
      ts.map(function (t) { return "<li><span>" + esc(t.title) + '<small class="owner">' + esc(t.owner || "Unassigned") + "</small></span>" + taskStatusPill(t.status) + "</li>"; }).join("") + "</ul></section>";
  }
  function taskStatusPill(st) { return '<span class="pill ' + (st === "done" ? "ok" : st === "doing" ? "info" : "warn") + '">' + TASK_STATUS[st] + "</span>"; }
  function deptPanel() {
    var u = hv();
    if ((u.role === "head" || u.role === "associate") && u.dept) return tasksPanel(u.dept);
    if (u.role === "captain") return contactsPanel(firstTeam());
    return '<section class="panel"><div class="panel-head"><h2>Departments</h2><a class="btn sm" href="#hub-departments">Open</a></div><table><tbody>' +
      visDepts().map(function (d) { var done = d.tasks.filter(function (t, i) { return state.tasks[d.id + i] === "done"; }).length; return "<tr><td><strong>" + d.name + '</strong><br><small class="muted">' + d.head + '</small></td><td class="r num">' + done + " / " + d.tasks.length + ' <span class="muted">done</span></td></tr>'; }).join("") + "</tbody></table></section>";
  }
  function hubOverview() {
    var ts = visTeams(), budget = 0, paid = 0, pend = 0;
    if (!can("money")) // no finance view: teams and department only
      return '<div class="ph-head"><div><p class="eyebrow">Season 2026–27</p><h1 class="display">Overview.</h1><p>' + esc(viewLabel(hv())) + ".</p></div></div>" +
        '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>' + (can("all") ? "Every team" : "Your teams") + '</h2><a class="btn sm" href="#hub-teams">Open</a></div><table><tbody>' +
        ts.map(function (t) { return '<tr><td class="tname">' + esc(tLabel(t)) + '</td><td class="r muted">' + esc(captainName(captainForTeam(t.id))) + "</td></tr>"; }).join("") + "</tbody></table></section>" + deptPanel() + "</div>";
    ts.forEach(function (t) { var o = totals(t.id); budget += t.budget; paid += o.paid; pend += o.pending; });
    var reqs = visExp().filter(function (e) { return e.status === "requested"; });
    var agreed = ts.filter(function (t) { return t.status === "agreed"; }).length;
    return '<div class="ph-head"><div><p class="eyebrow">Season 2026–27</p><h1 class="display">' + (ts.length !== 1 ? "Overview." : esc(tLabel(ts[0])) + ".") + "</h1><p>" + (ts.length !== 1 ? "Where " + (can("all") ? "every team" : "your teams") + " and " + (hFull() ? "every department" : "your department") + " stand today." : "Your team's budget and expenses, handled by your Finance, Media and Operations associates.") + "</p></div></div>" +
      '<div class="grid-4">' + stat("Season budget", EUR.format(budget), ts.length !== 1 ? ts.length + " teams" : "Agreed with you") + stat("Paid so far", EUR.format(paid), Math.round(paid / budget * 100) + "% of budget") +
      stat("Waiting", EUR.format(pend), reqs.length + " request" + (reqs.length === 1 ? "" : "s") + " to validate") + stat(ts.length !== 1 ? "Budgets agreed" : "Budget", ts.length !== 1 ? agreed + " / " + ts.length : BUDGET_STATUS[ts[0].status][1], ts.length !== 1 ? "with captains" : "status") + "</div>" +
      '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Requests waiting for Finance</h2>' + (hv().role === "captain" && can("submit") ? '<a class="btn sm solid" href="#hub-expenses" data-make-req>Make a request</a>' : '<a class="btn sm" href="#hub-expenses">All expenses</a>') + '</div>' + expTable(reqs, true) + "</section>" +
      deptPanel() + "</div>";
  }
  // ---- Team information and roster (captain's team sheet) --------------------------------------
  // The roster holds personal data: only the team's captain and the President / VPs / admins see it (checked in Convex).
  var ROSTER = {}, ROSTER_ALL = null;
  var SHIRTS = ["XS", "S", "M", "L", "XL", "XXL"], PROGRAMS = ["BBA", "BAIB", "GEL", "Double degree", "Masters", "Other"], PYEARS = ["1", "2", "3", "4", "5", "Masters"];
  var PL_FIELDS = [["first", "First name", "text"], ["last", "Last name", "text"], ["shirt", "Shirt", "shirt"], ["number", "No.", "num"], ["idDoc", "DNI / NIE", "text"], ["nationality", "Nationality", "text"], ["birth", "Birth date", "date"], ["email", "Email", "email"], ["phone", "Phone (+prefix)", "tel"], ["program", "Program", "program"], ["year", "Year", "year"], ["notes", "Allergies / notes", "text"]];
  function canRoster(id) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "captain" && (u.teams || []).indexOf(id) > -1)); }
  function rosterOf(id) {
    if (state.rosterDraft && state.rosterDraft[id]) return state.rosterDraft[id];
    if (live()) {
      if (ROSTER[id] === undefined && backend.getRoster) {
        ROSTER[id] = null;
        Promise.resolve(backend.getRoster(id)).then(function (r) { ROSTER[id] = r || { players: [] }; hubRefresh(); }, function (x) { console.error(x); ROSTER[id] = { players: [] }; });
      }
      return ROSTER[id] ? ROSTER[id].players : null;
    }
    return ((state.rosters || {})[id] || { players: [] }).players;
  }
  function sizeSummary(players) {
    var n = {}; players.forEach(function (p) { if (p.shirt) n[p.shirt] = (n[p.shirt] || 0) + 1; });
    return SHIRTS.filter(function (s) { return n[s]; }).map(function (s) { return n[s] + " " + s; }).join(" · ");
  }
  function plInput(f, val, i) {
    var name = 'data-f="' + f[0] + '" aria-label="' + esc(f[1]) + " " + (i + 1) + '"', v = esc(val || "");
    function sel(opts) { return "<select " + name + '><option value=""></option>' + opts.map(function (o) { return '<option' + (o === val ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>"; }
    if (f[2] === "shirt") return sel(SHIRTS);
    if (f[2] === "program") return sel(PROGRAMS);
    if (f[2] === "year") return sel(PYEARS);
    return "<input " + name + ' type="' + (f[2] === "num" ? "text" : f[2]) + '" value="' + v + '"' + (f[2] === "num" ? ' inputmode="numeric" maxlength="3" class="n"' : "") + ">";
  }
  function teamInfoPanel(id) {
    var i = teamInfoFor(id), rows = [["About", i.about], ["Training facility", [i.venue, i.venueAddress].filter(Boolean).join(", ")], ["League", i.league], ["League page", i.leagueUrl], ["Team contact", i.contact]].filter(function (r) { return r[1]; });
    return '<section class="panel"><div class="panel-head"><h2>Team information</h2>' + (can("teamEdit") ? '<a class="btn sm" href="#hub-team-editor">Edit</a>' : "") + "</div>" +
      (rows.length ? '<dl class="facts">' + rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" : '<p class="empty">Not filled in yet. ' + (can("teamEdit") ? 'Use <a href="#hub-team-editor">Team editor</a> to add the facility, league and contacts.' : "") + "</p>") + "</section>";
  }
  function rosterPanel(id) {
    if (!canRoster(id)) return "";
    var pl = rosterOf(id);
    if (pl === null) return '<section class="panel"><div class="panel-head"><h2>Team roster</h2></div><p class="empty">Loading…</p></section>';
    var rows = pl.length ? pl : [{}];
    return '<section class="panel roster"><div class="panel-head"><h2>Team roster <span class="muted" style="font-weight:600">· ' + pl.length + " player" + (pl.length === 1 ? "" : "s") + "</span></h2>" +
      '<span class="pill">Private: captain and Board only</span></div>' +
      (sizeSummary(pl) ? '<p class="muted" style="margin:0;font-size:13px">Shirt sizes: <b>' + esc(sizeSummary(pl)) + "</b></p>" : "") +
      '<div class="table-wrap"><table class="roster-t" data-roster="' + id + '"><thead><tr>' + PL_FIELDS.map(function (f) { return "<th>" + f[1] + "</th>"; }).join("") + "<th></th></tr></thead><tbody>" +
      rows.map(function (p, i) { return '<tr data-pl="' + i + '">' + PL_FIELDS.map(function (f) { return "<td>" + plInput(f, p[f[0]], i) + "</td>"; }).join("") + '<td><button type="button" class="btn sm ghost" data-pl-del="' + i + '" aria-label="Remove player ' + (i + 1) + '">✕</button></td></tr>'; }).join("") +
      '</tbody></table></div><div class="roster-actions"><button type="button" class="btn sm" data-pl-add="' + id + '">+ Add player</button><button type="button" class="btn sm solid" data-pl-save="' + id + '">Save roster</button>' +
      (live() && ROSTER[id] && ROSTER[id].updatedBy ? '<small class="muted">Last saved by ' + esc(ROSTER[id].updatedBy) + " · " + esc(fmtWhen(ROSTER[id].updatedAt)) + "</small>" : "") + "</div></section>";
  }
  function readRoster(id) {
    var out = [];
    hub.querySelectorAll('table[data-roster="' + id + '"] tbody tr').forEach(function (tr) {
      var p = {}; tr.querySelectorAll("[data-f]").forEach(function (el) { var v = el.value.trim(); if (v) p[el.getAttribute("data-f")] = v; });
      out.push(p);
    });
    return out;
  }
  // Board overview: every team's roster size and shirt sizes (President, VPs, admins).
  function rostersOverview() {
    var u = hv(); if (hRO() || !(u.role === "admin" || u.role === "exec")) return "";
    var all = {};
    if (live()) {
      if (ROSTER_ALL === null && backend.listRosters) { ROSTER_ALL = []; Promise.resolve(backend.listRosters()).then(function (rows) { ROSTER_ALL = rows || []; (rows || []).forEach(function (r) { if (ROSTER[r.team] === undefined) ROSTER[r.team] = r; }); hubRefresh(); }, console.error); }
      (ROSTER_ALL || []).forEach(function (r) { all[r.team] = r.players; });
    } else Object.keys(state.rosters || {}).forEach(function (k) { all[k] = state.rosters[k].players; });
    return '<section class="panel"><div class="panel-head"><h2>Rosters, every team</h2><span class="pill">Board only</span></div><div class="table-wrap"><table><thead><tr><th>Team</th><th>Captain</th><th class="r">Players</th><th>Shirt sizes</th></tr></thead><tbody>' +
      TEAMS.map(function (t) { var pl = all[t.id] || []; return '<tr class="click" data-hteam="' + t.id + '" tabindex="0"><td class="tname">' + esc(tLabel(t)) + "</td><td>" + esc(captainName(captainForTeam(t.id))) + '</td><td class="r num">' + (pl.length || '<span class="muted">—</span>') + "</td><td>" + (esc(sizeSummary(pl)) || '<span class="muted">Not filled in</span>') + "</td></tr>"; }).join("") +
      '</tbody></table></div><p class="muted" style="margin:0;font-size:12px">Select a team to open its information and full roster.</p></section>';
  }
  function hubTeams() {
    var ts = visTeams();
    if (!can("money")) // teams without the money columns (Finance only)
      return '<div class="ph-head"><div><p class="eyebrow">Teams</p><h1 class="display">' + (can("all") ? "Every team." : "Your teams.") + '</h1><p>Budgets and expenses are handled by Finance.</p></div></div>' +
        '<section class="panel"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Captain</th></tr></thead><tbody>' +
        ts.map(function (t) { return '<tr><td class="tname">' + esc(tLabel(t)) + "</td><td>" + esc(captainName(captainForTeam(t.id))) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    var open = state.teamOpen || (ts.length === 1 ? ts[0].id : null), detail = "";
    if (open) {
      var t = team(open), o = totals(open);
      detail = '<section class="panel" id="team-detail"><div class="panel-head"><h2>' + esc(tLabel(t)) + "</h2>" + pill(BUDGET_STATUS, t.status) + "</div>" +
        '<div class="people">' + [["Captain", captainName(captainForTeam(open)), "Runs the team"], ["Finance associate", assocFor("fin", open), "Budget and payments"], ["Media associate", assocFor("med", open), "Social media and coverage"], ["Operations associate", assocFor("ops", open), "Bookings, kit, travel"]].map(function (p) { return '<div class="person"><p class="eyebrow">' + p[0] + "</p><strong>" + esc(p[1]) + "</strong><small>" + p[2] + "</small></div>"; }).join("") + "</div>" +
        '<p class="muted" style="margin:0">Budget ' + EUR.format(t.budget) + " · paid " + EUR.format(o.paid) + " · waiting " + EUR.format(o.pending) + " · left " + EUR.format(Math.max(0, t.budget - o.paid - o.pending)) + "</p>" +
        splitPanel(t) +
        expTable(visExp().filter(function (e) { return e.team === open; }), false) + "</section>" + teamInfoPanel(open) + rosterPanel(open);
    }
    return '<div class="ph-head"><div><p class="eyebrow">Teams</p><h1 class="display">' + (can("all") ? "Every team." : "My team.") + "</h1><p>Each official team has a season budget agreed with its captain, and three dedicated associates.</p></div></div>" +
      '<section class="panel"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Budget</th><th class="r">Agreed</th><th class="r">Paid</th><th>Used (paid + waiting)</th></tr></thead><tbody>' +
      ts.map(function (t) { var o = totals(t.id), p = Math.min(100, o.paid / t.budget * 100), q = Math.min(100 - p, o.pending / t.budget * 100);
        return '<tr class="click" data-hteam="' + t.id + '" tabindex="0"><td class="tname">' + esc(tLabel(t)) + "</td><td>" + pill(BUDGET_STATUS, t.status) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(o.paid) + '</td><td style="width:22%"><div class="bar"><i style="width:' + p + '%"></i><i class="pend" style="left:' + p + "%;width:" + q + '%"></i></div></td></tr>'; }).join("") +
      "</tbody></table></div>" + (can("all") ? '<p class="muted" style="margin:0;font-size:12px">Select a team to see its associates and expenses.</p>' : "") + "</section>" + rostersOverview() + detail;
  }
  // ---- Expenses ledger -------------------------------------------------------------------------
  // Signed in with Convex: rows come from the database (only what this account may see, kept live).
  // Without Convex (local preview): the example rows saved in this browser.
  var LIVE = { exp: null, ideas: null, checks: {}, unExp: null, unIdeas: null, dirty: false };
  function live() { return !!(backend && backend.watchExpenses && (admin || captain)); }
  function meEmail() { var m = admin || captain; return m ? m.email : ""; }
  function errText(x, d) { var m = String((x && x.data) || (x && x.message) || ""), m2 = m.match(/ConvexError: (.*)/); return (m2 ? m2[1] : x && x.data ? m : "") || d || "Something went wrong. Try again."; }
  function fromServer(r) {
    return { id: r._id, team: r.team, dept: r.dept, item: r.item, cat: r.cat, amount: r.amount, by: r.by, byEmail: r.byEmail, date: r.date, status: r.status, link: r.link,
      file: r.fileUrl ? { name: r.fileName || "Attachment", data: r.fileUrl } : null, decidedBy: r.decidedBy, decidedByEmail: r.decidedByEmail, reason: r.reason,
      history: r.history || [], example: r.isExample, sv: { d: r.canDecide, p: r.canPay, r: r.canReconsider } };
  }
  function hubBusy() { var a = document.activeElement; return !!(a && hub.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "button" && a.type !== "submit") || a.tagName === "SELECT")); }
  function hubRefresh() { if (location.hash.indexOf("#hub-") !== 0) return; if (hubBusy()) { LIVE.dirty = true; return; } LIVE.dirty = false; render(); }
  function startLive() {
    if (!backend || !backend.watchExpenses) return;
    var on = !!(admin || captain);
    if (on && !LIVE.unExp) {
      LIVE.unExp = backend.watchExpenses(function (rows) { if (rows === undefined) return; LIVE.exp = (rows || []).map(fromServer); hubRefresh(); });
      LIVE.unIdeas = backend.watchIdeas(function (rows) { if (rows === undefined) return; LIVE.ideas = rows || []; hubRefresh(); });
    } else if (!on && LIVE.unExp) {
      LIVE.unExp(); LIVE.unIdeas(); LIVE.unExp = LIVE.unIdeas = null; LIVE.exp = LIVE.ideas = null; LIVE.checks = {}; ROSTER = {}; ROSTER_ALL = null;
    }
  }
  function allExp() { return live() ? LIVE.exp || [] : state.expenses; }
  function visExp() { return allExp().filter(seeExp); }
  // Who sees an expense: Finance for the team (it validates everything), the expense's own department
  // (heads: every team; associates: their teams), the team's captains; President, VPs, admins, Student Council: all.
  function seeExp(e) {
    var u = hv(), d = DEPT_ID[e.dept], mine = (u.teams || []).indexOf(e.team) > -1;
    if (hFull()) return true;
    if (u.role === "head") return u.dept === "fin" || u.dept === d;
    if (u.role === "associate") return mine && (u.dept === "fin" || u.dept === d);
    return u.role === "captain" && mine;
  }
  function srv(e, k) { return !e.sv || !!e.sv[k]; } // live rows: the server's answer for this account
  function canDecideE(e) { var u = hv(); return e.status === "requested" && can("validate") && (u.role !== "associate" || (u.teams || []).indexOf(e.team) > -1) && srv(e, "d"); }
  function canPayE(e) { return e.status === "validated" && can("pay") && srv(e, "p"); }
  function meLabel() { return myName() + " (" + myRoleText() + ")"; }
  // Reconsider: whoever decided it, or anyone above them (Head of Finance, President, VPs, admins).
  function canReconE(e) {
    if (hRO() || e.status === "requested") return false;
    var mine = live() ? !!e.decidedByEmail && e.decidedByEmail === meEmail() : e.decidedBy === meLabel();
    return (can("pay") || (e.status !== "paid" && mine && canDecideE({ status: "requested", team: e.team }))) && srv(e, "r");
  }
  var ACTION = { requested: "Requested", validated: "Validated", rejected: "Rejected", paid: "Paid", reopened: "Reopened for review" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDay(ms) { var d = new Date(ms); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function fmtWhen(ms) { var d = new Date(ms); return fmtDay(ms) + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  // Budget lines: each team's budget is split between Operations and Marketing (example split 70 / 30).
  function budgetLines(t) { var o = Math.round(t.budget * 0.7); return { ops: o, med: t.budget - o }; }
  function lineUse(teamId) {
    var u = { ops: 0, med: 0 };
    allExp().forEach(function (e) { if (e.team !== teamId || e.status === "rejected" || e.status === "requested") return; if (e.dept === "Media & Marketing") u.med += e.amount; else if (e.dept === "Operations") u.ops += e.amount; });
    return u;
  }
  function splitPanel(t) {
    var b = budgetLines(t), u = lineUse(t.id);
    return '<div class="split">' + [["Operations", b.ops, u.ops, "Kit, facilities, travel, tournaments"], ["Marketing", b.med, u.med, "Media, promotion, events"]].map(function (x) {
      var pc = x[1] ? Math.min(100, x[2] / x[1] * 100) : 0;
      return '<div><p class="eyebrow">' + x[0] + ' budget</p><strong class="num">' + EUR.format(x[2]) + ' <span class="muted">/ ' + EUR.format(x[1]) + '</span></strong><div class="bar"><i style="width:' + pc + '%"></i></div><small class="muted">' + x[3] + "</small></div>";
    }).join("") + '<small class="muted split-note">Split agreed by Finance (example: 70 / 30). Validated and paid expenses count against it.</small></div>';
  }
  function histList(e) {
    var h = e.history || []; if (!h.length) return "";
    return '<details class="hist"><summary>History (' + h.length + ")</summary><ol>" + h.map(function (x) {
      return "<li><b>" + esc(ACTION[x.action] || x.action) + "</b> · " + esc(fmtWhen(x.at)) + " · " + esc(x.by) + (x.reason ? '<br><span class="reason">“' + esc(x.reason) + "”</span>" : "") + "</li>";
    }).join("") + "</ol></details>";
  }
  function expTable(list, compact) {
    if (!list.length) return '<p class="empty">' + (live() && LIVE.exp === null ? "Loading…" : "Nothing here yet.") + "</p>";
    var multi = visTeams().length > 1;
    var act = list.some(function (e) { return canDecideE(e) || canPayE(e) || canReconE(e); });
    return '<div class="table-wrap"><table class="exp"><thead><tr><th>Date</th>' + (multi ? "<th>Team</th>" : "") + '<th>Expense</th><th class="r">Amount</th><th>Status</th>' + (act ? '<th class="r">Action</th>' : "") + "</tr></thead><tbody>" +
      list.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (e) {
        var id = String(e.id), btns = "";
        if (state.rejecting === id) btns = '<div class="reject-box"><textarea id="rj-' + id + '" rows="2" placeholder="Why is it rejected? (required)" aria-label="Reason for rejecting"></textarea><div><button class="btn sm solid" data-reject-confirm="' + id + '">Reject</button> <button class="btn sm" data-reject-cancel>Cancel</button></div></div>';
        else if (state.reconsidering === id) btns = '<div class="reject-box"><textarea id="rc-' + id + '" rows="2" placeholder="Why reconsider this decision? (required)" aria-label="Reason for reconsidering"></textarea><div><button class="btn sm solid" data-recon-confirm="' + id + '">Reopen</button> <button class="btn sm" data-reject-cancel>Cancel</button></div></div>';
        else {
          if (canDecideE(e)) btns = '<button class="btn sm" data-act="validated" data-id="' + id + '">Validate</button> <button class="btn sm" data-act="reject" data-id="' + id + '">Reject</button>';
          if (canPayE(e)) btns = '<button class="btn sm solid" data-act="paid" data-id="' + id + '">Mark paid</button>';
          if (canReconE(e)) btns += (btns ? " " : "") + '<button class="btn sm ghost" data-act="reconsider" data-id="' + id + '">Reconsider</button>';
        }
        var files = (e.link ? '<a href="' + esc(e.link) + '" target="_blank" rel="noopener">Link ↗</a>' : "") + (e.file ? (e.link ? " · " : "") + '<a href="' + esc(e.file.data) + '" target="_blank" rel="noopener" download="' + esc(e.file.name) + '">' + esc(e.file.name) + "</a>" : "");
        var who = e.decidedBy && e.status !== "requested" ? '<br><small class="muted">' + (e.status === "rejected" ? "Rejected" : "Validated") + " by " + esc(e.decidedBy) + "</small>" : "";
        var why = e.status === "rejected" && e.reason ? '<br><small class="reason">“' + esc(e.reason) + "”</small>" : "";
        var reopened = (e.history || []).some(function (x) { return x.action === "reopened"; }) ? ' <span class="pill info">Reconsidered</span>' : "";
        return '<tr><td class="num muted">' + e.date.slice(5).split("-").reverse().join("/") + "</td>" + (multi ? '<td class="tname">' + esc(tLabel(team(e.team)) || e.team) + "</td>" : "") +
          "<td>" + esc(e.item) + (e.example ? ' <span class="pill">Example</span>' : "") + (compact ? "" : '<br><small class="muted">' + esc(e.cat) + " · " + esc(e.dept === "Media & Marketing" ? "Marketing budget" : e.dept === "Operations" ? "Operations budget" : e.dept) + " · by " + esc(e.by) + "</small>") + (files && !compact ? '<br><small class="files">' + files + "</small>" : "") + (compact ? "" : histList(e)) +
          '</td><td class="r num"><strong>' + EUR.format(e.amount) + "</strong></td><td>" + pill(EXP_STATUS, e.status) + reopened + who + why + "</td>" +
          (act ? '<td class="r">' + btns + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function exportButtons(kind) {
    return '<div class="exports"><button type="button" class="btn sm" data-export="xlsx" data-scope="' + kind + '">⬇ Excel</button><button type="button" class="btn sm" data-export="pptx" data-scope="' + kind + '">⬇ PowerPoint</button></div>';
  }
  function hubExpenses() {
    var list = visExp(), u = hv();
    var shown = state.hubFilter === "all" ? list : list.filter(function (e) { return e.status === state.hubFilter; });
    var lines = '<option value="Operations"' + (u.dept === "med" ? "" : " selected") + '>Operations budget (kit, facilities, travel, tournaments)</option><option value="Media & Marketing"' + (u.dept === "med" ? " selected" : "") + ">Marketing budget (media, promotion, events)</option>";
    var form = can("submit") ? '<section class="panel"><div class="panel-head"><h2>Request a payment</h2><span class="muted" style="font-size:12px">The association pays directly. No captain fronts money.</span></div><form class="form" id="req">' +
      (visTeams().length > 1 ? '<label for="r-team">Team<select id="r-team">' + visTeams().map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label for="r-item" style="grid-column:span 2">What is it for<input id="r-item" required maxlength="140" placeholder="e.g. Referee fees, November"></label>' +
      '<label for="r-dept">Budget line<select id="r-dept">' + lines + '</select></label><label for="r-cat">Category<select id="r-cat"><option>League fees</option><option>Facilities</option><option>Kit</option><option>Material</option><option>Travel</option><option>Media</option><option>Promotion</option><option>Events</option></select></label>' +
      '<label for="r-amt">Amount (€)<input id="r-amt" type="number" min="1" step="1" required inputmode="numeric" placeholder="0"></label>' +
      '<label for="r-link" style="grid-column:span 2">Link to the product or quote (optional)<input id="r-link" type="url" placeholder="https://..."></label><label for="r-file">Picture, screenshot or PDF (optional)<input id="r-file" type="file" accept="image/*,application/pdf"></label>' +
      '<div><button class="btn solid" type="submit" id="r-send" style="width:100%">Send request</button></div></form></section>' : "";
    var ex = "";
    if (admin && live() && LIVE.exp) ex = LIVE.exp.some(function (e) { return e.example; })
      ? '<p class="muted ex-tools">Example rows are loaded for the demo. <button type="button" class="btn sm" data-examples="remove">Remove example expenses</button></p>'
      : '<p class="muted ex-tools">The ledger is empty. For a demo: <button type="button" class="btn sm" data-examples="load">Load example expenses</button> (marked “Example”, removable in one click).</p>';
    return '<div class="ph-head"><div><p class="eyebrow">Expenses ledger · ' + esc(viewLabel(u)) + '</p><h1 class="display">Every euro, traced.</h1><p>Every request, decision and payment for ' + (hFull() ? "every team and department" : u.role === "head" ? (u.dept === "fin" ? "every team" : esc(deptName(u.dept)) + ", every team") : u.role === "associate" ? esc(deptName(u.dept)) + " · " + esc(teamsText(u.teams)) : "your team") + '. It updates as soon as a request is decided or reconsidered, and downloads as Excel or PowerPoint.</p></div>' + exportButtons("ledger") + "</div>" +
      '<div class="flow" aria-label="How an expense moves"><span>Captain or department requests</span><span>Finance validates or rejects (with a reason)</span><span>Association pays</span><span>Can be reconsidered</span></div>' + ex + form +
      '<section class="panel"><div class="chips" role="group" aria-label="Filter by status">' + [["all", "All"], ["requested", "Requested"], ["validated", "Validated"], ["paid", "Paid"], ["rejected", "Rejected"]].map(function (c) {
        var n = c[0] === "all" ? list.length : list.filter(function (e) { return e.status === c[0]; }).length;
        return '<button class="chip" data-filter="' + c[0] + '" aria-pressed="' + (state.hubFilter === c[0]) + '">' + c[1] + ' <span class="num">' + n + "</span></button>"; }).join("") + "</div>" + expTable(shown, false) + "</section>";
  }
  // Decide / pay / reconsider: Convex when signed in, else this browser (prototype).
  function expAct(kind, id, reason) {
    var msg = kind === "validated" ? "Validated. Ready to pay." : kind === "paid" ? "Marked as paid." : kind === "rejected" ? "Request rejected. The requester sees your reason." : "Reopened. It can be decided again.";
    state.rejecting = state.reconsidering = null;
    if (live()) {
      var p = kind === "reopen" ? backend.reconsiderExpense({ id: id, reason: reason }) : backend.decideExpense({ id: id, status: kind, reason: reason || undefined });
      return Promise.resolve(p).then(function () { toast(msg); render(); }, function (x) { toast(errText(x)); render(); });
    }
    state.expenses.forEach(function (e) {
      if (String(e.id) !== id) return;
      var me = meLabel(), now = Date.now();
      e.history = e.history || [];
      if (kind === "reopen") { e.status = "requested"; e.decidedBy = e.reason = undefined; e.history.push({ action: "reopened", by: me, at: now, reason: reason }); }
      else if (kind === "paid") { e.status = "paid"; e.history.push({ action: "paid", by: me, at: now }); }
      else { e.status = kind; e.decidedBy = me; e.reason = kind === "rejected" ? reason : undefined; e.history.push({ action: kind, by: me, at: now, reason: reason || undefined }); }
    });
    save(); render(); toast(msg);
  }

  // ---- Reports (Excel / PowerPoint) ------------------------------------------------------------
  function inRange(ms, r) { return !r || (ms >= r.start && ms < r.end); }
  function buildModel(title, per, notes) {
    var r = per || null, list = visExp(), now = Date.now();
    var rows = list.filter(function (e) { return !r || inRange(Date.parse(e.date + "T12:00:00Z"), r) || (e.history || []).some(function (h) { return inRange(h.at, r); }); })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var hist = [];
    list.forEach(function (e) { (e.history || []).forEach(function (h) { if (inRange(h.at, r)) hist.push({ t: h.at, at: fmtWhen(h.at), team: tLabel(team(e.team)) || e.team, item: e.item, action: ACTION[h.action] || h.action, by: h.by, reason: h.reason || "" }); }); });
    hist.sort(function (a, b) { return b.t - a.t; });
    function sum(arr, st) { return arr.filter(function (e) { return st.indexOf(e.status) > -1; }).reduce(function (n, e) { return n + e.amount; }, 0); }
    var teams = visTeams().map(function (t) {
      var es = list.filter(function (e) { return e.team === t.id; }), ap = sum(es, ["validated", "paid"]), w = sum(es, ["requested"]);
      return { team: tLabel(t), budget: t.budget, approved: ap, paid: sum(es, ["paid"]), waiting: w, rejected: sum(es, ["rejected"]), left: Math.max(0, t.budget - ap - w) };
    });
    var depts = [];
    ["Operations", "Media & Marketing", "Partnerships", "IT", "Finance"].forEach(function (d) {
      var es = rows.filter(function (e) { return e.dept === d; }); if (!es.length) return;
      depts.push({ dept: d === "Media & Marketing" ? "Marketing" : d, count: es.length, approved: sum(es, ["validated", "paid"]), paid: sum(es, ["paid"]), waiting: sum(es, ["requested"]), rejected: sum(es, ["rejected"]) });
    });
    var decided = hist.filter(function (h) { return h.action === "Validated" || h.action === "Rejected"; }).length, reop = hist.filter(function (h) { return h.action === ACTION.reopened; }).length;
    var kpis = [
      { label: "Requested", value: EUR.format(rows.reduce(function (n, e) { return n + e.amount; }, 0)), note: rows.length + " request" + (rows.length === 1 ? "" : "s") + (r ? " this period" : " this season") },
      { label: "Validated", value: EUR.format(sum(rows, ["validated", "paid"])), note: decided + " decision" + (decided === 1 ? "" : "s") + (reop ? " · " + reop + " reconsidered" : "") },
      { label: "Paid", value: EUR.format(sum(rows, ["paid"])), note: "by the association" },
      { label: "Rejected", value: String(rows.filter(function (e) { return e.status === "rejected"; }).length), note: "each with a written reason" },
      { label: "Waiting", value: EUR.format(sum(list, ["requested"])), note: "to decide today" }
    ];
    var scope = viewLabel(hv()).replace("Eva Morta · ", "");
    // Charts: monthly trend over the season, expense categories, and a histogram of expense sizes (the whole scope, season to date).
    var trend = [], d0 = new Date(2026, 8, 1), nowD = new Date(), last = r ? new Date(Math.min(r.end - 1, Date.now() + 31 * 86400000)) : nowD;
    for (var md = new Date(d0); md <= last || trend.length < 3; md.setMonth(md.getMonth() + 1)) {
      var mk = md.getFullYear() + "-" + pad2(md.getMonth() + 1), es = list.filter(function (e) { return e.date.slice(0, 7) === mk; });
      trend.push({ label: MONTHS[md.getMonth()] + " " + String(md.getFullYear()).slice(2), requested: es.reduce(function (n, e) { return n + e.amount; }, 0), approved: sum(es, ["validated", "paid"]), paid: sum(es, ["paid"]) });
      if (trend.length > 12) break;
    }
    var cats = {}; list.forEach(function (e) { var c = cats[e.cat] = cats[e.cat] || { cat: e.cat, approved: 0, waiting: 0, rejected: 0 }; if (e.status === "requested") c.waiting += e.amount; else if (e.status === "rejected") c.rejected += e.amount; else c.approved += e.amount; });
    var B = [[0, 100, "Under €100"], [100, 250, "€100–249"], [250, 500, "€250–499"], [500, 1000, "€500–999"], [1000, 1e12, "€1,000+"]];
    var sizes = B.map(function (b) { return { bucket: b[2], count: list.filter(function (e) { return e.amount >= b[0] && e.amount < b[1]; }).length }; });
    var u0 = hv(), audience = u0.role === "associate" ? "Associate report · " + deptName(u0.dept) + " · " + teamsText(u0.teams) : u0.role === "head" ? "Head of " + deptName(u0.dept) + " report · every sport" : u0.role === "captain" ? "Team report · " + teamsText(u0.teams) : "Board report · every sport and department";
    return {
      audience: audience, trend: trend, cats: Object.keys(cats).sort().map(function (k) { return cats[k]; }), sizes: sizes,
      file: ("esade-sports-" + title + "-" + (r ? r.key : "season-2026-27")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
      title: title, scope: scope, period: r ? r.label : "Season 2026–27, to date", generated: fmtDay(now),
      example: rows.some(function (e) { return e.example || !live(); }), kpis: kpis, teams: teams, depts: depts,
      rows: rows.map(function (e) { return { date: e.date, team: tLabel(team(e.team)) || e.team, dept: e.dept, item: e.item, cat: e.cat, amount: e.amount, status: EXP_STATUS[e.status][1], by: e.by, decidedBy: e.decidedBy || "", reason: e.reason || "", link: e.link || "" }; }),
      history: hist.map(function (h) { delete h.t; return h; }),
      checkups: (notes || []).map(function (c) { return { at: fmtWhen(c.at), scope: ckScopeText(c), status: c.status === "issues" ? "Issues" : "OK", note: c.note || "", by: c.by }; })
    };
  }
  function runExport(fmt, scope) {
    if (!tools || !tools.exportXlsx) { toast("Downloads are available on the live site."); return; }
    var m;
    if (scope === "checkup") { var p = ckPeriod(); m = buildModel(CK_NAMES[state.ck.kind] + " report", p, ckNotes(p)); m.highlights = (state.deckNotes || {})[p.kind + "|" + p.key] || ""; }
    else m = buildModel("Expenses ledger", null, []);
    toast(fmt === "xlsx" ? "Preparing the Excel file…" : "Preparing the PowerPoint…");
    Promise.resolve(fmt === "xlsx" ? tools.exportXlsx(m) : tools.exportPptx(m)).catch(function (x) { console.error(x); toast("The download failed. Try again."); });
  }

  // ---- Check-ups ---------------------------------------------------------------------------------
  // Weekly: associates · monthly: heads and the Board · every semester: all members.
  var CK_NAMES = { weekly: "Weekly", monthly: "Monthly", semester: "Semester" };
  function ckKinds() { var r = hv().role; return r === "captain" ? ["semester"] : r === "associate" ? ["weekly", "semester"] : ["weekly", "monthly", "semester"]; }
  function ckDefault() { var r = hv().role; return r === "captain" ? "semester" : r === "associate" ? "weekly" : "monthly"; }
  function pad2(n) { return ("0" + n).slice(-2); }
  function ckPeriod() {
    var k = state.ck.kind, off = state.ck.off || 0, now = new Date(), s, e, key, label;
    if (k === "weekly") {
      s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); s.setDate(s.getDate() - ((s.getDay() + 6) % 7) + 7 * off); e = new Date(s); e.setDate(e.getDate() + 7);
      var th = new Date(s); th.setDate(th.getDate() + 3); var y0 = new Date(th.getFullYear(), 0, 1), wk = Math.ceil(((th - y0) / 86400000 + 1) / 7), last = new Date(e); last.setDate(last.getDate() - 1);
      key = th.getFullYear() + "-W" + pad2(wk); label = "Week " + wk + " · " + s.getDate() + " " + MONTHS[s.getMonth()] + " – " + fmtDay(last.getTime());
    } else if (k === "monthly") {
      s = new Date(now.getFullYear(), now.getMonth() + off, 1); e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
      key = s.getFullYear() + "-" + pad2(s.getMonth() + 1); label = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][s.getMonth()] + " " + s.getFullYear();
    } else {
      var m = now.getMonth(), acad = m >= 8 ? now.getFullYear() : now.getFullYear() - 1, idx = acad * 2 + (m >= 8 || m === 0 ? 0 : 1) + off;
      acad = Math.floor(idx / 2); var sem = idx % 2 + 1;
      s = sem === 1 ? new Date(acad, 8, 1) : new Date(acad + 1, 1, 1); e = sem === 1 ? new Date(acad + 1, 1, 1) : new Date(acad + 1, 8, 1);
      key = acad + "-" + pad2((acad + 1) % 100) + " S" + sem; label = "Semester " + sem + " · " + acad + "–" + pad2((acad + 1) % 100) + (sem === 1 ? " (Sep–Jan)" : " (Feb–Aug)");
    }
    return { kind: k, key: key, label: label, start: s.getTime(), end: e.getTime() };
  }
  // The scope a note is written for: associate = department + team, head = department, captain = team, President/VPs/admins = the Board.
  function ckScope() {
    var u = hv();
    if (u.role === "associate") return { dept: deptName(u.dept), team: state.ck.team && (u.teams || []).indexOf(state.ck.team) > -1 ? state.ck.team : (u.teams || [])[0] };
    if (u.role === "head") return { dept: deptName(u.dept) };
    if (u.role === "captain") return { team: firstTeam() };
    return {};
  }
  function ckScopeText(c) { var t = c.team ? tLabel(team(c.team)) || c.team : ""; return c.dept && t ? c.dept + " · " + t : c.dept ? c.dept + " · every team" : t ? t : "Board · everything"; }
  function seeCheck(c) {
    var u = hv(), d = c.dept ? DEPT_ID[c.dept] : null, mine = c.team && (u.teams || []).indexOf(c.team) > -1;
    if (hFull()) return true;
    if (!c.dept && !c.team) return u.role === "head";
    if (u.role === "head") return !!d && d === u.dept;
    if (u.role === "associate") return !!d && d === u.dept && (!c.team || mine);
    return u.role === "captain" && !!mine;
  }
  function ckNotes(p) {
    var k = p.kind + "|" + p.key;
    if (live()) {
      if (LIVE.checks[k] === undefined && backend.listCheckups) {
        LIVE.checks[k] = null;
        Promise.resolve(backend.listCheckups(p.kind, p.key)).then(function (rows) { LIVE.checks[k] = rows || []; hubRefresh(); }, function (x) { console.error(x); LIVE.checks[k] = []; });
      }
      return (LIVE.checks[k] || []).filter(seeCheck);
    }
    return state.checkups.filter(function (c) { return c.period === p.kind && c.key === p.key && seeCheck(c); }).sort(function (a, b) { return b.at - a.at; });
  }
  function hubCheckups() {
    var kinds = ckKinds(), u = hv();
    if (!state.ck || kinds.indexOf(state.ck.kind) < 0) state.ck = { kind: ckDefault(), off: 0 };
    var p = ckPeriod(), m = buildModel(CK_NAMES[p.kind] + " check-up", p, []), notes = ckNotes(p), sc = ckScope();
    var loading = live() && LIVE.checks[p.kind + "|" + p.key] === null;
    var issues = notes.filter(function (c) { return c.status === "issues"; }).length;
    var who = { weekly: "Associates, for their department and teams", monthly: "Heads for their department; the President and VPs for everything", semester: "Every member: how the year is going" }[p.kind];
    var form = hRO() ? "" : '<form class="form ck-form" id="ck-form"><p class="form-sub">Your check-up for ' + esc(ckScopeText(sc)) + "</p>" +
      (u.role === "associate" && (u.teams || []).length > 1 ? '<label for="ck-team">Team<select id="ck-team">' + u.teams.map(function (t) { return '<option value="' + t + '"' + (t === sc.team ? " selected" : "") + ">" + esc(tLabel(team(t))) + "</option>"; }).join("") + "</select></label>" : "") +
      '<fieldset class="ck-status"><legend>How is it going?</legend><label><input type="radio" name="ck-st" value="ok" checked> All OK</label><label><input type="radio" name="ck-st" value="issues"> Issues to flag</label></fieldset>' +
      '<label for="ck-note" style="grid-column:1/-1">Notes <small>(required if there are issues)</small><textarea id="ck-note" rows="3" maxlength="1000" placeholder="What went well, what is blocked, what needs the Board"></textarea></label>' +
      '<div><button class="btn solid" type="submit" id="ck-send">Save check-up</button></div></form>';
    var decisions = m.history.length ? '<div class="table-wrap"><table><thead><tr><th>When</th><th>Team</th><th>Expense</th><th>Action</th><th>By</th></tr></thead><tbody>' +
      m.history.map(function (h) { return '<tr><td class="num muted">' + esc(h.at) + '</td><td class="tname">' + esc(h.team) + "</td><td>" + esc(h.item) + (h.reason ? '<br><small class="reason">“' + esc(h.reason) + "”</small>" : "") + "</td><td>" + esc(h.action) + '</td><td class="muted">' + esc(h.by) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : '<p class="empty">No requests or decisions in this period.</p>';
    var budget = can("money") || hDept("ops") || hDept("med") ? '<section class="panel"><div class="panel-head"><h2>Budget so far</h2><span class="muted" style="font-size:12px">Season to date</span></div><div class="table-wrap"><table><thead><tr><th>Team</th><th class="r">Budget</th><th class="r">Validated</th><th class="r">Waiting</th><th class="r">Left</th></tr></thead><tbody>' +
      m.teams.map(function (t) { return '<tr><td class="tname">' + esc(t.team) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(t.approved) + '</td><td class="r num">' + EUR.format(t.waiting) + '</td><td class="r num">' + EUR.format(t.left) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" : "";
    var hl = (state.deckNotes || {})[p.kind + "|" + p.key] || "";
    var deck = '<section class="panel"><div class="panel-head"><h2>Excel and PowerPoint</h2>' + exportButtons("checkup") + '</div><p class="muted" style="margin:0;font-size:13px">Both files are rebuilt from the live figures each time you download them, so they always include the latest decisions. The PowerPoint is a normal, fully editable deck (text, tables and charts), and the key messages below become its own slide.</p>' +
      '<label class="field-l" for="deck-notes">Key messages for the deck <small class="muted">(optional, saved in this browser)</small><textarea id="deck-notes" rows="3" maxlength="1500" placeholder="e.g. Volleyball over budget on travel; spring tournament needs a decision by December">' + esc(hl) + "</textarea></label></section>";
    return '<div class="ph-head"><div><p class="eyebrow">Reports · ' + esc(viewLabel(u)) + '</p><h1 class="display">Reports.</h1><p>Weekly check-ups for associates, monthly for heads and the Board, every semester for all members. Each report has its Excel and PowerPoint, updated as soon as a request is decided or reconsidered.</p></div>' + exportButtons("checkup") + "</div>" +
      '<section class="panel ck-bar"><div class="chips" role="group" aria-label="Check-up type">' + kinds.map(function (k) { return '<button class="chip" data-ck-kind="' + k + '" aria-pressed="' + (k === p.kind) + '">' + CK_NAMES[k] + "</button>"; }).join("") + "</div>" +
      '<div class="ck-nav"><button type="button" class="btn sm" data-ck-off="-1" aria-label="Previous">←</button><strong>' + esc(p.label) + '</strong><button type="button" class="btn sm" data-ck-off="1" aria-label="Next"' + ((state.ck.off || 0) >= 0 ? " disabled" : "") + ">→</button>" + ((state.ck.off || 0) ? '<button type="button" class="btn sm ghost" data-ck-off="0">Current</button>' : "") + '</div><p class="muted" style="margin:0;font-size:12px">' + esc(who) + "</p></section>" +
      '<div class="grid-4 grid-5">' + m.kpis.map(function (k) { return stat(k.label, k.value, k.note); }).join("") + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Requests and decisions</h2><span class="muted" style="font-size:12px">' + esc(p.label) + "</span></div>" + decisions + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Check-up notes</h2>' + (notes.length ? '<span class="pill ' + (issues ? "bad" : "ok") + '">' + (issues ? issues + " issue" + (issues === 1 ? "" : "s") : "All OK") + "</span>" : "") + "</div>" +
      (loading ? '<p class="empty">Loading…</p>' : notes.length ? '<ul class="notes">' + notes.map(function (c) { return '<li><span class="pill ' + (c.status === "issues" ? "bad" : "ok") + '">' + (c.status === "issues" ? "Issues" : "OK") + "</span><div><strong>" + esc(ckScopeText(c)) + "</strong>" + (c.note ? "<p>" + esc(c.note) + "</p>" : "") + '<small class="muted">' + esc(c.by) + " · " + esc(fmtWhen(c.at)) + "</small></div></li>"; }).join("") + "</ul>" : '<p class="empty">No notes yet for this period.</p>') +
      form + "</section>" + deck + budget + (p.kind === "semester" && (hFull() || u.role === "head") ? metricsPanel() : "");
  }
  function metricsPanel() {
    return '<section style="display:grid;gap:12px"><h2 style="margin:0;font-size:15px;font-weight:800">Seven metrics for the Student Council</h2><ul class="metrics">' + METRICS.map(function (m) { return '<li class="metric"><p class="eyebrow">' + m[0] + "</p><strong>—</strong><small>" + m[1] + "</small></li>"; }).join("") + '</ul><p class="muted" style="margin:0;font-size:12px">Metrics fill in once the association is running. Shown empty on purpose.</p></section>';
  }

  // ---- Ideas & logistics: captains suggest, Operations researches, Finance sees the cost -----------
  var IDEA_KINDS = ["Friendly game", "Tournament", "Jerseys / kit", "Travel / logistics", "Training facility", "League facility", "Other"];
  var IDEA_STATUS = { "new": ["warn", "New"], researching: ["info", "Operations researching"], planned: ["ok", "Planned"], dropped: ["bad", "Not going ahead"] };
  function allIdeas() { return live() ? LIVE.ideas || [] : state.ideas || []; }
  function seeIdea(i) { var u = hv(), mine = (u.teams || []).indexOf(i.team) > -1; if (hFull()) return true; if (u.role === "head") return u.dept === "ops" || u.dept === "fin"; if (u.role === "associate") return mine && (u.dept === "ops" || u.dept === "fin"); return u.role === "captain" && mine; }
  function visIdeas() { return allIdeas().filter(seeIdea); }
  function canRunIdea(i) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "head" && u.dept === "ops") || (u.role === "associate" && u.dept === "ops" && (u.teams || []).indexOf(i.team) > -1)) && (!live() || !!i.canUpdate); }
  function canSuggest() { var u = hv(); return !hRO() && (u.role === "captain" || u.role === "admin" || u.role === "exec" || u.dept === "ops"); }
  function hubIdeas() {
    var list = visIdeas(), u = hv();
    var form = canSuggest() ? '<section class="panel"><div class="panel-head"><h2>Suggest something</h2><span class="muted" style="font-size:12px">Goes to the Operations associate of the team</span></div><form class="form" id="idea-form">' +
      (visTeams().length > 1 ? '<label for="id-team">Team<select id="id-team">' + visTeams().map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label for="id-kind">Type<select id="id-kind">' + IDEA_KINDS.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("") + "</select></label>" +
      '<label for="id-text" style="grid-column:1/-1">The idea<textarea id="id-text" rows="2" maxlength="600" required placeholder="e.g. A friendly against another business school in December"></textarea></label><div><button class="btn solid" type="submit" id="id-send">Send to Operations</button></div></form></section>' : "";
    var rows = list.length ? '<ul class="ideas">' + list.map(function (i) {
      var id = String(i._id || i.id), edit = canRunIdea(i);
      return '<li class="panel idea"><div class="idea-head"><span class="pill">' + esc(i.kind) + '</span><strong class="tname">' + esc(tLabel(team(i.team)) || i.team) + "</strong>" + pill(IDEA_STATUS, i.status) + "</div><p>" + esc(i.text) + '</p><small class="muted">Suggested by ' + esc(i.by) + " · " + esc(fmtDay(i.at)) + "</small>" +
        (i.opsNote || i.estimate ? '<div class="ops-note"><p class="eyebrow">Operations</p>' + (i.opsNote ? "<p>" + esc(i.opsNote) + "</p>" : "") + (i.estimate ? '<p><b>Estimated cost: ' + EUR.format(i.estimate) + "</b> <small class=\"muted\">(Finance checks it against the team's Operations budget)</small></p>" : "") + (i.updatedBy ? '<small class="muted">' + esc(i.updatedBy) + "</small>" : "") + "</div>" : "") +
        (edit ? '<form class="form idea-upd" data-idea="' + id + '"><label>Status<select name="status">' + Object.keys(IDEA_STATUS).map(function (k) { return '<option value="' + k + '"' + (k === i.status ? " selected" : "") + ">" + IDEA_STATUS[k][1] + "</option>"; }).join("") + '</select></label><label>Estimated cost (€)<input name="estimate" type="number" min="0" step="1" value="' + (i.estimate || "") + '"></label><label style="grid-column:1/-1">Research notes<textarea name="note" rows="2" maxlength="1000" placeholder="Options found, dates, prices negotiated">' + esc(i.opsNote || "") + '</textarea></label><div><button class="btn sm solid" type="submit">Save</button></div></form>' : "") + "</li>";
    }).join("") + "</ul>" : '<p class="empty">' + (live() && LIVE.ideas === null ? "Loading…" : "No ideas yet.") + "</p>";
    return '<div class="ph-head"><div><p class="eyebrow">Ideas &amp; logistics · ' + esc(viewLabel(u)) + '</p><h1 class="display">Captains suggest, Operations delivers.</h1><p>Friendlies, tournaments, jerseys, travel, training and league facilities. The captain suggests, Operations researches and organises, Finance checks the cost against the team’s Operations budget, and the expense goes through the ledger.</p></div></div>' +
      '<div class="flow"><span>Captain suggests</span><span>Operations researches</span><span>Finance checks the budget</span><span>Expense request</span></div>' + form + rows;
  }
  function hubTeamEditor() {
    var ts = visTeams(), selected = state.teamOpen && teamOk(state.teamOpen) ? state.teamOpen : ts[0].id, t = team(selected), info = teamInfoFor(selected), results = teamResultsFor(selected);
    var teamField = ts.length > 1 ? '<label for="ti-team">Team<select id="ti-team">' + ts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === selected ? ' selected' : '') + '>' + esc(tLabel(x)) + '</option>'; }).join('') + '</select></label>' : '<input type="hidden" id="ti-team" value="' + esc(selected) + '">';
    var rows = results.length ? results.slice().reverse().map(function (r) { return '<tr><td class="num">' + esc(r.date) + '</td><td class="opp">' + esc(r.opponent) + '</td><td>' + esc(r.side) + '</td><td class="num"><strong>' + esc(r.score) + '</strong></td><td>' + esc(r.status) + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="muted">No manual results yet.</td></tr>';
    return '<div class="ph-head"><div><p class="eyebrow">Captain workspace</p><h1 class="display">Team editor.</h1><p>Keep your team page current: team information, league source, venue and results. Manual updates are available immediately; live league syncing can be connected once the competition provides an API or approved feed.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Team information</h2><span class="muted">' + (can("teamEdit") ? "Saved for everyone" : "View only") + '</span></div><form class="form" id="team-info-form">' + teamField +
        '<label style="grid-column:span 2">Short description · public<textarea id="ti-about" rows="2" placeholder="Who the team is and what the season is about">' + esc(info.about || "") + '</textarea></label>' +
        '<label>Team contact email · public<input id="ti-contact" type="email" value="' + esc(info.contact || "") + '" placeholder="team@esade.edu"></label>' +
        '<p class="form-sub">Training facility</p>' +
        '<label>Facility name · public<input id="ti-venue" value="' + esc(info.venue || "") + '" placeholder="e.g. Pavelló ..."></label>' +
        '<label style="grid-column:span 2">Address · public<input id="ti-venue-address" value="' + esc(info.venueAddress || "") + '" placeholder="Street, city"></label>' +
        '<label>Facility contact name<input id="ti-venue-cname" placeholder="Booking manager"></label><label>Facility contact email<input id="ti-venue-cemail" type="email" placeholder="bookings@..."></label><label>Facility contact phone<input id="ti-venue-cphone" type="tel" placeholder="+34 ..."></label>' +
        '<p class="form-sub">League or tournament</p>' +
        '<label>League name · public<input id="ti-league" value="' + esc(info.league || "") + '" placeholder="League name"></label>' +
        '<label style="grid-column:span 2">League page URL · public<input id="ti-league-url" type="url" value="' + esc(info.leagueUrl || "") + '" placeholder="https://..."></label>' +
        '<label>League contact name<input id="ti-league-cname" placeholder="Organiser"></label><label>League contact email<input id="ti-league-cemail" type="email" placeholder="league@..."></label><label>League contact phone<input id="ti-league-cphone" type="tel" placeholder="+34 ..."></label>' +
        '<p class="muted" style="grid-column:1/-1;margin:0;font-size:12px">Fields marked public appear on the team page. Facility and league contact people are only visible to signed-in members of Esade Sports.</p>' +
        (can("teamEdit") ? '<div><button class="btn solid" type="submit" id="ti-save">Save team information</button></div>' : "") + '</form></section>' +
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
    var apps = visibleSportsApplications(), t = state.user.role === "captain" ? team(firstTeam()) : null, recipient = t ? captainForTeam(t.id) : null;
    return '<div class="ph-head"><div><p class="eyebrow">Applications for sports</p><h1 class="display">Try-outs inbox.</h1><p>' + (t ? 'Applications for ' + esc(tLabel(t)) + ' are routed to you as captain.' : 'Board view across every sports application folder. Each captain sees only applications for their own team.') + '</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>' + (t ? 'Your team applications' : 'All team applications') + '</h2><span class="muted num">' + apps.length + ' received</span></div><p class="muted" style="margin:0 0 18px">Folder: <strong>' + esc(t ? sportsApplicationsFolder(t.id) : 'Applications for sports/*') + '</strong>' + (recipient ? ' · Captain recipient: <strong>' + esc(captainName(recipient)) + ' · ' + esc(recipient.email) + '</strong>' : '') + '</p>' + sportsApplicationsTable(apps) + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Routing rule</h2><span class="pill ok">Active in prototype</span></div><p class="muted" style="margin:0">When a student applies to a team, their try-out or coaching information is stored in that team’s Applications for sports folder and is visible to the active captain for that team. In production, this same event should also send the captain a notification email.</p></section>';
  }
  function hubCaptains() {
    var active = state.captains.filter(function (c) { return c.active; }), edit = !hRO();
    var rows = active.map(function (c) {
      return '<tr><td><strong>' + esc(captainName(c)) + '</strong><br><small class="muted">' + esc(c.email) + '</small></td><td class="tname">' + esc(tLabel(team(c.team))) + '</td><td>' + esc(c.role) + '</td><td>' + esc(c.programme) + '</td><td class="num">' + esc(c.start) + '</td><td class="r">' + (edit ? '<button class="btn sm" data-captain-deactivate="' + c.id + '">Deactivate</button>' : "") + '</td></tr>';
    }).join("");
    return '<div class="ph-head"><div><p class="eyebrow">Board workspace</p><h1 class="display">Captains.</h1><p>One current record for every team, with a clear owner, role and start date. This demo stores changes in this browser; production data should move to the shared database.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Active captains</h2><span class="muted">' + active.length + ' records</span></div><div class="table-wrap"><table><thead><tr><th>Captain</th><th>Team</th><th>Role</th><th>Programme</th><th>Since</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      (edit ?       '<section class="panel"><div class="panel-head"><h2>Add a captain</h2><span class="muted">Board only</span></div><form class="form" id="captain-form"><label>First name<input id="c-first" required placeholder="First name"></label><label>Last name<input id="c-last" required placeholder="Last name"></label><label>Email<input id="c-email" type="email" required placeholder="name@esade.edu"></label><label>Team<select id="c-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + '</option>'; }).join('') + '</select></label><label>Role<select id="c-role"><option>Captain</option><option>Vice-captain</option></select></label><label>Programme<input id="c-programme" required placeholder="BBA, MSc..."></label><div><button class="btn solid" type="submit">Add captain</button></div></form></section>' : '<p class="muted">View only: changes are made by the Board.</p>');
  }
  function taskRow(t, deptId) {
    return "<li><span>" + esc(t.title) + '<small class="owner">' + esc(t.owner || "Unassigned") + "</small></span>" + (canSetTask(deptId) ? '<select data-task="' + t.key + '" aria-label="Status of ' + esc(t.title) + '">' + Object.keys(TASK_STATUS).map(function (o) { return '<option value="' + o + '"' + (o === t.status ? " selected" : "") + ">" + TASK_STATUS[o] + "</option>"; }).join("") + "</select>" : taskStatusPill(t.status)) + "</li>";
  }
  function addTaskForm(d) {
    if (!canAddTask(d.id)) return "";
    return '<form class="form add-task" data-add-task="' + d.id + '"><label style="grid-column:span 2">New task<input name="title" required maxlength="120" placeholder="e.g. Book courts for the spring try-outs"></label><label>Who works on it<select name="owner">' + deptPeople(d.id).map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("") + '</select></label><div><button class="btn solid" type="submit">Add task</button></div></form>';
  }
  function hubDepts() {
    var open = null; visDepts().forEach(function (d) { if (d.id === state.deptOpen) open = d; });
    if (open) {
      var p = DEPT_PEOPLE[open.id], ts = deptTasks(open), team = [[p.head, p.headRole || "Head of " + open.name, null]].concat(p.associates.map(function (a) { return [a[0], a[2] || "Associate", a[1]]; }));
      return '<div class="ph-head"><div><p class="eyebrow"><a href="#hub-departments" data-dept-open="">← All departments</a></p><h1 class="display">' + esc(open.name) + '.</h1><p>' + esc(open.remit) + "</p></div></div>" +
        '<section class="panel"><div class="panel-head"><h2>The team</h2><span class="muted" style="font-size:12px">Example names</span></div><div class="table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Teams</th><th>Working on now</th></tr></thead><tbody>' +
        team.map(function (m) {
          var now = ts.filter(function (t) { return t.owner === m[0] && t.status !== "done"; });
          return '<tr><td><strong>' + esc(m[0]) + "</strong></td><td>" + esc(m[1]) + '</td><td class="muted">' + (m[2] ? (m[2].length === TEAMS.length ? "All teams" : esc(teamsText(m[2]))) : "All teams") + "</td><td>" + (now.length ? now.map(function (t) { return esc(t.title) + " " + taskStatusPill(t.status); }).join("<br>") : '<span class="muted">Nothing open</span>') + "</td></tr>";
        }).join("") + "</tbody></table></div></section>" +
        '<section class="panel"><div class="panel-head"><h2>Tasks and projects</h2><span class="muted" style="font-size:12px">' + (canAddTask(open.id) ? "You can add tasks here" : "Only the Board adds tasks") + '</span></div><ul class="tasks">' + ts.map(function (t) { return taskRow(t, open.id); }).join("") + "</ul>" + addTaskForm(open) + "</section>";
    }
    return '<div class="ph-head"><div><p class="eyebrow">One Board, four departments</p><h1 class="display">Departments.</h1><p>Who leads each department, what it is responsible for, and where its work stands. Open a department to see its full team and who is working on what.</p></div></div>' +
      '<div class="dept-grid">' + visDepts().map(function (d) {
        return '<section class="dept"><div class="dept-title"><h2><a href="#hub-departments" data-dept-open="' + d.id + '">' + d.name + '</a></h2><small>' + d.size + ' people</small></div><div class="panel"><p style="margin:0"><strong>' + d.head + ' · ' + esc(DEPT_PEOPLE[d.id].head) + '</strong><br><span class="muted">' + d.remit + '</span></p><ul class="tasks">' +
          deptTasks(d).map(function (t) { return taskRow(t, d.id); }).join("") + '</ul><a class="btn sm" href="#hub-departments" data-dept-open="' + d.id + '">Open team and tasks →</a>' + addTaskForm(d) + "</div></section>";
      }).join("") + "</div>";
  }
  function bindHub() {
    var da = $("demo-as"); if (da) da.addEventListener("change", function () { setDemo(da.value); });
    hub.querySelectorAll("[data-demo]").forEach(function (b) { b.addEventListener("click", function () { setDemo(b.getAttribute("data-demo")); }); });
    hub.querySelectorAll("[data-history]").forEach(function (b) { b.addEventListener("click", function () {
      if (b.getAttribute("data-history") === "back") history.back(); else history.forward();
    }); });
    hub.querySelectorAll("[data-signout]").forEach(function (b) { b.addEventListener("click", function () {
      signOut();
    }); });
    hub.querySelectorAll("[data-dept-open]").forEach(function (b) { b.addEventListener("click", function (ev) { ev.preventDefault(); state.deptOpen = b.getAttribute("data-dept-open") || null; if (location.hash === "#hub-departments") { render(); window.scrollTo(0, 0); } else go("hub-departments"); }); });
    hub.querySelectorAll("[data-add-task]").forEach(function (f) { f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var d = f.getAttribute("data-add-task"), title = f.elements.title.value.trim();
      if (!title || !canAddTask(d)) return;
      state.newTasks.push({ id: state.nextId++, dept: d, title: title.slice(0, 120), owner: f.elements.owner.value, status: "todo" }); save(); render(); toast("Task added.");
    }); });
    hub.querySelectorAll("[data-reject-cancel]").forEach(function (b) { b.addEventListener("click", function () { state.rejecting = state.reconsidering = null; render(); }); });
    hub.querySelectorAll("[data-reject-confirm]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-reject-confirm"), box = $("rj-" + id), why = box ? box.value.trim() : "";
      if (!why) { if (box) { box.focus(); box.classList.add("invalid"); } toast("Write why the request is rejected."); return; }
      expAct("rejected", id, why.slice(0, 300));
    }); });
    hub.querySelectorAll("[data-recon-confirm]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-recon-confirm"), box = $("rc-" + id), why = box ? box.value.trim() : "";
      if (!why) { if (box) { box.focus(); box.classList.add("invalid"); } toast("Write why the decision is reconsidered."); return; }
      expAct("reopen", id, why.slice(0, 300));
    }); });
    hub.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-id"), a = b.getAttribute("data-act");
      if (a === "reject" || a === "reconsider") { state.rejecting = a === "reject" ? id : null; state.reconsidering = a === "reconsider" ? id : null; render(); var bx = $((a === "reject" ? "rj-" : "rc-") + id); if (bx) bx.focus(); return; }
      b.disabled = true; expAct(a, id);
    }); });
    hub.querySelectorAll("[data-export]").forEach(function (b) { b.addEventListener("click", function () { runExport(b.getAttribute("data-export"), b.getAttribute("data-scope")); }); });
    hub.querySelectorAll("[data-examples]").forEach(function (b) { b.addEventListener("click", function () {
      b.disabled = true; var rm = b.getAttribute("data-examples") === "remove";
      Promise.resolve(backend.exampleExpenses(rm)).then(function () { toast(rm ? "Example expenses removed." : "Example expenses loaded."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-ck-kind]").forEach(function (b) { b.addEventListener("click", function () { state.ck = { kind: b.getAttribute("data-ck-kind"), off: 0 }; render(); }); });
    hub.querySelectorAll("[data-ck-off]").forEach(function (b) { b.addEventListener("click", function () { var d = +b.getAttribute("data-ck-off"); state.ck.off = d ? (state.ck.off || 0) + d : 0; render(); }); });
    hub.querySelectorAll("[data-make-req]").forEach(function (b) { b.addEventListener("click", function () { state.focusReq = true; }); });
    if (state.focusReq && $("r-item")) { state.focusReq = false; var rf = $("req"); if (rf) rf.scrollIntoView({ block: "start" }); $("r-item").focus(); }
    hub.querySelectorAll("[data-pl-add]").forEach(function (b) { b.addEventListener("click", function () { var id = b.getAttribute("data-pl-add"); state.rosterDraft = state.rosterDraft || {}; state.rosterDraft[id] = readRoster(id).concat([{}]); render(); var rows = hub.querySelectorAll('table[data-roster="' + id + '"] tbody tr'); var last = rows[rows.length - 1]; if (last) last.querySelector("input").focus(); }); });
    hub.querySelectorAll("[data-pl-del]").forEach(function (b) { b.addEventListener("click", function () { var t = b.closest("table"), id = t.getAttribute("data-roster"), i = +b.getAttribute("data-pl-del"), rows = readRoster(id); rows.splice(i, 1); state.rosterDraft = state.rosterDraft || {}; state.rosterDraft[id] = rows; render(); }); });
    hub.querySelectorAll("[data-pl-save]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-pl-save"), rows = readRoster(id).filter(function (p) { return p.first || p.last; });
      if (rows.some(function (p) { return p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email); })) { toast("Check the email addresses."); return; }
      function done() { if (state.rosterDraft) delete state.rosterDraft[id]; render(); toast("Roster saved."); }
      if (!live()) { state.rosters[id] = { players: rows }; save(); done(); return; }
      b.disabled = true;
      Promise.resolve(backend.saveRoster({ team: id, players: rows })).then(function () { ROSTER[id] = undefined; ROSTER_ALL = null; done(); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    var dn = $("deck-notes"); if (dn) dn.addEventListener("input", function () { var p = ckPeriod(); state.deckNotes = state.deckNotes || {}; state.deckNotes[p.kind + "|" + p.key] = dn.value; save(); });
    var ckt = $("ck-team"); if (ckt) ckt.addEventListener("change", function () { state.ck.team = ckt.value; });
    var ckf = $("ck-form"); if (ckf) ckf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var st = (ckf.querySelector("input[name=ck-st]:checked") || {}).value || "ok", note = $("ck-note").value.trim(), p = ckPeriod(), sc = ckScope();
      if (st === "issues" && !note) { $("ck-note").focus(); toast("Describe the issue."); return; }
      var row = { period: p.kind, key: p.key, dept: sc.dept, team: sc.team, status: st, note: note };
      if (!live()) { row.by = meLabel(); row.at = Date.now(); state.checkups.push(row); save(); render(); toast("Check-up saved."); return; }
      $("ck-send").disabled = true;
      Promise.resolve(backend.saveCheckup(row)).then(function () { delete LIVE.checks[p.kind + "|" + p.key]; render(); toast("Check-up saved. Your head and the Board see it."); }, function (x) { $("ck-send").disabled = false; toast(errText(x)); });
    });
    var idf = $("idea-form"); if (idf) idf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var text = $("id-text").value.trim(); if (!text) return;
      var row = { team: $("id-team") ? $("id-team").value : firstTeam(), kind: $("id-kind").value, text: text.slice(0, 600) };
      if (!live()) { row.id = state.nextId++; row.status = "new"; row.by = meLabel(); row.at = Date.now(); state.ideas.unshift(row); save(); render(); toast("Sent to Operations."); return; }
      $("id-send").disabled = true;
      Promise.resolve(backend.suggestIdea(row)).then(function () { toast("Sent to Operations."); }, function (x) { $("id-send").disabled = false; toast(errText(x)); });
    });
    hub.querySelectorAll("form[data-idea]").forEach(function (f) { f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var id = f.getAttribute("data-idea"), st = f.elements.status.value, note = f.elements.note.value.trim(), est = Math.round(+f.elements.estimate.value) || 0;
      if (!live()) { state.ideas.forEach(function (i) { if (String(i.id) === id) { i.status = st; i.opsNote = note || undefined; i.estimate = est || undefined; i.updatedBy = meLabel(); } }); save(); render(); toast("Saved."); return; }
      Promise.resolve(backend.updateIdea({ id: id, status: st, opsNote: note || undefined, estimate: est || undefined })).then(function () { toast("Saved."); }, function (x) { toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-hteam]").forEach(function (r) {
      function open() { state.teamOpen = r.getAttribute("data-hteam"); render(); var d = $("team-detail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      r.addEventListener("click", open); r.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
    hub.querySelectorAll("[data-filter]").forEach(function (c) { c.addEventListener("click", function () { state.hubFilter = c.getAttribute("data-filter"); render(); }); });
    hub.querySelectorAll("[data-task]").forEach(function (s) { s.addEventListener("change", function () { state.tasks[s.getAttribute("data-task")] = s.value; save(); toast("Task updated."); }); });
    var f = $("req"); if (f) f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var amt = Math.round(+$("r-amt").value), item = $("r-item").value.trim(); if (!item || !(amt > 0)) return;
      var link = $("r-link").value.trim(), file = $("r-file").files[0], tm = $("r-team") ? $("r-team").value : firstTeam(), dept = $("r-dept").value, cat = $("r-cat").value;
      if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
      if (link) link = link.replace(/^http:/i, "https:");
      if (live()) {
        if (file && file.size > 10 * 1024 * 1024) { toast("The file is too big (max 10 MB)."); return; }
        var btn = $("r-send"); btn.disabled = true; btn.textContent = "Sending…";
        Promise.resolve(file ? backend.uploadFile(file) : null).then(function (fid) {
          return backend.requestExpense({ team: tm, dept: dept, item: item, cat: cat, amount: amt, link: link || undefined, fileId: fid || undefined, fileName: file ? file.name : undefined });
        }).then(function () { state.hubFilter = "all"; toast("Request sent to Finance."); render(); }, function (x) { btn.disabled = false; btn.textContent = "Send request"; toast(errText(x)); });
        return;
      }
      function done(att) {
        var now = Date.now(), d = new Date(now), day = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        state.expenses.push({ id: state.nextId++, team: tm, dept: dept, item: item, cat: cat, amount: amt, by: meLabel(), date: day, status: "requested", link: link || undefined, file: att || undefined, history: [{ action: "requested", by: meLabel(), at: now }] });
        state.hubFilter = "all"; save(); render(); toast("Request sent to Finance.");
      }
      if (!file) { done(null); return; }
      if (file.size > 1.5 * 1024 * 1024) { toast("The file is too big for the prototype (max 1.5 MB)."); return; }
      var r = new FileReader(); r.onload = function () { done({ name: file.name, type: file.type, data: r.result }); }; r.readAsDataURL(file);
    });
    hub.querySelectorAll("[data-captain-deactivate]").forEach(function (b) { b.addEventListener("click", function () {
      var id = +b.getAttribute("data-captain-deactivate"); state.captains.forEach(function (c) { if (c.id === id) c.active = false; }); save(); render(); toast("Captain deactivated.");
    }); });
    var cf = $("captain-form"); if (cf) cf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      state.captains.push({ id: state.nextId++, first: $("c-first").value.trim(), last: $("c-last").value.trim(), email: $("c-email").value.trim(), team: $("c-team").value, role: $("c-role").value, programme: $("c-programme").value.trim(), start: "2026-11-12", active: true });
      save(); render(); toast("Captain added.");
    });
    var tif = $("team-info-form");
    if (tif && $("ti-team").tagName === "SELECT") $("ti-team").addEventListener("change", function () { state.teamOpen = $("ti-team").value; render(); });
    if (tif && backend && backend.getTeamInfo) Promise.resolve(backend.getTeamInfo($("ti-team").value)).then(function (r) {
      if (!r || !$("team-info-form")) return;
      [["ti-about", "about"], ["ti-contact", "contact"], ["ti-venue", "venue"], ["ti-venue-address", "venueAddress"], ["ti-venue-cname", "venueContactName"], ["ti-venue-cemail", "venueContactEmail"], ["ti-venue-cphone", "venueContactPhone"], ["ti-league", "league"], ["ti-league-url", "leagueUrl"], ["ti-league-cname", "leagueContactName"], ["ti-league-cemail", "leagueContactEmail"], ["ti-league-cphone", "leagueContactPhone"]].forEach(function (f) { if ($(f[0]) && r[f[1]]) $(f[0]).value = r[f[1]]; });
    }, console.error);
    if (tif) tif.addEventListener("submit", function (ev) {
      ev.preventDefault(); var id = $("ti-team").value, v = function (k) { return $(k).value.trim() || undefined; };
      var data = { teamId: id, about: v("ti-about"), contact: v("ti-contact"), venue: v("ti-venue"), venueAddress: v("ti-venue-address"), venueContactName: v("ti-venue-cname"), venueContactEmail: v("ti-venue-cemail"), venueContactPhone: v("ti-venue-cphone"),
        league: v("ti-league"), leagueUrl: v("ti-league-url"), leagueContactName: v("ti-league-cname"), leagueContactEmail: v("ti-league-cemail"), leagueContactPhone: v("ti-league-cphone") };
      if (data.leagueUrl && !/^https?:\/\//i.test(data.leagueUrl)) data.leagueUrl = "https://" + data.leagueUrl;
      state.teamOpen = id;
      if (!backend || !backend.saveTeamInfo) { state.teamInfo[id] = data; save(); render(); toast("Team information saved in this browser (prototype)."); return; }
      var btn = $("ti-save"); if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
      Promise.resolve(backend.saveTeamInfo(data)).then(function () { return loadTeamInfo(); }).then(function () { render(); toast("Team information saved. It is on the team page now."); }, function (x) {
        console.error(x); if (btn) { btn.disabled = false; btn.textContent = "Save team information"; }
        var m2 = String((x && x.message) || "").match(/ConvexError: ([^\n]*)/);
        toast(m2 ? m2[1] : "Could not save. Are you signed in with access to this team?");
      });
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
      if (admin === undefined && !captain) { page.innerHTML = '<section class="band"><div class="wrap"><p class="eyebrow">Hub</p><h1 class="display">Checking your login…</h1></div></section>'; show("page"); return; }
      if (!admin && !captain) { location.replace("#signin"); return; }
      if (demoPublic) { demoPublic = false; industryVisibility(); }
      if (!isHub() || !viewAllowed(state.user)) { var dv = allowedViews()[0]; if (!dv) { location.replace("#signin"); return; } state.user = dv; save(); renderAcct(); }
      if (h === "hub-expenses" && !can("expenses")) h = "hub-overview";
      if (h === "hub-departments" && !can("depts")) h = "hub-overview";
      if (h === "hub-report" && !can("reports")) h = "hub-overview";
      if (h === "hub-captains" && !can("captains")) h = "hub-overview";
      if (h === "hub-team-editor" && !can("teamEdit")) h = "hub-overview";
      if (h === "hub-applications" && !can("applications")) h = "hub-overview";
      if (h === "hub-ideas" && !can("ideas")) h = "hub-overview";
      var inner = h === "hub-teams" ? hubTeams() : h === "hub-team-editor" ? hubTeamEditor() : h === "hub-applications" ? hubApplications() : h === "hub-captains" ? hubCaptains() : h === "hub-expenses" ? hubExpenses() : h === "hub-departments" ? hubDepts() : h === "hub-report" || h === "hub-checkups" ? hubCheckups() : h === "hub-ideas" ? hubIdeas() : hubOverview();
      hub.innerHTML = hubShell(h, inner); show("hub"); bindHub(); return;
    }
    if (h === "signin") html = signinView();
    else if (h === "alumni-signin" || h === "alumni-me" || h === "alumni-verify") { location.replace("#alumni"); return; }
    else if (h.indexOf("team-") === 0 && parseTeam(h)) { var pt = parseTeam(h); html = teamView(pt.t, pt.tab); }
    else if (h === "alumni") html = alumniView();
    else if (h === "apply-associate") html = applyAssociateView();
    else if (h === "apply" || h.indexOf("apply-") === 0) html = applyView(h);
    else if (h === "my-profile") html = formView();
    else if (h === "privacy") html = privacyView();
    else if (h === "contact") html = contactView();
    else if (h === "calendar") html = calendarView();
    else if (h === "all-events") html = eventsView();
    else if (h.indexOf("alumni-") === 0) {
      var id = h.slice(7), a = null;
      allAlumni().forEach(function (x) { if (x.id === id) a = x; });
      html = a ? profileView(a) : alumniView();
    }
    if (html !== null) {
      render.lastPub = false;
      page.innerHTML = html; show("page");
      if (h === "signin") bindSignin();
      if (h === "alumni") bindAlumni();
      if (h === "my-profile") bindForm();
      if (h === "apply-associate") bindAssociateApply();
      if (h === "contact") bindContact();
      if (h === "calendar") bindCalendar();
      if (h === "all-events" && !REDUCED && "IntersectionObserver" in window) {
        var evo = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); evo.unobserve(x.target); } }); }, { threshold: 0.08 });
        page.querySelectorAll(".ev").forEach(function (el) { el.classList.add("reveal"); evo.observe(el); });
      }
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
    var wasPub = render.lastPub; render.lastPub = true;
    if (target) target.scrollIntoView({ behavior: wasPub && !REDUCED ? "smooth" : "auto" }); else window.scrollTo(0, 0);
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
    var row = e.target.closest && e.target.closest("[data-match-id]");
    if (row) openMatch(row.getAttribute("data-match-id"));
    if (e.target.closest && e.target.closest("[data-match-close]")) closeMatch();
  });
  document.addEventListener("keydown", function (e) {
    var row = e.target.closest && e.target.closest("[data-match-id]");
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
    captain = null;
    setAdmin(null); go("home"); toast("Signed out.");
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#member [data-signout]")) signOut();
  });
  function setAdmin(a) {
    setTimeout(startLive, 0);
    var c = a && a.captain ? a : null; if (c) a = null;
    if ((c ? c.email + c.label : null) !== (captain ? captain.email + captain.label : null)) { captain = c; renderAcct(); var hh = location.hash.slice(1); if (hh === "signin" || hh.indexOf("hub-") === 0) render(); }
    if (a === admin || (a && admin && a.email === admin.email)) return;
    admin = a;
    if (!admin && !captain && state.user && HUB_ROLES[state.user.role]) { state.user = null; save(); }
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
  // Section reveal on scroll (fade + small rise) and the nav item for the section in view.
  // Sections stay visible if JS or IntersectionObserver is unavailable, or with reduced motion.
  (function () {
    var secs = Array.prototype.slice.call(document.querySelectorAll("#public main > section:not(.hero)"));
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
      secs.forEach(function (sct) { sct.classList.add("reveal"); io.observe(sct); });
    }
    if (!("IntersectionObserver" in window)) return;
    var links = {}; document.querySelectorAll("#nav > a[href^='#']").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var alias = { "alumni-home": "alumni" }, visible = {};
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var cur = null; secs.forEach(function (sct) { if (!cur && visible[sct.id] && links[alias[sct.id] || sct.id]) cur = alias[sct.id] || sct.id; });
      Object.keys(links).forEach(function (k) { if (k === cur) links[k].setAttribute("aria-current", "true"); else links[k].removeAttribute("aria-current"); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(function (sct) { if (sct.id) spy.observe(sct); });
  })();
  window.addEventListener("hashchange", function () { state.teamOpen = null; render(); });
  // A live update that arrived while someone was typing in the Hub is shown once they leave the field.
  hub.addEventListener("focusout", function () { if (LIVE.dirty) setTimeout(function () { if (LIVE.dirty && !hubBusy()) { LIVE.dirty = false; render(); } }, 400); });
  renderAcct(); render(); loadAlumni(); loadTeamInfo();
  return { setAdmin: setAdmin };

}
