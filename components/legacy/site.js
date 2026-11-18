/* eslint-disable */
import { SPORT_IMAGES } from "@/lib/images";
import { BOARD_BLOCK } from "./markup";
import { GAMES as ALL_GAMES } from "./games";
import { EVENTS as ALL_EVENTS } from "./events";
import { enableBoardDrag } from "@/lib/dragBoard";
// Ported from the original prototype script. Runs once on the client after the markup mounts.
export function initSite(backend, tools) {

  "use strict";
  // Made-up presentation content (fictional players, stats, news, example games, events and alumni) stays
  // hidden on the public site. Set to true only for an internal demo. Real data never depends on it.
  var SHOW_EXAMPLES = false;
  // Pre-launch samples Quentin asked to keep visible until the site is approved (15/11/2026): the Off Track charity
  // run (events.js, keepVisible) and two "Example profile" alumni (ALUMNI below, preview). Set to false before go-live.
  var SHOW_PRELAUNCH_SAMPLES = true;
  var GAMES = ALL_GAMES.filter(function (g) { return SHOW_EXAMPLES || !g.example; });
  var EVENTS = ALL_EVENTS.filter(function (e) { return SHOW_EXAMPLES || !e.example; });
  // Line icons (one stroke family, drawn as SVG): no glyph or emoji stand-ins.
  var ICONS = { left: "M15 6l-6 6 6 6", right: "M9 6l6 6-6 6", down: "M12 4v12M6 11l6 6 6-6M5 20h14", x: "M6 6l12 12M18 6L6 18", out: "M7 17L17 7M9 7h8v8", bell: "M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9M10 20.5a2.2 2.2 0 0 0 4 0" };
  function ico(k) { return '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="' + ICONS[k] + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  var EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var $ = function (id) { return document.getElementById(id); };
  var REDUCED = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var pub = $("public"), page = $("page"), hub = $("hub"), siteHead = $("top"), siteFoot = $("site-foot");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mono(w) { return '<svg class="mono" style="width:' + w + 'px" viewBox="0 0 132 72" aria-hidden="true"><use href="#es"/></svg>'; }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }

  // Several files on one form (PDFs, images). Picked files are kept here until the form is sent, so they
  // survive Hub redraws; each box lists them with a × to remove one. pickBox(key, accept, label) draws it.
  var PICKS = {};
  function picked(k) { return PICKS[k] || []; }
  function pickList(k) { return picked(k).map(function (f, i) { return "<li>" + esc(f.name) + ' <small class="muted">' + Math.max(1, Math.round(f.size / 1024)) + ' KB</small><button type="button" class="mpick-rm" data-pick-rm="' + esc(k) + '" data-i="' + i + '" aria-label="Remove ' + esc(f.name) + '">×</button></li>'; }).join(""); }
  function pickBox(k, accept, label) { return '<div class="mpick" data-pick="' + esc(k) + '"><label class="btn sm ghost mpick-add">' + esc(label) + '<input type="file" hidden multiple accept="' + accept + '" data-pick-in="' + esc(k) + '"></label><ul class="mpick-list">' + pickList(k) + "</ul></div>"; }
  function pickRedraw(k) { document.querySelectorAll('[data-pick="' + k + '"] .mpick-list').forEach(function (u) { u.innerHTML = pickList(k); }); }
  document.addEventListener("change", function (e) {
    var k = e.target.getAttribute && e.target.getAttribute("data-pick-in"); if (!k) return;
    var cur = picked(k).slice();
    Array.prototype.forEach.call(e.target.files || [], function (f) { if (!cur.some(function (x) { return x.name === f.name && x.size === f.size; })) cur.push(f); });
    if (cur.length > 10) { toast("Up to 10 files at once."); cur = cur.slice(0, 10); }
    PICKS[k] = cur; e.target.value = ""; pickRedraw(k);
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-pick-rm]"); if (!b) return;
    e.preventDefault(); var k = b.getAttribute("data-pick-rm"), i = +b.getAttribute("data-i");
    PICKS[k] = picked(k).filter(function (_, j) { return j !== i; }); pickRedraw(k);
  });
  function tooBig(files, mb) { return files.some(function (f) { return f.size > mb * 1024 * 1024; }); }
  // Live: upload each file to Convex storage. Prototype: read each one in the browser.
  function uploadAll(files) { return Promise.all(files.map(function (f) { return Promise.resolve(backend.uploadFile(f)).then(function (id) { return { id: id, name: f.name, type: f.type || undefined }; }); })); }
  function readAll(files) { return Promise.all(files.map(function (f) { return new Promise(function (ok) { var rd = new FileReader(); rd.onload = function () { ok({ name: f.name, type: f.type, data: rd.result, url: rd.result }); }; rd.readAsDataURL(f); }); })); }
  // Every attachment of an expense or task update (older ones have a single `file`).
  function filesOf(x) { return x.files && x.files.length ? x.files : x.file ? [x.file] : []; }

  // ================= Games (one source: components/legacy/games.js) =================
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function gDate(g) { var p = g.date.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  // Past or upcoming is decided when the page is viewed, in Barcelona time (Europe/Madrid), whatever the
  // visitor's own time zone. A game counts as played 2 hours after kick-off, even if no score was added yet.
  var GAME_MINS = 120;
  function dayKey(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); if (m) return m[0]; m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ""); return m ? m[3] + "-" + m[2] + "-" + m[1] : null; }
  function startMs(x) { var d = dayKey(x.date); return d ? madridToUtc(d, /^\d{1,2}:\d{2}$/.test(x.time || "") ? x.time : "12:00") : NaN; }
  function isOver(x, mins) { return !!x.score || Date.now() > startMs(x) + (mins || GAME_MINS) * 60000; }
  function madridYmd(offDays) {
    var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(Date.now() + (offDays || 0) * 864e5)).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  function gameById(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }
  function gTeams(g) { return g.score ? g.home + " " + g.score + " " + g.away : g.home + " vs " + g.away; }
  function gLong(g) { var d = gDate(g); return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function gShort(g) { var d = gDate(g); return DAYS[d.getDay()].slice(0, 3) + " " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  function gStatus(g) {
    if (!g.score) return isOver(g) ? "Played · Result to be confirmed" : "Upcoming · " + g.side;
    var sc = g.score.split("–"), esadeHome = g.home.indexOf("Esade") === 0, us = +(esadeHome ? sc[0] : sc[1]), them = +(esadeHome ? sc[1] : sc[0]);
    return "Final · " + (us > them ? "Esade won " : us < them ? "Esade lost " : "Draw ") + g.score;
  }
  function gameRow(g) {
    var played = isOver(g);
    return '<li class="row match-button" data-match-id="' + g.id + '" role="button" tabindex="0" aria-label="View ' + esc(g.sport) + ' match details"><span class="when"><b>' + gShort(g) + "</b>" + (g.score ? "Final" : played ? "Finished" : g.time) + '</span><span class="match"><span class="sport">' + esc(g.sport) + (g.example ? ' <em class="ex">Example</em>' : "") + '</span><div class="teamsline">' + esc(gTeams(g)) + '</div><span class="where">' + esc(g.venue) + "</span></span>" + (g.score ? '<span class="score">' + esc(g.score) + "</span>" : played ? '<span class="tag tbc" title="Result to be confirmed">Result TBC</span>' : '<span class="tag">' + g.side + "</span>") + "</li>";
  }
  // Home lists: upcoming = not started + 2 h yet (soonest first), results = played, scored or not (latest first).
  // Recomputed every minute, so a page left open moves a game to Results on its own.
  function homeGames() {
    var up = GAMES.filter(function (g) { return !isOver(g); }).sort(function (a, b) { return startMs(a) - startMs(b); });
    var res = GAMES.filter(function (g) { return isOver(g); }).sort(function (a, b) { return startMs(b) - startMs(a); });
    if ($("list-up")) $("list-up").innerHTML = up.length ? up.slice(0, 5).map(gameRow).join("") : '<li class="muted">No upcoming games yet.</li>';
    if ($("list-res")) $("list-res").innerHTML = res.length ? res.slice(0, 5).map(gameRow).join("") : '<li class="muted">No results yet.</li>';
    var strip = $("next-strip"), n = up[0];
    if (strip) {
      strip.hidden = !n;
      if (n) strip.querySelector(".wrap").innerHTML = '<p class="eyebrow">Next match · ' + esc(n.sport) + '</p><p class="vs" style="margin:0">' + esc(n.home) + " <b>vs</b> " + esc(n.away) + "</p>" +
        '<div class="meta"><span>' + esc(gShort(n)) + " · " + esc(n.time) + " · " + esc(n.venue) + '</span><a class="link-arrow" href="#" data-match-id="' + esc(n.id) + '">Match details →</a></div>';
    }
  }

  // ================= Events (one source: components/legacy/events.js) =================
  // Upcoming events (soonest first), then any past pre-launch sample kept on purpose (keepVisible), marked as past.
  function upcomingEvents() {
    var up = EVENTS.filter(function (e) { return !isOver(e); }).sort(function (a, b) { return startMs(a) - startMs(b); });
    var kept = SHOW_PRELAUNCH_SAMPLES ? EVENTS.filter(function (e) { return e.keepVisible && isOver(e); }).sort(function (a, b) { return startMs(b) - startMs(a); }) : [];
    return up.concat(kept);
  }
  function homeEvents() { if ($("events") && $("events").querySelector(".events")) $("events").querySelector(".events").innerHTML = upcomingEvents().slice(0, 3).map(eventCard).join(""); }
  function eWhen(e) { return gLong(e) + " · " + e.time; }
  function eTitleHtml(e) { var w = e.title.split(" "); return esc(w.length > 1 ? w.slice(0, -1).join(" ") : w[0]) + (w.length > 1 ? "<br>" + esc(w[w.length - 1]) : "") + "."; }
  function eventCard(e) {
    return '<article class="event"><div class="title"><p class="eyebrow">' + esc(e.kind) + (isOver(e) ? " · Past event" : "") + (e.example ? ' · <em class="ex">Example</em>' : "") + '</p><h3 class="display">' + eTitleHtml(e) + "</h3></div>" +
      '<dl><div><dt>When</dt><dd>' + esc(gShort(e)) + " · " + e.time + '</dd></div><div><dt>Where</dt><dd>' + esc(e.place) + '</dd></div><div><dt>Price</dt><dd><b class="price">' + esc(e.price) + "</b></dd></div></dl>" +
      '<p>' + esc(e.summary) + ' <a class="link-arrow" href="#all-events">Details →</a></p></article>';
  }
  function eventsView() {
    var list = upcomingEvents();
    return '<section class="band"><div class="wrap"><h1 class="display">All<br>events.</h1><p>Runs, tournaments, talks and get-togethers in the Esade Sports community. Everyone is welcome: check the price and sign up below.</p></div></section>' +
      '<section class="sec ev-sec"><div class="wrap"><ol class="ev-list">' + (list.length ? list.map(function (e) {
        var past = isOver(e);
        return '<li class="ev" id="ev-' + e.id + '"><div class="ev-date"><b>' + gDate(e).getDate() + "</b><span>" + MONTHS[gDate(e).getMonth()].slice(0, 3) + "</span><small>" + e.time + "</small></div>" +
          '<div class="ev-body"><p class="eyebrow">' + esc(e.kind) + (past ? " · Past event" : "") + (e.example ? ' · <em class="ex">Example</em>' : "") + '</p><h2 class="ev-title">' + esc(e.title) + "</h2>" +
          (e.tagline ? '<p class="ev-tag">' + esc(e.tagline) + "</p>" : "") + "<p>" + esc(e.summary) + "</p>" + (e.details ? '<p class="muted">' + esc(e.details) + "</p>" : "") +
          '<dl class="ev-facts"><div><dt>When</dt><dd>' + esc(eWhen(e)) + '</dd></div><div><dt>Where</dt><dd>' + esc(e.place) + '</dd></div><div><dt>Organised by</dt><dd>' + esc(e.organiser) + '</dd></div><div><dt>Price</dt><dd><b class="price">' + esc(e.price) + "</b>" + (e.priceNote ? " · " + esc(e.priceNote) : "") + "</dd></div></dl>" +
          (past ? '<span class="muted" style="font-size:13px">This event has taken place.</span>' : (e.signup ? '<a class="btn btn-blue" href="' + esc(e.signup) + '" target="_blank" rel="noopener noreferrer">Sign up</a>' : '<span class="muted" style="font-size:13px">Sign-ups open soon.</span>') +
          calMenu({ id: e.id, title: e.title + " · " + e.kind, date: e.date, time: e.time, mins: 120, place: e.place, details: e.summary + (e.signup ? "\nSign up: " + e.signup : "") })) + "</div></li>";
      }).join("") : '<li class="muted">No upcoming events yet.</li>') + "</ol></div></section>";
  }

  // ---- "Add to my calendar": one menu for every game and event -------------------------------
  // Times on the site are Barcelona time (Europe/Madrid). Convert to UTC once, so the date is
  // right in every calendar whatever the visitor's own time zone (summer/winter time included).
  function madridOffset(ms) {
    var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
  }
  function madridToUtc(date, time) {
    var d = date.split("-"), t = (time || "12:00").split(":");
    var wall = Date.UTC(+d[0], +d[1] - 1, +d[2], +t[0], +t[1]);
    var ms = wall - madridOffset(wall);
    return wall - madridOffset(ms);
  }
  function icsStamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"; }
  // ev: { id, title, date "YYYY-MM-DD", time "HH:MM", mins, place, details }
  function calMenu(ev) {
    var s = madridToUtc(ev.date, ev.time), e = s + (ev.mins || 120) * 60000;
    var S = icsStamp(s), E = icsStamp(e), enc = encodeURIComponent;
    var details = (ev.details ? ev.details + "\n\n" : "") + "Esade Sports · " + location.origin;
    var isoS = new Date(s).toISOString().slice(0, 19) + "Z", isoE = new Date(e).toISOString().slice(0, 19) + "Z";
    var outlook = function (host) { return "https://" + host + "/calendar/0/action/compose?rru=addevent&subject=" + enc(ev.title) + "&startdt=" + isoS + "&enddt=" + isoE + "&location=" + enc(ev.place || "") + "&body=" + enc(details); };
    var links = [
      ["/api/ics?id=" + enc(ev.id) + "&s=" + S + "&e=" + E + "&t=" + enc(ev.title) + "&l=" + enc(ev.place || "") + "&d=" + enc(details), "Apple Calendar (iPhone, Mac)", false],
      ["https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + enc(ev.title) + "&dates=" + S + "/" + E + "&location=" + enc(ev.place || "") + "&details=" + enc(details), "Google Calendar", true],
      [outlook("outlook.office.com"), "Outlook (Esade / Microsoft 365)", true],
      [outlook("outlook.live.com"), "Outlook.com (personal)", true],
      ["/api/ics?id=" + enc(ev.id) + "&s=" + S + "&e=" + E + "&t=" + enc(ev.title) + "&l=" + enc(ev.place || "") + "&d=" + enc(details), "Other app (.ics file)", false]
    ];
    return '<details class="cal-add"><summary class="btn btn-ghost-navy">Add to my calendar</summary><div class="cal-menu">' +
      links.map(function (l) { return '<a href="' + esc(l[0]) + '"' + (l[2] ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<p class="cal-hint">On iPhone, if nothing happens, open this page in Safari (not inside Instagram or WhatsApp).</p></div></details>';
  }
  // Opening the menu scrolls it into view, so the last option is never hidden at the bottom of a phone screen.
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (d.classList && d.classList.contains("cal-add") && d.open) { var m = d.querySelector(".cal-menu"); if (m && m.scrollIntoView) m.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }, true);
  function openMatch(id) {
    var g = gameById(id), modal = $("match-modal");
    if (!g || !modal) return;
    $("match-modal-sport").textContent = g.sport + (g.example ? " · Example" : "");
    $("match-modal-title").textContent = gTeams(g);
    $("match-modal-meta").textContent = gLong(g) + " · " + g.time;
    $("match-modal-location").textContent = g.venue;
    $("match-modal-league").textContent = g.competition;
    $("match-modal-status").textContent = gStatus(g);
    var calBox = $("match-modal-cal");
    if (calBox) calBox.innerHTML = isOver(g) ? "" : calMenu({ id: g.id, title: g.sport + ": " + g.home + " vs " + g.away, date: g.date, time: g.time, mins: 120, place: g.venue, details: g.competition });
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  // ================= Full calendar (#calendar) =================
  var cal = { month: null, view: "month", team: "" };
  function calendarView() {
    var tk = madridYmd(0).split("-"), today = new Date(+tk[0], +tk[1] - 1, +tk[2]);
    if (!cal.month) {
      var next = GAMES.filter(function (g) { return !isOver(g); }).sort(function (a, b) { return startMs(a) - startMs(b); })[0];
      cal.month = next ? new Date(gDate(next).getFullYear(), gDate(next).getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);
    }
    var y = cal.month.getFullYear(), m = cal.month.getMonth();
    var games = GAMES.filter(function (g) { return !cal.team || g.team === cal.team; }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var teamsWithGames = TEAMS.filter(function (t) { return GAMES.some(function (g) { return g.team === t.id; }); });
    var head = '<section class="band"><div class="wrap"><h1 class="display">Full<br>calendar.</h1><p>Every Esade Sports game on the website: date, time, place and result. Captains add their games during the season.</p></div></section>';
    var bar = '<div class="cal-bar"><div class="cal-nav"><button type="button" class="btn btn-ghost-navy sm" data-cal="prev" aria-label="Previous month">' + ico("left") + '</button><h2 class="cal-title">' + MONTHS[m] + " " + y + '</h2><button type="button" class="btn btn-ghost-navy sm" data-cal="next" aria-label="Next month">' + ico("right") + '</button><button type="button" class="btn btn-ghost-navy sm" data-cal="today">Today</button></div>' +
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
          dayGames.map(function (g) { return '<button type="button" class="cal-game' + (isOver(g) ? " played" : "") + '" data-match-id="' + g.id + '"><b>' + (g.score ? g.score : isOver(g) ? "TBC" : g.time) + "</b> " + esc(g.sport) + (g.example ? " <em>Ex.</em>" : "") + "</button>"; }).join("") +
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
    { id: "tennis", name: "Tennis", squad: "Open", sport: "Tennis", budget: 0, status: "draft" },
    // Added 15/11/2026: one open squad. No budget, roster, results or news yet.
    { id: "cheerleading", name: "Cheerleading", squad: "Open", sport: "Cheerleading", budget: 0, status: "draft" }
  ];
  var SPORTS = ["Football 7", "Futsal", "Basketball", "Volleyball", "Padel", "Rugby", "Tennis", "Cheerleading"];
  var POS = { "Football 7": ["Goalkeeper", "Defender", "Defender", "Midfielder", "Midfielder", "Forward", "Forward", "Midfielder"],
    Futsal: ["Goalkeeper", "Defender", "Winger", "Winger", "Pivot", "Defender", "Winger", "Pivot"],
    Basketball: ["Guard", "Guard", "Forward", "Forward", "Center", "Guard", "Forward", "Center"],
    Volleyball: ["Setter", "Outside hitter", "Outside hitter", "Middle blocker", "Middle blocker", "Opposite", "Libero", "Setter"],
    Padel: ["Right side", "Left side", "Right side", "Left side", "Right side", "Left side", "Right side", "Left side"],
    Rugby: ["Prop", "Hooker", "Lock", "Flanker", "Number 8", "Scrum-half", "Fly-half", "Centre", "Wing", "Full-back"],
    Tennis: ["Singles", "Doubles", "Singles", "Doubles", "Singles", "Doubles", "Singles", "Doubles"],
    Cheerleading: ["Flyer", "Base", "Base", "Back spot", "Front spot", "Tumbler", "Flyer", "Base"] };
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
    { id: "2", preview: true, first: "Marco", last: "Bianchi", nationality: "Italian", programme: "BBA", grad: 2022, exUni: "National University of Singapore", exDomain: "nus.edu.sg", exCity: "Singapore", inCo: "Sports data start-up", inRole: "Business analyst intern", assos: "Esade Sports, Finance club", sports: ["Basketball"], linkedin: "linkedin.com/in/example-marco", interns: [], phone: "+39 300 000 002", esade: "marco.bianchi@esade.example", perso: "marco.b@example.com", active: false },
    { id: "3", preview: true, first: "Sophie", last: "Laurent", nationality: "French", programme: "Double degree BBA + Law", grad: 2024, exUni: "McGill University", exDomain: "mcgill.ca", exCity: "Montréal, Canada", inCo: "Sports law firm", inRole: "Legal intern", assos: "Esade Sports", sports: ["Volleyball"], linkedin: "", interns: [["Event agency", "Operations intern", "2022"]], phone: "+33 6 00 00 00 03", esade: "sophie.laurent@esade.example", perso: "sophie.l@example.com", active: true },
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
  // Example profiles: internal demo only, except the two "preview" ones shown before launch (see SHOW_PRELAUNCH_SAMPLES).
  if (!SHOW_EXAMPLES) ALUMNI = SHOW_PRELAUNCH_SAMPLES ? ALUMNI.filter(function (a) { return a.preview; }) : [];

  // ================= State =================
  var state = { user: null, me: null, expenses: null, captains: null, teamApplications: {}, teamInfo: {}, teamResults: {}, tasks: {}, checkups: [], rosters: {}, deckNotes: {}, nextId: 100, al: { q: "", sport: "All", year: "" }, hubFilter: "all", appFilter: "all", teamOpen: null };
  try {
    var s = JSON.parse(localStorage.getItem("es-site") || "null");
    if (s && s.v === 2) { state.user = s.user && s.user.role === "alumni" ? null : s.user; state.expenses = s.expenses; state.captains = s.captains || null; state.teamApplications = s.teamApplications || {}; state.teamInfo = s.teamInfo || {}; state.teamResults = s.teamResults || {}; state.tasks = s.tasks || {}; state.newTasks = s.newTasks || []; state.checkups = s.checkups || []; state.tupd = s.tupd || []; state.links = s.links || []; state.notifs = s.notifs || []; state.notifSeen = s.notifSeen || 0; state.rosters = s.rosters || {}; state.deckNotes = s.deckNotes || {}; state.ideas = s.ideas || null; state.nextId = s.nextId || 100; }
  } catch (e) {}
  function save() { try { localStorage.setItem("es-site", JSON.stringify({ v: 2, user: state.user, expenses: state.expenses, captains: state.captains, teamApplications: state.teamApplications, teamInfo: state.teamInfo, teamResults: state.teamResults, tasks: state.tasks, newTasks: state.newTasks, checkups: state.checkups, tupd: state.tupd, links: state.links, notifs: state.notifs, notifSeen: state.notifSeen, rosters: state.rosters, ideas: state.ideas, deckNotes: state.deckNotes, nextId: state.nextId })); } catch (e) {} }
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
  // /admin has something for this member beyond the chat (same rules as the tabs in components/admin/AdminApp.tsx):
  // admins, President/VPs, heads, captains, view-only, and associates in Operations or Partnerships.
  // Other associates (e.g. Finance) have everything in the Hub, so the Hub is their only home.
  function membersAreaUseful() {
    if (admin) return true;
    var sc = captain && captain.scope;
    if (!sc) return false;
    return !!(sc.exec || sc.viewer || (sc.heads || []).length || (sc.teams || []).length ||
      (sc.assoc || []).some(function (x) { return x.department === "Operations" || x.department === "Partnerships"; }));
  }
  function adminBar() {
    if (captain) return '<a class="admin-badge" href="#hub-overview" title="Signed in as ' + esc(captain.email) + ' · open the Hub"><i>' + esc(captain.label || "Member") + '</i><span>' + esc(captain.name || captain.email.split("@")[0]) + '</span></a>' +
      '<a href="#hub-overview">Hub</a>' + (membersAreaUseful() ? '<a href="/admin">Members area</a>' : "") + '<button type="button" class="signout" data-signout>Sign out</button>';
    if (!admin) return "";
    return '<a class="admin-badge" href="/admin" title="Signed in as ' + esc(admin.email) + ' · open the admin area"><i>Admin</i><span>' + esc(admin.name || admin.email.split("@")[0]) + '</span></a>' +
      '<a href="#hub-overview">Hub</a><button type="button" class="signout" data-signout>Sign out</button>';
  }
  // The Industry Platform preview and the "What Esade gains" column are for the Eva Morta / Student Council
  // presentation: admins and view-only accounts see them; students (and admins demoing the student view) don't.
  var demoPublic = false;
  function industryVisibility() {
    var show = !!((admin && !demoPublic) || (captain && captain.scope && captain.scope.viewer));
    var el = $("industry"); if (el) el.hidden = !show;
    // "What Esade gains" (Why join section) follows the same rule; students only see "What you get".
    var ge = $("why-esade"), gr = $("why-grid");
    if (ge) ge.hidden = !show;
    if (gr) gr.classList.toggle("solo", !show);
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
    return '<section class="band"><div class="wrap"><h1 class="display">Members<br>area.</h1><p>For captains, Board members, associates and the Student Council: requests, decisions and follow-up in one place. Visitors don\u2019t need an account, everything public is open.</p></div></section>' +
      '<section class="signin"><div class="wrap">' + (admin || captain ? "" : membersOnly()) + '<div class="access">' +
      (admin || captain ? hubPicker() + (captain && !admin ? requestBlock() : "")
      : '<div class="acc"><p class="eyebrow">Captains · Board · Associates</p><strong>Sign in to the Hub</strong><p>Expenses and budgets, team updates, try-out applications, department tasks and reports for the Student Council.</p>' +
        '<a class="btn btn-blue" href="/admin">' + (admin === undefined ? "Checking your login\u2026" : "Sign in") + '</a></div>' + requestBlock()) +
      '</div><p class="hint">Only accounts approved by the Board can sign in.</p>' +
      (admin ? '<div class="members-board">' + BOARD_BLOCK + '</div>' : "") + '</div></section>';
  }
  // Shown above the sign-in: the Hub is for association members and captains, not for visitors.
  function membersOnly() {
    return '<div class="members-only" role="note"><strong>Members-only access</strong><p>Reserved for Esade Sports association members and team captains. Not for visitors or students in general: everything public on this site is open without an account.</p>' +
      '<p class="mo-join">Want to get involved? <a href="/#apply-associate" target="_blank" rel="noopener">Join the association</a></p></div>';
  }
  // "Request access": becomes a request that the right person approves in /admin
  // (associates: their head of department; captains: the Board). Board positions are added by the admin.
  var REQ_DEPTS = ["Finance", "Media & Marketing", "Operations", "Partnerships", "IT"]; // same as convex/roles.ts
  function requestBlock() {
    return '<form class="acc req" id="req-form" novalidate><p class="eyebrow">New here?</p><strong>Request access</strong><p>Associates, captains and vice-captains: send a request. Once it is approved, sign in with the same email to create your account.</p>' +
      '<div class="fgrid">' + fieldI("rq-name", "Full name", "", 'required autocomplete="name"') + fieldI("rq-email", "Email", "", 'required type="email" autocomplete="email"') +
      '<label class="field" for="rq-role">I am<select id="rq-role"><option value="associate">An associate of a department</option><option value="captain">A team captain</option><option value="vicecaptain">A team vice-captain</option></select></label>' +
      '<label class="field" for="rq-dept" id="rq-dept-wrap">Department<select id="rq-dept">' + REQ_DEPTS.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="field" id="rq-teams-wrap"><span id="rq-teams-label">Team(s) you work with</span><div class="checks">' + TEAMS.map(function (t, i) { return '<label for="rq-t-' + i + '"><input type="checkbox" id="rq-t-' + i + '" value="' + t.id + '">' + esc(tLabel(t)) + "</label>"; }).join("") + "</div></div>" +
      '<label class="field full" for="rq-note">Note <small>(optional)</small><textarea id="rq-note" rows="2" maxlength="500" placeholder="E.g. elected captain in October"></textarea></label>' +
      '<input type="text" id="rq-website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<p class="err" id="rq-err" hidden></p><button class="btn btn-blue" type="submit" id="rq-send">Send request</button></form>';
  }
  function bindRequest() {
    var f = $("req-form"); if (!f) return;
    var role = $("rq-role");
    role.addEventListener("change", function () { var c = role.value !== "associate"; $("rq-dept-wrap").hidden = c; $("rq-teams-label").textContent = c ? "Your team(s)" : "Team(s) you work with"; });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("rq-err"), name = $("rq-name").value.trim(), email = $("rq-email").value.trim(), teams = [];
      page.querySelectorAll("#rq-teams-wrap input:checked").forEach(function (c) { teams.push(c.value); });
      var msg = !name || !email ? "Please add your name and email." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : !teams.length ? "Choose at least one team." : "";
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      var btn = $("rq-send"); btn.disabled = true; btn.textContent = "Sending…";
      function done() { f.innerHTML = '<p class="eyebrow">Request sent</p><strong>Thank you</strong><p>' + (role.value !== "associate" ? "The Board" : "The head of " + esc($("rq-dept") ? $("rq-dept").value : "your department")) + " will review your request. Once approved, sign in with " + esc(email) + " to create your account.</p>"; }
      var data = { name: name, email: email, role: role.value, department: role.value !== "associate" ? undefined : $("rq-dept").value, teams: teams, note: $("rq-note").value.trim() || undefined, website: $("rq-website").value || undefined, lang: window.__lang };
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
      (views.length ? '<button class="btn btn-blue" data-go="hub">Open the Hub</button>' : "") + (membersAreaUseful() || !views.length ? ' <a class="btn btn-ghost-navy" href="/admin">Members area</a>' : "") + "</div>";
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
    "basketball-men": {"league": "CSS · Bàsquet 1ª Lliga · 1ª Divisió", "short": "CSS · 1ª Divisió", "source": "css.cat", "updated": "17/11/2026", "club": "Esade Men's", "statCols": ["GP", "PTS", "PPG", "FT", "2P", "3P"], "cols": ["Played", "W", "L", "PF", "PA", "Diff"], "table": [["Esade Men's", 5, 4, 1, 248, 163, 85], ["TOP", 5, 4, 1, 272, 241, 31], ["PICK&RON", 5, 4, 1, 300, 288, 12], ["SANTS TENTACIO", 5, 2, 3, 211, 212, -1], ["FE NATURAL", 6, 2, 4, 236, 277, -41], ["Las amigas de Tomás", 6, 0, 6, 227, 313, -86]], "tableNote": "Calculated from every result on the league page. The league's official table may break ties differently.", "games": [{"date": "20/10/2026", "time": "21:00", "home": "Las amigas de Tomás", "away": "Esade Men's", "score": [26, 60], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 4"}, {"date": "27/10/2026", "time": "21:00", "home": "SANTS TENTACIO", "away": "Esade Men's", "score": [23, 32], "venue": "Jesús y Maria · Bàsquet Poli 2", "round": "Round 2"}, {"date": "03/11/2026", "time": "21:00", "home": "PICK&RON", "away": "Esade Men's", "score": [61, 59], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 3"}, {"date": "10/11/2026", "time": "22:00", "home": "Esade Men's", "away": "TOP", "score": [56, 37], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 1"}, {"date": "17/11/2026", "time": "21:00", "home": "Esade Men's", "away": "FE NATURAL", "score": [41, 16], "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 5"}, {"date": "24/11/2026", "time": "21:00", "home": "TOP", "away": "Esade Men's", "score": null, "venue": "Jesús y Maria · Bàsquet Poli 2", "round": "Round 6"}, {"date": "01/12/2026", "time": "21:00", "home": "Esade Men's", "away": "SANTS TENTACIO", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 7"}, {"date": "15/12/2026", "time": "21:00", "home": "Esade Men's", "away": "PICK&RON", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 8"}, {"date": "12/01/2027", "time": "22:00", "home": "FE NATURAL", "away": "Esade Men's", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 10"}, {"date": "19/01/2027", "time": "22:00", "home": "Esade Men's", "away": "Las amigas de Tomás", "score": null, "venue": "Thau Pedralbes · Voley - Baloncesto P2", "round": "Round 9"}], "players": [{"name": "Quentin Maigron", "no": 4, "stat": {"GP": 4, "PTS": 39, "PPG": "9.8", "FT": 1, "2P": 13, "3P": 4}}, {"name": "Diego Weis", "no": 11, "stat": {"GP": 5, "PTS": 37, "PPG": "7.4", "FT": 2, "2P": 16, "3P": 1}}, {"name": "Natan Miguel Viejo Evrard", "no": 2, "stat": {"GP": 5, "PTS": 33, "PPG": "6.6", "FT": 3, "2P": 12, "3P": 2}}, {"name": "Robin Basdevant", "no": 3, "stat": {"GP": 5, "PTS": 30, "PPG": "6.0", "FT": 3, "2P": 12, "3P": 1}}, {"name": "Arsenii Kolobov", "no": 28, "stat": {"GP": 5, "PTS": 22, "PPG": "4.4", "FT": 0, "2P": 8, "3P": 2}}, {"name": "Federico Polese", "no": 1, "stat": {"GP": 5, "PTS": 18, "PPG": "3.6", "FT": 0, "2P": 9, "3P": 0}}, {"name": "Unai Gillet", "no": 6, "stat": {"GP": 5, "PTS": 18, "PPG": "3.6", "FT": 0, "2P": 6, "3P": 2}}, {"name": "Viktor Velimir", "no": 12, "stat": {"GP": 5, "PTS": 17, "PPG": "3.4", "FT": 2, "2P": 6, "3P": 1}}, {"name": "Louis Rivalain", "no": 0, "stat": {"GP": 5, "PTS": 11, "PPG": "2.2", "FT": 0, "2P": 4, "3P": 1}}, {"name": "Marc Oriol Serra Francès", "no": 24, "stat": {"GP": 5, "PTS": 8, "PPG": "1.6", "FT": 0, "2P": 4, "3P": 0}}, {"name": "Jan Halbach", "no": 8, "stat": {"GP": 5, "PTS": 4, "PPG": "0.8", "FT": 2, "2P": 1, "3P": 0}}], "roster": [{"name": "Quentin Maigron", "no": 4, "programme": "BBA · 3rd year"}, {"name": "Diego Weis", "no": 11, "programme": "BBA · 2nd year"}, {"name": "Natan Miguel Viejo Evrard", "no": 2, "programme": "BAIB · 4th year"}, {"name": "Robin Basdevant", "no": 3, "programme": "BBA · 3rd year"}, {"name": "Arsenii Kolobov", "no": 28, "programme": "GEL · 1st year"}, {"name": "Federico Polese", "no": 1, "programme": "BBA · 1st year"}, {"name": "Unai Gillet", "no": 6, "programme": "BBA · 1st year"}, {"name": "Viktor Velimir", "no": 12, "programme": "Master's"}, {"name": "Louis Rivalain", "no": 0, "programme": "BBA · 2nd year"}, {"name": "Marc Oriol Serra Francès", "no": 24, "programme": "BAIB · 3rd year"}, {"name": "Jan Halbach", "no": 8, "programme": "BBA · 3rd year"}], "statsNote": "FT, 2P and 3P are shots made, from the league match sheets. The other 11 of the team's 248 points were scored by walk-on players who aren't listed here."}
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
  function teamData(t) { return SHOW_EXAMPLES ? TEAM_DATA[t.id] || {} : {}; } // fictional squads: internal demo only
  function soon(text) { return '<p class="empty-state">' + text + "</p>"; }
  function sgn(n) { return n > 0 ? "+" + n : String(n); }
  function leagueTable(L) {
    var diffCol = L.cols.length - 1;
    return '<div class="tscroll"><table class="sched lt"><thead><tr><th class="r">Pos</th><th>Team</th>' + L.cols.map(function (c) { return '<th class="r">' + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
      L.table.map(function (r, i) { return '<tr' + (r[0] === L.club ? ' class="us"' : "") + '><td class="r num">' + (i + 1) + '</td><td class="opp">' + esc(r[0]) + "</td>" + r.slice(1).map(function (v, j) { return '<td class="r num">' + (j === 0 ? "<strong>" + v + "</strong>" : j === diffCol ? sgn(v) : v) + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div><p class="src">' + (L.tableNote ? "<span>" + esc(L.tableNote) + "</span> " : "") + "<span>Source: " + esc(L.source) + " · updated " + L.updated + "</span></p>";
  }
  function nextGame(L) { for (var i = 0; i < L.games.length; i++) if (!isOver(L.games[i])) return L.games[i]; return null; }
  function nextStrip(t) {
    var L = LEAGUE[t.id], D = teamData(t), n = (L && L.games && nextGame(L)) || (D.next && !isOver(D.next) ? D.next : null);
    if (!n) return '<section class="tnext"><div class="wrap"><p class="eyebrow">Next game</p><p class="vs" style="margin:0">Esade <b>vs</b> the next opponent</p><span class="when">Date to be confirmed by the captain</span></div></section>';
    return '<section class="tnext"><div class="wrap"><p class="eyebrow">Next game · ' + n.round + '</p><p class="vs" style="margin:0">' + esc(n.home) + " <b>vs</b> " + esc(n.away) + '</p><span class="when">' + n.date + " · " + n.time + " · " + esc(n.venue) + "</span></div></section>";
  }
  function gamesTable(L, list) {
    return '<div class="tscroll"><table class="sched"><thead><tr><th>Date</th><th></th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>' +
      list.map(function (g) {
        var home = g.home === L.club, opp = home ? g.away : g.home, res = '<span class="muted">' + (isOver(g) ? "Result to be confirmed" : g.time) + "</span>";
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
    Tennis: ["Matches", "Won", "Lost", "Sets won"],
    Cheerleading: ["Competitions", "Best placing", "Best score"]
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
      // Ordered by shirt number, smallest first (no number = last), for every sport.
      var byNo = players.slice().sort(function (a, b) { return (a.no == null ? 1e9 : a.no) - (b.no == null ? 1e9 : b.no); });
      out = byNo.slice(0, n || byNo.length).map(function (r, i) { return '<li class="player' + (r.captain ? " capt" : "") + '"><div class="ph2">' + esc(r.position || t.sport) + '<span class="no">' + (r.no != null ? r.no : "–") + '</span></div><div class="pi"><strong>' + esc(r.name) + "</strong><span>" + (r.captain ? "Captain · " : "") + esc(r.position || "Player") + " · " + esc(r.programme || (L && L.club) || t.sport) + "</span></div></li>"; });
      return '<ul class="roster">' + out.join("") + "</ul>";
    }
    return soon("The squad list is coming soon: the captain is adding it.");
  }
  function schedTable(t) {
    var D = teamData(t), rows = D.schedule || [];
    if (!rows.length) return soon("The schedule is coming soon: the captain adds the games here.");
    rows = rows.map(function (r) { return '<tr><td>' + esc(r.date) + '</td><td class="ha">' + esc(r.side) + '</td><td class="opp">' + esc(r.opponent) + '</td><td>' + esc(r.venue) + '</td><td>' + (r.result && /^(W|L|D)\b/.test(r.result) ? '<span class="res">' + esc(r.result) + '</span>' : '<span class="muted">' + esc(r.result) + '</span>') + '</td></tr>'; });
    return '<div class="tscroll"><table class="sched"><thead><tr><th>Date</th><th></th><th>Opponent</th><th>Venue</th><th>Result</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>";
  }
  function newsList(t, n) {
    var D = teamData(t), stories = D.news || [], out = [];
    if (!stories.length) return soon("No news yet.");
    stories.slice(0, n || stories.length).forEach(function (story) { out.push('<li><div class="thumb" aria-hidden="true"></div><div><p class="eyebrow">' + esc(story.kind) + "</p><strong>" + esc(story.title) + "</strong><span>" + esc(story.date) + " · " + esc(story.summary) + "</span></div></li>"); });
    return '<ul class="news">' + out.join("") + "</ul>";
  }
  function sec(id, title, sub, body) { return '<section class="tsec" id="' + id + '"><header><h2>' + title + "</h2><span>" + sub + "</span></header>" + body + "</section>"; }
  function joinBlock(t) {
    var D = teamData(t);
    return '<div class="ways"><div class="tryout"><h3 class="display">Come to<br>try-outs.</h3><p>Next try-out: ' + esc(D.tryout || "Check the next club announcement") + '. Every level is welcome. Come and train with the squad.</p><a class="btn btn-solid-white" href="#apply-player-' + t.id + '">Sign up for try-outs</a><p class="fun-link">Rather play just for fun? No try-out needed. <a href="#apply-fun-' + t.id + '">Join the open sessions</a></p></div>' +
      '<div class="tryout coach"><h3 class="display">Volunteer as coach.</h3><p>Our coaches are volunteers. Esade student or not, if you have played or coached ' + esc(t.sport.toLowerCase()) + ', we would love your help.</p><a class="btn btn-ghost-navy" href="#apply-coach-' + t.id + '">Apply to coach</a></div></div>';
  }
  function statsTable(t) {
    var L = LEAGUE[t.id], cols = (L && L.statCols) || STATCOLS[t.sport] || ["GP"], rows = [], D = teamData(t), players = D.roster || (L && L.players) || [];
    players.forEach(function (pl) { rows.push('<tr><td class="pn"><span class="muted num">#' + (pl.no != null ? pl.no : "–") + "</span> " + esc(pl.name) + "</td>" + cols.map(function (c) { return '<td class="r num">' + (pl.stat && pl.stat[c] != null ? "<strong>" + esc(pl.stat[c]) + "</strong>" : "–") + "</td>"; }).join("") + "</tr>"); });
    if (!rows.length) return soon("Player stats are coming soon.");
    return '<div class="tscroll"><table class="sched stats"><thead><tr><th>Player</th>' + cols.map(function (c) { return '<th class="r">' + c + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") +
      '</tbody></table></div>';
  }
  // Results the captain added in the Hub (manual mode). Shown on the public page straight away in this demo; in production after approval.
  function captainResults(t) {
    var list = teamResultsFor(t.id).slice().reverse();
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
        '<section class="tsec" id="t-alumni"><div class="alumni-strip"><p>' + (nAl ? "<strong>" + nAl + " alumni played " + esc(t.sport.toLowerCase()) + "</strong>Find them in the Alumni corner and get in touch." : "<strong>Played " + esc(t.sport.toLowerCase()) + " at Esade?</strong>Add your profile to the Alumni corner and stay in touch.") + "</p>" + '<a class="btn btn-ghost-navy" href="#alumni" data-sport="' + esc(t.sport) + '">See ' + esc(t.sport.toLowerCase()) + " alumni</a></div></section>";
    } else if (tab === "roster") {
      body = sec("t-roster", "Roster", "Season 2026–27 · kept up to date by the captain", rosterCards(t, 12));
    } else if (tab === "staff") {
      body = '<div class="tgrid">' + sec("t-staff", "Staff", "Students and volunteers", staffList(t)) +
        '<section class="tsec"><div class="tryout coach"><h3 class="display">Volunteer as coach.</h3><p>Our coaches are volunteers. Esade student or not, if you have played or coached ' + esc(t.sport.toLowerCase()) + ', we would love your help.</p><a class="btn btn-ghost-navy" href="#apply-coach-' + t.id + '">Apply to coach</a></div></section></div>';
    } else if (tab === "schedule") {
      if (L && L.games) {
        body = recordCards(L) + sec("t-sched", "Schedule &amp; results", esc(L.league), gamesTable(L, L.games) + (L.gamesNote ? '<p class="src">' + esc(L.gamesNote) + "</p>" : "")) +
          captainResults(t) + sec("t-table", "League table", esc(L.short), leagueTable(L));
      } else {
        var rec = D.record || { position: "–", total: "–", points: "–", played: "–", gd: 0 };
        body = !D.record ? captainResults(t) + sec("t-sched", "Schedule &amp; results", "Season 2026–27", schedTable(t)) : '<div class="record"><div><span class="eyebrow">Position</span><strong>' + rec.position + " / " + rec.total + '</strong></div><div><span class="eyebrow">Points</span><strong>' + rec.points + '</strong></div><div><span class="eyebrow">Played</span><strong>' + rec.played + '</strong></div><div><span class="eyebrow">Goal difference</span><strong>' + sgn(rec.gd) + "</strong></div></div>" +
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
      body = !archives.length ? sec("t-arch", "Season archives", "Past seasons", soon("Past seasons will be added here.")) : sec("t-arch", "Season archives", "Past seasons", '<div class="tscroll"><table class="sched"><thead><tr><th>Season</th><th>League</th><th>Record</th><th>Position</th><th></th></tr></thead><tbody>' +
        archives.map(function (a) { return '<tr><td class="opp">' + esc(a[0]) + "</td><td>" + esc(a[1]) + "</td><td>" + esc(a[2]) + "</td><td>" + esc(a[3]) + '</td><td class="r"><span class="muted">Archived</span></td></tr>'; }).join("") + "</tbody></table></div>") +
        '<p class="muted" style="margin:0;font-size:13px">Each season is kept with its roster, results and stats. Prototype archive data shown for presentation.</p>';
    } else if (tab === "records") {
      body = !D.records ? sec("t-rec", "Record book", "All-time team records", soon("Team records will be added once the season is played.")) : sec("t-rec", "Record book", "All-time team records", '<div class="staff">' + D.records.map(function (r) { var p = r.split(" · "); return "<div><span>" + esc(p[0]) + "</span><span>" + esc(p.slice(1).join(" · ")) + "</span></div>"; }).join("") + "</div>");
    }
    var info = teamInfoFor(t.id), facts = [];
    if (info.league) facts.push(["League", info.league + (info.leagueUrl ? "" : ""), info.leagueUrl]);
    if (info.venue || info.venueAddress) facts.push(["Training venue", [info.venue, info.venueAddress].filter(Boolean).join(" · ")]);
    if (info.contact) facts.push(["Team contact", info.contact, "mailto:" + info.contact]);
    var about = info.about || facts.length || info.leagueUrl ? '<div class="tinfo">' + (info.about ? "<p>" + esc(info.about) + "</p>" : "") +
      (facts.length ? '<dl class="tfacts">' + facts.map(function (f) { return "<div><dt>" + f[0] + "</dt><dd>" + (f[2] ? '<a href="' + esc(f[2]) + '"' + (f[2].indexOf("http") === 0 ? ' target="_blank" rel="noopener"' : "") + ">" + esc(f[1]) + "</a>" : esc(f[1])) + "</dd></div>"; }).join("") + "</dl>" : "") +
      (info.leagueUrl && !info.league ? '<a class="link-arrow" href="' + esc(info.leagueUrl) + '" target="_blank" rel="noopener">League page →</a>' : "") + "</div>" : "";
    var exNote = L ? "" : SHOW_EXAMPLES ? '<p class="exnote"><b>Example data</b> <span>Names, results and stats on this page are examples for the presentation. The captain replaces them with the real roster and results.</span></p>' : '<p class="exnote"><b>Season 2026–27</b> <span>The squad, schedule and results are coming soon: the captain adds them during the season.</span></p>';
    return head + nextStrip(t) + '<section class="tbody"><div class="wrap">' + exNote + about + body + "</div></section>";
  }
  function staffList(t) {
    var D = t && teamData(t), L = t && LEAGUE[t.id], s = D.staff || {};
    var tba = "To be announced";
    return '<div class="staff"><div><span>Captain</span><span>' + esc(D.captain || (L && L.captain) || tba) + '</span></div><div><span>Coach</span><span>' + esc(D.coach || tba) + '</span></div><div><span>Finance associate</span><span>' + esc(s.finance || tba) + '</span></div><div><span>Media &amp; Marketing associate</span><span>' + esc(s.media || tba) + '</span></div><div><span>Operations associate</span><span>' + esc(s.operations || tba) + '</span></div></div>';
  }

  // ================= Join a team (player or coach) =================
  function applyView(h) {
    var m = h.match(/^apply-(player|coach|fun)-(.+)$/), fun = /^apply-fun/.test(h), as = m && m[1] === "coach" ? "coach" : "player", tid = m && team(m[2]) ? m[2] : TEAMS[0].id;
    return '<section class="band"><div class="wrap"><h1 class="display">Play or<br>coach.</h1><p>Esade Sports teams are run by students. Play in a league squad (through try-outs) or just for fun, with no try-out. Coaches are volunteers, and you do not need to be an Esade student to coach.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="aform" novalidate>' +
      '<div class="fsec"><h2>What would you like to do?</h2><div class="checks" role="radiogroup" aria-label="Join as">' +
      '<label for="as-player"><input type="radio" name="as" id="as-player" value="player"' + (as === "player" ? " checked" : "") + '>Play: sign up for try-outs</label>' +
      '<label for="as-coach"><input type="radio" name="as" id="as-coach" value="coach"' + (as === "coach" ? " checked" : "") + '>Coach the team</label></div>' +
      '<div class="fgrid"><label class="field" for="a-team">Team<select id="a-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === tid ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" +
      '<label class="field" for="a-esade">Are you an Esade student?<select id="a-esade"><option value="yes">Yes, I study at Esade</option><option value="no">No, I am not an Esade student</option></select></label></div></div>' +
      '<div class="fsec"><h2>About you</h2><div class="fgrid">' + fieldI("a-first", "First name", "", "required") + fieldI("a-last", "Last name", "", "required") + fieldI("a-email", "Email", "", 'type="email" required') + phoneField("a-phone", "Phone number", true) +
      '<label class="field" for="a-prog" id="a-prog-wrap">Programme and year<input id="a-prog" placeholder="e.g. BBA, 2nd year"></label>' +
      '<label class="field" for="a-track">How do you want to play?<select id="a-track"><option value="competitive"' + (fun ? "" : " selected") + '>Competitive squad: try-outs, weekly training, league games</option><option value="social"' + (fun ? " selected" : "") + '>Just for fun: open sessions and friendlies, no try-out</option></select></label>' +
      '<label class="field" for="a-level">Your level<select id="a-level"><option>Beginner</option><option>Played at school or in a club</option><option>Played at a competitive level</option></select></label>' +
      '<label class="field full" for="a-exp" id="a-exp-wrap">Coaching experience<textarea id="a-exp" rows="3" placeholder="Teams or age groups you have coached, licences, how much time you can give each week"></textarea></label></div></div>' +
      '<p class="err" id="a-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit" id="a-submit">Send</button><span class="muted" style="font-size:13px">The captain gets back to you by email.</span></div></form>' +
      '<div class="locked" id="a-done" hidden><h2 id="a-done-h">Thanks, we have your details</h2><p id="a-done-p">The captain will contact you by email with the next steps.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  function applyAssociateView() {
    var opts = DEPTS.filter(function (d) { return d.id !== "board"; }).map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('');
    return '<section class="band"><div class="wrap"><h1 class="display">Join the<br>association.</h1><p>Apply to up to two departments. Rank your preferences, tell us what motivates you and share the work that helps us understand how you could contribute.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="assoc-form" novalidate>' +
      '<div class="fsec"><h2>Personal information</h2><div class="fgrid">' + fieldI("as-first", "First name", "", "required autocomplete=\"given-name\"") + fieldI("as-last", "Last name", "", "required autocomplete=\"family-name\"") + fieldI("as-email", "Email", "", 'type="email" required autocomplete="email"') + phoneField("as-phone", "Phone number", true) + progSelect("as-programme", "Programme", "") + '<label class="field" for="as-year">Year<select id="as-year" required><option value="">Choose your year</option>' + YEARS.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('') + '</select></label>' + fieldI("as-linkedin", "LinkedIn profile", "", 'type="url" placeholder="https://linkedin.com/in/..."') + '</div></div>' +
      '<div class="fsec"><h2>Department preferences</h2><p class="muted" style="margin:0">You may apply to a maximum of two departments. Preference 1 is your strongest choice.</p><div class="fgrid"><label class="field" for="as-pref1">Preference 1<select id="as-pref1" required><option value="">Choose a department</option>' + opts + '</select></label><label class="field" for="as-pref2">Preference 2 <small>(optional)</small><select id="as-pref2"><option value="">No second preference</option>' + opts + '</select></label></div><label class="field full" for="as-motivation">Why do you want to join Esade Sports and why these departments?<textarea id="as-motivation" rows="6" required placeholder="Tell us what motivates you, what you could contribute and why you ranked these departments."></textarea></label></div>' +
      '<div class="fsec"><h2>Application materials</h2><div class="fgrid"><div class="field">CV and other PDFs <small>(the first PDF is your CV; you can add a cover letter, certificates…)</small>' + pickBox("as-cv", "application/pdf,.pdf", "+ Add PDFs") + "</div>" + '<label class="field" for="as-video">Motivation video <small>(optional)</small><input id="as-video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov"></label></div><p class="muted" style="margin:10px 0 0;font-size:13px">Video: MP4 or MOV, around 60–90 seconds. Explain who you are, why Esade Sports interests you and why your department preferences fit you.</p></div>' +
      '<div class="fsec"><label class="consent" for="as-redirect"><input type="checkbox" id="as-redirect" required><span>I understand that the Board may redirect my application to another department if it is a better fit for my profile and the association’s needs.</span></label><label class="consent" for="as-consent"><input type="checkbox" id="as-consent" required><span>I confirm that the information and documents submitted are accurate and may be reviewed by the Esade Sports recruitment team.</span></label></div>' +
      '<p class="err" id="as-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">Submit application</button><span class="muted" style="font-size:13px">Your application will be reviewed by the Board and relevant department Heads.</span></div></form>' +
      '<div class="locked" id="as-done" hidden><h2>Thanks for applying to Esade Sports</h2><p id="as-done-p">Your ranked preferences and application materials are ready for review.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
  }
  // ================= Contact form (footer "Contact") =================
  var CONTACT_TOPICS = ["Question", "Suggestion", "Feedback or complaint", "Try-outs", "Coaching", "Partnership or business", "Alumni", "Other"];
  function contactView() {
    return '<section class="band"><div class="wrap"><h1 class="display">Get in<br>touch.</h1><p>A question, a suggestion or an idea? Send us a message and the right person at Esade Sports will get back to you by email.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="contact-form" novalidate>' +
      '<div class="fsec"><h2>Your message</h2><div class="fgrid">' +
      '<label class="field" for="ct-topic">What is your message about?<select id="ct-topic" required><option value="">Choose a topic</option>' + CONTACT_TOPICS.map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("") + "</select></label>" +
      '<label class="field" for="ct-sport">Sport (optional)<select id="ct-sport"><option value="">Not about a specific sport</option>' + SPORTS.map(function (sp) { return '<option value="' + esc(sp) + '">' + esc(sp) + "</option>"; }).join("") + "</select></label>" +
      fieldI("ct-subject", "Subject", "", 'required maxlength="150"', true) +
      '<label class="field full" for="ct-message">Message<textarea id="ct-message" rows="7" maxlength="2000" required placeholder="Write your message here"></textarea><small class="muted" id="ct-count">0 / 2000</small></label>' +
      "</div></div>" +
      '<div class="fsec"><h2>Your details</h2><div class="fgrid">' + fieldI("ct-name", "Name", "", 'required maxlength="100" autocomplete="name"') + fieldI("ct-email", "Email", "", 'type="email" required maxlength="200" autocomplete="email"') + phoneField("ct-phone", "Phone number", false) + "</div>" +
      '<div class="hp" aria-hidden="true"><label for="ct-website">Website<input id="ct-website" tabindex="-1" autocomplete="off"></label></div></div>' +
      '<div class="fsec"><label class="consent" for="ct-consent"><input type="checkbox" id="ct-consent" required><span>I have read the <a href="#privacy" target="_blank" rel="noopener">privacy policy</a> and agree that Esade Sports uses my details to answer this message.</span></label></div>' +
      '<p class="err" id="ct-err" hidden></p><div class="form-actions"><button class="btn btn-blue" type="submit">Send message</button><span class="muted" style="font-size:13px">We usually reply within a few days.</span></div></form>' +
      '<div class="locked" id="ct-done" hidden><h2>Thanks for your message</h2><p>We have received it and will reply by email.</p><a class="btn btn-ghost-navy" href="#home">Back to home</a></div></div></section>';
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
        name: $("ct-name").value.trim(), email: email, phone: ctPhone.value || undefined, consent: true, website: $("ct-website").value || undefined, lang: window.__lang
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
      e.preventDefault(); var err = $("as-err"), pdfs = picked("as-cv"), cv = pdfs[0], video = $("as-video").files[0], p1 = $("as-pref1").value, p2 = $("as-pref2").value;
      if (!$("as-first").value.trim() || !$("as-last").value.trim() || !$("as-email").value.trim() || !$("as-programme").value.trim() || !$("as-year").value || !p1 || !$("as-motivation").value.trim() || !cv || !$("as-redirect").checked || !$("as-consent").checked) { err.textContent = "Please complete your personal information, rank at least one department, upload your CV and accept both acknowledgements."; err.hidden = false; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("as-email").value.trim())) { err.textContent = "Please enter a valid email address."; err.hidden = false; return; }
      var asPhone = phoneValue("as-phone", true);
      if (asPhone.error) { err.textContent = asPhone.error; err.hidden = false; return; }
      if (p1 === p2) { err.textContent = "Choose two different departments, or leave Preference 2 empty."; err.hidden = false; return; }
      if (pdfs.some(function (x) { return x.type !== "application/pdf" && !/\.pdf$/i.test(x.name); })) { err.textContent = "Please upload your CV and documents as PDFs."; err.hidden = false; return; }
      if (video && !/^video\/(mp4|quicktime)$/.test(video.type) && !/\.(mp4|mov)$/i.test(video.name)) { err.textContent = "Please upload the motivation video as an MP4 or MOV file."; err.hidden = false; return; }
      err.hidden = true;
      function done() { PICKS["as-cv"] = []; f.hidden = true; $("as-done").hidden = false; $("as-done-p").textContent = "Preference 1: " + deptName(p1) + (p2 ? ". Preference 2: " + deptName(p2) + "." : ".") + " The Board may redirect your application to another department if appropriate."; }
      if (!backend || !backend.submitAssociationApplication) { done(); return; }
      var btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Sending…";
      backend.submitAssociationApplication({
        firstName: $("as-first").value.trim(), lastName: $("as-last").value.trim(), email: $("as-email").value.trim(), phone: phoneValue("as-phone", true).value,
        programme: $("as-programme").value.trim(), year: $("as-year").value, linkedin: $("as-linkedin").value.trim() || undefined,
        pref1: deptName(p1), pref2: p2 ? deptName(p2) : undefined, motivation: $("as-motivation").value.trim(),
        acceptsRedirect: $("as-redirect").checked, confirmsAccuracy: $("as-consent").checked, lang: window.__lang
      }, { cv: cv, more: pdfs.slice(1), video: video }).then(done, function (x) {
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
      var fun = !coach && $("a-track").value === "social";
      $("a-level").parentNode.hidden = coach; $("a-track").parentNode.hidden = coach;
      $("a-submit").textContent = coach ? "Apply to coach" : fun ? "Sign me up" : "Sign up for try-outs";
    }
    f.addEventListener("change", sync); sync();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var miss = ["a-first", "a-last", "a-email", "a-phone-num"].filter(function (id) { return !$(id).value.trim(); });
      if (miss.length) { $("a-err").textContent = "Please fill in your name, email and phone number."; $("a-err").hidden = false; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("a-email").value.trim())) { $("a-err").textContent = "Please enter a valid email address."; $("a-err").hidden = false; return; }
      var aPhone = phoneValue("a-phone", true);
      if (aPhone.error) { $("a-err").textContent = aPhone.error; $("a-err").hidden = false; return; }
      var coach = $("as-coach").checked, t = team($("a-team").value), track = coach ? undefined : $("a-track").value;
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
        f.hidden = true; $("a-done").hidden = false; window.scrollTo(0, 0);
        $("a-done-h").textContent = coach ? "Thanks for offering to coach" : track === "social" ? "You are in: playing just for fun" : "You are signed up for try-outs";
        $("a-done-p").textContent = "Team: " + tLabel(t) + ". " + (coach ? "The captain and the Operations team will read your application and email you." : track === "social" ? "No try-out needed. The captain will email you when the next open session or friendly is on." : "The captain will email you with the date, time and place of the next try-out.");
      }
      if (!backend || !backend.submitTeamApplication) { done(); return; }
      var btn = $("a-submit"), label = btn.textContent; btn.disabled = true; btn.textContent = "Sending…";
      backend.submitTeamApplication({
        teamSlug: t.id, kind: coach ? "coach" : "tryout",
        firstName: $("a-first").value.trim(), lastName: $("a-last").value.trim(), email: $("a-email").value.trim(), phone: aPhone.value,
        esadeStudent: $("a-esade").value === "yes", programme: ($("a-esade").value === "yes" && $("a-prog").value.trim()) || undefined,
        level: coach ? undefined : $("a-level").value, track: track, coachingExperience: coach ? ($("a-exp").value.trim() || undefined) : undefined, lang: window.__lang
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
    return '<section class="band"><div class="wrap"><h1 class="display">A community<br>beyond sports.</h1><p>Part of an Esade alumni network ranked #6 in Europe by the <a href="https://www.esade.edu/en/news/esade-full-time-mba-ranked-7th-in-the-world-by-the-financial-times" target="_blank" rel="noopener">Financial Times</a>. Search the Esade Sports alumni network like a professional directory. Anyone can browse profiles. Alumni add their own profile, and it appears once the Esade Sports team has checked it.</p>' + (extra || "") + "</div></section>";
  }
  // Graduation years: 1991 up to next year's class, newest first.
  function gradYears() { var out = [], top = new Date().getFullYear() + 1; for (var y = top; y >= 1991; y--) out.push(y); return out; }
  // LinkedIn-style logo tiles. Organisation logos load from our own /api/logo route (by website
  // domain); if there is no domain or no logo, the tile shows the organisation's initials.
  var SPORT_ICON = { "Football 7": "⚽", Futsal: "⚽", Basketball: "🏀", Volleyball: "🏐", Padel: "🎾", Rugby: "🏉", Tennis: "🎾", Cheerleading: "📣" };
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
    }).join("") : '<li class="empty-state" style="grid-column:1/-1">' + (allAlumni().length ? "No alumni match these filters. Try another sport or clear the search." : 'No alumni profiles yet. Be the first: <a href="#my-profile">add your profile</a>.') + "</li>";
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
      '<small class="hint">Contact via WhatsApp only.</small></div>';
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
  // Esade programmes in Barcelona (application forms, alumni profiles, roster).
  var PROGRAMMES = [["Undergraduate", ["BBA · Business Administration", "Bachelor in Law", "Business & Artificial Intelligence (BAI)", "Global Governance", "Economics & Legal Order", "Transformational Leadership & Social Impact (BITLASI)", "Double degree · BBA + Law", "Double degree · other"]],
    ["Postgraduate", ["MSc (Master of Science)", "Law Masters", "Full-Time MBA", "Executive MBA (EMBA)", "Executive Education", "PhD / Research"]], ["Other", ["Other"]]];
  function progSelect(id, label, val) {
    return '<label class="field" for="' + id + '">' + label + '<select id="' + id + '" required><option value="">Choose your programme</option>' + PROGRAMMES.map(function (g) {
      return '<optgroup label="' + g[0] + '">' + g[1].map(function (p) { return '<option' + (p === val ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</optgroup>"; }).join("") + "</select></label>";
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
    return '<section class="band"><div class="wrap"><h1 class="display">Add your<br>profile.</h1><p>Share what you did at Esade and since, so other Esade alumni and students who played sport can find you. The Esade Sports team checks each profile before it appears in the directory. Your email and phone stay private.</p></div></section>' +
      '<section class="al"><div class="wrap body"><form class="pform" id="pform" novalidate>' +
      '<div class="fsec"><h2>About you</h2><div class="photo-row"><div class="av" id="ph-prev">?</div><label class="field" for="f-photo">Profile photo <small>(optional)</small><input id="f-photo" type="file" accept="image/*"></label></div>' +
      '<div class="fgrid">' + fieldI("f-first", "First name", "", "required autocomplete=\"given-name\"") + fieldI("f-last", "Last name", "", "required autocomplete=\"family-name\"") + fieldI("f-nat", "Nationality", "", "required") +
      fieldI("f-headline", "What you do now <small>(optional)</small>", "", 'placeholder="Brand manager · sportswear company"') + "</div></div>" +
      '<div class="fsec"><h2>At Esade</h2><div class="fgrid">' + fieldI("f-prog", "Programme studied", m.programme, 'required list="progs"') + '<datalist id="progs">' + PROGRAMMES.map(function (g) { return g[1].map(function (p) { return "<option>" + esc(p) + "</option>"; }).join(""); }).join("") + '</datalist>' +
      '<label class="field" for="f-grad">Graduation year<select id="f-grad" required><option value="">Choose a year</option>' + gradYears().map(function (y) { return "<option>" + y + "</option>"; }).join("") + "</select></label>" +
      fieldI("f-role", "Your role at Esade Sports <small>(optional)</small>", "", 'placeholder="Captain, Football 7"', true) +
      fieldI("f-exuni", "Exchange university", "", 'required placeholder="University of Michigan"') + fieldI("f-excity", "Exchange city and country", "", "required") +
      fieldI("f-exdom", "Exchange university website <small>(for the logo, optional)</small>", "", 'placeholder="umich.edu"', true) +
      fieldI("f-inco", "4th-year internship: company", "", "required") + fieldI("f-inrole", "4th-year internship: role", "", "required") +
      fieldI("f-indom", "Company website <small>(for the logo, optional)</small>", "", 'placeholder="company.com"', true) + "</div>" +
      '<div class="field full">Associations you joined<div id="assocs" style="display:grid;gap:12px"></div><button type="button" class="btn btn-ghost-navy" id="add-assoc" style="justify-self:start">Add an association</button></div>' +
      '<div class="field">Sports you played at Esade<div class="checks" id="f-sports">' + SPORTS.map(function (s, i) { return '<label for="sp-' + i + '"><input type="checkbox" id="sp-' + i + '" value="' + s + '">' + s + "</label>"; }).join("") + "</div></div></div>" +
      '<div class="fsec"><h2>Other internships and jobs <small>Optional</small></h2><div id="interns" style="display:grid;gap:12px"></div><button type="button" class="btn btn-ghost-navy" id="add-intern" style="justify-self:start">Add an internship</button></div>' +
      '<div class="fsec"><h2>Contact details <small>Email and phone are only seen by the Esade Sports team</small></h2><div class="fgrid">' + fieldI("f-email", "Email <small>(Esade or personal, either works)</small>", "", 'required type="email" autocomplete="email"') + phoneField("f-phone", "Phone number", false) + fieldI("f-li", "LinkedIn <small>(optional, shown on your profile)</small>", "", 'placeholder="linkedin.com/in/..."', true) + "</div>" +
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
      var data = { lang: window.__lang, first: v("f-first"), last: v("f-last"), nationality: v("f-nat"), programme: v("f-prog"), grad: +v("f-grad"), sports: sports,
        esadeRole: v("f-role") || undefined, headline: v("f-headline") || undefined,
        exUni: v("f-exuni"), exDomain: cleanDomain(v("f-exdom")) || undefined, exCity: v("f-excity"), inCo: v("f-inco"), inDomain: cleanDomain(v("f-indom")) || undefined, inRole: v("f-inrole"),
        interns: readInterns().filter(function (x) { return x[0] || x[1]; }).map(function (x) { return { co: x[0], role: x[1], year: x[2] || undefined, domain: cleanDomain(x[3]) || undefined }; }),
        assocs: assocRows.map(function (x) { return { name: x[0], domain: cleanDomain(x[1]) || undefined }; }),
        linkedin: v("f-li") || undefined, photo: draftPhoto || undefined, email: v("f-email"), phone: ph.value || undefined, consent: true, website: v("f-website") || undefined };
      var btn = $("f-submit"); btn.disabled = true; btn.textContent = "Sending…";
      function done() {
        page.innerHTML = '<section class="band"><div class="wrap"><h1 class="display">Thank<br>you.</h1><p>We received your profile. It will appear in the alumni directory once the Esade Sports team has checked it, usually within a few days.</p><div class="ctas"><a class="btn btn-solid-white" href="#alumni">Back to the Alumni corner</a></div></div></section>';
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
    return '<section class="band"><div class="wrap"><h1 class="display">Your data,<br>your call.</h1><p>How Esade Sports handles personal data. This page will be checked against Esade\u2019s data-protection rules before launch.</p></div></section>' +
      '<section class="al"><div class="wrap body"><div class="staff privacy">' + items.map(function (x) { return "<div><span>" + x[0] + "</span><span>" + x[1] + "</span></div>"; }).join("") + '</div><p class="muted" style="margin:0;font-size:13px">Contact: <a href="mailto:esadesports@alumni.esade.edu">esadesports@alumni.esade.edu</a></p></div></section>';
  }

  // ================= Hub (department tracking) =================
  var BUDGET_STATUS = { agreed: ["ok", "Agreed with captain"], review: ["warn", "In review"], draft: ["bad", "Not agreed yet"], none: ["", "Budget not set"] };
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
  // Older saved prototype rows: give them a budget line (department), a decision history and an Esade status.
  state.expenses.forEach(function (e) {
    if (!("esade" in e)) e.esade = e.status === "validated" || e.status === "paid" || e.id === 7 ? "accepted" : e.id === 6 ? "sent" : null;
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
    { id: "med", name: "Media & Marketing", head: "Head of Media & Marketing", size: "5–6", remit: "Runs every team's media accounts, and the communication and promotion of games and events.", tasks: [["Match-day posts for every home game", "doing"], ["Promote the spring tournament", "todo"], ["Team intro reels (13 teams)", "todo"], ["Rebuild the Linktree", "done"]] },
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
    fin: { head: "Laura Gómez", associates: [["Pablo Ruiz", ["football7-men", "futsal-men", "futsal-women", "basketball-men"]], ["Nina Weber", ["basketball-women", "volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Omar Haddad", ["padel-men", "padel-women", "rugby", "tennis", "cheerleading"]]] },
    med: { head: "Julia Rossi", associates: [["Lucas Martin", ["football7-men", "futsal-men", "futsal-women"]], ["Mia Novak", ["basketball-men", "basketball-women", "rugby"]], ["Sara Lindqvist", ["volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Diego Alves", ["padel-men", "padel-women", "tennis", "cheerleading"]]] },
    ops: { head: "Marc Puig", associates: [["Elena Costa", ["football7-men", "futsal-men", "futsal-women"]], ["Hugo Petit", ["basketball-men", "basketball-women", "rugby"]], ["Aisha Khan", ["volleyball-men", "volleyball-women", "volleyball-mixed"]], ["Leo Fischer", ["padel-men", "padel-women", "tennis", "cheerleading"]]] },
    par: { head: "Sofia Bianco", associates: [["Ivan Horvat", ALL_IDS], ["Chloé Dubois", ALL_IDS], ["Noah Smith", ALL_IDS]] },
    it: { head: "Daniel Kim", associates: [["Marta Soler", ALL_IDS], ["Yuki Tanaka", ALL_IDS]] }
  };
  // Who works on each of the starting tasks (index into [head, associates...]).
  var TASK_OWNER = { board0: 0, board1: 1, board2: 0, fin0: 0, fin1: 2, fin2: 3, fin3: 1, med0: 1, med1: 0, med2: 3, med3: 2, ops0: 2, ops1: 3, ops2: 1, ops3: 4, par0: 1, par1: 0, par2: 3, it0: 1, it1: 0, it2: 2 };
  var EXAMPLE_PEOPLE = DEPT_PEOPLE, TBA = "To be assigned";
  // Signed in (live): the real Board, heads, associates and captains from Convex (convex/org.ts overview).
  // Nobody approved yet for a role = "To be assigned". Example names are only for the local preview.
  function applyPeople() {
    if (!live()) { DEPT_PEOPLE = EXAMPLE_PEOPLE; return; }
    var o = LIVE.people || { exec: [], departments: [], teams: [] }, out = {};
    var pres = (o.exec || []).filter(function (x) { return x.position === "President"; })[0];
    out.board = { head: pres ? pres.name : TBA, headEmail: pres ? pres.email : "", headRole: "President", associates: (o.exec || []).filter(function (x) { return x !== pres; }).map(function (x) { return [x.name, ALL_IDS, x.position, x.email]; }) };
    DEPTS.forEach(function (d) {
      if (d.id === "board") return;
      var r = (o.departments || []).filter(function (x) { return x.name === d.name; })[0] || { heads: [], associates: [] }, h = r.heads[0];
      out[d.id] = { head: h ? h.name : TBA, headEmail: h ? h.email : "", associates: r.associates.map(function (x) { return [x.name, x.teams || [], "Associate", x.email]; }) };
    });
    DEPT_PEOPLE = out;
  }
  function deptPeople(id) { var p = DEPT_PEOPLE[id]; return p ? [p.head].concat(p.associates.map(function (a) { return a[0]; })).filter(function (n) { return n !== TBA; }) : []; }
  // [name, email] of everyone in a department (for "who works on it").
  function deptMembers(id) { var p = DEPT_PEOPLE[id]; if (!p) return []; var out = p.head !== TBA ? [[p.head, p.headEmail || ""]] : []; p.associates.forEach(function (a) { out.push([a[0], a[3] || ""]); }); return out; }
  function assocFor(deptId, teamId) { var p = DEPT_PEOPLE[deptId], n = ""; if (p) p.associates.forEach(function (a) { if (!n && a[1].indexOf(teamId) > -1) n = a[0]; }); return n; }
  function deptKey(id) { return id === "board" ? "Board" : deptName(id); }
  function deptTasks(d) {
    if (live()) return (LIVE.tasks || []).filter(function (t) { return t.dept === deptKey(d.id); }).map(function (t) {
      return { key: String(t._id), id: t._id, title: t.title, owner: t.ownerName || "", ownerEmail: t.ownerEmail || "", status: t.status, team: t.team, due: t.due, canSet: t.canSet, canRemove: t.canRemove, mine: t.mine };
    });
    var ppl = deptPeople(d.id);
    return d.tasks.map(function (t, i) { var k = d.id + i; return { key: k, title: t[0], owner: ppl[TASK_OWNER[k] || 0] || "", status: state.tasks[k] || t[1] }; })
      .concat(state.newTasks.filter(function (x) { return x.dept === d.id; }).map(function (x) { return { key: "n" + x.id, title: x.title, owner: x.owner, status: state.tasks["n" + x.id] || "todo" }; }));
  }
  // Only the Board adds tasks: a head for their own department, the president / VPs (and admins) for any.
  function canAddTask(deptId) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "head" && u.dept === deptId)); }
  // Work summaries / comments on tasks: the department's own head and associates (+ President, VPs, admins).
  function canPostTask(deptId) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || ((u.role === "head" || u.role === "associate") && u.dept === deptId)); }
  function taskUpdatesFor(key) {
    if (live()) return (LIVE.tupd || []).filter(function (r) { return r.taskKey === key; }).map(function (r) { return { kind: r.kind, text: r.text, link: r.link, by: r.by, at: r.at, files: r.fileLinks || [] }; });
    return (state.tupd || []).filter(function (r) { return r.taskKey === key; });
  }
  function canSetTask(deptId) { var u = hv(); return can("tasks") && (u.role === "admin" || u.role === "exec" || u.dept === deptId); }
  // Name of the person whose view this is (example data).
  function myName() {
    var u = hv(), me = admin || captain;
    if (live() && me) return me.name || me.email.split("@")[0];
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
  function hRO() { return hv().role === "viewer" || !!hv().ro; }
  function hDept(d) { var u = hv(); return hFull() || ((u.role === "head" || u.role === "associate") && u.dept === d); }
  function teamOk(id) { var u = hv(); return hFull() || u.role === "head" || (u.teams || []).indexOf(id) > -1; }
  function can(k) {
    var u = hv(), r = u.role, ro = hRO();
    if (k === "all") return hFull() || r === "head";
    if (k === "expenses") return true; // the ledger: each person sees their own scope (seeExp)
    if (k === "money") return hDept("fin") || r === "captain"; // budgets on the overview and team pages
    if (k === "submit") return !ro && (r === "admin" || r === "exec" || r === "captain" || ["fin", "ops", "med"].indexOf(u.dept) > -1);
    if (k === "ideas") return hDept("ops") || hDept("fin") || hDept("med") || r === "captain";
    if (k === "checkups") return true;
    if (k === "validate") return !ro && (r === "admin" || r === "exec" || ((r === "head" || r === "associate") && u.dept === "fin"));
    if (k === "pay") return !ro && (r === "admin" || r === "exec" || (r === "head" && u.dept === "fin"));
    if (k === "applications") return hDept("ops") || r === "captain";
    if (k === "teamEdit") return !ro && (r === "admin" || r === "exec" || hDept("med") || r === "captain");
    if (k === "captains") return hFull() || (r === "head" && u.dept === "ops");
    if (k === "reports") return true; // weekly / monthly / semester, each person for their own scope
    if (k === "depts") return r !== "captain";
    if (k === "tasks") return !ro && r !== "captain";
    if (k === "partners") return hDept("par");
    if (k === "goals") return r !== "captain";
    if (k === "board") return r === "admin" || r === "exec" || r === "head"; // website messages + association applications
    if (k === "people") return !ro && (r === "admin" || r === "exec" || r === "head"); // add people (limits: peopleKinds)
    if (k === "tournament") return r !== "associate"; // captains (own team), Board, admins, view-only (Eva Morta)
    if (k === "chat") return r === "admin" || r === "exec" || r === "head" || r === "associate" || r === "captain"; // the association's chat (no view-only)
    return false;
  }
  function tryoutCount() { if (!live()) return visibleSportsApplications().length; return LIVE.tryouts ? visTryouts().filter(function (a) { return (a.status || "New") === "New" && !a.openedAt; }).length : (LIVE.inbox || {}).tryouts || 0; }
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
      out.push({ role: "captain", teams: ["basketball-men"] }, { role: "viewer" });
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
    ["head-fin", "2 · Head of Finance (every team)", { role: "head", dept: "fin" }],
    ["head-ops", "2 · Head of Operations (every team)", { role: "head", dept: "ops" }],
    ["head-med", "2 · Head of Marketing (every team)", { role: "head", dept: "med" }],
    ["head-par", "2 · Head of Partnerships (every team)", { role: "head", dept: "par" }],
    ["head-it", "2 · Head of IT", { role: "head", dept: "it" }],
    ["assoc", "3 · Associate: Finance, Basketball Women", { role: "associate", dept: "fin", teams: ["basketball-women"] }],
    ["assoc-ops", "3 · Associate: Operations, Basketball Women", { role: "associate", dept: "ops", teams: ["basketball-women"] }],
    ["assoc-med", "3 · Associate: Marketing, Basketball Women", { role: "associate", dept: "med", teams: ["basketball-women"] }],
    ["assoc-par", "3 · Associate: Partnerships, Basketball Women", { role: "associate", dept: "par", teams: ["basketball-women"] }],
    ["assoc-it", "3 · Associate: IT", { role: "associate", dept: "it", teams: ["basketball-women"] }],
    ["captain", "4 · Captain: Basketball Men", { role: "captain", teams: ["basketball-men"] }],
    ["viewer", "Student Council (Eva Morta), view only", { role: "viewer" }],
    ["admin", "Admin (back to full access)", { role: "admin" }]
  ];
  function demoKey(u) { var k = ""; DEMO.forEach(function (d) { if (d[2] && d[2].role === u.role && d[2].dept === u.dept && (d[2].teams || []).join() === (u.teams || []).join()) k = d[0]; }); return k; }
  function demoBar(u) {
    var k = demoKey(u);
    return '<div class="banner demo"><b>Prototype demo</b><span>Viewing as <strong>' + esc(viewLabel(u)) + "</strong>" + (live() ? " (preview: the shared data, shown as that role would see it)" : " (example data)") + ".</span>" +
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
  // Captain pages of any team (My team, roster, tournament, handover, ideas, expenses). Only for admins and the
  // President / Vice-presidents (read and edit) and the Student Council / Eva Morta view-only account (read only).
  // Not for heads, associates or captains. Convex checks the same rules on every query and change.
  function teamEditor() { return !!admin || !!(captain && captain.scope && captain.scope.exec); }
  function opensAnyTeam() { return teamEditor() || !!(captain && captain.scope && captain.scope.viewer); }
  function onTeamPages(u) { return u.role === "captain" && (u.teams || []).length === 1 && (teamEditor() || (!!u.ro && opensAnyTeam())); }
  function teamBar(u) {
    if (!opensAnyTeam()) return "";
    var cur = onTeamPages(u) ? u.teams[0] : "", t = cur ? team(cur) : null;
    var sel = '<label class="demo-as">' + (t ? "Switch team" : "Open a team") + '<select id="team-as">' + (t ? "" : '<option value="" selected>Choose a team…</option>') +
      TEAMS.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? " selected" : "") + ">" + esc(tLabel(x)) + "</option>"; }).join("") + "</select></label>";
    return t
      ? '<div class="banner demo team-bar on"><b>Captain pages</b><span>You are on the captain pages of <strong>' + esc(tLabel(t)) + "</strong>, as its captain sees them. " + (u.ro ? "View only: you can read everything here." : "You can read and change everything here.") + "</span>" + sel + '<button type="button" class="btn sm" data-team-exit>Back to my view</button></div>'
      : '<div class="banner demo team-bar"><b>Captain pages</b><span>Open any team’s captain pages: My team, roster, tournament, handover, ideas and expenses.</span>' + sel + "</div>";
  }
  function setTeamView(id) {
    if (!opensAnyTeam()) return;
    if (id && !team(id)) return;
    state.user = id ? (teamEditor() ? { role: "captain", teams: [id] } : { role: "captain", teams: [id], ro: true }) : admin ? { role: "admin" } : teamEditor() ? { role: "exec" } : { role: "viewer" };
    state.teamOpen = null; save(); renderAcct();
    var h = location.hash.slice(1);
    if (h.indexOf("hub-") === 0 && h !== "hub-overview") render(); else go(id ? "hub-teams" : "hub-overview");
  }
  function viewAllowed(u) {
    if (!u || !HUB_ROLES[u.role]) return false;
    if (admin) return true;
    if (opensAnyTeam() && u.role === "captain" && (u.teams || []).length === 1 && team(u.teams[0]) && (teamEditor() || u.ro)) return true;
    return allowedViews().some(function (v) { return v.role === u.role && v.dept === u.dept && (v.teams || []).join() === (u.teams || []).join(); });
  }
  function totals(id) { var o = { paid: 0, pending: 0 }; allExp().forEach(function (e) { if (e.team !== id) return; if (e.status === "paid") o.paid += e.amount; else if (e.status !== "rejected") o.pending += e.amount; }); return o; }
  function captainForTeam(id) {
    if (live()) { var row = ((LIVE.people || {}).teams || []).filter(function (x) { return x.id === id; })[0], c = row && (row.captains.filter(function (x) { return !x.vice; })[0] || row.captains[0]); return c ? { first: c.name || c.email, last: "", email: c.email, team: id, role: "Captain", active: true } : null; }
    for (var i = 0; i < state.captains.length; i++) if (state.captains[i].team === id && state.captains[i].active && state.captains[i].role === "Captain") return state.captains[i]; return null; }
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
  // Results typed in the Hub: Convex when available (public on the team pages), else this browser (local preview).
  var PUBLIC_RESULTS = null;
  function teamResultsFor(id) {
    var rows = live() && LIVE.results ? LIVE.results : PUBLIC_RESULTS;
    if (!rows) return state.teamResults[id] || [];
    return rows.filter(function (r) { return r.team === id; }).map(function (r) { return { id: r._id, date: r.date, opponent: r.opponent, side: r.side, score: r.score || "", status: r.status, competition: r.competition || "", canRemove: !!r.canRemove }; });
  }
  function loadResults() {
    if (!backend || !backend.listResults) return;
    Promise.resolve(backend.listResults()).then(function (rows) { PUBLIC_RESULTS = rows || []; var h = location.hash.slice(1); if (h.indexOf("team-") === 0) render(); }, console.error);
  }
  function pill(map, k) { return '<span class="pill ' + map[k][0] + '">' + map[k][1] + "</span>"; }
  function stat(k, v, s) { return '<div class="stat"><p class="eyebrow">' + k + '</p><span class="v num">' + v + "</span><small>" + s + "</small></div>"; }
  var HUBV = [["hub-overview", "Overview"], ["hub-chat", "Chat"], ["hub-teams", "Teams"], ["hub-tournament", "Tournament"], ["hub-handover", "Team handover"], ["hub-contracts", "Contracts"], ["hub-team-editor", "Team editor"], ["hub-applications", "Sports applications"], ["hub-assoc-apps", "Association applications"], ["hub-messages", "Contact messages"], ["hub-captains", "Captains"], ["hub-people", "Add people"], ["hub-ideas", "Ideas & logistics"], ["hub-expenses", "Expenses ledger"], ["hub-partners", "Partnerships"], ["hub-departments", "Departments"], ["hub-goals", "Goals"], ["hub-history", "History"], ["hub-report", "Reports"]];

  function hubShell(view, inner) {
    var partnerBadge = ((LIVE.inbox || {}).inquiries || 0) + partnerDueCount(), taskBadge = hRO() ? 0 : newTaskCount();
    var pending = visExp().filter(canDecideE).length, newIdeas = can("ideas") ? visIdeas().filter(function (i) { return (i.status === "new" && canRunIdea(i)) || canApproveIdea(i) || canCommIdea(i); }).length : 0;
    var nav = HUBV.filter(function (v) { return (v[0] !== "hub-expenses" || can("expenses")) && (v[0] !== "hub-departments" || can("depts")) && (v[0] !== "hub-report" || can("reports")) && (v[0] !== "hub-captains" || can("captains")) && (v[0] !== "hub-team-editor" || can("teamEdit")) && (v[0] !== "hub-applications" || can("applications")) && (v[0] !== "hub-ideas" || can("ideas")) && (v[0] !== "hub-partners" || can("partners")) && (v[0] !== "hub-goals" || can("goals")) && ((v[0] !== "hub-messages" && v[0] !== "hub-assoc-apps") || can("board")) && (v[0] !== "hub-chat" || can("chat")) && (v[0] !== "hub-tournament" || can("tournament")) && (v[0] !== "hub-people" || can("people")); }).map(function (v) {
      return '<a href="#' + v[0] + '"' + (v[0] === view ? ' aria-current="page"' : "") + ">" + (v[0] === "hub-teams" && !can("all") ? "My team" : v[1]) + (v[0] === "hub-expenses" && pending ? '<span class="count num">' + pending + "</span>" : "") + (v[0] === "hub-overview" && unreadCount() ? '<span class="count num" title="New notifications">' + unreadCount() + "</span>" : "") + (v[0] === "hub-ideas" && newIdeas ? '<span class="count num">' + newIdeas + "</span>" : "") + (v[0] === "hub-applications" && tryoutCount() ? '<span class="count num">' + tryoutCount() + "</span>" : "") + (v[0] === "hub-chat" && chatUnread() ? '<span class="count num" title="Unread chat messages">' + chatUnread() + "</span>" : "") + (v[0] === "hub-messages" && newMsgCount() ? '<span class="count num" title="New messages">' + newMsgCount() + "</span>" : "") + (v[0] === "hub-assoc-apps" && newAppCount() ? '<span class="count num" title="New applications">' + newAppCount() + "</span>" : "") + (v[0] === "hub-partners" && partnerBadge ? '<span class="count num" title="New partner inquiries and follow-ups due this week">' + partnerBadge + "</span>" : "") + (v[0] === "hub-departments" && taskBadge ? '<span class="count num" title="New tasks assigned to you">' + taskBadge + "</span>" : "") + (v[0] === "hub-tournament" && tnBadge() ? '<span class="count num" title="Players without an answer">' + tnBadge() + "</span>" : "") + "</a>";
    }).join("") + adminNavLink();
    var u = state.user, me = admin || captain, multi = !!admin || allowedViews().length > 1;
    return '<div class="app"><aside class="rail"><div class="top"><a class="lock" href="#home" aria-label="Back to Esade Sports home">' + mono(38) + '<span>ESADE SPORTS<br>HUB</span></a><div class="history" aria-label="Page navigation"><button type="button" data-history="back" aria-label="Go back">' + ico("left") + '</button><button type="button" data-history="forward" aria-label="Go forward">' + ico("right") + '</button>' + (live() ? bellHtml() : "") + '</div>' +
      '<div class="who"><p class="eyebrow">Signed in' + (admin ? " as admin" : "") + '</p><strong>' + esc(me.email) + "</strong><small>Viewing as " + esc(viewLabel(u)) + (hRO() ? " · read-only" : "") + "</small>" + (multi ? '<a class="back-site" href="#signin">Change view</a>' : "") + (membersAreaUseful() ? '<a class="back-site" href="/admin">Requests &amp; applications</a>' : "") + '<a class="back-site" href="#home">← Public site</a><button type="button" data-signout>Sign out</button>' + langSwitch() + '</div></div>' +
      '<nav aria-label="Hub">' + nav + "</nav></aside>" +
      '<main class="main">' + teamBar(u) + (onTeamPages(u) ? activityPanel(u.teams[0]) : "") + (admin && !onTeamPages(u) ? demoBar(u) : admin || opensAnyTeam() || live() ? "" : '<div class="banner"><b>Prototype</b><span>Example figures and tasks, saved in this browser only.</span></div>') + inner + "</main></div>";
  }
  // Sidebar link to the /admin page (association applications, try-outs, messages, organisation, requests...).
  // Only for people who may open the Organisation tab there: admins, President and VPs. Follows "Demo as":
  // shown only while viewing as Admin or as President / Vice-president. /admin checks access again in Convex.
  function adminNavLink() {
    var u = state.user || {}, sc = (captain && captain.scope) || {}, real = !!admin || !!sc.exec;
    if (real && (u.role === "admin" || u.role === "exec")) return '<a href="/admin" class="nav-admin">Admin: applications &amp; requests</a>';
    return "";
  }
  // People responsible for a team in each department (captain view, team detail).
  function teamContacts(teamId) {
    return [["fin", "Finance"], ["med", "Media & Marketing"], ["ops", "Operations"], ["par", "Partnerships"]].map(function (d) {
      return [d[1], assocFor(d[0], teamId) || TBA, "Head: " + DEPT_PEOPLE[d[0]].head];
    });
  }
  function contactsPanel(teamId) {
    return '<section class="panel"><div class="panel-head"><h2>Who looks after your team</h2>' + (live() ? "" : '<span class="muted" style="font-size:12px">Example names</span>') + '</div><div class="people">' +
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
      visDepts().map(function (d) { var all = deptTasks(d), done = all.filter(function (t) { return t.status === "done"; }).length; return "<tr><td><strong>" + d.name + '</strong><br><small class="muted">' + d.head + '</small></td><td class="r num">' + done + " / " + all.length + ' <span class="muted">done</span></td></tr>'; }).join("") + "</tbody></table></section>";
  }
  // ---- Overview panels: department budgets, where the work stands, main links, Operations desk ---------
  function pair(a, b) { return a && b ? '<div class="grid-2">' + a + b + "</div>" : a || b; }
  function okUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  // Budgets: only Operations and Marketing spend a team's budget. Finance allocates it and approves or rejects requests.
  function budgetPanel() {
    var ts = visTeams(), tot = { ops: 0, med: 0, uo: 0, um: 0 };
    var rows = ts.map(function (t) {
      var b = budgetLines(t), u = lineUse(t.id); tot.ops += b.ops; tot.med += b.med; tot.uo += u.ops; tot.um += u.med;
      return '<tr><td class="tname">' + esc(tLabel(t)) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(b.ops) + '<small class="muted"> · ' + EUR.format(u.ops) + ' used</small></td><td class="r num">' + EUR.format(b.med) + '<small class="muted"> · ' + EUR.format(u.med) + " used</small></td></tr>";
    }).join("");
    return '<section class="panel budgets"><div class="panel-head"><h2>Department budgets' + (ts.length === 1 ? " · " + esc(tLabel(ts[0])) : "") + '</h2>' + (live() ? "" : '<span class="pill">Example split 70 / 30</span>') + '</div>' +
      '<p class="lead-note">Each team\'s budget is split between <b>Operations</b> and <b>Marketing</b>, the two departments that spend it. <b>Finance does not spend it.</b> Finance allocates the budgets and approves or rejects each request, once Esade\'s finance office has accepted it.</p>' +
      '<div class="grid-4 b-lines">' + stat("Team budgets", EUR.format(tot.ops + tot.med), ts.length + " team" + (ts.length === 1 ? "" : "s") + " · allocated by Finance") + stat("Operations", EUR.format(tot.ops), EUR.format(tot.uo) + " used · kit, facilities, travel") + stat("Marketing", EUR.format(tot.med), EUR.format(tot.um) + " used · media, promotion, events") +
        stat("Waiting for a decision", EUR.format(visExp().filter(function (e) { return e.status === "requested" && ts.some(function (t) { return t.id === e.team; }); }).reduce(function (n, e) { return n + e.amount; }, 0)), "Esade, then Finance") + "</div>" +
      (ts.length > 1 ? '<details class="b-teams"><summary>Split for each team</summary><div class="table-wrap"><table class="budget-t"><thead><tr><th>Team</th><th class="r">Total</th><th class="r">Operations</th><th class="r">Marketing</th></tr></thead><tbody>' + rows + "</tbody></table></div></details>" : "") + "</section>";
  }
  // Task updates the person may see (the server already filters; this also covers the admin's "Demo as" views).
  function visUpdates() {
    var u = hv(), rows = live() ? (LIVE.tupd || []) : (state.tupd || []);
    return rows.filter(function (r) { return hFull() || r.dept === deptName(u.dept) || (r.dept === "Board" && u.role === "head"); });
  }
  function taskIndex() { var m = {}; DEPTS.forEach(function (d) { deptTasks(d).forEach(function (t) { m[t.key] = { title: t.title, dept: d.id, status: t.status, owner: t.owner }; }); }); return m; }
  function workPanel() {
    if (!can("depts")) return "";
    var m = taskIndex(), ups = visUpdates().slice().sort(function (a, b) { return b.at - a.at; }).slice(0, 6), d = hv().dept;
    return '<section class="panel"><div class="panel-head"><h2>Where the work stands</h2><a class="btn sm" href="#hub-departments" data-dept-open="' + (d || "") + '">Post an update</a></div>' +
      (ups.length ? '<ul class="work-feed">' + ups.map(function (r) {
        var t = m[r.taskKey];
        return '<li><div class="tu-head"><span class="pill ' + (r.kind === "summary" ? "info" : "") + '">' + (r.kind === "summary" ? "Work summary" : "Comment") + "</span><b>" + esc(r.by) + '</b><small class="muted">' + esc(fmtWhen(r.at)) + "</small></div><p><strong>" + esc(t ? t.title : "Task") + "</strong>" + (r.text ? " · " + esc(r.text.length > 160 ? r.text.slice(0, 157) + "…" : r.text) : "") + "</p></li>";
      }).join("") + "</ul>" : '<p class="empty">No work summaries yet. Open a task in your department and write where you are: what is done, what is next, what you need.</p>') + "</section>";
  }
  // Main links per department. IT gets the real tools behind the website; the rest are added by each head.
  var DEFAULT_LINKS = {
    it: [["Website code (GitHub)", "https://github.com/quentmgrn-star/esports", "Every change to the site starts here"],
      ["How to change the website", "https://github.com/quentmgrn-star/esports#readme", "README: run it, edit it, publish it"],
      ["Hosting (Vercel)", "https://vercel.com/dashboard", "Deployments and logs"],
      ["Database (Convex)", "https://dashboard.convex.dev", "Data, environment variables, functions"]]
  };
  var LINK_HINTS = { ops: ["Court booking website", "Current league website"], med: ["Instagram account", "Media shared folder"], par: ["Sponsor pipeline", "Partnership deck"], fin: ["Budget sheet", "Esade finance office contact"] };
  function canLinks(id) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "head" && u.dept === id)); }
  function savedLinks(id) {
    var n = deptName(id);
    if (live()) return (LIVE.links || []).filter(function (r) { return r.dept === n; }).map(function (r) { return { id: r._id, title: r.title, url: r.url, note: r.note }; });
    return (state.links || []).filter(function (r) { return r.dept === n; });
  }
  function linksPanel() {
    var u = hv(); if (!can("depts")) return "";
    var ids = hFull() || !u.dept || u.dept === "board" ? ["ops", "it", "med", "par", "fin"] : [u.dept], cur = ids.indexOf(state.linksDept) > -1 ? state.linksDept : ids[0];
    var auto = (DEFAULT_LINKS[cur] || []).map(function (l) { return { title: l[0], url: l[1], note: l[2] }; });
    if (cur === "ops") visTeams().forEach(function (t) { var i = teamInfoFor(t.id); if (okUrl(i.leagueUrl)) auto.push({ title: "League page · " + tLabel(t), url: i.leagueUrl, note: i.league || "Saved by the captain in Team editor" }); });
    var saved = savedLinks(cur), edit = canLinks(cur), have = auto.concat(saved).map(function (l) { return l.title.toLowerCase(); }).join("|");
    var todo = (LINK_HINTS[cur] || []).filter(function (h) { return have.indexOf(h.toLowerCase().split(" ")[0]) < 0; });
    function li(l, del) { return '<li><a href="' + esc(okUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.title) + " " + ico("out") + "</a>" + (l.note ? '<small class="muted">' + esc(l.note) + "</small>" : "") + (del ? '<button type="button" class="btn sm ghost" data-link-del="' + esc(String(l.id)) + '" aria-label="Remove ' + esc(l.title) + '">' + ico("x") + "</button>" : "") + "</li>"; }
    return '<section class="panel links-panel"><div class="panel-head"><h2>Main links' + (ids.length === 1 ? " · " + esc(deptName(cur)) : "") + "</h2></div>" +
      (ids.length > 1 ? '<div class="chips" role="group" aria-label="Department">' + ids.map(function (id) { return '<button class="chip" data-links-dept="' + id + '" aria-pressed="' + (id === cur) + '">' + esc(id === "med" ? "Marketing" : deptName(id)) + "</button>"; }).join("") + "</div>" : "") +
      (cur === "it" ? '<p class="lead-note">To change the website: edit the code on GitHub (branch <b>main</b>). Vercel publishes it in a few minutes and updates the Convex database at the same time.</p>' : "") +
      '<ul class="link-list">' + auto.map(function (l) { return li(l, false); }).join("") + saved.map(function (l) { return li(l, edit); }).join("") +
      todo.map(function (h) { return '<li class="ph"><span>' + esc(h) + '</span><small class="muted">Not added yet' + (edit ? "" : ": ask the head of the department") + "</small></li>"; }).join("") + "</ul>" +
      (edit ? '<form class="link-form" id="link-form" data-dept="' + cur + '"><input name="title" maxlength="80" placeholder="Name, e.g. ' + esc(todo[0] || "Shared folder") + '" aria-label="Link name" required><input name="url" inputmode="url" placeholder="https://…" aria-label="Address" required><input name="note" maxlength="200" placeholder="Note (optional)" aria-label="Note"><button class="btn sm solid" type="submit">Add link</button></form>' : "") + "</section>";
  }
  // Head of Operations (and Operations associates): what to organise, team by team.
  function opsDesk() {
    var u = hv(); if (u.dept !== "ops" || (u.role !== "head" && u.role !== "associate")) return "";
    var ideas = visIdeas(), ts = visTeams();
    var todo = ideas.filter(function (i) { return i.status === "new" || i.status === "researching"; }), wait = ideas.filter(function (i) { return i.status === "awaiting"; }), go = ideas.filter(function (i) { return i.status === "approved" || i.status === "communicated" || i.status === "planned"; });
    var left = 0; ts.forEach(function (t) { left += budgetLines(t).ops - lineUse(t.id).ops; });
    function row(i) { return '<li><span><strong>' + esc(i.kind) + '</strong> · ' + esc(tLabel(team(i.team)) || i.team) + '<small class="muted">' + esc(i.text.length > 110 ? i.text.slice(0, 107) + "…" : i.text) + "</small></span>" + pill(IDEA_STATUS, i.status) + "</li>"; }
    var d = null; DEPTS.forEach(function (x) { if (x.id === "ops") d = x; });
    var people = {}; deptTasks(d).forEach(function (t) { var k = t.owner || "Unassigned"; people[k] = people[k] || { open: 0, done: 0, last: 0 }; people[k][t.status === "done" ? "done" : "open"]++; taskUpdatesFor(t.key).forEach(function (x) { if (x.at > people[k].last) people[k].last = x.at; }); });
    return '<div class="grid-4">' + stat("Ideas to research", String(todo.length), "new or being researched") + stat("With the captains", String(wait.length), "waiting for their approval") + stat("To organise", String(go.length), "approved by the captain") + stat("Operations budget left", EUR.format(left), ts.length + " team" + (ts.length === 1 ? "" : "s")) + "</div>" +
      '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>To organise</h2><a class="btn sm" href="#hub-ideas">Ideas &amp; logistics</a></div>' + (go.length ? '<ul class="tasks">' + go.slice(0, 6).map(row).join("") + "</ul>" : '<p class="empty">Nothing approved yet. Friendlies, tournaments and kit the captains approve appear here.</p>') +
      (todo.length ? '<h3 class="sub-h">Ideas to research</h3><ul class="tasks">' + todo.slice(0, 5).map(row).join("") + "</ul>" : "") + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Tasks by person</h2><a class="btn sm" href="#hub-departments" data-dept-open="ops">Open department</a></div><table><thead><tr><th>Person</th><th class="r">Open</th><th class="r">Done</th><th class="r">Last update</th></tr></thead><tbody>' +
      Object.keys(people).map(function (k) { var p = people[k]; return "<tr><td><strong>" + esc(k) + '</strong></td><td class="r num">' + p.open + '</td><td class="r num">' + p.done + '</td><td class="r muted">' + (p.last ? esc(fmtDay(p.last)) : "None yet") + "</td></tr>"; }).join("") + "</tbody></table></section></div>" +
      '<section class="panel"><div class="panel-head"><h2>Team logistics</h2><a class="btn sm" href="#hub-teams">Teams</a></div><div class="table-wrap"><table><thead><tr><th>Team</th><th>Training facility</th><th>League</th><th class="r">Open ideas</th><th class="r">Operations budget left</th></tr></thead><tbody>' +
      ts.map(function (t) {
        var i = teamInfoFor(t.id), n = ideas.filter(function (x) { return x.team === t.id && ["new", "researching", "awaiting", "approved"].indexOf(x.status) > -1; }).length, l = budgetLines(t).ops - lineUse(t.id).ops;
        return '<tr><td class="tname">' + esc(tLabel(t)) + "</td><td>" + (i.venue ? esc(i.venue) : '<span class="muted">Not set</span>') + "</td><td>" + (i.league ? (okUrl(i.leagueUrl) ? '<a href="' + esc(i.leagueUrl) + '" target="_blank" rel="noopener">' + esc(i.league) + " " + ico("out") + "</a>" : esc(i.league)) : '<span class="muted">Not set</span>') + '</td><td class="r num">' + n + '</td><td class="r num">' + EUR.format(l) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
  }
  // ---- History: what has been done so far (finished tasks with their summaries, and each team's results) ----
  function hubHistory() {
    var depts = can("depts") ? visDepts() : [], ts = visTeams(), fd = state.histDept || "all", ft = state.histTeam || "all";
    if (fd !== "all" && !depts.some(function (d) { return d.id === fd; })) fd = "all";
    if (ft !== "all" && !ts.some(function (t) { return t.id === ft; })) ft = "all";
    var done = []; depts.forEach(function (d) { if (fd !== "all" && fd !== d.id) return; deptTasks(d).forEach(function (t) { if (t.status === "done") done.push({ t: t, d: d }); }); });
    var items = [];
    visIdeas().forEach(function (i) { if ((ft === "all" || i.team === ft) && ["approved", "communicated", "planned"].indexOf(i.status) > -1) items.push({ at: i.updatedAt || i.at, team: i.team, what: i.kind + ": " + i.text, tag: pill(IDEA_STATUS, i.status) }); });
    visExp().forEach(function (e) { if ((ft === "all" || e.team === ft) && (e.status === "paid" || e.status === "validated")) items.push({ at: Date.parse(e.date + "T12:00:00Z"), team: e.team, what: e.item + " · " + EUR.format(e.amount), tag: pill(EXP_STATUS, e.status) }); });
    items.sort(function (a, b) { return b.at - a.at; });
    return '<div class="ph-head"><div><h1 class="display">History.</h1><p>What has been done so far: finished tasks with their work summaries, what each team got (approved ideas, communications and paid expenses), and each team\'s photos and videos.</p></div></div>' +
      '<section class="panel hist-filters"><div class="form">' + (depts.length > 1 ? '<label for="hi-dept">Department<select id="hi-dept"><option value="all">All departments</option>' + depts.map(function (d) { return '<option value="' + d.id + '"' + (fd === d.id ? " selected" : "") + ">" + esc(d.name) + "</option>"; }).join("") + "</select></label>" : "") +
      (ts.length > 1 ? '<label for="hi-team">Team<select id="hi-team"><option value="all">All teams</option>' + ts.map(function (t) { return '<option value="' + t.id + '"' + (ft === t.id ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") + "</div></section>" +
      (depts.length ? '<section class="panel"><div class="panel-head"><h2>Finished tasks</h2><span class="muted" style="font-size:12px">' + done.length + " done</span></div>" + (done.length ? '<ul class="tasks">' + done.map(function (x) { return taskRow(x.t, x.d.id).replace("<li>", '<li><small class="muted dept-tag">' + esc(x.d.name) + "</small>"); }).join("") + "</ul>" : '<p class="empty">No task marked done yet.</p>') + "</section>" : "") +
      '<section class="panel"><div class="panel-head"><h2>Done for the teams</h2><span class="muted" style="font-size:12px">' + items.length + " item" + (items.length === 1 ? "" : "s") + "</span></div>" +
      (items.length ? '<div class="table-wrap"><table><thead><tr><th>Date</th>' + (ts.length > 1 ? "<th>Team</th>" : "") + "<th>What</th><th>Status</th></tr></thead><tbody>" + items.map(function (x) { return '<tr><td class="num muted">' + esc(fmtDay(x.at)) + "</td>" + (ts.length > 1 ? '<td class="tname">' + esc(tLabel(team(x.team)) || x.team) + "</td>" : "") + "<td>" + esc(x.what.length > 160 ? x.what.slice(0, 157) + "…" : x.what) + "</td><td>" + x.tag + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="empty">Nothing yet for this selection.</p>') + "</section>" + mediaPanel(ft);
  }
  // ---- Esade acceptance on an expense request ----------------------------------------------------
  var ESADE_FIN_EMAIL = ""; // Esade finance office address: fill in when known; the email opens in the person's own mail app
  function esadeMail(e) {
    var lines = ["Hello,", "", "Esade Sports asks for approval of the following expense:", "", "Team: " + (tLabel(team(e.team)) || e.team), "Budget line: " + e.dept, "What: " + e.item + " (" + e.cat + ")", "Amount: " + EUR.format(e.amount), "Requested by: " + e.by + ", " + e.date];
    filesOf(e).forEach(function (x) { lines.push("Invoice / PDF: " + (/^https:/.test(x.data) ? x.data : x.name + " (attached)")); });
    if (e.link) lines.push("Link: " + e.link);
    lines.push("", "Thank you,", myName(), "Esade Sports · Finance");
    return "mailto:" + ESADE_FIN_EMAIL + "?subject=" + encodeURIComponent("Expense approval: " + e.item + " (" + EUR.format(e.amount) + ")") + "&body=" + encodeURIComponent(lines.join("\n"));
  }
  function esadeLine(e) {
    var s = e.esade, when = e.esadeAt ? " · " + fmtDay(e.esadeAt) : "";
    if (s === "accepted") return '<br><small class="esade ok">Accepted by Esade' + esc(when) + "</small>";
    if (s === "refused") return '<br><small class="esade bad">Refused by Esade' + esc(when) + "</small>" + (e.esadeNote ? '<br><small class="reason">“' + esc(e.esadeNote) + "”</small>" : "");
    if (s === "sent") return '<br><small class="esade">Sent to Esade finance' + esc(when) + ", waiting</small>";
    return e.status === "requested" ? '<br><small class="esade">Not sent to Esade yet</small>' : "";
  }
  function canEsadeE(e) { return e.status === "requested" && canDecideE(e) && srv(e, "e"); }
  function esadeBox(e) {
    var id = String(e.id), s = e.esade, b = "";
    if (state.esadeRefusing === id) return '<div class="reject-box"><textarea id="er-' + id + '" rows="2" placeholder="What did Esade say? (required)" aria-label="Esade\'s answer"></textarea><div><button class="btn sm solid" data-esade-confirm="' + id + '">Save</button> <button class="btn sm" data-reject-cancel>Cancel</button></div></div>';
    var inv = filesOf(e).map(function (x, i, all) { return '<a class="btn sm ghost" href="' + esc(x.data) + '" target="_blank" rel="noopener" download="' + esc(x.name) + '" title="' + esc(x.name) + '">' + ico("down") + (all.length > 1 ? " File " + (i + 1) : " Invoice") + "</a>"; }).join("");
    if (!s) b = '<a class="btn sm" href="' + esc(esadeMail(e)) + '">Email to Esade</a>' + inv + '<button class="btn sm" data-esade="sent" data-id="' + id + '">Mark sent</button>';
    else if (s === "sent") b = '<a class="btn sm ghost" href="' + esc(esadeMail(e)) + '">Email again</a><button class="btn sm" data-esade="accepted" data-id="' + id + '">Esade accepted</button><button class="btn sm" data-esade="refused" data-id="' + id + '">Esade refused</button>';
    else if (s === "refused") b = '<button class="btn sm ghost" data-esade="accepted" data-id="' + id + '">Esade accepted after all</button>';
    return b ? '<div class="esade-box">' + b + "</div>" : "";
  }
  // ---- Waiting for you / My week (overview) ----------------------------------------------------
  // Everything this person should act on, with a link to where it is done. Counts follow the same rules as each page.
  function pl(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function todayYmd(off) { return madridYmd(off); }
  function myOpenTasks() {
    if (!live()) return [];
    var out = []; DEPTS.forEach(function (d) { deptTasks(d).forEach(function (t) { if (t.mine && t.status !== "done") out.push({ t: t, d: d }); }); });
    return out;
  }
  // Everything waiting for the signed-in person, as { n, text, href }: shown in "Waiting for you" and in the bell.
  // Each count follows the same access rules as the page it links to (associates: their department and teams).
  function waitingItems() {
    if (hRO()) return [];
    var u = hv(), ib = live() ? LIVE.inbox || {} : {}, items = [];
    function add(n, text, href) { if (n) items.push({ n: n, text: text, href: href }); }
    var exD = visExp().filter(canDecideE).length, exP = visExp().filter(canPayE).length;
    var ideas = can("ideas") ? visIdeas().filter(function (i) { return (i.status === "new" && canRunIdea(i)) || canApproveIdea(i) || canCommIdea(i); }).length : 0;
    add(exD, exD === 1 ? "expense request to decide" : "expense requests to decide", "#hub-expenses");
    add(exP, exP === 1 ? "validated expense to pay" : "validated expenses to pay", "#hub-expenses");
    add(ideas, ideas === 1 ? "captain idea waiting for you" : "captain ideas waiting for you", "#hub-ideas");
    var approver = u.role === "admin" || u.role === "exec" || u.role === "head";
    if (approver) add(ib.requests, ib.requests === 1 ? "access request to approve (associate or captain)" : "access requests to approve (associates or captains)", "/admin");
    if (approver) add(ib.applications, ib.applications === 1 ? "new application to join your department" : "new applications to join your department", "#hub-assoc-apps");
    if (approver) add(ib.messages, ib.messages === 1 ? "new message from the website" : "new messages from the website", "#hub-messages");
    // Only for people who can open Sports applications (Operations, captains, Board), counted for the current view.
    if (can("applications")) { var tc = tryoutCount(); add(tc, tc === 1 ? "new try-out or coach sign-up" : "new try-out or coach sign-ups", "#hub-applications"); }
    if (can("partners")) {
      var soon = partnerDueCount();
      add(ib.inquiries, ib.inquiries === 1 ? "new partner inquiry from the website" : "new partner inquiries from the website", "#hub-partners");
      add(soon, soon === 1 ? "partner follow-up due this week" : "partner follow-ups due this week", "#hub-partners");
    }
    if (u.role === "head" && live()) { var d0 = DEPTS.filter(function (d) { return d.id === u.dept; })[0], un = d0 ? deptTasks(d0).filter(function (t) { return t.status !== "done" && !t.owner; }).length : 0; add(un, un === 1 ? "open task with nobody assigned" : "open tasks with nobody assigned", "#hub-departments"); }
    return items;
  }
  // Tasks assigned to me that I have not started yet (they leave the count once set to "In progress").
  function newTaskCount() { return myOpenTasks().filter(function (x) { return x.t.status === "todo"; }).length; }
  function partnerDueCount() {
    if (!can("partners") || !live()) return 0;
    var u = hv(), me = meEmail();
    return ((LIVE.partners || {}).partners || []).filter(function (p) { return p.nextDate && p.nextDate <= todayYmd(7) && p.stage !== "signed" && p.stage !== "lost" && (u.role !== "associate" || p.ownerEmail === me || !p.ownerEmail); }).length;
  }
  // The bell in the Hub: unread chat, new notifications, new tasks for me, then everything in waitingItems().
  var bellOpen = false, BASE_TITLE = document.title || "Esade Sports";
  function bellItems() {
    var out = [], c = chatUnread(), nt = unreadCount(), tk = hRO() ? 0 : newTaskCount();
    if (c) out.push({ n: c, text: c === 1 ? "unread chat message" : "unread chat messages", href: "#hub-chat" });
    if (nt) out.push({ n: nt, text: nt === 1 ? "new notification" : "new notifications", href: "#hub-overview" });
    if (tk) out.push({ n: tk, text: tk === 1 ? "new task assigned to you" : "new tasks assigned to you", href: can("depts") ? "#hub-departments" : "#hub-overview" });
    return out.concat(waitingItems());
  }
  function bellTotal(items) { return (items || bellItems()).reduce(function (n, x) { return n + x.n; }, 0); }
  function bellMenu(items) {
    return '<div class="bell-menu" id="bell-menu"' + (bellOpen ? "" : " hidden") + '><h2>Waiting for you</h2>' +
      (items.length ? "<ul>" + items.map(function (x) { return '<li><a href="' + esc(x.href) + '" data-bell-go><b class="num">' + x.n + "</b><span>" + esc(x.text) + "</span>" + ico("right") + "</a></li>"; }).join("") + "</ul>" : '<p class="empty">You are all caught up.</p>') + "</div>";
  }
  function bellHtml() {
    var items = bellItems(), n = bellTotal(items);
    return '<span class="bell-wrap"><button type="button" class="bell" data-bell aria-haspopup="true" aria-expanded="' + bellOpen + '" aria-controls="bell-menu" aria-label="Notifications' + (n ? ", " + n + " waiting" : "") + '">' + ico("bell") + (n ? '<span class="bell-n num">' + (n > 99 ? "99+" : n) + "</span>" : "") + "</button>" + bellMenu(items) + "</span>";
  }
  // Browser tab title "(3) Esade Sports Hub" and the bell, updated in place (also while someone is typing).
  function updateTitle() {
    var n = 0; try { if ((admin || captain) && live()) n = bellTotal(); } catch (e) {}
    document.title = (n ? "(" + n + ") " : "") + (location.hash.indexOf("#hub-") === 0 ? "Esade Sports Hub" : BASE_TITLE);
  }
  function bellPatch() {
    updateTitle();
    var w = hub.querySelector(".bell-wrap"); if (!w) return;
    var tmp = document.createElement("div"); tmp.innerHTML = bellHtml(); w.replaceWith(tmp.firstChild); bindBell();
  }
  // On desktop the menu is position: fixed (the side menu scrolls and would cut it off), so place it under the bell.
  function placeBell(b) {
    var m = $("bell-menu"); if (!m || !b) return;
    if (window.matchMedia("(min-width: 861px)").matches) { var r = b.getBoundingClientRect(); m.style.top = Math.round(r.bottom + 8) + "px"; m.style.left = Math.round(Math.max(8, r.left)) + "px"; }
    else { m.style.top = ""; m.style.left = ""; }
  }
  function bindBell() {
    var b = hub.querySelector("[data-bell]"); if (!b) return;
    if (bellOpen) placeBell(b);
    b.addEventListener("click", function (e) { e.stopPropagation(); bellOpen = !bellOpen; var m = $("bell-menu"); if (bellOpen) placeBell(b); if (m) m.hidden = !bellOpen; b.setAttribute("aria-expanded", String(bellOpen)); if (bellOpen) { var f = m && m.querySelector("a"); if (f) f.focus(); } });
    hub.querySelectorAll("[data-bell-go]").forEach(function (a) { a.addEventListener("click", function () { bellOpen = false; var m = $("bell-menu"); if (m) m.hidden = true; b.setAttribute("aria-expanded", "false"); }); });
  }
  document.addEventListener("click", function (e) { if (bellOpen && !(e.target.closest && e.target.closest(".bell-wrap"))) { bellOpen = false; var m = $("bell-menu"); if (m) m.hidden = true; var b = hub.querySelector("[data-bell]"); if (b) b.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && bellOpen) { bellOpen = false; var m = $("bell-menu"); if (m) m.hidden = true; var b = hub.querySelector("[data-bell]"); if (b) { b.setAttribute("aria-expanded", "false"); b.focus(); } } });
  function todoPanel() {
    if (hRO()) return "";
    var u = hv(), items = waitingItems().map(function (x) { return '<li><a href="' + x.href + '"><b class="num">' + x.n + "</b><span>" + x.text + "</span>" + ico("right") + "</a></li>"; });
    var mine = myOpenTasks(), assoc = u.role === "associate";
    var title = assoc ? "My week" : u.role === "head" ? "Needs your approval" : "Waiting for you";
    var sub = assoc ? '<p class="muted" style="margin:0 0 8px;font-size:13px">Your teams: ' + esc(teamsText(u.teams) || "none yet") + " · " + esc(deptName(u.dept)) + "</p>" : "";
    var tasks = mine.length ? '<h3 class="sub-h">My tasks</h3><ul class="tasks">' + mine.slice(0, 6).map(function (x) { return taskRowBase(x.t, x.d.id).replace("<li>", '<li><small class="muted dept-tag">' + esc(x.d.name) + "</small>"); }).join("") + "</ul>" : "";
    return '<section class="panel todo"><div class="panel-head"><h2>' + title + "</h2>" + (items.length ? '<span class="pill warn">' + pl(items.length, "thing", "things") + " to do</span>" : '<span class="pill ok">All clear</span>') + "</div>" + sub +
      (items.length ? '<ul class="todo-list">' + items.join("") + "</ul>" : '<p class="empty">Nothing is waiting for you right now.</p>') + tasks + "</section>";
  }

  // ---- Partnerships tracker (sponsors and partners, from first contact to signed) ---------------
  var P_STAGE = { lead: ["", "Lead"], contacted: ["info", "Contacted"], meeting: ["info", "Meeting"], proposal: ["warn", "Proposal sent"], signed: ["ok", "Signed"], lost: ["bad", "Lost"] };
  var INQ_STATUS = { "new": "New", contacted: "Contacted", added: "Added to tracker", closed: "Closed" };
  var INTEREST_KIND = { "Team sponsor": "Cash sponsor", "Event partner": "Event partner", "Industry Platform partner": "Industry Platform" };
  function openStage(st) { return st !== "signed" && st !== "lost"; }
  function partnerArgs(p, over) {
    var o = {}, src = Object.assign({}, p, over || {});
    ["company", "contactName", "contactEmail", "team", "kind", "stage", "value", "nextStep", "nextDate", "notes", "ownerEmail", "ownerName"].forEach(function (k) { var v = src[k]; if (v !== undefined && v !== null && v !== "") o[k] = v; });
    return o;
  }
  function partnerForm(d, p) {
    var ts = can("all") ? TEAMS : visTeams(), ppl = deptMembers("par"), x = p || {};
    function opt(v, l, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(l) + "</option>"; }
    return '<form class="form" id="partner-edit" data-id="' + esc(x._id || "") + '" data-inq="' + esc(x.inquiryId || "") + '"><p class="form-sub">' + (x._id ? "Edit " + esc(x.company) : "Add a partner") + "</p>" +
      '<label>Company<input name="company" required maxlength="120" value="' + esc(x.company || "") + '"></label>' +
      '<label>Kind<select name="kind">' + d.kinds.map(function (k) { return opt(k, k, x.kind || d.kinds[0]); }).join("") + "</select></label>" +
      '<label>For<select name="team">' + opt("", "The whole association", x.team || "") + ts.map(function (t) { return opt(t.id, tLabel(t), x.team || ""); }).join("") + "</select></label>" +
      '<label>Stage<select name="stage">' + Object.keys(P_STAGE).map(function (k) { return opt(k, P_STAGE[k][1], x.stage || "lead"); }).join("") + "</select></label>" +
      '<label>Contact name<input name="contactName" maxlength="100" value="' + esc(x.contactName || "") + '"></label>' +
      '<label>Contact email<input name="contactEmail" type="email" maxlength="200" value="' + esc(x.contactEmail || "") + '"></label>' +
      '<label>Value (€, optional)<input name="value" type="number" min="0" step="50" value="' + (x.value != null ? x.value : "") + '" placeholder="Cash or value of kit"></label>' +
      '<label>Who follows it<select name="owner">' + opt("", "Nobody yet", "") + ppl.map(function (n) { return opt(n[1] + "|" + n[0], n[0], (x.ownerEmail || "") + "|" + (x.ownerName || "")); }).join("") + "</select></label>" +
      '<label style="grid-column:span 2">Next step<input name="nextStep" maxlength="200" value="' + esc(x.nextStep || "") + '" placeholder="e.g. Send the sponsorship deck"></label>' +
      '<label>Next step date<input name="nextDate" type="date" value="' + esc(x.nextDate || "") + '"></label>' +
      '<label style="grid-column:1/-1">Notes<input name="notes" maxlength="2000" value="' + esc(x.notes || "") + '" placeholder="What was agreed, what they want in return"></label>' +
      '<div><button class="btn solid" type="submit">' + (x._id ? "Save" : "Add partner") + '</button> <button class="btn" type="button" data-p-cancel>Cancel</button></div></form>';
  }
  function hubPartners() {
    var head = '<div class="ph-head"><div><h1 class="display">Partnerships.</h1><p>Every sponsor and partner, from first contact to signed: who follows it, the next step and what it is worth. Partner messages from the website arrive here too.</p></div></div>';
    if (!live()) return head + '<section class="panel"><p class="empty">The tracker works once you are signed in (shared database).</p></section>';
    var d = LIVE.partners;
    if (d === undefined) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    if (!d) return head + '<section class="panel"><p class="empty">The tracker is for the Partnerships department and the Board.</p></section>';
    head += mailWarnPanel(["partner"]);
    var all = d.partners.filter(function (p) { return !p.team || teamOk(p.team); }), f = state.pFilter || "open", ft = state.pTeam || "all";
    var open = all.filter(function (p) { return openStage(p.stage); }), signed = all.filter(function (p) { return p.stage === "signed"; });
    var sum = function (arr) { return arr.reduce(function (n, p) { return n + (p.value || 0); }, 0); };
    var rows = all.filter(function (p) { return (f === "all" || (f === "open" ? openStage(p.stage) : p.stage === f)) && (ft === "all" || (ft === "assoc" ? !p.team : p.team === ft)); });
    var edit = !hRO() && d.canAdd, today = todayYmd(0);
    var editing = state.pEdit === "new" ? state.pPrefill || {} : state.pEdit ? all.filter(function (p) { return p._id === state.pEdit; })[0] : null;
    var table = rows.length ? '<div class="table-wrap"><table><thead><tr><th>Partner</th><th>For</th><th>Stage</th><th class="r">Value</th><th>Next step</th><th>Who</th><th></th></tr></thead><tbody>' + rows.map(function (p) {
      var late = p.nextDate && p.nextDate < today && openStage(p.stage);
      return '<tr><td><strong>' + esc(p.company) + '</strong><br><small class="muted">' + esc(p.kind) + (p.contactName || p.contactEmail ? " · " + esc(p.contactName || "") + (p.contactEmail ? ' <a href="mailto:' + esc(p.contactEmail) + '">' + esc(p.contactEmail) + "</a>" : "") : "") + "</small>" + (p.notes ? '<br><small class="muted">' + esc(p.notes.length > 120 ? p.notes.slice(0, 117) + "…" : p.notes) + "</small>" : "") + "</td>" +
        '<td class="tname">' + esc(p.team && team(p.team) ? tLabel(team(p.team)) : "Association") + "</td>" +
        "<td>" + (p.canEdit && !hRO() ? '<select data-pstage="' + esc(p._id) + '" aria-label="Stage of ' + esc(p.company) + '">' + Object.keys(P_STAGE).map(function (k) { return '<option value="' + k + '"' + (k === p.stage ? " selected" : "") + ">" + P_STAGE[k][1] + "</option>"; }).join("") + "</select>" : pill(P_STAGE, p.stage)) + "</td>" +
        '<td class="r num">' + (p.value != null ? EUR.format(p.value) : '<span class="muted">–</span>') + "</td>" +
        "<td>" + (p.nextStep ? esc(p.nextStep) : '<span class="muted">None</span>') + (p.nextDate ? '<br><small class="' + (late ? "esade bad" : "muted") + '">' + (late ? "Late · " : "") + esc(p.nextDate) + "</small>" : "") + "</td>" +
        "<td>" + esc(p.ownerName || "Nobody yet") + "</td>" +
        '<td class="r">' + (p.canEdit && !hRO() ? '<button type="button" class="btn sm" data-p-edit="' + esc(p._id) + '">Edit</button>' : "") + (p.canRemove && !hRO() ? ' <button type="button" class="btn sm ghost" data-p-del="' + esc(p._id) + '" aria-label="Remove ' + esc(p.company) + '">' + ico("x") + "</button>" : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<p class="empty">' + (all.length ? "No partner in this selection." : "No partners yet. Add the first company you are talking to: even a lead counts.") + "</p>";
    var tsel = can("all") ? TEAMS : visTeams();
    var inq = d.inquiries || [], newInq = inq.filter(function (i) { return i.status === "new"; }).length;
    return head + '<div class="grid-4">' + stat("In progress", String(open.length), EUR.format(sum(open)) + " in discussion") + stat("Signed", String(signed.length), EUR.format(sum(signed)) + " signed value") +
      stat("Follow-ups late", String(open.filter(function (p) { return p.nextDate && p.nextDate < today; }).length), "next step date passed") + stat("Website inquiries", String(newInq), "new, to answer") + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Partners</h2>' + (edit && !editing ? '<button type="button" class="btn sm solid" data-p-new>Add a partner</button>' : "") + "</div>" +
      (editing ? partnerForm(d, editing) : "") +
      '<div class="chips" role="group" aria-label="Stage">' + [["open", "In progress"], ["signed", "Signed"], ["lost", "Lost"], ["all", "All"]].map(function (x) { return '<button class="chip" data-pf="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + "</button>"; }).join("") +
      (tsel.length > 1 ? '<select id="p-team-f" aria-label="Team" style="margin-left:auto"><option value="all">Every team and the association</option><option value="assoc"' + (ft === "assoc" ? " selected" : "") + ">The whole association</option>" + tsel.map(function (t) { return '<option value="' + t.id + '"' + (ft === t.id ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select>" : "") + "</div>" + table + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Messages from the website</h2><span class="muted" style="font-size:12px">Partner form on the home page</span></div>' +
      (inq.length ? '<div class="table-wrap"><table><thead><tr><th>Company</th><th>Interested in</th><th>Message</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>' + inq.map(function (i) {
        return "<tr><td><strong>" + esc(i.company) + "</strong><br><small>" + esc(i.name) + ' · <a href="mailto:' + esc(i.email) + '">' + esc(i.email) + "</a></small></td><td>" + esc(i.interest) + '</td><td><small class="muted">' + esc(i.message ? (i.message.length > 160 ? i.message.slice(0, 157) + "…" : i.message) : "No message") + '</small></td><td class="num muted">' + esc(fmtDay(i._creationTime)) + "</td>" +
          "<td>" + (d.canInquiry && !hRO() ? '<select data-inq="' + esc(i._id) + '" aria-label="Status">' + Object.keys(INQ_STATUS).map(function (k) { return '<option value="' + k + '"' + (k === i.status ? " selected" : "") + ">" + INQ_STATUS[k] + "</option>"; }).join("") + "</select>" : esc(INQ_STATUS[i.status] || i.status)) + "</td>" +
          '<td class="r">' + (edit && i.status !== "added" ? '<button type="button" class="btn sm" data-inq-add="' + esc(i._id) + '">Add to tracker</button>' : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="empty">No partner messages from the website yet.</p>') + "</section>";
  }

  // ---- Website messages and association applications (admins and the Board) -------------------
  // Same data as /admin (convex/admin.ts): Convex only sends what the signed-in account may see.
  function boardAccount() { return !!admin || !!(captain && captain.scope && (captain.scope.exec || (captain.scope.heads || []).length)); }
  var MSG_STATUS = { "new": ["warn", "New"], read: ["info", "Read"], answered: ["ok", "Sent"] }; // "answered" is stored, shown as "Sent"
  var APP_STAGE = { applied: "Applied", review: "Under review", interview: "Interview", "case": "Case interview", offer: "Offer", accepted: "Accepted", declined: "Declined", rejected: "Rejected" };
  var APP_TABS = [["all", "All"], ["applied", "Applied"], ["review", "Under review"], ["interview", "Interview"], ["case", "Case interview"], ["decision", "Decision"]];
  function visMsgs() { return can("board") && live() ? LIVE.messages || [] : []; }
  function visApps() {
    if (!can("board") || !live()) return [];
    var u = hv(), d = DEPTS.filter(function (x) { return x.id === u.dept; })[0]; // a head (or the admin previewing one) sees their department's applicants
    return (LIVE.assocApps || []).filter(function (a) { return u.role !== "head" || (d && (a.pref1 === d.name || a.pref2 === d.name)); });
  }
  function newMsgCount() { return visMsgs().filter(function (m) { return m.status === "new"; }).length; }
  function newAppCount() { return visApps().filter(function (a) { return (a.stage || "applied") === "applied" && !a.openedAt; }).length; }
  function clip(t, n) { t = t || ""; return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function msgStatusSelect(m) {
    return '<span class="st-select st-' + m.status + '"><select data-msg="' + esc(m._id) + '" aria-label="Status of the message from ' + esc(m.name) + '">' + Object.keys(MSG_STATUS).map(function (k) { return '<option value="' + k + '"' + (k === m.status ? " selected" : "") + ">" + MSG_STATUS[k][1] + "</option>"; }).join("") + "</select></span>";
  }
  function hubMessages() {
    var head = '<div class="ph-head"><div><h1 class="display">Contact messages.</h1><p>Only the messages sent through the contact form on the website (your internal conversations are in Chat). Click a message to read it in full and reply: the reply is emailed to the sender and the message moves to Sent.</p></div></div>';
    if (!live()) return head + '<section class="panel"><p class="empty">Messages show once you are signed in.</p></section>';
    if (LIVE.messages == null) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    head += mailWarnPanel(["contact"]);
    var all = visMsgs(), f = state.mFilter || "all", rows = all.filter(function (m) { return f === "all" || m.status === f; });
    var cnt = function (k) { return all.filter(function (m) { return m.status === k; }).length; };
    var open = all.filter(function (m) { return m._id === state.msgOpen; })[0];
    return head + '<div class="grid-4">' + stat("New", String(cnt("new")), "not opened yet") + stat("Read", String(cnt("read")), "opened, no reply yet") + stat("Sent", String(cnt("answered")), "replied to") + stat("Total", String(all.length), "since the site opened") + "</div>" +
      '<section class="panel"><div class="chips" role="group" aria-label="Status">' + [["all", "All"], ["new", "New"], ["read", "Read"], ["answered", "Sent"]].map(function (x) { return '<button class="chip" data-mf="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + (x[0] === "all" ? "" : " (" + cnt(x[0]) + ")") + "</button>"; }).join("") + "</div>" +
      (rows.length ? '<div class="table-wrap"><table class="msg-table"><thead><tr><th>From</th><th>Topic</th><th>Message</th><th>Received</th><th>Status</th></tr></thead><tbody>' + rows.map(function (m) {
        return '<tr class="msg-row' + (m.status === "new" ? " unread" : "") + '" data-msg-open="' + esc(m._id) + '" tabindex="0" title="Open the full message">' +
          '<td><span class="msg-name">' + esc(m.name) + '</span><br><small class="muted">' + esc(m.email) + "</small></td>" +
          "<td>" + esc(m.topic) + (m.sport ? '<br><small class="muted">' + esc(m.sport) + "</small>" : "") + "</td>" +
          '<td><span class="msg-subj">' + esc(m.subject) + '</span><br><small class="muted">' + esc(clip(m.message, 110)) + '</small><br><span class="msg-more">Open message' + ((m.replies || []).length ? " · " + m.replies.length + (m.replies.length === 1 ? " reply" : " replies") : "") + " →</span></td>" +
          '<td class="num muted">' + esc(fmtDay(m._creationTime)) + "</td>" +
          "<td>" + (hRO() ? pill(MSG_STATUS, m.status) : msgStatusSelect(m)) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="empty">' + (all.length ? "No message with this status." : "No messages from the website yet.") + "</p>") + "</section>" +
      (open ? msgDialog(open) : "");
  }
  function msgDialog(m) {
    var mailto = "mailto:" + esc(m.email) + "?subject=" + encodeURIComponent("Re: " + (m.subject || ""));
    var reps = (m.replies || []).map(function (r) {
      var st = r.emailStatus === "sent" ? '<span class="pill ok">Emailed</span>' : r.emailStatus === "sending" ? '<span class="pill info">Sending…</span>' : '<span class="pill bad" title="' + esc(r.emailStatus || "") + '">Not sent</span>';
      return '<div class="msg-reply"><p class="eyebrow">' + esc(r.byName) + " · " + esc(fmtDay(r.at)) + " " + st + '</p><p style="white-space:pre-wrap;margin:4px 0 0">' + esc(r.text) + "</p></div>";
    }).join("");
    return '<div class="match-modal"><div class="match-backdrop" data-msg-close></div><section class="match-dialog msg-dialog" role="dialog" aria-modal="true" aria-labelledby="msg-title">' +
      '<button class="match-close" type="button" data-msg-close aria-label="Close">×</button>' +
      '<p class="eyebrow" style="color:var(--blue)">' + esc(m.topic) + (m.sport ? " · " + esc(m.sport) : "") + "</p><h2 id=\"msg-title\">" + esc(m.subject) + "</h2>" +
      '<dl class="match-details"><div><dt>From</dt><dd>' + esc(m.name) + '</dd></div><div><dt>Email</dt><dd><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a></dd></div>" + (m.phone ? "<div><dt>Phone</dt><dd>" + esc(m.phone) + "</dd></div>" : "") +
      "<div><dt>Received</dt><dd>" + esc(new Date(m._creationTime).toLocaleString("en-GB")) + "</dd></div><div><dt>Status</dt><dd>" + (hRO() ? pill(MSG_STATUS, m.status) : msgStatusSelect(m)) + "</dd></div>" + (m.confirmEmail && seesMail() ? "<div><dt>Confirmation</dt><dd>" + (m.confirmEmail === "sent" ? "Sent" : mailFailPill(m)) + "</dd></div>" : "") + "</dl>" +
      '<p class="msg-body">' + esc(m.message) + "</p>" +
      (reps ? '<h3 class="msg-h3">Replies</h3>' + reps : "") +
      (hRO() ? "" : '<form id="msg-reply" data-id="' + esc(m._id) + '" class="msg-form"><label for="msg-reply-text" class="msg-h3">Reply to ' + esc(m.name) + '</label><textarea id="msg-reply-text" name="text" rows="5" required placeholder="Write your answer. It is emailed to ' + esc(m.email) + ', and their answer comes back to your inbox."></textarea>' +
        '<div class="msg-actions"><button type="submit" class="btn solid">Send reply</button><a class="btn" href="' + mailto + '">Reply in my email app</a><button type="button" class="btn ghost" data-msg-unread="' + esc(m._id) + '">Mark as unread</button></div></form>') +
      "</section></div>";
  }
  // Board view (default): one column per stage, colour-coded; drag a card into another column to change its stage.
  // "Decision" groups Offer / Accepted / Declined / Rejected: dropping there sends an offer, the drop-down sets the rest.
  var APP_COLS = [["applied", "Applied"], ["review", "Under review"], ["interview", "Interview"], ["case", "Case interview"], ["decision", "Decision"]];
  function appCol(a) { var st = a.stage || "applied"; return ["offer", "accepted", "declined", "rejected"].indexOf(st) > -1 ? "decision" : st; }
  function appStageSelect(a) {
    var st = a.stage || "applied", name = a.firstName + " " + a.lastName;
    return '<select class="stg-sel stg-' + st + '" data-app-stage="' + esc(a._id) + '" aria-label="Stage of ' + esc(name) + '">' + Object.keys(APP_STAGE).map(function (k) { return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + APP_STAGE[k] + "</option>"; }).join("") + "</select>";
  }
  function stageChip(st) { return '<span class="stg-chip stg-' + st + '">' + esc(APP_STAGE[st] || st) + "</span>"; }
  // Confirmation emails that did not reach the person (convex/admin.ts emailProblems).
  // Only admins, President/VPs and the IT department (head + associates) see these (same rule as seesMail in convex/roles.ts).
  function seesMail() { var u = hv(); return u.role === "admin" || u.role === "exec" || ((u.role === "head" || u.role === "associate") && u.dept === "it"); }
  function mailFailPill(x) { return seesMail() && x && x.confirmEmail && x.confirmEmail !== "sent" ? ' <span class="pill bad" title="' + esc(x.confirmEmail) + '">Email not sent</span>' : ""; }
  // cats: only these kinds of forms (e.g. ["partner"] on the Partnerships tab); none = all (Overview).
  // Convex returns them only to admins, President, VPs and IT; seesMail() also hides them when an admin uses "Demo as".
  function mailWarnPanel(cats) {
    var all = (LIVE.emailProblems || []).filter(function (r) { return !cats || cats.indexOf(r.cat) > -1; });
    if (!live() || !all.length || !seesMail()) return "";
    var rows = all.filter(function (r) { return !r.handledBy; }), done = all.filter(function (r) { return r.handledBy; }), ro = hRO();
    var doneList = done.length ? '<details style="margin-top:10px"><summary><small class="muted">Handled (' + done.length + ")</small></summary><ul style=\"margin:6px 0 0;padding-left:18px\">" + done.slice(0, 20).map(function (r) {
      return "<li><small><strong>" + esc(r.name) + "</strong> · " + esc(r.form) + " · handled by " + esc(r.handledBy) + " · " + esc(fmtDay(r.handledAt)) + (ro ? "" : ' <button type="button" class="btn sm ghost" data-mail-undo="' + esc(r.key) + '">Undo</button>') + "</small></li>";
    }).join("") + "</ul></details>" : "";
    if (!rows.length) return '<section class="panel">' + '<p class="muted" style="margin:0">Every email problem here has been handled.</p>' + doneList + "</section>";
    return '<section class="panel" role="alert"><div class="panel-head"><h2>Email not sent to ' + rows.length + (rows.length === 1 ? " person" : " people") + '</h2><span class="pill bad">Check</span></div>' +
      '<p class="muted" style="margin:0 0 10px">These forms were saved, but the person did not get their confirmation email. Write to them by hand, then click \u201cI wrote to them\u201d so the others know. \u201cResend\u201d only works once a sending domain is verified in Resend.</p>' +
      '<div class="table-wrap"><table><tbody>' + rows.slice(0, 8).map(function (r) {
        return "<tr><td><strong>" + esc(r.name) + '</strong><br><small><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a></small></td><td>" + esc(r.form) + (r.about ? '<br><small class="muted">' + esc(r.about) + "</small>" : "") + '</td><td class="num muted">' + esc(fmtDay(r.at)) + '</td><td><small class="muted">' + esc(clip(r.why, 90)) + "</small></td>" +
          (ro ? "" : '<td class="r" style="white-space:nowrap"><button type="button" class="btn sm" data-mail-done="' + esc(r.key) + '">I wrote to them</button>' + (r.canRetry ? ' <button type="button" class="btn sm ghost" data-mail-retry="' + esc(r.key) + '">Resend</button>' : "") + "</td>") + "</tr>";
      }).join("") + "</tbody></table></div>" + (rows.length > 8 ? '<p class="muted" style="margin:10px 0 0">The full list is at the top of <a href="/admin">/admin</a>.</p>' : "") + doneList + "</section>";
  }
  // Buttons of the panel above (one listener for the whole Hub; replaced if the site is set up again).
  if (window.__esMailClick) document.removeEventListener("click", window.__esMailClick);
  window.__esMailClick = function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-mail-done],[data-mail-retry],[data-mail-undo]");
    if (!b || !backend) return;
    var key = b.getAttribute("data-mail-done") || b.getAttribute("data-mail-retry") || b.getAttribute("data-mail-undo");
    var retry = b.hasAttribute("data-mail-retry"), undo = b.hasAttribute("data-mail-undo");
    b.disabled = true;
    Promise.resolve(retry ? backend.run("mailResend", { key: key }) : backend.run("mailHandled", undo ? { key: key, undo: true } : { key: key }))
      .then(function () { toast(retry ? "Sending again. It leaves the list if it goes through." : undo ? "Put back in the list." : "Marked as handled."); }, function (x) { b.disabled = false; toast(errText(x)); });
  };
  document.addEventListener("click", window.__esMailClick);
  function appCard(a) {
    var st = a.stage || "applied", name = a.firstName + " " + a.lastName, ro = hRO();
    var links = ['<a href="mailto:' + esc(a.email) + '">Email</a>'];
    if (a.cvUrl) links.push('<a href="' + esc(a.cvUrl) + '" target="_blank" rel="noopener">CV</a>');
    (a.moreDocLinks || []).forEach(function (d) { links.push('<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.name) + "</a>"); });
    if (a.videoUrl) links.push('<a href="' + esc(a.videoUrl) + '" target="_blank" rel="noopener">Video</a>');
    if (a.linkedin) links.push('<a href="' + esc(a.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>');
    return '<article class="kb-card stg-' + st + (st === "applied" && !a.openedAt ? " unread" : "") + '" data-app-open="' + esc(a._id) + '" tabindex="0"' + (ro ? ' title="Open the full application"' : ' data-card="' + esc(a._id) + '" data-col="' + appCol(a) + '" title="Click to open the full application, drag to another column to change the stage"') + ">" +
      "<strong>" + esc(name) + mailFailPill(a) + "</strong><small>" + esc(a.programme) + " · " + esc(a.year) + "</small><small>" + esc(a.pref1) + (a.pref2 ? " · then " + esc(a.pref2) : "") + "</small>" +
      '<div class="kb-foot">' + stageChip(st) + '<small class="num">' + esc(fmtDay(a._creationTime)) + "</small></div>" +
      '<div class="kb-foot"><span>' + links.join(" · ") + "</span>" + (ro ? "" : appStageSelect(a)) + "</div>" +
      (a.motivation ? '<details><summary><small class="muted">Motivation</small></summary><p style="white-space:pre-wrap;margin:6px 0 0;font-size:12px">' + esc(a.motivation) + "</p></details>" : "") + "</article>";
  }
  function appBoard(all) {
    return '<div class="kb" data-kb="assoc">' + APP_COLS.map(function (c) {
      var list = all.filter(function (a) { return appCol(a) === c[0]; });
      return '<section class="kb-col stg-' + c[0] + '" data-drop="' + c[0] + '" aria-label="' + esc(c[1]) + '"><h3>' + esc(c[1]) + "<b>" + list.length + '</b></h3><div class="kb-list">' +
        (list.length ? list.map(appCard).join("") : '<p class="kb-empty">' + (hRO() ? "Nobody here" : "Drop an applicant here") + "</p>") + "</div></section>";
    }).join("") + "</div>";
  }
  function hubAssocApps() {
    var head = '<div class="ph-head"><div><h1 class="display">Association applications.</h1><p>Students applying to join a department. Heads see the applicants who chose their department; the President, VPs and admins see everyone. Click an applicant to open the full application and add notes.</p></div></div>';
    if (!live()) return head + '<section class="panel"><p class="empty">Applications show once you are signed in.</p></section>';
    if (LIVE.assocApps == null) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    head += mailWarnPanel(["association"]);
    var all = visApps(), f = state.aFilter || "all", board = state.aView !== "table";
    var inTab = function (a, t) { var st = a.stage || "applied"; return t === "all" || (t === "decision" ? ["offer", "accepted", "declined", "rejected"].indexOf(st) > -1 : st === t); };
    var rows = all.filter(function (a) { return inTab(a, f); });
    var open = all.filter(function (a) { return a._id === state.appOpen; })[0], dlg = open ? appDialog(open) : "";
    var bar = '<div class="kb-bar"><div class="kb-switch" role="group" aria-label="Layout"><button type="button" data-aview="board" aria-pressed="' + board + '">Board</button><button type="button" data-aview="table" aria-pressed="' + !board + '">Table</button></div>' +
      (board ? '<p class="kb-hint">' + (hRO() ? "View only." : "Drag a card into another column to move the applicant to that stage (on a phone: press and hold, then drag).") + "</p>" : "") + "</div>";
    if (board) return head + '<section class="panel">' + bar + (all.length ? appBoard(all) : '<p class="empty">No applications yet.</p>') + "</section>" + dlg;
    return head + '<section class="panel">' + bar + '<div class="chips" role="group" aria-label="Stage">' + APP_TABS.map(function (x) { var n = all.filter(function (a) { return inTab(a, x[0]); }).length; return '<button class="chip" data-af="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + " (" + n + ")</button>"; }).join("") + "</div>" +
      (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Studies</th><th>Departments</th><th>Motivation</th><th>Files</th><th>Received</th><th>Stage</th></tr></thead><tbody>' + rows.map(function (a) {
        var st = a.stage || "applied", name = a.firstName + " " + a.lastName;
        return '<tr class="msg-row stg-row stg-' + st + (st === "applied" && !a.openedAt ? " unread" : "") + '" data-app-open="' + esc(a._id) + '" tabindex="0" title="Open the full application"><td><strong>' + esc(name) + '</strong>' + mailFailPill(a) + '<br><small><a href="mailto:' + esc(a.email) + '">' + esc(a.email) + "</a><br>" + esc(a.phone) + (a.linkedin ? '<br><a href="' + esc(a.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a>' : "") + "</small></td>" +
          "<td>" + esc(a.programme) + '<br><small class="muted">' + esc(a.year) + "</small></td>" +
          "<td>" + esc(a.pref1) + (a.pref2 ? '<br><small class="muted">then ' + esc(a.pref2) + "</small>" : "") + "</td>" +
          '<td>' + (a.motivation.length > 120 ? '<details><summary><small class="muted">' + esc(clip(a.motivation, 120)) + '</small></summary><p style="white-space:pre-wrap;margin:6px 0 0">' + esc(a.motivation) + "</p></details>" : '<small class="muted" style="white-space:pre-wrap">' + esc(a.motivation) + "</small>") + "</td>" +
          "<td>" + (a.cvUrl ? '<a href="' + esc(a.cvUrl) + '" target="_blank" rel="noopener">CV</a>' : "") + (a.moreDocLinks || []).map(function (d) { return '<br><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.name) + "</a>"; }).join("") + (a.videoUrl ? '<br><a href="' + esc(a.videoUrl) + '" target="_blank" rel="noopener">Video</a>' : "") + "</td>" +
          '<td class="num muted">' + esc(fmtDay(a._creationTime)) + "</td>" +
          "<td>" + (hRO() ? stageChip(st) : appStageSelect(a)) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="empty">' + (all.length ? "No application at this stage." : "No applications yet.") + "</p>") + "</section>" + dlg;
  }
  // The full application, opened by clicking a card (board) or a row (table).
  function appDialog(a) {
    var name = a.firstName + " " + a.lastName, st = a.stage || "applied", ro = hRO();
    var files = [];
    if (a.cvUrl) files.push('<a href="' + esc(a.cvUrl) + '" target="_blank" rel="noopener">CV</a>');
    (a.moreDocLinks || []).forEach(function (d) { files.push('<a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.name) + "</a>"); });
    if (a.videoUrl) files.push('<a href="' + esc(a.videoUrl) + '" target="_blank" rel="noopener">Video</a>');
    var row = function (k, v) { return "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>"; };
    return '<div class="match-modal"><div class="match-backdrop" data-app-close></div><section class="match-dialog msg-dialog" role="dialog" aria-modal="true" aria-labelledby="app-title">' +
      '<button class="match-close" type="button" data-app-close aria-label="Close">×</button>' +
      '<p class="eyebrow" style="color:var(--blue)">Association application · ' + esc(a.pref1) + (a.pref2 ? " then " + esc(a.pref2) : "") + '</p><h2 id="app-title">' + esc(name) + "</h2>" +
      '<dl class="match-details">' + row("Email", '<a href="mailto:' + esc(a.email) + '">' + esc(a.email) + "</a>") + (a.phone ? row("Phone", esc(a.phone)) : "") +
      row("Studies", esc(a.programme) + " · " + esc(a.year)) + row("1st choice", esc(a.pref1)) + (a.pref2 ? row("2nd choice", esc(a.pref2)) : "") +
      row("Open to another department", a.acceptsRedirect ? "Yes" : "No") +
      (a.linkedin ? row("LinkedIn", '<a href="' + esc(a.linkedin) + '" target="_blank" rel="noopener">Open profile</a>') : "") +
      row("Files", files.length ? files.join(" · ") : "None") +
      row("Received", esc(new Date(a._creationTime).toLocaleString("en-GB"))) +
      row("Stage", ro ? stageChip(st) : appStageSelect(a)) + (a.stageChangedAt ? row("Stage changed", esc(fmtDay(a.stageChangedAt))) : "") +
      (a.confirmEmail && seesMail() ? row("Confirmation email", a.confirmEmail === "sent" ? "Sent" : mailFailPill(a)) : "") + "</dl>" +
      '<h3 class="msg-h3">Motivation</h3><p class="msg-body">' + esc(a.motivation || "Not given") + "</p>" +
      (ro ? (a.notes ? '<h3 class="msg-h3">Notes</h3><p class="msg-body">' + esc(a.notes) + "</p>" : "") :
        '<form id="app-notes" data-id="' + esc(a._id) + '" class="msg-form"><label for="app-notes-text" class="msg-h3">Notes (only people who can see this application read them)</label><textarea id="app-notes-text" name="notes" rows="4" maxlength="5000" placeholder="e.g. Interview on Tuesday, strong in Excel">' + esc(a.notes || "") + "</textarea>" +
        '<div class="msg-actions"><button type="submit" class="btn solid">Save notes</button><a class="btn" href="mailto:' + esc(a.email) + '">Email ' + esc(a.firstName) + '</a><button type="button" class="btn" data-app-unread="' + esc(a._id) + '">Mark as unread</button></div></form>') +
      "</section></div>";
  }
  // Dropping a card: move it right away, then save (the live data re-draws the board; on an error it snaps back).
  enableBoardDrag(hub, function (id, col, card, column) {
    if (!card.closest('[data-kb="assoc"]') || hRO()) return;
    var cur = (LIVE.assocApps || []).filter(function (a) { return a._id === id; })[0];
    var stage = col === "decision" ? (cur && appCol(cur) === "decision" ? cur.stage : "offer") : col;
    var list = column.querySelector(".kb-list"), empty = list && list.querySelector(".kb-empty");
    if (empty) empty.remove();
    if (list) list.insertBefore(card, list.firstChild);
    Promise.resolve(backend.run("setAppStage", { id: id, stage: stage })).then(function () { toast("Moved to " + APP_STAGE[stage] + "."); }, function (x) { toast(errText(x)); render(); });
  });

  // ---- Chat: the association's group chats and direct messages (convex/hubChat.ts) -------------
  // Board chat (Board + admins), one chat per department (its head and associates, plus President / VPs / admins)
  // and direct messages between any two members. Convex decides what this account may open; "Demo as"
  // hides the group chats the previewed role would not have. Direct messages are always your own.
  function chatAccount() { var sc = captain && captain.scope; return !!admin || !!(sc && (sc.exec || (sc.heads || []).length || (sc.assoc || []).length || (sc.teams || []).length)); }
  function chatGroups() {
    var u = hv(), c = LIVE.chats; if (!c) return [];
    return c.groups.filter(function (g) {
      if (g.id === "board") return u.role === "admin" || u.role === "exec" || u.role === "head";
      if (g.id === "captains") return u.role === "admin" || u.role === "exec" || u.role === "head" || u.role === "captain";
      return hFull() || DEPT_ID[g.id.slice(5)] === u.dept;
    });
  }
  function chatDms() { var c = LIVE.chats; return c ? c.dms.slice().sort(function (a, b) { return (b.lastAt - a.lastAt) || a.name.localeCompare(b.name); }) : []; }
  function chatUnread() { if (!can("chat") || !live()) return 0; return chatGroups().concat(chatDms()).reduce(function (n, x) { return n + (x.unread || 0); }, 0); }
  function chatFind(id) { return chatGroups().concat(chatDms()).filter(function (x) { return x.id === id; })[0]; }
  function chatTitle(x) { return x.id === "board" ? "Board" : x.id === "captains" ? "Captains" : x.id.indexOf("dept:") === 0 ? x.label + " team" : x.name; }
  function fmtWhen(ms) {
    var d = new Date(ms), n = new Date(), t = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return d.toDateString() === n.toDateString() ? t : d.getDate() + " " + MONTHS[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? " " + d.getFullYear() : "") + ", " + t;
  }
  // Keep one live subscription for the open conversation.
  function chatWatch(id) {
    if (LIVE.chatOpen === id) return;
    if (LIVE.unChat) LIVE.unChat();
    LIVE.chatOpen = id; LIVE.chatMsgs = undefined; LIVE.unChat = null;
    if (!id || !backend || !backend.watch) return;
    LIVE.unChat = backend.watch("chatMsgs", function (d) {
      if (d === undefined || LIVE.chatOpen !== id) return;
      LIVE.chatMsgs = d;
      if (location.hash === "#hub-chat" && document.visibilityState !== "hidden") Promise.resolve(backend.run("chatRead", { channel: id })).catch(function () {});
      chatPatch() || setTimeout(hubRefresh, 0);
    }, { channel: id });
  }
  function chatSide() {
    var cur = state.chatId, gs = chatGroups(), ds = chatDms();
    var item = function (x) {
      return '<button type="button" class="chat-item" data-chat="' + esc(x.id) + '"' + (x.id === cur ? ' aria-current="true"' : "") + '><span class="chat-item-top"><strong>' + esc(chatTitle(x)) + "</strong>" + (x.unread ? '<span class="count num" title="Unread">' + x.unread + "</span>" : "") + "</span>" +
        '<small class="muted">' + (x.lastAt ? esc(clip((x.lastBy ? x.lastBy.split(" ")[0] + ": " : "") + x.lastText, 46)) : esc(x.role || "No messages yet")) + "</small></button>";
    };
    return '<p class="chat-group">Group chats</p>' + (gs.length ? gs.map(item).join("") : '<p class="empty">No group chat for this view.</p>') +
      '<p class="chat-group">Direct messages</p>' + (ds.length ? ds.map(item).join("") : '<p class="empty">Nobody to message yet. People show up here once they are approved in <a href="/admin">/admin</a>.</p>');
  }
  function chatLog() {
    var m = LIVE.chatMsgs;
    if (m === undefined) return '<p class="empty">Loading…</p>';
    if (m === null) return '<p class="empty">You can no longer open this chat.</p>';
    if (!m.length) return '<p class="empty">No messages yet. Say hello.</p>';
    return m.map(function (x) {
      return '<div class="chat-msg' + (x.mine ? " mine" : "") + '"><p class="chat-meta"><strong>' + esc(x.mine ? "You" : x.name) + '</strong> <span class="muted">' + esc(fmtWhen(x.at)) + "</span></p><p class=\"chat-body\">" + esc(x.body) + "</p></div>";
    }).join("");
  }
  // Live updates while someone is typing: refresh the list and messages without re-rendering the form.
  function chatPatch() {
    if (location.hash !== "#hub-chat") return false;
    var side = $("chat-side"), log = $("chat-log");
    if (!side || !log) return false;
    side.innerHTML = chatSide(); bindChatSide();
    var atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.innerHTML = chatLog(); if (atEnd) log.scrollTop = log.scrollHeight;
    var nav = hub.querySelector('.rail nav a[href="#hub-chat"]'), n = chatUnread();
    if (nav) { var b = nav.querySelector(".count"); if (n && !b) { b = document.createElement("span"); b.className = "count num"; nav.appendChild(b); } if (b) { if (n) b.textContent = n; else b.remove(); } }
    return true;
  }
  function hubChat() {
    var head = '<div class="ph-head"><div><h1 class="display">Chat.</h1><p>' + (hv().role === "captain" ? "Talk to the other captains, or send a direct message to your team's associates, the heads of department or the Board." : "Talk to anyone in the association: your department's group chat, the Board chat, the captains' chat, or a direct message to one person.") + '</p></div></div>';
    if (!live() || !chatAccount()) return head + '<section class="panel"><p class="empty">The chat opens once you are signed in with a Board, associate or captain account.</p></section>';
    if (LIVE.chats == null) { chatWatch(null); return head + '<section class="panel"><p class="empty">Loading…</p></section>'; }
    if (state.chatId && !chatFind(state.chatId)) state.chatId = null;
    if (!state.chatId) { var first = chatGroups()[0] || chatDms()[0]; state.chatId = first ? first.id : null; }
    var cur = state.chatId ? chatFind(state.chatId) : null;
    chatWatch(cur ? cur.id : null);
    if (cur && cur.unread && document.visibilityState !== "hidden") Promise.resolve(backend.run("chatRead", { channel: cur.id })).catch(function () {});
    var main = cur
      ? '<div class="chat-head"><h2>' + esc(chatTitle(cur)) + "</h2>" + (cur.role ? '<small class="muted">' + esc(cur.role) + "</small>" : cur.id === "board" ? '<small class="muted">President, vice-presidents, heads of department and admins</small>' : cur.id === "captains" ? '<small class="muted">Every team captain, plus the President, vice-presidents, heads of department and admins</small>' : '<small class="muted">Head, associates, President, vice-presidents and admins</small>') + "</div>" +
        '<div id="chat-log" class="chat-log" aria-live="polite">' + chatLog() + "</div>" +
        '<form id="chat-form" class="chat-form" data-ch="' + esc(cur.id) + '"><textarea id="chat-text" aria-label="Message" rows="2" maxlength="2000" placeholder="Write a message… (Enter to send, Shift+Enter for a new line)" required></textarea><button class="btn btn-blue" type="submit">Send</button></form>'
      : '<p class="empty">Pick a chat on the left.</p>';
    return head + '<section class="panel chat"><aside id="chat-side" class="chat-side" aria-label="Chats">' + chatSide() + '</aside><div class="chat-main">' + main + "</div></section>";
  }
  function bindChatSide() {
    hub.querySelectorAll("[data-chat]").forEach(function (b) { b.addEventListener("click", function () { state.chatId = b.getAttribute("data-chat"); render(); var t = $("chat-text"); if (t) t.focus(); }); });
  }
  function bindChat() {
    if (!$("chat-side")) return;
    bindChatSide();
    var log = $("chat-log"); if (log) log.scrollTop = log.scrollHeight;
    var f = $("chat-form"), ta = $("chat-text");
    if (!f) return;
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = ta.value.trim(), id = state.chatId; if (!text || !id) return;
      var btn = f.querySelector("button"); btn.disabled = true;
      Promise.resolve(backend.run("chatSend", { channel: id, body: text })).then(function () { ta.value = ""; btn.disabled = false; ta.focus(); var l = $("chat-log"); if (l) l.scrollTop = l.scrollHeight; }, function (x) { btn.disabled = false; toast(errText(x)); });
    });
  }

  // ---- Goals: semester targets against the real numbers ----------------------------------------
  function termOf(y, s2) { return y + "-" + String((y + 1) % 100).padStart(2, "0") + " S" + (s2 ? 2 : 1); }
  // Stored keys stay "2026-27 S1" / "S2"; people see "2026-27 Fall" / "2026-27 Spring".
  function termLabel(t) { return String(t).replace(/ S1$/, " Fall").replace(/ S2$/, " Spring"); }
  function currentTerm() { var d = new Date(), y = d.getFullYear(), m = d.getMonth(); return m >= 8 ? termOf(y, false) : m === 0 ? termOf(y - 1, false) : termOf(y - 1, true); }
  function goalTerm() { return state.goalTerm || currentTerm(); }
  function shiftTerm(t, n) { var m = t.match(/^(\d{4})-\d{2} S([12])$/), i = +m[1] * 2 + (+m[2] - 1) + n; return termOf(Math.floor(i / 2), i % 2 === 1); }
  var GOAL_IDEAS = [["Players on the team sheets", "players", "players"], ["Try-out sign-ups", "tryouts", "sign-ups"], ["Just-for-fun sign-ups", "social", "sign-ups"], ["Matches played", "results", "matches"], ["Applications to join the association", "applications", "applications"], ["Partners signed", "partnersSigned", "partners", "Partnerships"], ["Sponsorship income", "sponsorIncome", "€", "Partnerships"], ["Budget spent", "spent", "€", "Finance"], ["Events held", "manual", "events", "Operations"], ["Event attendance", "manual", "people", "Operations"], ["Instagram followers", "manual", "followers", "Media & Marketing"]];
  // Semester chips: last semester → next one, plus any added with "+" (saved in Convex), "‹" to go further back.
  function termIdx(t) { var m = t.match(/^(\d{4})-\d{2} S([12])$/); return +m[1] * 2 + (+m[2] - 1); }
  function termChips(term, d) {
    var cur = currentTerm(), first = termIdx(term) < termIdx(shiftTerm(cur, -1)) ? term : shiftTerm(cur, -1), last = shiftTerm(cur, 1);
    ((d && d.terms) || []).concat([term]).forEach(function (t) { if (/^\d{4}-\d{2} S[12]$/.test(t) && termIdx(t) > termIdx(last)) last = t; });
    var out = '<button class="chip" data-term="' + esc(shiftTerm(first, -1)) + '" aria-label="Earlier semester" title="Earlier semester">' + ico("left") + "</button>";
    for (var t = first; termIdx(t) <= termIdx(last); t = shiftTerm(t, 1)) out += t === term ? '<button class="chip" aria-pressed="true">' + esc(termLabel(t)) + "</button>" : '<button class="chip" data-term="' + esc(t) + '">' + esc(termLabel(t)) + "</button>";
    if (d && d.canEdit && !hRO()) out += '<button class="chip" id="goal-term-add" data-next="' + esc(shiftTerm(last, 1)) + '" aria-label="Add a semester" title="Add ' + esc(termLabel(shiftTerm(last, 1))) + '" style="margin-left:auto">+</button>';
    return out;
  }
  function fmtGoal(v, unit) { return v == null ? "–" : unit === "€" ? EUR.format(v) : String(Math.round(v * 10) / 10) + " " + unit; }
  function hubGoals() {
    var term = goalTerm(); watchGoals(term);
    var d = LIVE.goals, head = '<div class="ph-head"><div><h1 class="display">Goals.</h1><p>The Board\'s targets for the semester, with the real number next to each one. Most numbers are counted from the website and the Hub; the rest are typed in by the department.</p></div></div>' +
      '<section class="panel hist-filters"><div class="chips" role="group" aria-label="Semester">' + termChips(term, d) + "</div></section>";
    if (!live()) return head + '<section class="panel"><p class="empty">Goals work once you are signed in (shared database).</p></section>';
    if (d === undefined) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    if (!d) return head + '<section class="panel"><p class="empty">Goals are for the Board and the departments.</p></section>';
    var u = hv(), gs = d.goals.filter(function (g) { return hFull() || u.role === "head" || !g.dept || g.dept === deptName(u.dept); }), edit = d.canEdit && !hRO();
    var reached = gs.filter(function (g) { return g.value != null && g.target && g.value >= g.target; }).length;
    var list = gs.length ? '<div class="table-wrap"><table class="goals-t"><thead><tr><th>Goal</th><th class="r">Target</th><th class="r">Real</th><th style="width:22%">Progress</th><th>Where the number comes from</th><th></th></tr></thead><tbody>' + gs.map(function (g) {
      var p = g.value != null && g.target ? Math.min(100, g.value / g.target * 100) : 0;
      var real = g.canSetActual && !hRO() ? '<form class="goal-actual" data-goal-actual="' + esc(g._id) + '"><input name="v" type="number" min="0" step="any" value="' + (g.value != null ? g.value : "") + '" aria-label="Real number for ' + esc(g.title) + '"><button class="btn sm" type="submit">Save</button></form>' : '<strong class="num">' + esc(fmtGoal(g.value, g.unit)) + "</strong>";
      return "<tr><td><strong>" + esc(g.title) + '</strong><br><small class="muted">' + esc(g.dept || "Board") + (g.note ? " · " + esc(g.note) : "") + '</small></td><td class="r num">' + esc(fmtGoal(g.target, g.unit)) + '</td><td class="r">' + real + "</td>" +
        '<td><div class="bar"><i style="width:' + p + '%"></i></div><small class="muted">' + (g.value == null ? "No number yet" : Math.round(g.target ? g.value / g.target * 100 : 0) + "% of target") + '</small></td><td><small class="muted">' + esc(d.sources[g.source] || g.source) + "</small></td>" +
        '<td class="r">' + (edit ? '<button type="button" class="btn sm ghost" data-goal-del="' + esc(g._id) + '" aria-label="Remove ' + esc(g.title) + '">' + ico("x") + "</button>" : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<p class="empty">No goals for ' + esc(termLabel(term)) + " yet. " + (edit ? "Add the 5 to 7 numbers the Board agreed on." : "The President or a Vice-president adds them once the Board has agreed on them.") + "</p>";
    var form = edit ? '<section class="panel"><div class="panel-head"><h2>Add a goal</h2></div><p class="muted" style="margin:0 0 10px;font-size:13px">Ideas (click to fill in, then type the target):</p><div class="chips" style="margin-bottom:14px">' + GOAL_IDEAS.map(function (x, i) { return '<button type="button" class="chip" data-gi="' + i + '">' + esc(x[0]) + "</button>"; }).join("") + "</div>" +
      '<form class="form" id="goal-form"><label style="grid-column:span 2">Goal<input name="title" required maxlength="120" placeholder="e.g. Players on the team sheets"></label>' +
      '<label>Target<input name="target" type="number" min="0" step="any" required></label><label>Unit<input name="unit" maxlength="20" placeholder="players, €, matches"></label>' +
      '<label style="grid-column:span 2">Real number comes from<select name="source">' + Object.keys(d.sources).map(function (k) { return '<option value="' + k + '">' + esc(d.sources[k]) + "</option>"; }).join("") + "</select></label>" +
      '<label>Department<select name="dept"><option value="">Board</option>' + DEPTS.filter(function (x) { return x.id !== "board"; }).map(function (x) { return "<option>" + esc(x.name) + "</option>"; }).join("") + "</select></label>" +
      '<label>Note (optional)<input name="note" maxlength="300"></label><div><button class="btn solid" type="submit">Add goal</button></div></form></section>' : "";
    return head + '<div class="grid-4">' + stat("Goals", String(gs.length), termLabel(term)) + stat("Reached", String(reached), "target met or beaten") + stat("To watch", String(gs.filter(function (g) { return g.value == null || (g.target && g.value < g.target); }).length), "below target or no number yet") + stat("Counted automatically", String(gs.filter(function (g) { return g.source !== "manual"; }).length), "no typing needed") + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Targets and real numbers</h2><span class="muted" style="font-size:12px">' + esc(termLabel(term)) + "</span></div>" + list + "</section>" + form;
  }
  function hubOverview() {
    var ts = visTeams(), budget = 0, paid = 0, pend = 0;
    if (!can("money")) // no finance view: teams and department only
      return '<div class="ph-head"><div><h1 class="display">Overview.</h1><p>' + esc(viewLabel(hv())) + ".</p></div></div>" + mailWarnPanel() + todoPanel() + notifPanel() + opsDesk() + pair(workPanel(), linksPanel()) + budgetPanel() +
        '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>' + (can("all") ? "Every team" : "Your teams") + '</h2><a class="btn sm" href="#hub-teams">Open</a></div><table><tbody>' +
        ts.map(function (t) { return '<tr><td class="tname">' + esc(tLabel(t)) + '</td><td class="r muted">' + esc(captainName(captainForTeam(t.id))) + "</td></tr>"; }).join("") + "</tbody></table></section>" + deptPanel() + "</div>";
    ts.forEach(function (t) { var o = totals(t.id); budget += t.budget; paid += o.paid; pend += o.pending; });
    var reqs = visExp().filter(function (e) { return e.status === "requested"; });
    var agreed = ts.filter(function (t) { return t.status === "agreed"; }).length;
    return '<div class="ph-head"><div><h1 class="display">' + (ts.length !== 1 ? "Overview." : esc(tLabel(ts[0])) + ".") + "</h1><p>" + (ts.length !== 1 ? "Where " + (can("all") ? "every team" : "your teams") + " and " + (hFull() ? "every department" : "your department") + " stand today." : "Your team's budget and expenses, handled by your Finance, Media and Operations associates.") + "</p></div></div>" +
      '<div class="grid-4">' + stat("Season budget", EUR.format(budget), ts.length !== 1 ? ts.length + " teams" : "Agreed with you") + stat("Paid so far", EUR.format(paid), pct(paid, budget) + "% of budget") +
      stat("Waiting", EUR.format(pend), reqs.length + " request" + (reqs.length === 1 ? "" : "s") + " to validate") + stat(ts.length !== 1 ? "Budgets agreed" : "Budget", ts.length !== 1 ? agreed + " / " + ts.length : BUDGET_STATUS[ts[0].status][1], ts.length !== 1 ? "with captains" : "status") + "</div>" +
      mailWarnPanel() + todoPanel() + notifPanel() + budgetPanel() + pair(workPanel(), linksPanel()) + '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Requests waiting for Finance</h2>' + (hv().role === "captain" && can("submit") ? '<a class="btn sm solid" href="#hub-expenses" data-make-req>Make a request</a>' : '<a class="btn sm" href="#hub-expenses">All expenses</a>') + '</div>' + expTable(reqs, true) + "</section>" +
      deptPanel() + "</div>";
  }
  // ---- Team information and roster (captain's team sheet) --------------------------------------
  // The roster holds personal data: only the team's captain and the President / VPs / admins see it (checked in Convex).
  var ROSTER = {}, ROSTER_ALL = null;
  var SHIRTS = ["XS", "S", "M", "L", "XL", "XXL"], PROGRAMS = ["BBA", "Law", "BAI", "Global Governance", "Economics & Legal Order", "BITLASI", "Double degree", "MSc", "Law Masters", "MBA", "Executive Education", "PhD", "Other"], PYEARS = ["1", "2", "3", "4", "5", "Masters"];
  var PL_FIELDS = [["first", "First name", "text"], ["last", "Last name", "text"], ["shirt", "Shirt size", "shirt"], ["number", "Jersey number", "num"], ["idDoc", "DNI / NIE", "text"], ["nationality", "Nationality", "text"], ["birth", "Birth date", "date"], ["email", "Email", "email"], ["phone", "Phone (+prefix)", "tel"], ["program", "Program (bachelor / master)", "program"], ["year", "Year", "year"], ["notes", "Allergies / notes", "text"]];
  function canRoster(id) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "captain" && (u.teams || []).indexOf(id) > -1)); }
  function rosterOf(id) {
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
    function sel(opts) { if (val && opts.indexOf(val) < 0) opts = opts.concat([val]); return "<select " + name + '><option value=""></option>' + opts.map(function (o) { return '<option' + (o === val ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>"; }
    if (f[2] === "shirt") return sel(SHIRTS);
    if (f[2] === "program") return sel(PROGRAMS);
    if (f[2] === "year") return sel(PYEARS);
    if (f[2] === "date") return dateSelects(f, val);
    return "<input " + name + ' type="' + (f[2] === "num" ? "text" : f[2]) + '" value="' + v + '"' + (f[2] === "num" ? ' inputmode="numeric" maxlength="3" class="n"' : "") + ">";
  }
  // Birth date as three drop-downs: a calendar opens on today and needs 20 years of scrolling to reach a birth year.
  function dateSelects(f, val) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val || "") || [], y0 = new Date().getFullYear() - 14, yrs = [], days = [], k;
    for (k = y0; k >= 1950; k--) yrs.push(String(k));
    for (k = 1; k <= 31; k++) days.push(("0" + k).slice(-2));
    function sel(part, label, opts, cur, names) { return '<select data-bd="' + part + '" aria-label="' + label + '"><option value="">' + label + "</option>" + opts.map(function (o, i) { return '<option value="' + o + '"' + (o === cur ? " selected" : "") + ">" + (names ? names[i] : +o) + "</option>"; }).join("") + "</select>"; }
    return '<span class="bdate">' + sel("d", "Day", days, m[3]) + sel("m", "Month", ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"], m[2], MONTHS) + sel("y", "Year", yrs, m[1]) +
      '<input type="hidden" data-f="' + f[0] + '" value="' + esc(val || "") + '"></span>';
  }
  function bindDateSelects(root) {
    root.querySelectorAll(".bdate").forEach(function (w) {
      var g = function (k) { return w.querySelector('[data-bd="' + k + '"]').value; }, out = w.querySelector("input");
      w.addEventListener("change", function () { out.value = g("y") && g("m") && g("d") ? g("y") + "-" + g("m") + "-" + g("d") : ""; });
    });
  }
  function teamInfoPanel(id) {
    var i = teamInfoFor(id), rows = [["About", i.about], ["Training facility", [i.venue, i.venueAddress].filter(Boolean).join(", ")], ["League", i.league], ["League page", i.leagueUrl], ["Team contact", i.contact]].filter(function (r) { return r[1]; });
    return '<section class="panel"><div class="panel-head"><h2>Team information</h2>' + (can("teamEdit") ? '<a class="btn sm" href="#hub-team-editor">Edit</a>' : "") + "</div>" +
      (rows.length ? '<dl class="facts">' + rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" : '<p class="empty">Not filled in yet. ' + (can("teamEdit") ? 'Use <a href="#hub-team-editor">Team editor</a> to add the facility, league and contacts.' : "") + "</p>") + "</section>";
  }
  // Roster as a table (like the captain's Google Sheet). "Add team member" and a click on a row open the player form in a dialog.
  function rDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : d || ""; }
  function rosterPanel(id) {
    var ed = canRoster(id); // the view-only account (Student Council / Eva Morta) reads it on the captain pages
    if (!ed && !hv().ro) return "";
    var pl = rosterOf(id);
    if (pl === null) return '<section class="panel"><div class="panel-head"><h2>Team roster</h2></div><p class="empty">Loading…</p></section>';
    var cols = PL_FIELDS.map(function (f) { return f[0] === "number" ? "No." : f[0] === "program" ? "Program" : f[0] === "notes" ? "Allergies" : f[1]; });
    var table = pl.length ? '<div class="table-wrap"><table class="roster-sheet"><thead><tr><th class="r">#</th>' + cols.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "<th></th></tr></thead><tbody>" +
      pl.map(function (p, i) { return (ed ? '<tr class="click" data-pl-edit="' + i + '" data-team="' + id + '" tabindex="0" title="Edit this player">' : "<tr>") + '<td class="r num muted">' + (i + 1) + "</td>" +
        PL_FIELDS.map(function (f) { var v = f[0] === "birth" ? rDate(p.birth) : p[f[0]]; return '<td class="rc-' + f[0] + '">' + (v ? esc(v) : '<span class="muted">—</span>') + "</td>"; }).join("") +
        "<td>" + (ed ? '<button type="button" class="btn sm ghost" data-pl-edit="' + i + '" data-team="' + id + '">Edit</button>' : "") + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : ed ? '<p class="empty">No players yet. Use <b>Add team member</b>, or paste the rows from your team sheet.</p>' : '<p class="empty">No players yet.</p>';
    var sizes = sizeSummary(pl);
    return '<section class="panel roster-panel"><div class="panel-head"><h2>Team roster <span class="muted" style="font-weight:600">· ' + pl.length + " player" + (pl.length === 1 ? "" : "s") + "</span></h2>" +
      '<span class="pill">Private: captain and Board only</span></div>' +
      (ed ? '<div class="roster-actions"><button type="button" class="btn sm solid" data-pl-add="' + id + '">+ Add team member</button><button type="button" class="btn sm" data-pl-paste="' + id + '">Paste from Google Sheets</button>' : '<div class="roster-actions">') +
      (sizes ? '<span class="muted" style="font-size:13px">Shirt sizes: <b>' + esc(sizes) + "</b></span>" : "") + "</div>" + table +
      (live() && ROSTER[id] && ROSTER[id].updatedBy ? '<small class="muted">Last saved by ' + esc(ROSTER[id].updatedBy) + " · " + esc(fmtWhen(ROSTER[id].updatedAt)) + "</small>" : "") +
      (ed ? rosterDialog(id, pl) : "") + "</section>";
  }
  function rosterDialog(id, pl) {
    var e = state.rosterEdit;
    if (!e || e.team !== id) return "";
    var head = '<div class="match-modal"><div class="match-backdrop" data-pl-close></div><section class="match-dialog msg-dialog roster-dialog" role="dialog" aria-modal="true" aria-labelledby="pl-title">' +
      '<button class="match-close" type="button" data-pl-close aria-label="Close">×</button>';
    if (e.paste) return head + '<h2 id="pl-title">Paste from your sheet</h2>' +
      '<p class="muted" style="margin:0 0 12px">In Google Sheets, select the player rows (from First name to Allergies, without the header row), copy, and paste them here. Players already in the roster (same first and last name) are skipped.</p>' +
      '<form id="pl-paste-form" data-team="' + id + '"><textarea id="pl-paste" rows="8" style="width:100%;padding:10px;border:1.5px solid var(--navy);font:inherit;font-size:13px" placeholder="Diego&#9;Weis&#9;L&#9;11&#9;…"></textarea>' +
      '<div class="msg-actions"><button class="btn solid" type="submit">Add players</button><button class="btn" type="button" data-pl-close>Cancel</button></div></form></section></div>';
    var isNew = e.i < 0, p = isNew ? {} : pl[e.i] || {};
    return head + '<h2 id="pl-title">' + (isNew ? "Add team member" : esc(((p.first || "") + " " + (p.last || "")).trim() || "Player " + (e.i + 1))) + "</h2>" +
      '<form id="pl-form" data-team="' + id + '" data-i="' + e.i + '"><div class="pl-grid">' +
      PL_FIELDS.map(function (f) { return '<label class="pl-f pl-' + f[0] + '"><span>' + f[1] + "</span>" + plInput(f, p[f[0]], 0) + "</label>"; }).join("") + "</div>" +
      '<div class="msg-actions"><button class="btn solid" type="submit">' + (isNew ? "Add to roster" : "Save changes") + '</button><button class="btn" type="button" data-pl-close>Cancel</button>' +
      (isNew ? "" : '<button class="btn ghost" type="button" data-pl-del style="margin-left:auto">' + ico("x") + " Remove player</button>") + "</div></form></section></div>";
  }
  // Rows copied from Google Sheets arrive tab-separated, in the sheet's column order (same as PL_FIELDS).
  function parseSheetRows(text) {
    var NAT = { francia: "France", "francés": "France", "españa": "Spain", espana: "Spain", alemania: "Germany", italia: "Italy" };
    return text.split(/\r?\n/).map(function (line) { return line.split("\t"); }).filter(function (c) { return c.length > 1 && (c[0] || c[1] || "").trim(); }).map(function (c) {
      var p = {};
      PL_FIELDS.forEach(function (f, k) { var v = (c[k] || "").trim(); if (v && v !== "/" && v !== "-") p[f[0]] = v; });
      if (p.number && !/^\d{1,3}$/.test(p.number)) delete p.number;
      if (p.shirt) p.shirt = p.shirt.toUpperCase();
      if (p.nationality && NAT[p.nationality.toLowerCase()]) p.nationality = NAT[p.nationality.toLowerCase()];
      var d = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(p.birth || "");
      if (d) p.birth = d[3] + "-" + ("0" + d[2]).slice(-2) + "-" + ("0" + d[1]).slice(-2);
      if (p.phone && /^\d/.test(p.phone)) p.phone = "+" + p.phone.replace(/\s+/g, " ");
      if (p.year && /^master/i.test(p.year)) p.year = "Masters";
      return p;
    });
  }
  function saveRosterList(id, rows, msg, btn) {
    rows = rows.filter(function (p) { return p.first || p.last; });
    if (rows.some(function (p) { return p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email); })) { toast("Check the email addresses."); return; }
    function done() { state.rosterEdit = null; render(); toast(msg); }
    if (!live()) { state.rosters[id] = { players: rows }; save(); done(); return; }
    if (btn) btn.disabled = true;
    Promise.resolve(backend.saveRoster({ team: id, players: rows })).then(function () { ROSTER[id] = undefined; ROSTER_ALL = null; done(); }, function (x) { if (btn) btn.disabled = false; toast(errText(x)); });
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
  // Finance sets each team's season budget and split, then marks it agreed with the captain.
  function budgetForm(t) {
    if (!live() || !canBudget(t.id)) return t.budgetNote ? '<p class="muted" style="margin:0;font-size:13px">Note from Finance: ' + esc(t.budgetNote) + "</p>" : "";
    return '<form class="form" id="budget-form" data-team="' + t.id + '"><p class="form-sub">Season budget · set by Finance</p>' +
      '<label>Total (€)<input name="total" type="number" min="0" step="10" required value="' + (t.status === "none" ? "" : t.budget) + '" placeholder="e.g. 2500"></label>' +
      '<label>Operations share (%)<input name="ops" type="number" min="0" max="100" step="5" required value="' + (t.opsShare == null ? 70 : t.opsShare) + '"></label>' +
      '<label>Status<select name="status">' + ["draft", "review", "agreed"].map(function (k) { return '<option value="' + k + '"' + (t.status === k ? " selected" : "") + ">" + BUDGET_STATUS[k][1] + "</option>"; }).join("") + "</select></label>" +
      '<label>Note (optional)<input name="note" maxlength="300" value="' + esc(t.budgetNote || "") + '" placeholder="e.g. includes league fee"></label>' +
      '<div><button class="btn solid" type="submit">Save budget</button></div>' + (t.budgetBy ? '<p class="muted" style="grid-column:1/-1;margin:0;font-size:12px">Last set by ' + esc(t.budgetBy) + "</p>" : "") + "</form>";
  }

  // ---- Tournament (next Unijess tournament) ------------------------------------------------------
  // Captains mark each roster player Attending / Not attending and add the ID or passport number and documents.
  // The Board, admins and the view-only account (Eva Morta) see every team, read-only. Checked in convex/tournament.ts.
  var TN_ST = { yes: ["ok", "Attending"], no: ["bad", "Not attending"], none: ["warn", "Not answered"] };
  function tnLongDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""; }
  function tnDaysTo(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if (!m) return null; var t = madridYmd(0).split("-"); return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+t[0], +t[1] - 1, +t[2])) / 864e5); }
  function tnMine() { return hv().role === "captain"; }
  // Teams this view shows: a captain only their own, everyone else every team the server returned.
  function tnTeams() {
    var d = LIVE.tournament; if (!d) return [];
    var u = hv();
    return d.teams.filter(function (t) { return tnMine() ? (u.teams || []).indexOf(t.team) > -1 : true; });
  }
  function tnEditable(t) { var r = hv().role; return t.canEdit && !hRO() && (r === "captain" || r === "admin" || r === "exec"); }
  function tnId(p) { return p.idNumber || p.rosterId || ""; }
  function tnCount(pl) {
    var c = { yes: 0, no: 0, none: 0, noId: 0, noDoc: 0 };
    pl.forEach(function (p) { c[p.status || "none"]++; if (p.status === "yes") { if (!tnId(p)) c.noId++; if (!p.files.length) c.noDoc++; } });
    return c;
  }
  function tnBadge() { if (!live() || !tnMine() || !LIVE.tournament) return 0; var n = 0; tnTeams().forEach(function (t) { n += tnCount(t.players).none; }); return n; }
  function tnSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function hubTournament() {
    var d = LIVE.tournament;
    var head = function (ev) {
      var days = ev ? tnDaysTo(ev.date) : null, dl = ev ? tnDaysTo(ev.deadline) : null;
      return '<div class="ph-head"><div><h1 class="display">Tournament.</h1><p>' + (ev ? "<b>" + esc(ev.name) + "</b> · " + esc(tnLongDate(ev.date)) + (ev.place ? " · " + esc(ev.place) : "") + (days != null && days >= 0 ? " · in " + days + (days === 1 ? " day" : " days") : "") : "") + "</p>" +
        (ev && ev.deadline ? '<p class="tn-deadline' + (dl != null && dl < 0 ? " late" : "") + '">Captains answer by <b>' + esc(tnLongDate(ev.deadline)) + "</b>" + (dl != null ? dl < 0 ? " · deadline passed" : dl === 0 ? " · today" : " · " + dl + (dl === 1 ? " day left" : " days left") : "") + "</p>" : "") +
        "<p>" + (tnMine() ? "Mark who comes, and add each attending player's ID or passport number and documents. Eva Morta and the Board see your answers to organise the tournament." : "Who is confirmed for the tournament, team by team. Captains fill it in for their own team.") + "</p></div></div>";
    };
    if (!live()) return head(null) + '<section class="panel"><p class="empty">The tournament list shows once you are signed in.</p></section>';
    if (!d) return head(null) + '<section class="panel"><p class="empty">Loading…</p></section>';
    var ts = tnTeams(), all = [];
    ts.forEach(function (t) { t.players.forEach(function (p) { all.push(p); }); });
    var c = tnCount(all);
    var stats = '<div class="grid-4">' + stat("Attending", String(c.yes), "confirmed players") + stat("Not attending", String(c.no), "said no") + stat("Not answered", String(c.none), "still to confirm") + stat("ID missing", String(c.noId), "attending, no ID / passport") + "</div>";
    var body = "";
    if (tnMine()) {
      body = ts.length ? ts.map(function (t) { return tnTeamPanel(t); }).join("") : '<section class="panel"><p class="empty">No team linked to your account yet.</p></section>';
    } else {
      // Admins, President/VPs, heads and the view-only account first pick a tournament from the list.
      // Only one tournament exists for now (the Convex `tournaments` row); add more entries here later.
      if (!state.tnEv) return tnList(d, c);
      var open = state.tnOpen, ot = ts.filter(function (t) { return t.team === open; })[0];
      if (ot) return head(d.event) + '<p class="tn-back"><button type="button" class="btn sm" data-tn-back>← All teams</button></p>' + tnTeamPanel(ot, true) + tnConfirmed([ot]);
      body = '<p class="tn-back"><button type="button" class="btn sm" data-tn-evback>← All tournaments</button></p>';
      body += '<section class="panel"><div class="panel-head"><h2>Every team</h2><p class="tn-total"><b>' + c.yes + "</b> " + (c.yes === 1 ? "person" : "people") + ' attending</p><button type="button" class="btn sm solid" data-tn-csv' + (c.yes ? "" : " disabled") + '>Download confirmed players (CSV)</button></div><div class="table-wrap"><table><thead><tr><th>Team</th><th class="r">Attending</th><th class="r">Not attending</th><th class="r">Not answered</th><th class="r">ID missing</th><th class="r">No documents</th><th class="r">Roster</th></tr></thead><tbody>' +
        ts.map(function (t) { var k = tnCount(t.players), tm = team(t.team);
          return '<tr class="click" data-tn-open="' + t.team + '" tabindex="0"' + (open === t.team ? ' aria-current="true"' : "") + '><td class="tname"><a href="#hub-tournament" class="tn-team" data-tn-link="' + t.team + '">' + esc(tm ? tLabel(tm) : t.team) + '</a></td><td class="r num"><b class="tn-n ok">' + k.yes + '</b></td><td class="r num">' + k.no + '</td><td class="r num">' + (k.none ? '<span class="tn-n warn">' + k.none + "</span>" : "0") + '</td><td class="r num">' + (k.noId ? '<span class="tn-n bad">' + k.noId + "</span>" : "0") + '</td><td class="r num">' + k.noDoc + '</td><td class="r num muted">' + t.players.length + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr class="tn-foot"><td>Total</td><td class="r num"><b class="tn-n ok">' + c.yes + '</b></td><td class="r num">' + c.no + '</td><td class="r num">' + c.none + '</td><td class="r num">' + c.noId + '</td><td class="r num">' + c.noDoc + '</td><td class="r num">' + all.length + "</td></tr></tfoot></table></div>" + '<p class="muted" style="margin:0;font-size:12px">Click a team to see its players. A team with an empty roster has not added its players yet.</p></section>' +
        tnConfirmed(ts);
    }
    return head(d.event) + stats + body + (d.canEditEvent && !hRO() && (hv().role === "admin" || hv().role === "exec") ? tnEventForm(d.event) : "");
  }
  function tnList(d, c) {
    var ev = d.event, days = tnDaysTo(ev.date);
    return '<div class="ph-head"><div><h1 class="display">Tournaments.</h1><p>Choose a tournament to see who is coming, team by team.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Tournaments</h2></div><div class="table-wrap"><table><thead><tr><th>Tournament</th><th>Date</th><th>Place</th><th class="r">Attending</th><th class="r">Not answered</th></tr></thead><tbody>' +
      '<tr class="click" data-tn-ev="main" tabindex="0"><td class="tname"><a href="#hub-tournament" class="tn-team" data-tn-ev="main">' + esc(ev.name) + "</a></td><td>" + esc(tnLongDate(ev.date)) + (days != null && days >= 0 ? ' <small class="muted">· in ' + days + (days === 1 ? " day" : " days") + "</small>" : "") + "</td><td>" + (ev.place ? esc(ev.place) : '<span class="muted">—</span>') +
      '</td><td class="r num"><b class="tn-n ok">' + c.yes + '</b></td><td class="r num">' + (c.none ? '<span class="tn-n warn">' + c.none + "</span>" : "0") + "</td></tr>" +
      '</tbody></table></div><p class="muted" style="margin:0;font-size:12px">Click a tournament to open its full page: attendance, ID / passport, documents and the CSV download.</p></section>';
  }
  function tnTeamPanel(t, grouped) {
    var tm = team(t.team), ed = tnEditable(t), k = tnCount(t.players);
    var row = function (p) {
      var st = p.status || "none", idv = tnId(p);
      var seg = ed ? '<div class="tn-seg" role="group" aria-label="Attendance">' + ["yes", "no", "none"].map(function (x) { return '<button type="button" class="' + TN_ST[x][0] + '" data-tn-st="' + x + '" data-team="' + t.team + '" data-key="' + esc(p.key) + '" aria-pressed="' + (st === x) + '">' + TN_ST[x][1] + "</button>"; }).join("") + "</div>" : '<span class="pill ' + TN_ST[st][0] + '">' + TN_ST[st][1] + "</span>";
      var idCell = ed ? '<input class="tn-id" type="text" maxlength="30" autocomplete="off" data-team="' + t.team + '" data-key="' + esc(p.key) + '" value="' + esc(p.idNumber || "") + '" placeholder="' + esc(p.rosterId ? p.rosterId + " (roster)" : "ID / passport no.") + '" aria-label="ID or passport number">' : idv ? esc(idv) : '<span class="muted">—</span>';
      var files = p.files.map(function (f) { return '<li><a href="' + esc(f.url || "#") + '" target="_blank" rel="noopener" title="Added by ' + esc(f.by) + " · " + esc(fmtWhen(f.at)) + '">' + esc(clip(f.name, 34)) + '</a> <small class="muted">' + tnSize(f.size) + "</small>" + (ed ? ' <button type="button" class="rm" data-tn-rm="' + esc(f.id) + '" data-team="' + t.team + '" data-key="' + esc(p.key) + '" aria-label="Remove ' + esc(f.name) + '">Remove</button>' : "") + "</li>"; }).join("");
      var hist = (p.history || []).slice().reverse().map(function (h) { return fmtWhen(h.at) + " · " + h.by + ": " + h.what; }).join("\n");
      return '<tr class="tn-' + st + '"><td><b>' + esc(p.first + " " + p.last) + "</b>" + (p.number ? ' <span class="muted">#' + esc(p.number) + "</span>" : "") +
        (p.updatedBy ? '<br><small class="muted" title="' + esc(hist) + '">Changed by ' + esc(p.updatedBy) + " · " + esc(fmtWhen(p.updatedAt)) + "</small>" : "") + "</td><td>" + seg + "</td><td>" + idCell + "</td><td>" +
        (files ? '<ul class="tn-files">' + files + "</ul>" : ed ? "" : '<span class="muted">None</span>') +
        (ed ? '<label class="btn sm tn-add">+ Add document<input type="file" hidden multiple accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic" data-tn-file data-team="' + t.team + '" data-key="' + esc(p.key) + '"></label>' + hoMsgHtml("t:" + t.team + "|" + p.key) : "") + "</td></tr>";
    };
    // Board / Eva view: Attending first, then Not attending, then Not answered. Captains keep their roster order.
    var rows = grouped ? ["yes", "no", "none"].map(function (g) {
      var ps = t.players.filter(function (p) { return (p.status || "none") === g; });
      return '<tr class="tn-group tn-g-' + g + '"><th colspan="4">' + TN_ST[g][1] + " · " + ps.length + "</th></tr>" + (ps.length ? ps.map(row).join("") : '<tr><td colspan="4" class="muted">Nobody.</td></tr>');
    }).join("") : t.players.map(row).join("");
    return '<section class="panel tn-panel"><div class="panel-head"><h2>' + esc(tm ? tLabel(tm) : t.team) + ' <span class="muted" style="font-weight:600">· ' + k.yes + " attending, " + k.none + " not answered</span></h2>" +
      '<span class="pill">' + (ed ? "Private: your team, the Board and Eva Morta" : "View only") + "</span></div>" +
      (t.players.length ? '<div class="table-wrap"><table class="tn-table"><thead><tr><th>Player</th><th>Attendance</th><th>ID / passport</th><th>Documents (PDF or image, max 10 MB)</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
        : '<p class="empty">No players on the roster yet.' + (ed ? ' Add them first in <a href="#hub-teams">' + (can("all") ? "Teams" : "My team") + "</a> (Team roster), then come back here." : "") + "</p>") + "</section>";
  }
  function tnConfirmed(ts) {
    var rows = [];
    ts.forEach(function (t) { t.players.forEach(function (p) { if (p.status === "yes") rows.push({ t: t, p: p }); }); });
    if (!rows.length) return "";
    return '<section class="panel"><div class="panel-head"><h2>Confirmed players <span class="muted" style="font-weight:600">· ' + rows.length + '</span></h2></div><div class="table-wrap"><table><thead><tr><th>Team</th><th>Player</th><th>ID / passport</th><th>Birth date</th><th>Nationality</th><th class="r">Documents</th></tr></thead><tbody>' +
      rows.map(function (x) { var tm = team(x.t.team), idv = tnId(x.p); return "<tr><td>" + esc(tm ? tLabel(tm) : x.t.team) + "</td><td><b>" + esc(x.p.first + " " + x.p.last) + "</b></td><td>" + (idv ? esc(idv) : '<span class="tn-n bad">Missing</span>') + '</td><td class="num">' + esc(rDate(x.p.birth)) + "</td><td>" + esc(x.p.nationality || "") + '</td><td class="r num">' + x.p.files.length + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>";
  }
  function tnEventForm(ev) {
    return '<section class="panel"><div class="panel-head"><h2>Tournament details</h2><span class="pill">Admins, President, VPs</span></div>' +
      '<form id="tn-event" class="tn-event"><label>Name<input name="name" maxlength="80" required value="' + esc(ev.name) + '"></label><label>Date<input name="date" type="date" required value="' + esc(ev.date) + '"></label>' +
      '<label>Place<input name="place" maxlength="120" value="' + esc(ev.place || "") + '" placeholder="Venue, city"></label><label>Answer deadline (optional)<input name="deadline" type="date" value="' + esc(ev.deadline || "") + '"></label>' +
      '<button class="btn sm solid" type="submit">Save details</button></form>' + (ev.updatedBy ? '<small class="muted">Last changed by ' + esc(ev.updatedBy) + " · " + esc(fmtWhen(ev.updatedAt)) + "</small>" : "") + "</section>";
  }
  function tnCsv() {
    var d = LIVE.tournament, ev = d.event, lines = [["Team", "First name", "Last name", "Jersey number", "ID / passport", "Birth date", "Nationality", "Documents"]];
    tnTeams().forEach(function (t) { var tm = team(t.team); t.players.forEach(function (p) { if (p.status === "yes") lines.push([tm ? tLabel(tm) : t.team, p.first, p.last, p.number || "", tnId(p), rDate(p.birth), p.nationality || "", String(p.files.length)]); }); });
    var csv = lines.map(function (r) { return r.map(function (x) { x = String(x == null ? "" : x); return /[",\n;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(","); }).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = (ev.name + " " + ev.date + " confirmed").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".csv";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function bindTournament() {
    hub.querySelectorAll("[data-tn-st]").forEach(function (b) { b.addEventListener("click", function () {
      if (b.getAttribute("aria-pressed") === "true") return;
      hub.querySelectorAll('[data-tn-st][data-key="' + b.getAttribute("data-key") + '"]').forEach(function (x) { x.disabled = true; });
      Promise.resolve(backend.run("tnStatus", { team: b.getAttribute("data-team"), key: b.getAttribute("data-key"), status: b.getAttribute("data-tn-st") })).then(null, function (x) { render(); toast(errText(x)); });
    }); });
    hub.querySelectorAll(".tn-id").forEach(function (i) {
      var was = i.value;
      function saveId() { if (i.value.trim() === was.trim()) return; was = i.value; Promise.resolve(backend.run("tnId", { team: i.getAttribute("data-team"), key: i.getAttribute("data-key"), idNumber: i.value })).then(function () { toast("ID / passport number saved."); }, function (x) { toast(errText(x)); }); }
      i.addEventListener("change", saveId);
      i.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); i.blur(); } });
    });
    hub.querySelectorAll("[data-tn-file]").forEach(function (inp) { inp.addEventListener("change", function () {
      var files = Array.prototype.slice.call(inp.files || []), team_ = inp.getAttribute("data-team"), key = inp.getAttribute("data-key"), mk = "t:" + team_ + "|" + key;
      inp.blur();
      inp.value = "";
      files.reduce(function (pr, f) { return pr.then(function () {
        if (f.size > 10 * 1048576) { hoSay(mk, f.name + ": too big (max 10 MB).", "bad"); toast(f.name + ": too big (max 10 MB)."); return; }
        hoSay(mk, "Uploading " + f.name + "…", "busy");
        return Promise.resolve(backend.uploadFile(f)).then(function (sid) { return backend.run("tnAddFile", { team: team_, key: key, storageId: sid, name: f.name }); })
          .then(function (r) { if (r && r.error) { hoSay(mk, f.name + ": " + r.error, "bad"); toast(f.name + ": " + r.error); } else { hoSay(mk, "Added ✓ " + f.name, "ok", 8000); toast(f.name + " added."); } }, function (x) { hoSay(mk, errText(x), "bad"); toast(errText(x)); });
      }); }, Promise.resolve());
    }); });
    hub.querySelectorAll("[data-tn-rm]").forEach(function (b) { b.addEventListener("click", function () {
      b.disabled = true;
      Promise.resolve(backend.run("tnRemoveFile", { team: b.getAttribute("data-team"), key: b.getAttribute("data-key"), storageId: b.getAttribute("data-tn-rm") })).then(function () { toast("Document removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-tn-link]").forEach(function (a) { a.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); state.tnOpen = a.getAttribute("data-tn-link"); render(); window.scrollTo(0, 0); }); });
    hub.querySelectorAll("[data-tn-back]").forEach(function (b) { b.addEventListener("click", function () { state.tnOpen = null; render(); window.scrollTo(0, 0); }); });
    hub.querySelectorAll("[data-tn-open]").forEach(function (r) {
      function op() { state.tnOpen = r.getAttribute("data-tn-open"); render(); window.scrollTo(0, 0); }
      r.addEventListener("click", op);
      r.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); op(); } });
    });
    hub.querySelectorAll("tr[data-tn-ev]").forEach(function (r) {
      function op(ev) { if (ev) ev.preventDefault(); state.tnEv = r.getAttribute("data-tn-ev"); state.tnOpen = null; render(); window.scrollTo(0, 0); }
      r.addEventListener("click", op);
      r.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") op(ev); });
    });
    hub.querySelectorAll("[data-tn-evback]").forEach(function (b) { b.addEventListener("click", function () { state.tnEv = null; state.tnOpen = null; render(); window.scrollTo(0, 0); }); });
    hub.querySelectorAll("[data-tn-csv]").forEach(function (b) { b.addEventListener("click", tnCsv); });
    var ef = $("tn-event"); if (ef) ef.addEventListener("submit", function (ev) {
      ev.preventDefault(); var bt = ef.querySelector("button"); bt.disabled = true;
      Promise.resolve(backend.run("tnEvent", { name: ef.elements.name.value, date: ef.elements.date.value, place: ef.elements.place.value || undefined, deadline: ef.elements.deadline.value || undefined }))
        .then(function () { toast("Tournament details saved."); }, function (x) { bt.disabled = false; toast(errText(x)); });
    });
  }
  // ---- Team handover ------------------------------------------------------------------------------
  // What each team knows, per department (invoices, league, contacts, jerseys...), so the next captain and the
  // newly recruited associates start from it. Who sees and edits which section is checked in convex/handover.ts.
  var HO_HELP = {
    "Finance": "Invoices and receipts, who you paid and how, deposits, and anything still owed.",
    "Operations": "League (name, fees, registration dates), referees, venues and training slots, and who to call for what.",
    "Media & Marketing": "Where the jerseys come from (supplier, sizes, design files), social media accounts and who holds them, photos and videos.",
    "Partnerships": "Current and past sponsors, what was agreed with them, and who to contact.",
    "IT": "Tools and accounts the team uses, and who holds the access. Never write passwords here."
  };
  function hoShown(t, s) {
    var u = hv(), r = u.role, d = DEPT_ID[s.dept], mine = (u.teams || []).indexOf(t.team) > -1;
    if (hFull()) return true;
    if (r === "head") return d === u.dept;
    if (r === "associate") return d === u.dept && mine;
    return r === "captain" && mine;
  }
  function hoTeams() {
    var d = LIVE.handover; if (!d) return [];
    return d.teams.map(function (t) { return { team: t.team, sections: t.sections.filter(function (s) { return hoShown(t, s); }).sort(function (a, b) { return DEPARTMENT_ORDER.indexOf(a.dept) - DEPARTMENT_ORDER.indexOf(b.dept); }) }; }).filter(function (t) { return t.sections.length; });
  }
  function hoFilled(s) { return !!(s.notes || s.contacts.length || s.links.length || s.files.length); }
  function hubHandover() {
    var head = '<div class="ph-head"><div><h1 class="display">Team handover.</h1><p>Everything the next team needs to start the season: invoices, league details, who to contact, where the jerseys come from. Captains fill in their team; each department sees its own part for the teams it works with.</p></div></div>';
    if (!live()) return head + '<section class="panel"><p class="empty">The handover notes show once you are signed in.</p></section>';
    if (!LIVE.handover) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    var ts = hoTeams();
    if (!ts.length) return head + '<section class="panel"><p class="empty">No team linked to your account yet.</p></section>';
    var open = ts.length === 1 ? ts[0].team : state.hoOpen, body = "";
    if (ts.length > 1) {
      var depts = [];
      ts.forEach(function (t) { t.sections.forEach(function (s) { if (depts.indexOf(s.dept) < 0) depts.push(s.dept); }); });
      depts = DEPARTMENT_ORDER.filter(function (d) { return depts.indexOf(d) > -1; });
      body += '<section class="panel"><div class="panel-head"><h2>Every team</h2></div><div class="table-wrap"><table><thead><tr><th>Team</th>' + depts.map(function (d) { return "<th>" + esc(d) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        ts.map(function (t) { var tm = team(t.team);
          return '<tr class="click" data-ho-open="' + t.team + '" tabindex="0"' + (open === t.team ? ' aria-current="true"' : "") + '><td class="tname">' + esc(tm ? tLabel(tm) : t.team) + "</td>" + depts.map(function (d) {
            var s = t.sections.filter(function (x) { return x.dept === d; })[0];
            return "<td>" + (!s ? '<span class="muted">—</span>' : hoFilled(s) ? '<span class="pill ok">Filled</span>' : '<span class="pill warn">Empty</span>') + "</td>";
          }).join("") + "</tr>"; }).join("") +
        '</tbody></table></div><p class="muted" style="margin:0;font-size:12px">Select a team to open its handover notes.</p></section>';
    }
    if (open) ts.filter(function (t) { return t.team === open; }).forEach(function (t) {
      var tm = team(t.team);
      body += (ts.length > 1 ? '<h2 class="ho-team">' + esc(tm ? tLabel(tm) : t.team) + "</h2>" : "") + t.sections.map(function (s) { return hoSection(t.team, s); }).join("");
    });
    return head + body;
  }
  var DEPARTMENT_ORDER = ["Finance", "Operations", "Media & Marketing", "Partnerships", "IT"];
  var HO_CK = [["name", "Name", 100], ["role", "Role", 100], ["org", "Organisation", 100], ["email", "Email", 200], ["phone", "Phone", 40]];
  function hoCRow(c) {
    return '<tr class="ho-c">' + HO_CK.map(function (k) { return '<td><input data-k="' + k[0] + '" maxlength="' + k[2] + '" value="' + esc(c[k[0]] || "") + '" placeholder="' + k[1] + '" aria-label="' + k[1] + '"' + (k[0] === "email" ? ' type="email"' : "") + "></td>"; }).join("") +
      '<td><button type="button" class="rm" data-ho-rmrow aria-label="Remove contact">Remove</button></td></tr>';
  }
  function hoLRow(l) {
    return '<tr class="ho-l"><td><input data-k="label" maxlength="100" value="' + esc(l.label || "") + '" placeholder="What it is (e.g. League page)" aria-label="Link name"></td><td><input data-k="url" maxlength="500" value="' + esc(l.url || "") + '" placeholder="https://…" aria-label="Link address"></td>' +
      '<td><button type="button" class="rm" data-ho-rmrow aria-label="Remove link">Remove</button></td></tr>';
  }
  function hoSection(teamId, s) {
    var ed = s.canEdit && !hRO(), k = teamId + "|" + s.dept;
    var filesBlock = hoFiles(k, s, ed);
    var meta = s.updatedBy ? '<small class="muted">Last edited by ' + esc(s.updatedBy) + " · " + esc(fmtWhen(s.updatedAt)) + "</small>" : '<small class="muted">Nothing written yet</small>';
    var top = '<section class="panel ho-panel"><div class="panel-head"><h2>' + esc(s.dept) + "</h2>" + meta + '</div><p class="muted ho-help">' + esc(HO_HELP[s.dept] || "") + "</p>";
    if (!ed) {
      return top + '<div class="ho-block"><h3>Notes</h3>' + (s.notes ? '<p class="ho-notes">' + esc(s.notes) + "</p>" : '<p class="muted" style="margin:0">No notes yet.</p>') + "</div>" +
        '<div class="ho-block"><h3>Contacts</h3>' + (s.contacts.length ? '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Email</th><th>Phone</th></tr></thead><tbody>' + s.contacts.map(function (c) {
          return "<tr><td><b>" + esc(c.name) + "</b></td><td>" + esc(c.role || "") + "</td><td>" + esc(c.org || "") + "</td><td>" + (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") + "</td><td>" + (c.phone ? '<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + "</a>" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted" style="margin:0">No contacts yet.</p>') + "</div>" +
        '<div class="ho-block"><h3>Links</h3>' + (s.links.length ? '<ul class="ho-links">' + s.links.map(function (l) { return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a></li>"; }).join("") + "</ul>" : '<p class="muted" style="margin:0">No links yet.</p>') + "</div>" + filesBlock + "</section>";
    }
    return top + '<form class="ho-form" data-ho-form data-k="' + esc(k) + '">' +
      '<div class="ho-block"><h3><label for="ho-n-' + esc(k).replace(/[^a-z0-9]/gi, "") + '">Notes</label></h3><textarea id="ho-n-' + esc(k).replace(/[^a-z0-9]/gi, "") + '" name="notes" rows="5" maxlength="8000" placeholder="' + esc(HO_HELP[s.dept] || "") + '">' + esc(s.notes) + "</textarea></div>" +
      '<div class="ho-block"><h3>Contacts</h3><div class="table-wrap"><table class="ho-edit"><tbody data-ho-rows="c">' + (s.contacts.length ? s.contacts : [{}]).map(hoCRow).join("") + '</tbody></table></div><button type="button" class="btn sm" data-ho-add="c">+ Add contact</button></div>' +
      '<div class="ho-block"><h3>Links</h3><div class="table-wrap"><table class="ho-edit"><tbody data-ho-rows="l">' + (s.links.length ? s.links : [{}]).map(hoLRow).join("") + '</tbody></table></div><button type="button" class="btn sm" data-ho-add="l">+ Add link</button></div>' +
      '<div class="ho-save"><button class="btn sm solid" type="submit">Save ' + esc(s.dept) + '</button><span class="ho-unsaved">Unsaved changes</span>' + hoMsgHtml("s:" + k) + "</div></form>" + filesBlock + "</section>";
  }
  // Files list of one section. Re-drawn on its own when the live data changes (hoPatchFiles), so a new file shows
  // straight away even while someone is typing in the notes above (that blocks a full re-render).
  function hoFiles(k, s, ed) {
    var files = s.files.map(function (f) { return '<li><a href="' + esc(f.url || "#") + '" target="_blank" rel="noopener">' + esc(clip(f.name, 48)) + '</a> <small class="muted">' + tnSize(f.size) + " · added by " + esc(f.by) + " · " + esc(fmtWhen(f.at)) + "</small>" + (ed ? ' <button type="button" class="rm" data-ho-rmfile="' + esc(f.id) + '" data-k="' + esc(k) + '" aria-label="Remove ' + esc(f.name) + '">Remove</button>' : "") + "</li>"; }).join("");
    return '<div class="ho-block" data-ho-files="' + esc(k) + '"><h3>Files' + (s.files.length ? ' <span class="muted">· ' + s.files.length + "</span>" : "") + "</h3>" + (files ? '<ul class="tn-files">' + files + "</ul>" : '<p class="muted" style="margin:0 0 6px">No files yet.</p>') +
      (ed ? '<label class="btn sm tn-add">+ Add files<input type="file" hidden multiple accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic,.xlsx,.docx,.csv" data-ho-file data-k="' + esc(k) + '"></label> <small class="muted">PDF, image, Excel, Word or CSV, max 10 MB each</small>' + hoMsgHtml("f:" + k) : "") + "</div>";
  }
  // Status line next to a button ("Uploading…", "Added", "Saved", errors). Kept in state so a re-render keeps it.
  var HO_MSG = {};
  function hoMsgHtml(key) { var m = HO_MSG[key]; return '<p class="ho-msg' + (m ? " " + m.kind : "") + '" data-ho-msg="' + esc(key) + '" role="status" aria-live="polite">' + (m ? esc(m.text) : "") + "</p>"; }
  function hoSay(key, text, kind, ms) {
    var m = { text: text, kind: kind || "" }; HO_MSG[key] = m;
    hub.querySelectorAll("[data-ho-msg]").forEach(function (el) { if (el.getAttribute("data-ho-msg") === key) { el.className = "ho-msg " + m.kind; el.textContent = text; } });
    if (ms) setTimeout(function () { if (HO_MSG[key] === m) hoSay(key, "", ""); }, ms);
  }
  function hoPatchFiles() {
    if (!LIVE.handover) return;
    hub.querySelectorAll("[data-ho-files]").forEach(function (el) {
      var key = hoKey(el), t = LIVE.handover.teams.filter(function (x) { return x.team === key.team; })[0], s = t && t.sections.filter(function (x) { return x.dept === key.dept; })[0];
      if (!s) return;
      var box = document.createElement("div"); box.innerHTML = hoFiles(el.getAttribute("data-ho-files"), s, s.canEdit && !hRO());
      var nu = box.firstChild; el.parentNode.replaceChild(nu, el); bindHoFiles(nu);
    });
  }
  function hoKey(el) { var p = (el.getAttribute("data-k") || el.getAttribute("data-ho-files") || "").split("|"); return { team: p[0], dept: p.slice(1).join("|") }; }
  function bindHandover() {
    hub.querySelectorAll("[data-ho-open]").forEach(function (r) {
      function op() { var id = r.getAttribute("data-ho-open"); state.hoOpen = state.hoOpen === id ? null : id; render(); }
      r.addEventListener("click", op);
      r.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); op(); } });
    });
    hub.querySelectorAll("[data-ho-form]").forEach(function (f) {
      f.addEventListener("input", function () { f.classList.add("dirty"); });
      f.addEventListener("click", function (ev) {
        var t = ev.target;
        if (t.closest("[data-ho-rmrow]")) { t.closest("tr").remove(); f.classList.add("dirty"); }
        var add = t.closest("[data-ho-add]");
        if (add) { var kind = add.getAttribute("data-ho-add"); f.querySelector('[data-ho-rows="' + kind + '"]').insertAdjacentHTML("beforeend", kind === "c" ? hoCRow({}) : hoLRow({})); f.classList.add("dirty"); }
      });
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var key = hoKey(f), bt = f.querySelector('button[type="submit"]'), val = function (tr, k) { return tr.querySelector('[data-k="' + k + '"]').value; };
        var contacts = Array.prototype.map.call(f.querySelectorAll("tr.ho-c"), function (tr) { var c = {}; HO_CK.forEach(function (k) { c[k[0]] = val(tr, k[0]); }); return c; })
          .filter(function (c) { return (c.name + c.email + c.phone + c.org + c.role).trim(); });
        var links = Array.prototype.map.call(f.querySelectorAll("tr.ho-l"), function (tr) { return { label: val(tr, "label"), url: val(tr, "url") }; }).filter(function (l) { return l.url.trim(); });
        bt.disabled = true; hoSay("s:" + f.getAttribute("data-k"), "Saving…", "busy");
        Promise.resolve(backend.run("hoSave", { team: key.team, dept: key.dept, notes: f.elements.notes.value, contacts: contacts, links: links }))
          .then(function () { f.classList.remove("dirty"); bt.disabled = false; hoSay("s:" + f.getAttribute("data-k"), "Saved ✓ " + key.dept + " is up to date.", "ok", 8000); toast(key.dept + " saved."); },
            function (x) { bt.disabled = false; hoSay("s:" + f.getAttribute("data-k"), "Not saved: " + errText(x), "bad"); toast(errText(x)); });
      });
    });
    bindHoFiles(hub);
  }
  function bindHoFiles(root) {
    root.querySelectorAll("[data-ho-file]").forEach(function (inp) { inp.addEventListener("change", function () {
      var files = Array.prototype.slice.call(inp.files || []), key = hoKey(inp), mk = "f:" + inp.getAttribute("data-k"), ok = 0, bad = [];
      inp.blur();
      inp.value = "";
      files.reduce(function (pr, f, i) { return pr.then(function () {
        if (f.size > 10 * 1048576) { bad.push(f.name + ": too big (max 10 MB)"); return; }
        hoSay(mk, "Uploading " + f.name + (files.length > 1 ? " (" + (i + 1) + " of " + files.length + ")" : "") + "…", "busy");
        return Promise.resolve(backend.uploadFile(f)).then(function (sid) { return backend.run("hoAddFile", { team: key.team, dept: key.dept, storageId: sid, name: f.name }); })
          .then(function (r) { if (r && r.error) bad.push(f.name + ": " + r.error); else ok++; }, function (x) { bad.push(f.name + ": " + errText(x)); });
      }); }, Promise.resolve()).then(function () {
        if (bad.length) { hoSay(mk, (ok ? ok + " added. " : "") + "Not added: " + bad.join("; "), "bad"); toast("Not added: " + bad[0]); }
        else if (ok) { hoSay(mk, (ok === 1 ? "Added ✓ " + files[0].name : "Added ✓ " + ok + " files") + " (saved, it's in the list above).", "ok", 8000); toast(ok === 1 ? files[0].name + " added." : ok + " files added."); }
      });
    }); });
    root.querySelectorAll("[data-ho-rmfile]").forEach(function (b) { b.addEventListener("click", function () {
      var key = hoKey(b), mk = "f:" + b.getAttribute("data-k"); b.disabled = true;
      Promise.resolve(backend.run("hoRemoveFile", { team: key.team, dept: key.dept, storageId: b.getAttribute("data-ho-rmfile") })).then(function () { hoSay(mk, "File removed.", "ok", 5000); }, function (x) { b.disabled = false; hoSay(mk, errText(x), "bad"); });
    }); });
  }
  // ---- Contracts: signed agreements and their PDFs (convex/contracts.ts decides who sees each one) ----
  function ctTeamName(id) { if (!id) return "Whole association"; var t = team(id); return t ? tLabel(t) : id; }
  function ctEnds(c) {
    if (!c.endsOn) return "";
    var end = Date.parse(c.endsOn + "T23:59:59"), left = end - Date.now();
    var txt = fmtDay(Date.parse(c.endsOn + "T12:00:00"));
    if (left < 0) return esc(txt) + ' <span class="pill bad">Ended</span>';
    if (left < 60 * 86400000) return esc(txt) + ' <span class="pill warn">Ends soon</span>';
    return esc(txt);
  }
  function ctDeptOpts(opt, cur) {
    var ds = (opt && opt.depts) || [], u = hv(), mine = u.dept ? deptName(u.dept) : "";
    var pick = ds.indexOf(cur) > -1 ? cur : ds.indexOf(mine) > -1 ? mine : ds.indexOf("Partnerships") > -1 ? "Partnerships" : ds[0];
    return ds.map(function (d) { return "<option" + (d === pick ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("");
  }
  function hubContracts() {
    var head = '<div class="ph-head"><div><h1 class="display">Contracts.</h1><p>Signed agreements and their PDFs: sponsors, league and venue agreements, suppliers. A contract is seen only by its team\'s captains, the department it belongs to, and the President, Vice-presidents and admins.</p></div></div>';
    if (!live()) return head + '<section class="panel"><p class="empty">Contracts show once you are signed in.</p></section>';
    var d = LIVE.contracts;
    if (!d) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    var all = d.contracts, opts = hRO() ? [] : d.options, f = state.ctTeam || "all";
    var keys = []; all.forEach(function (c) { var k = c.team || ""; if (keys.indexOf(k) < 0) keys.push(k); });
    if (f !== "all" && keys.indexOf(f) < 0) f = "all";
    var rows = all.filter(function (c) { return f === "all" || (c.team || "") === f; });
    var form = "";
    if (opts.length) {
      var o0 = opts.filter(function (o) { return o.team === (state.ctFormTeam != null ? state.ctFormTeam : (f !== "all" ? f : "")); })[0] || opts.filter(function (o) { return o.team; })[0] || opts[0];
      form = '<details class="panel ct-add" data-open="ct"' + ((state.open || {}).ct != null ? (state.open.ct ? " open" : "") : all.length ? "" : " open") + '><summary><h2>Add a contract</h2></summary><form class="form" id="ct-form" data-keep>' +
        '<label for="ct-title">Title<input id="ct-title" name="title" required maxlength="140" placeholder="e.g. Sponsorship agreement 2026-27"></label>' +
        '<label for="ct-party">With (other party)<input id="ct-party" name="party" maxlength="140" placeholder="Sponsor, league, venue, supplier…"></label>' +
        '<label for="ct-team">Team<select id="ct-team" name="team">' + opts.map(function (o) { return '<option value="' + esc(o.team) + '"' + (o === o0 ? " selected" : "") + ">" + esc(ctTeamName(o.team)) + "</option>"; }).join("") + "</select></label>" +
        '<label for="ct-dept">Department<select id="ct-dept" name="dept">' + ctDeptOpts(o0) + "</select></label>" +
        '<label for="ct-signed">Signed on<input id="ct-signed" name="signedOn" type="date"></label>' +
        '<label for="ct-ends">Ends on (optional)<input id="ct-ends" name="endsOn" type="date"></label>' +
        '<label for="ct-notes" class="wide">Notes (optional)<textarea id="ct-notes" name="notes" rows="2" maxlength="2000" placeholder="Amount, renewal, who signed, anything to remember"></textarea></label>' +
        '<div class="wide">' + pickBox("ct-files", ".pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic", "+ Add PDFs") + '<small class="muted">PDF or scan, max 10 MB each, up to 10 files</small></div>' +
        '<div class="wide"><button class="btn sm solid" type="submit">Save contract</button>' + hoMsgHtml("ct:new") + "</div></form></details>";
    }
    var filter = keys.length > 1 ? '<section class="panel hist-filters"><div class="form"><label for="ct-filter">Team<select id="ct-filter"><option value="all">All (' + all.length + ")</option>" +
      keys.map(function (k) { return '<option value="' + esc(k) + '"' + (f === k ? " selected" : "") + ">" + esc(ctTeamName(k)) + "</option>"; }).join("") + "</select></label></div></section>" : "";
    var list = '<section class="panel"><div class="panel-head"><h2>' + (f === "all" ? "All contracts" : esc(ctTeamName(f))) + '</h2><span class="muted" style="font-size:12px">' + rows.length + " contract" + (rows.length === 1 ? "" : "s") + "</span></div>" +
      (rows.length ? '<div class="table-wrap"><table class="ct-table"><thead><tr><th>Contract</th><th>Team</th><th>Department</th><th>Signed</th><th>Ends</th><th>Files</th>' + (hRO() ? "" : "<th></th>") + "</tr></thead><tbody>" + rows.map(ctRow).join("") + "</tbody></table></div>"
        : '<p class="empty">' + (all.length ? "No contract for this team." : "No contract yet." + (opts.length ? " Add the first one above." : "")) + "</p>") + "</section>";
    return head + form + filter + list;
  }
  function ctRow(c) {
    var ed = c.canEdit && !hRO();
    var files = c.files.map(function (x) { return '<li><a href="' + esc(x.url || "#") + '" target="_blank" rel="noopener">' + esc(clip(x.name, 36)) + "</a>" + (ed ? ' <button type="button" class="rm" data-ct-rmfile="' + esc(x.id) + '" data-ct="' + esc(c._id) + '" aria-label="Remove ' + esc(x.name) + '">×</button>' : "") + "</li>"; }).join("");
    return "<tr><td><b>" + esc(c.title) + "</b>" + (c.party ? '<br><small class="muted">With ' + esc(c.party) + "</small>" : "") + (c.notes ? '<br><small class="ct-notes">' + esc(c.notes) + "</small>" : "") + '<br><small class="muted">Added by ' + esc(c.by) + " · " + esc(fmtDay(c.at)) + "</small></td>" +
      '<td class="tname">' + esc(ctTeamName(c.team)) + "</td><td>" + esc(c.dept) + '</td><td class="num">' + (c.signedOn ? esc(fmtDay(Date.parse(c.signedOn + "T12:00:00"))) : '<span class="muted">—</span>') + '</td><td class="num">' + (ctEnds(c) || '<span class="muted">—</span>') + "</td>" +
      "<td>" + (files ? '<ul class="tn-files">' + files + "</ul>" : '<span class="muted">No file</span>') + (ed && c.files.length < 10 ? '<label class="btn sm ghost tn-add">+ File<input type="file" hidden multiple accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic" data-ct-file="' + esc(c._id) + '"></label>' : "") + "</td>" +
      (hRO() ? "" : "<td>" + (ed ? '<button type="button" class="rm" data-ct-rm="' + esc(c._id) + '">Remove</button>' : "") + "</td>") + "</tr>";
  }
  // Add forms that must survive live redraws: remember open <details> and hold redraws while a form has unsaved input.
  function bindKeep() {
    hub.querySelectorAll("details[data-open]").forEach(function (d) { d.addEventListener("toggle", function () { (state.open = state.open || {})[d.getAttribute("data-open")] = d.open; }); });
    hub.querySelectorAll("form[data-keep]").forEach(function (f) { f.addEventListener("input", function () { f.classList.add("dirty"); }); f.addEventListener("change", function () { f.classList.add("dirty"); }); });
  }
  function keepDone(f) { f.classList.remove("dirty"); hubRefresh(); }
  function bindContracts() {
    bindKeep();
    var fl = $("ct-filter"); if (fl) fl.addEventListener("change", function () { state.ctTeam = fl.value; render(); });
    var form = $("ct-form");
    if (form) {
      var tSel = $("ct-team"), dSel = $("ct-dept");
      tSel.addEventListener("change", function () { state.ctFormTeam = tSel.value; var o = LIVE.contracts.options.filter(function (x) { return x.team === tSel.value; })[0]; dSel.innerHTML = ctDeptOpts(o, dSel.value); });
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var el = form.elements, files = picked("ct-files"), bt = form.querySelector('button[type="submit"]');
        if (!el.title.value.trim()) { hoSay("ct:new", "Give the contract a title.", "bad"); return; }
        if (tooBig(files, 10)) { hoSay("ct:new", "A file is too big (max 10 MB each).", "bad"); return; }
        bt.disabled = true; hoSay("ct:new", files.length ? "Uploading " + files.length + " file" + (files.length === 1 ? "" : "s") + "…" : "Saving…", "busy");
        uploadAll(files).then(function (up) {
          return backend.run("addContract", { team: el.team.value || undefined, dept: el.dept.value, title: el.title.value, party: el.party.value || undefined, signedOn: el.signedOn.value || undefined, endsOn: el.endsOn.value || undefined, notes: el.notes.value || undefined, files: up.map(function (x) { return { id: x.id, name: x.name }; }) });
        }).then(function (r) {
          PICKS["ct-files"] = []; state.ctFormTeam = null; form.reset(); bt.disabled = false; keepDone(form);
          if (r && r.skipped && r.skipped.length) { hoSay("ct:new", "Saved, but not added: " + r.skipped.join("; "), "bad"); toast("Contract saved, some files were not added."); }
          else { hoSay("ct:new", "Saved ✓", "ok", 6000); toast("Contract saved."); }
          pickRedraw("ct-files");
        }, function (x) { bt.disabled = false; hoSay("ct:new", "Not saved: " + errText(x), "bad"); });
      });
    }
    hub.querySelectorAll("[data-ct-file]").forEach(function (inp) { inp.addEventListener("change", function () {
      var id = inp.getAttribute("data-ct-file"), files = Array.prototype.slice.call(inp.files || []), bad = [];
      inp.value = "";
      files.reduce(function (pr, f) { return pr.then(function () {
        if (f.size > 10 * 1048576) { bad.push(f.name + ": too big (max 10 MB)"); return; }
        return Promise.resolve(backend.uploadFile(f)).then(function (sid) { return backend.run("ctAddFile", { id: id, storageId: sid, name: f.name }); })
          .then(function (r) { if (r && r.error) bad.push(r.error); }, function (x) { bad.push(f.name + ": " + errText(x)); });
      }); }, Promise.resolve()).then(function () { toast(bad.length ? "Not added: " + bad[0] : files.length === 1 ? files[0].name + " added." : files.length + " files added."); });
      toast("Uploading…");
    }); });
    hub.querySelectorAll("[data-ct-rmfile]").forEach(function (b) { b.addEventListener("click", function () {
      b.disabled = true;
      Promise.resolve(backend.run("ctRemoveFile", { id: b.getAttribute("data-ct"), storageId: b.getAttribute("data-ct-rmfile") })).then(function () { toast("File removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-ct-rm]").forEach(function (b) { b.addEventListener("click", function () {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Click again to remove"; setTimeout(function () { if (b.isConnected) { b.classList.remove("armed"); b.textContent = "Remove"; } }, 4000); return; }
      b.disabled = true;
      Promise.resolve(backend.run("removeContract", { id: b.getAttribute("data-ct-rm") })).then(function () { toast("Contract removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
  }

  // ---- Photo & video history of a team (Hub > History). convex/media.ts: captains, Media & Marketing, Board. ----
  function seasonNow() { var d = new Date(), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return y + "-" + String(y + 1).slice(2); }
  // Big phone photos are shrunk in the browser (longest side 2560 px, JPEG) so the archive stays light.
  function shrinkPhoto(f) {
    if (f.size < 1.5 * 1048576 || !/^image\/(jpeg|png|webp)$/.test(f.type) || !window.createImageBitmap) return Promise.resolve(f);
    return createImageBitmap(f).then(function (bmp) {
      var k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(function (b) { ok(b && b.size < f.size ? new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f); }, "image/jpeg", 0.86); });
    }).catch(function () { return f; });
  }
  function mediaPanel(ft) {
    if (!live() || !LIVE.media || !LIVE.media.length) return "";
    var ts = LIVE.media, one = ts.length === 1 ? ts[0] : ts.filter(function (t) { return t.team === ft; })[0];
    var head = '<section class="panel media-panel"><div class="panel-head"><h2>Photos & videos</h2>';
    if (!one) {
      var withItems = ts.filter(function (t) { return t.items.length; });
      return head + '<span class="muted" style="font-size:12px">Pick a team above</span></div><p class="muted" style="margin:0">Each team\'s archive of past games, choreos and events, for Media & Marketing and the next generations. ' +
        (withItems.length ? withItems.map(function (t) { return esc(ctTeamName(t.team)) + " (" + t.items.length + ")"; }).join(" · ") : "Nothing uploaded yet.") + "</p></section>";
    }
    var groups = {}, order = [];
    one.items.slice().sort(function (a, b) { return b.season.localeCompare(a.season) || b.at - a.at; }).forEach(function (m) {
      var k = m.season + "|" + m.event; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(m);
    });
    var ed = one.canAdd && !hRO(), byS = {};
    order.forEach(function (k) { var s = k.split("|")[0]; (byS[s] = byS[s] || []).push(k); });
    var body = Object.keys(byS).sort().reverse().map(function (s) {
      return '<div class="media-season"><h3>' + esc(s) + "</h3>" + byS[s].map(function (k) {
        var it = groups[k];
        return '<div class="media-event"><h4>' + esc(k.split("|").slice(1).join("|")) + ' <small class="muted">' + it.length + "</small></h4><ul class=\"media-grid\">" + it.map(function (m) {
          var rm = ed ? '<button type="button" class="media-rm" data-media-rm="' + esc(m._id) + '" aria-label="Remove">×</button>' : "", cap = m.caption ? ' title="' + esc(m.caption) + '"' : "";
          if (m.kind === "video") return '<li class="vid"' + cap + '><a href="' + esc(m.url) + '" target="_blank" rel="noopener"><span>Video</span><small>' + esc(clip(m.caption || m.url.replace(/^https?:\/\/(www\.)?/, ""), 40)) + "</small></a>" + rm + "</li>";
          return "<li" + cap + '><a href="' + esc(m.src || "#") + '" target="_blank" rel="noopener"><img src="' + esc(m.src || "") + '" alt="' + esc(m.caption || m.event) + '" loading="lazy"></a>' + rm + "</li>";
        }).join("") + "</ul></div>";
      }).join("") + "</div>";
    }).join("");
    var events = []; one.items.forEach(function (m) { if (events.indexOf(m.event) < 0) events.push(m.event); });
    var form = ed ? '<details class="media-add" data-open="md"' + ((state.open || {}).md ? " open" : "") + '><summary class="btn sm">+ Add photos or a video link</summary><form class="form" id="media-form" data-keep data-team="' + esc(one.team) + '">' +
      '<label for="md-season">Season<input id="md-season" name="season" required maxlength="20" value="' + esc(seasonNow()) + '"></label>' +
      '<label for="md-event">Event<input id="md-event" name="event" required maxlength="100" list="md-events" placeholder="e.g. Spring showcase, Final vs UB"><datalist id="md-events">' + events.map(function (e) { return "<option>" + esc(e) + "</option>"; }).join("") + "</datalist></label>" +
      '<label for="md-cap" class="wide">Caption (optional)<input id="md-cap" name="caption" maxlength="300"></label>' +
      '<div class="wide">' + pickBox("md-photos", "image/jpeg,image/png,image/webp,image/heic", "+ Choose photos") + '<small class="muted">Up to 10 at a time. Big photos are made lighter automatically.</small></div>' +
      '<label for="md-video" class="wide">Video link (optional)<input id="md-video" name="video" type="text" inputmode="url" maxlength="500" placeholder="Google Drive, YouTube or Instagram link"></label>' +
      '<div class="wide"><button class="btn sm solid" type="submit">Upload</button>' + hoMsgHtml("md:new") + "</div></form></details>" : "";
    return head + '<span class="muted" style="font-size:12px">' + esc(ctTeamName(one.team)) + " · " + one.items.length + " item" + (one.items.length === 1 ? "" : "s") + "</span></div>" + form +
      (order.length ? body : '<p class="empty">No photos or videos yet.' + (ed ? " Add past games, choreos or events: Media & Marketing can use them, and the team keeps an archive." : "") + "</p>") + "</section>";
  }
  function bindMedia() {
    var form = $("media-form");
    if (form) form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var el = form.elements, files = picked("md-photos"), bt = form.querySelector('button[type="submit"]'), video = el.video.value.trim();
      if (!el.season.value.trim() || !el.event.value.trim()) { hoSay("md:new", "Fill in the season and the event.", "bad"); return; }
      if (!files.length && !video) { hoSay("md:new", "Choose photos or paste a video link.", "bad"); return; }
      bt.disabled = true; hoSay("md:new", files.length ? "Uploading " + files.length + " photo" + (files.length === 1 ? "" : "s") + "…" : "Saving…", "busy");
      Promise.all(files.map(shrinkPhoto)).then(function (small) {
        if (tooBig(small, 10)) throw new Error("A photo is still over 10 MB. Export it smaller and try again.");
        return uploadAll(small);
      }).then(function (up) {
        return backend.run("addMedia", { team: form.getAttribute("data-team"), season: el.season.value, event: el.event.value, caption: el.caption.value || undefined, photos: up.map(function (x) { return { id: x.id, name: x.name }; }), videoUrl: video || undefined });
      }).then(function (r) {
        PICKS["md-photos"] = []; pickRedraw("md-photos"); el.video.value = ""; el.caption.value = ""; bt.disabled = false; keepDone(form);
        if (r && r.skipped && r.skipped.length) hoSay("md:new", (r.added ? r.added + " added. " : "") + "Not added: " + r.skipped.join("; "), "bad");
        else { hoSay("md:new", "Added ✓ " + (r ? r.added : "") + " item" + (r && r.added === 1 ? "" : "s"), "ok", 6000); toast("Added to the history."); }
      }, function (x) { bt.disabled = false; hoSay("md:new", "Not added: " + (errText(x, x && x.message)), "bad"); });
    });
    hub.querySelectorAll("[data-media-rm]").forEach(function (b) { b.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Remove?"; setTimeout(function () { if (b.isConnected) { b.classList.remove("armed"); b.textContent = "×"; } }, 4000); return; }
      b.disabled = true;
      Promise.resolve(backend.run("removeMedia", { id: b.getAttribute("data-media-rm") })).then(function () { toast("Removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
  }
  function hubTeams() {
    var ts = visTeams(), u0 = state.user || {};
    // A captain sees their own team's live activity here (on the captain pages it sits under the team bar).
    var feedTeam = u0.role === "captain" && !onTeamPages(u0) ? ((u0.teams || []).indexOf(state.teamOpen) > -1 ? state.teamOpen : (u0.teams || [])[0]) : null;
    var feed = feedTeam && team(feedTeam) ? activityPanel(feedTeam) : "";
    if (!can("money")) // teams without the money columns (Finance only)
      return '<div class="ph-head"><div><h1 class="display">' + (can("all") ? "Every team." : "Your teams.") + '</h1><p>Budgets and expenses are handled by Finance.</p></div></div>' + feed +
        '<section class="panel"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Captain</th></tr></thead><tbody>' +
        ts.map(function (t) { return '<tr><td class="tname">' + esc(tLabel(t)) + "</td><td>" + esc(captainName(captainForTeam(t.id))) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    var open = state.teamOpen || (ts.length === 1 ? ts[0].id : null), detail = "";
    if (open) {
      var t = team(open), o = totals(open);
      detail = '<section class="panel" id="team-detail"><div class="panel-head"><h2>' + esc(tLabel(t)) + "</h2>" + pill(BUDGET_STATUS, t.status) + "</div>" +
        '<div class="people">' + [["Captain", captainName(captainForTeam(open)), "Runs the team"], ["Finance associate", assocFor("fin", open) || TBA, "Budget and payments"], ["Media associate", assocFor("med", open) || TBA, "Social media and coverage"], ["Operations associate", assocFor("ops", open) || TBA, "Bookings, kit, travel"], ["Partnerships associate", assocFor("par", open) || TBA, "Sponsors for the team"]].map(function (p) { return '<div class="person"><p class="eyebrow">' + p[0] + "</p><strong>" + esc(p[1]) + "</strong><small>" + p[2] + "</small></div>"; }).join("") + "</div>" +
        '<p class="muted" style="margin:0">Budget ' + EUR.format(t.budget) + " · paid " + EUR.format(o.paid) + " · waiting " + EUR.format(o.pending) + " · left " + EUR.format(Math.max(0, t.budget - o.paid - o.pending)) + "</p>" +
        splitPanel(t) + budgetForm(t) +
        expTable(visExp().filter(function (e) { return e.team === open; }), false) + "</section>" + teamInfoPanel(open) + rosterPanel(open);
    }
    return '<div class="ph-head"><div><h1 class="display">' + (can("all") ? "Every team." : "My team.") + "</h1><p>Each official team has a season budget agreed with its captain, and three dedicated associates.</p></div></div>" +
      '<section class="panel"><div class="table-wrap"><table><thead><tr><th>Team</th><th>Budget</th><th class="r">Agreed</th><th class="r">Paid</th><th>Used (paid + waiting)</th></tr></thead><tbody>' +
      ts.map(function (t) { var o = totals(t.id), p = t.budget ? Math.min(100, o.paid / t.budget * 100) : 0, q = t.budget ? Math.min(100 - p, o.pending / t.budget * 100) : 0;
        return '<tr class="click" data-hteam="' + t.id + '" tabindex="0"><td class="tname">' + esc(tLabel(t)) + "</td><td>" + pill(BUDGET_STATUS, t.status) + '</td><td class="r num">' + EUR.format(t.budget) + '</td><td class="r num">' + EUR.format(o.paid) + '</td><td style="width:22%"><div class="bar"><i style="width:' + p + '%"></i><i class="pend" style="left:' + p + "%;width:" + q + '%"></i></div></td></tr>'; }).join("") +
      "</tbody></table></div>" + (can("all") ? '<p class="muted" style="margin:0;font-size:12px">Select a team to see its associates and expenses.</p>' : "") + "</section>" + feed + rostersOverview() + detail;
  }
  // ---- Expenses ledger -------------------------------------------------------------------------
  // Signed in with Convex: rows come from the database (only what this account may see, kept live).
  // Without Convex (local preview): the example rows saved in this browser.
  var LIVE = { exp: null, ideas: null, checks: {}, unExp: null, unIdeas: null, dirty: false };
  // Phones: the Hub tabs are one sideways-scrolling row; keep the open tab in view.
  function showTab() {
    var nav = hub.querySelector(".rail nav"), a = nav && nav.querySelector('[aria-current="page"]');
    if (a && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
  }
  function live() { return !!(backend && backend.watchExpenses && (admin || captain)); }
  function meEmail() { var m = admin || captain; return m ? m.email : ""; }
  function errText(x, d) { var m = String((x && x.data) || (x && x.message) || ""), m2 = m.match(/ConvexError: (.*)/); return (m2 ? m2[1] : x && x.data ? m : "") || d || "Something went wrong. Try again."; }
  function fromServer(r) {
    return { id: r._id, team: r.team, dept: r.dept, item: r.item, cat: r.cat, amount: r.amount, by: r.by, byEmail: r.byEmail, date: r.date, status: r.status, link: r.link,
      files: (r.fileLinks || []).map(function (x) { return { name: x.name, data: x.url, type: x.type }; }), decidedBy: r.decidedBy, decidedByEmail: r.decidedByEmail, reason: r.reason, esade: r.esade, esadeAt: r.esadeAt, esadeNote: r.esadeNote,
      history: r.history || [], example: r.isExample, sv: { d: r.canDecide, p: r.canPay, r: r.canReconsider, e: r.canEsade } };
  }
  function hubBusy() { var a = document.activeElement; if (hub.querySelector("form.dirty[data-ho-form], form.dirty[data-keep]")) return true; return !!(a && hub.contains(a) && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "button" && a.type !== "submit") || a.tagName === "SELECT")); }
  // Live updates often arrive in bursts (a dozen queries at sign-in): redraw the Hub at most once per frame.
  var refreshQueued = false;
  function hubRefresh() { if (refreshQueued) return; refreshQueued = true; requestAnimationFrame(function () { refreshQueued = false; hubRefreshNow(); }); }
  function hubRefreshNow() { if (location.hash.indexOf("#hub-") !== 0) { updateTitle(); return; } if (hubBusy()) { LIVE.dirty = true; bellPatch(); return; } LIVE.dirty = false; render(); }
  function startLive() {
    if (!backend || !backend.watchExpenses) return;
    var on = !!(admin || captain);
    if (on && !LIVE.unExp) {
      LIVE.unExp = backend.watchExpenses(function (rows) { if (rows === undefined) return; LIVE.exp = (rows || []).map(fromServer); hubRefresh(); });
      LIVE.unIdeas = backend.watchIdeas(function (rows) { if (rows === undefined) return; LIVE.ideas = rows || []; hubRefresh(); });
      LIVE.unLinks = backend.watchDeptLinks ? backend.watchDeptLinks(function (rows) { if (rows === undefined) return; LIVE.links = rows || []; hubRefresh(); }) : null;
      LIVE.unTupd = backend.watchTaskUpdates ? backend.watchTaskUpdates(function (rows) { if (rows === undefined) return; LIVE.tupd = rows || []; hubRefresh(); }) : null;
      LIVE.unNotifs = backend.watchNotifications ? backend.watchNotifications(function (d) { if (d === undefined) return; LIVE.notifs = d; hubRefresh(); }) : null;
      // Shared Hub data: same for everyone with the right access (convex/tasks, budgets, results, org, partners, inbox).
      LIVE.subs = [];
      applyPeople(); applyBudgets();
      if (backend.watch) [["tasks", "tasks"], ["budgets", "budgets"], ["results", "results"], ["people", "people"], ["partners", "partners"], ["inbox", "inbox"], ["tournament", "tournament"], ["handover", "handover"], ["contracts", "contracts"], ["media", "media"], ["tryouts", "tryouts"], ["emailProblems", "emailProblems"]].forEach(function (x) {
        LIVE.subs.push(backend.watch(x[0], function (d) { if (d === undefined) return; LIVE[x[1]] = d; if (x[1] === "handover") hoPatchFiles(); if (x[1] === "people") applyPeople(); if (x[1] === "budgets") applyBudgets(); hubRefresh(); }));
      });
      if (backend.watch && boardAccount()) [["messages", "messages"], ["assocApps", "assocApps"]].forEach(function (x) {
        LIVE.subs.push(backend.watch(x[0], function (d) { if (d === undefined) return; LIVE[x[1]] = d || []; hubRefresh(); }));
      });
      if (backend.watch && chatAccount()) LIVE.subs.push(backend.watch("chats", function (d) { if (d === undefined) return; LIVE.chats = d; if (chatPatch()) bellPatch(); else hubRefresh(); }));
      watchGoals(goalTerm());
    } else if (!on && LIVE.unExp) {
      if (LIVE.unChat) LIVE.unChat(); LIVE.unChat = null; LIVE.chatOpen = null; LIVE.chatMsgs = null;
      (LIVE.subs || []).forEach(function (u) { try { u(); } catch (e) {} }); LIVE.subs = [];
      if (LIVE.unGoals) LIVE.unGoals(); LIVE.unGoals = null;
      if (LIVE.unAct) LIVE.unAct(); LIVE.unAct = null; LIVE.act = null; LIVE.actTeam = null;
      ["tasks", "budgets", "results", "people", "partners", "inbox", "goals", "messages", "assocApps", "chats", "tournament", "handover", "contracts", "media", "tryouts", "emailProblems"].forEach(function (k) { LIVE[k] = null; });
      setTimeout(function () { applyPeople(); applyBudgets(); }, 0);
      LIVE.unExp(); LIVE.unIdeas(); if (LIVE.unNotifs) LIVE.unNotifs(); if (LIVE.unTupd) LIVE.unTupd(); if (LIVE.unLinks) LIVE.unLinks(); LIVE.unLinks = null; LIVE.links = null; LIVE.unTupd = null; LIVE.tupd = null; LIVE.unExp = LIVE.unIdeas = LIVE.unNotifs = null; LIVE.notifs = null; LIVE.exp = LIVE.ideas = null; LIVE.checks = {}; ROSTER = {}; ROSTER_ALL = null;
    }
  }
  // Goals are per semester: re-subscribe when the Board looks at another semester.
  function watchGoals(term) {
    if (!backend || !backend.watch || !(admin || captain)) return;
    if (LIVE.unGoals && LIVE.goalsTerm === term) return;
    if (LIVE.unGoals) LIVE.unGoals();
    LIVE.goalsTerm = term; LIVE.goals = undefined; LIVE.unGoals = function () {};
    var un = backend.watch("goals", function (d) { if (d === undefined || LIVE.goalsTerm !== term) return; LIVE.goals = d; setTimeout(hubRefresh, 0); }, { term: term });
    if (LIVE.goalsTerm === term) LIVE.unGoals = un; else un();
  }
  // Latest activity of one team (captain pages): the most recent changes made on the team, newest first.
  // Admins, President / VPs and the view-only account see any team; a captain only their own (checked in Convex).
  var ACT_AREAS = [["all", "All activity"], ["expenses", "Expenses"], ["ideas", "Ideas & logistics"], ["roster", "Roster"], ["tournament", "Tournament"], ["handover", "Handover"], ["contracts", "Contracts"], ["media", "Photos & videos"], ["results", "Results"], ["signups", "Sign-ups"], ["budget", "Budget"], ["team", "Team editor"]];
  function watchActivity(id) {
    if (!backend || !backend.watch || !(admin || captain)) return;
    if (LIVE.unAct && LIVE.actTeam === id) return;
    if (LIVE.unAct) LIVE.unAct();
    LIVE.actTeam = id; LIVE.act = undefined; state.actArea = "all"; state.actMore = false; LIVE.unAct = function () {};
    var un = backend.watch("activity", function (d) { if (d === undefined || LIVE.actTeam !== id) return; LIVE.act = d || []; setTimeout(hubRefresh, 0); }, { team: id });
    if (LIVE.actTeam === id) LIVE.unAct = un; else un();
  }
  function ago(at) {
    var m = Math.floor((Date.now() - at) / 60000);
    if (m < 1) return "just now"; if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60); if (h < 24) return h + " h ago";
    var d = Math.floor(h / 24); return d < 7 ? d + (d === 1 ? " day ago" : " days ago") : fmtDay(at);
  }
  // Compact: the 3 latest items; the arrow opens the list (25, then "Show more"). Open state kept only on this page.
  function activityPanel(id) {
    if (!live() || !backend.watch) return "";
    watchActivity(id);
    var page = location.hash + "|" + id; if (state.actPage !== page) { state.actPage = page; state.actOpen = false; state.actMore = false; }
    var rows = LIVE.actTeam === id ? LIVE.act : undefined, area = state.actArea || "all", all = rows || [];
    var list = area === "all" ? all : all.filter(function (r) { return r.area === area; });
    var shown = !state.actOpen ? list.slice(0, 3) : state.actMore ? list : list.slice(0, 25);
    var label = {}; ACT_AREAS.forEach(function (x) { label[x[0]] = x[1]; });
    var arrow = list.length > 3 ? '<button type="button" class="act-toggle" data-act-open aria-expanded="' + !!state.actOpen + '">' + (state.actOpen ? "Show less" : "Show all " + list.length) + ' <span class="act-arrow' + (state.actOpen ? " up" : "") + '" aria-hidden="true">▾</span></button>' : "";
    return '<section class="panel act-panel" id="act-panel"><div class="act-head"><h2>Latest activity · ' + esc(tLabel(team(id))) + "</h2>" +
      '<label class="act-filter" for="act-area"><span class="sr-only">Show</span><select id="act-area" aria-label="Show">' + ACT_AREAS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === area ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label></div>" +
      (rows === undefined ? '<p class="empty">Loading…</p>' : !list.length ? '<p class="empty">Nothing yet' + (area === "all" ? " for this team." : " in this area.") + "</p>" :
        '<ul class="act-list' + (state.actOpen ? " open" : "") + '">' + shown.map(function (r) {
          return '<li><span class="act-area">' + esc(label[r.area] || r.area) + '</span><span class="act-what">' + esc(r.what) + '<small class="muted">' + esc(r.mine ? "You" : r.by) + ' · <time data-at="' + r.at + '" title="' + esc(new Date(r.at).toLocaleString("en-GB")) + '">' + esc(ago(r.at)) + "</time></small></span></li>";
        }).join("") + "</ul>" + arrow + (state.actOpen && list.length > 25 ? '<button type="button" class="btn sm ghost" data-act-more>' + (state.actMore ? "Show fewer" : "Show more (" + list.length + ")") + "</button>" : "")) +
      "</section>";
  }
  setInterval(function () { document.querySelectorAll("#act-panel time[data-at]").forEach(function (t) { t.textContent = ago(+t.getAttribute("data-at")); }); }, 30000);
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
  var ACTION = { requested: "Requested", validated: "Validated", rejected: "Rejected", paid: "Paid", reopened: "Reopened for review", esade_sent: "Sent to Esade finance", esade_accepted: "Accepted by Esade", esade_refused: "Refused by Esade" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDay(ms) { var d = new Date(ms); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function fmtWhen(ms) { var d = new Date(ms); return fmtDay(ms) + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  // Budget lines: each team's budget is split between Operations and Marketing (example split 70 / 30).
  function budgetLines(t) { var o = Math.round(t.budget * (t.opsShare == null ? 70 : t.opsShare) / 100); return { ops: o, med: t.budget - o }; }
  // Team budgets: set by Finance in Convex. Not set yet = 0 and "Budget not set" (the example figures are for the local preview only).
  var EXAMPLE_BUDGETS = {}; TEAMS.forEach(function (t) { EXAMPLE_BUDGETS[t.id] = [t.budget, t.status]; });
  function applyBudgets() {
    TEAMS.forEach(function (t) {
      if (!live()) { t.budget = EXAMPLE_BUDGETS[t.id][0]; t.status = EXAMPLE_BUDGETS[t.id][1]; t.opsShare = 70; t.budgetNote = ""; return; }
      var b = (LIVE.budgets || []).filter(function (x) { return x.team === t.id; })[0];
      t.budget = b ? b.total : 0; t.status = b ? b.status : "none"; t.opsShare = b ? b.opsShare : 70; t.budgetNote = b ? b.note || "" : ""; t.budgetBy = b ? b.by : "";
    });
  }
  function canBudget(id) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || (u.dept === "fin" && (u.role === "head" || (u.teams || []).indexOf(id) > -1))); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
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
    }).join("") + '<small class="muted split-note">Split set by Finance: ' + (t.opsShare == null ? 70 : t.opsShare) + " / " + (100 - (t.opsShare == null ? 70 : t.opsShare)) + ". Validated and paid expenses count against it.</small></div>";
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
    return '<div class="table-wrap"><table class="ledger-t"><thead><tr><th>Date</th>' + (multi ? "<th>Team</th>" : "") + '<th>Expense</th><th class="r">Amount</th><th>Status</th>' + (act ? '<th class="r">Action</th>' : "") + "</tr></thead><tbody>" +
      list.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (e) {
        var id = String(e.id), btns = "";
        if (state.rejecting === id) btns = '<div class="reject-box"><textarea id="rj-' + id + '" rows="2" placeholder="Why is it rejected? (required)" aria-label="Reason for rejecting"></textarea><div><button class="btn sm solid" data-reject-confirm="' + id + '">Reject</button> <button class="btn sm" data-reject-cancel>Cancel</button></div></div>';
        else if (state.reconsidering === id) btns = '<div class="reject-box"><textarea id="rc-' + id + '" rows="2" placeholder="Why reconsider this decision? (required)" aria-label="Reason for reconsidering"></textarea><div><button class="btn sm solid" data-recon-confirm="' + id + '">Reopen</button> <button class="btn sm" data-reject-cancel>Cancel</button></div></div>';
        else {
          if (canDecideE(e)) btns = (canEsadeE(e) ? esadeBox(e) : "") + (e.esade === "accepted" ? '<button class="btn sm solid" data-act="validated" data-id="' + id + '">Validate</button>' : '<button class="btn sm" disabled title="Esade finance has to accept it first">Validate</button>') + ' <button class="btn sm" data-act="reject" data-id="' + id + '">Reject</button>';
          if (canPayE(e)) btns = '<button class="btn sm solid" data-act="paid" data-id="' + id + '">Mark paid</button>';
          if (canReconE(e)) btns += (btns ? " " : "") + '<button class="btn sm ghost" data-act="reconsider" data-id="' + id + '">Reconsider</button>';
        }
        var files = (e.link ? '<a href="' + esc(e.link) + '" target="_blank" rel="noopener">Link ' + ico("out") + '</a>' : "") + filesOf(e).map(function (x, i) { return (e.link || i ? " · " : "") + '<a href="' + esc(x.data) + '" target="_blank" rel="noopener" download="' + esc(x.name) + '">' + esc(x.name) + "</a>"; }).join("");
        var who = e.decidedBy && e.status !== "requested" ? '<br><small class="muted">' + (e.status === "rejected" ? "Rejected" : "Validated") + " by " + esc(e.decidedBy) + "</small>" : "";
        var why = e.status === "rejected" && e.reason ? '<br><small class="reason">“' + esc(e.reason) + "”</small>" : "";
        var reopened = (e.history || []).some(function (x) { return x.action === "reopened"; }) ? ' <span class="pill info">Reconsidered</span>' : "";
        return '<tr><td class="num muted">' + e.date.slice(5).split("-").reverse().join("/") + "</td>" + (multi ? '<td class="tname">' + esc(tLabel(team(e.team)) || e.team) + "</td>" : "") +
          "<td>" + esc(e.item) + (e.example ? ' <span class="pill">Example</span>' : "") + (compact ? "" : '<br><small class="muted">' + esc(e.cat) + " · " + esc(e.dept === "Media & Marketing" ? "Marketing budget" : e.dept + " budget") + " · by " + esc(e.by) + "</small>") + (files && !compact ? '<br><small class="files">' + files + "</small>" : "") + (compact ? "" : histList(e)) +
          '</td><td class="r num"><strong>' + EUR.format(e.amount) + "</strong></td><td>" + pill(EXP_STATUS, e.status) + reopened + esadeLine(e) + who + why + "</td>" +
          (act ? '<td class="r">' + btns + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function exportButtons(kind) {
    return '<div class="exports"><button type="button" class="btn sm" data-export="xlsx" data-scope="' + kind + '">' + ico("down") + ' Excel</button><button type="button" class="btn sm" data-export="pptx" data-scope="' + kind + '">' + ico("down") + ' PowerPoint</button></div>';
  }
  function hubExpenses() {
    var list = visExp(), u = hv();
    var shown = state.hubFilter === "all" ? list : list.filter(function (e) { return e.status === state.hubFilter; });
    var mine = { med: "Media & Marketing", par: "Partnerships", it: "IT" }[u.dept] || "Operations";
    var lines = [["Operations", "Operations"], ["Media & Marketing", "Marketing"], ["Partnerships", "Partnerships"], ["IT", "IT"]].map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === mine ? " selected" : "") + ">" + l[1] + "</option>"; }).join("");
    var form = can("submit") ? '<section class="panel"><div class="panel-head"><h2>Request a payment</h2><span class="muted" style="font-size:12px">The association pays directly. No captain fronts money.</span></div><form class="form" id="req">' +
      (visTeams().length > 1 ? '<label for="r-team">Team<select id="r-team">' + visTeams().map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label for="r-item" style="grid-column:span 2">What is it for<input id="r-item" required maxlength="140" placeholder="e.g. Referee fees, November"></label>' +
      '<label for="r-dept">Budget line<select id="r-dept">' + lines + '</select></label><label for="r-cat">Category<select id="r-cat"><option>League fees</option><option>Facilities</option><option>Kit</option><option>Material</option><option>Travel</option><option>Media</option><option>Promotion</option><option>Events</option></select></label>' +
      '<label for="r-amt">Amount (€)<input id="r-amt" type="number" min="1" step="1" required inputmode="numeric" placeholder="0"></label>' +
      '<label for="r-link" style="grid-column:span 2">Link to the product or quote (optional)<input id="r-link" type="url" placeholder="https://..."></label><div class="mpick-field">Unpaid invoices, quotes or PDFs (Finance forwards them to Esade)' + pickBox("r-file", "image/*,application/pdf", "+ Add files") + "</div>" + '' +
      '<div><button class="btn solid" type="submit" id="r-send" style="width:100%">Send request</button></div></form></section>' : "";
    var ex = "";
    if (admin && live() && LIVE.exp) ex = LIVE.exp.some(function (e) { return e.example; })
      ? '<p class="muted ex-tools">Example rows are loaded for the demo. <button type="button" class="btn sm" data-examples="remove">Remove example expenses</button></p>'
      : '<p class="muted ex-tools">The ledger is empty. For a demo: <button type="button" class="btn sm" data-examples="load">Load example expenses</button> (marked “Example”, removable in one click).</p>';
    return '<div class="ph-head"><div><h1 class="display">Every euro, traced.</h1><p>Every request, decision and payment for ' + (hFull() ? "every team and department" : u.role === "head" ? (u.dept === "fin" ? "every team" : esc(deptName(u.dept)) + ", every team") : u.role === "associate" ? esc(deptName(u.dept)) + " · " + esc(teamsText(u.teams)) : "your team") + '. It updates as soon as a request is decided or reconsidered, and downloads as Excel or PowerPoint.</p></div>' + exportButtons("ledger") + "</div>" +
      '<div class="flow" aria-label="How an expense moves"><span>Captain or department requests, with the unpaid invoice</span><span>Finance sends it to Esade finance</span><span>Esade accepts or refuses</span><span>Finance validates or rejects (with a reason)</span><span>Association pays</span></div>' + ex + form +
      '<section class="panel"><div class="chips" role="group" aria-label="Filter by status">' + [["all", "All"], ["requested", "Requested"], ["validated", "Validated"], ["paid", "Paid"], ["rejected", "Rejected"]].map(function (c) {
        var n = c[0] === "all" ? list.length : list.filter(function (e) { return e.status === c[0]; }).length;
        return '<button class="chip" data-filter="' + c[0] + '" aria-pressed="' + (state.hubFilter === c[0]) + '">' + c[1] + ' <span class="num">' + n + "</span></button>"; }).join("") + "</div>" + expTable(shown, false) + "</section>";
  }
  // Decide / pay / reconsider: Convex when signed in, else this browser (prototype).
  function expAct(kind, id, reason) {
    if (kind.indexOf("esade-") === 0) {
      var step = kind.slice(6), emsg = step === "sent" ? "Marked as sent to Esade finance." : step === "accepted" ? "Esade accepted. Finance can validate it now." : "Esade refused. You can reject the request with that reason.";
      state.esadeRefusing = null;
      if (live()) return Promise.resolve(backend.esadeExpense({ id: id, step: step, note: reason || undefined })).then(function () { toast(emsg); render(); }, function (x) { toast(errText(x)); render(); });
      state.expenses.forEach(function (e) { if (String(e.id) !== id) return; e.esade = step; e.esadeAt = Date.now(); e.esadeNote = reason || undefined; (e.history = e.history || []).push({ action: "esade_" + step, by: meLabel(), at: e.esadeAt, reason: reason || undefined }); });
      save(); render(); toast(emsg); return;
    }
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
      file: ("esade-sports-" + title + "-" + (r ? termLabel(r.key) : "season-2026-27")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
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
      key = acad + "-" + pad2((acad + 1) % 100) + " S" + sem; label = (sem === 1 ? "Fall " : "Spring ") + acad + "–" + pad2((acad + 1) % 100) + (sem === 1 ? " (Sep–Jan)" : " (Feb–Aug)");
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
    var form = hRO() ? "" : '<form class="form ck-form" id="ck-form" data-period="' + esc(p.kind + "|" + p.key + "|" + (sc.team || "")) + '"><p class="form-sub">Your check-up for ' + esc(ckScopeText(sc)) + "</p>" +
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
    return '<div class="ph-head"><div><h1 class="display">Reports.</h1><p>Weekly check-ups for associates, monthly for heads and the Board, every semester for all members. Each report has its Excel and PowerPoint, updated as soon as a request is decided or reconsidered.</p></div>' + exportButtons("checkup") + "</div>" +
      '<section class="panel ck-bar"><div class="chips" role="group" aria-label="Check-up type">' + kinds.map(function (k) { return '<button class="chip" data-ck-kind="' + k + '" aria-pressed="' + (k === p.kind) + '">' + CK_NAMES[k] + "</button>"; }).join("") + "</div>" +
      '<div class="ck-nav"><button type="button" class="btn sm" data-ck-off="-1" aria-label="Previous">' + ico("left") + '</button><strong>' + esc(p.label) + '</strong><button type="button" class="btn sm" data-ck-off="1" aria-label="Next"' + ((state.ck.off || 0) >= 0 ? " disabled" : "") + ">" + ico("right") + "</button>" + ((state.ck.off || 0) ? '<button type="button" class="btn sm ghost" data-ck-off="0">Current</button>' : "") + '</div><p class="muted" style="margin:0;font-size:12px">' + esc(who) + "</p></section>" +
      '<div class="grid-4 grid-5">' + m.kpis.map(function (k) { return stat(k.label, k.value, k.note); }).join("") + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Requests and decisions</h2><span class="muted" style="font-size:12px">' + esc(p.label) + "</span></div>" + decisions + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Check-up notes</h2>' + (notes.length ? '<span class="pill ' + (issues ? "bad" : "ok") + '">' + (issues ? issues + " issue" + (issues === 1 ? "" : "s") : "All OK") + "</span>" : "") + "</div>" +
      (loading ? '<p class="empty">Loading…</p>' : notes.length ? '<ul class="notes">' + notes.map(function (c) { return '<li><span class="pill ' + (c.status === "issues" ? "bad" : "ok") + '">' + (c.status === "issues" ? "Issues" : "OK") + "</span><div><strong>" + esc(ckScopeText(c)) + "</strong>" + (c.note ? "<p>" + esc(c.note) + "</p>" : "") + '<small class="muted">' + esc(c.by) + " · " + esc(fmtWhen(c.at)) + "</small></div></li>"; }).join("") + "</ul>" : '<p class="empty">No notes yet for this period.</p>') +
      form + "</section>" + deck + budget + (p.kind === "semester" && (hFull() || u.role === "head") ? metricsPanel() : "");
  }
  function metricsPanel() {
    if (live()) return '<section class="panel"><div class="panel-head"><h2>Goals for the Student Council</h2><a class="btn sm" href="#hub-goals">Open Goals</a></div><p class="muted" style="margin:0">The semester targets and their real numbers are on the Goals page, counted from the website and the Hub.</p></section>';
    return '<section style="display:grid;gap:12px"><h2 style="margin:0;font-size:15px;font-weight:800">Seven metrics for the Student Council</h2><ul class="metrics">' + METRICS.map(function (m) { return '<li class="metric"><p class="eyebrow">' + m[0] + "</p><strong>—</strong><small>" + m[1] + "</small></li>"; }).join("") + '</ul><p class="muted" style="margin:0;font-size:12px">Metrics fill in once the association is running. Shown empty on purpose.</p></section>';
  }

  // ---- Ideas & logistics -----------------------------------------------------------------------
  // Captain suggests (or Operations comes up with it) → Operations researches → Operations sends it to the captain
  // (budget: an expense request goes to Finance; team only: just the captain) → captain approves → Marketing
  // communicates it (media accounts or platform news). Every step notifies the next people.
  var IDEA_KINDS = ["Friendly game", "Tournament", "Jerseys / kit", "Travel / logistics", "Training facility", "League facility", "Other"];
  var IDEA_STATUS = { "new": ["warn", "New · for Operations"], researching: ["info", "Operations researching"], awaiting: ["warn", "Waiting for the captain"], approved: ["info", "Approved · Marketing to communicate"], communicated: ["ok", "Communicated"], planned: ["ok", "Planned"], dropped: ["bad", "Not going ahead"] };
  var IDEA_CAT = { "Friendly game": "Facilities", Tournament: "League fees", "Jerseys / kit": "Kit", "Travel / logistics": "Travel", "Training facility": "Facilities", "League facility": "Facilities" };
  function allIdeas() { return live() ? LIVE.ideas || [] : state.ideas || []; }
  function inDept(d, teamId) { var u = hv(); return hFull() || (u.role === "head" && u.dept === d) || (u.role === "associate" && u.dept === d && (u.teams || []).indexOf(teamId) > -1); }
  function seeIdea(i) { var u = hv(); return inDept("ops", i.team) || inDept("fin", i.team) || inDept("med", i.team) || (u.role === "captain" && (u.teams || []).indexOf(i.team) > -1); }
  function visIdeas() { return allIdeas().filter(seeIdea); }
  function editsDept(d, teamId) { var u = hv(); return !hRO() && (u.role === "admin" || u.role === "exec" || ((u.role === "head" || u.role === "associate") && u.dept === d && (u.role === "head" || (u.teams || []).indexOf(teamId) > -1))); }
  function canRunIdea(i) { return editsDept("ops", i.team) && (!live() || !!i.canUpdate); }
  function canApproveIdea(i) { var u = hv(); return i.status === "awaiting" && !hRO() && (u.role === "admin" || u.role === "exec" || (u.role === "captain" && (u.teams || []).indexOf(i.team) > -1)) && (!live() || !!i.canApprove); }
  function canCommIdea(i) { return i.status === "approved" && editsDept("med", i.team) && (!live() || !!i.canCommunicate); }
  function canSuggest() { var u = hv(); return !hRO() && (u.role === "captain" || u.role === "admin" || u.role === "exec" || u.dept === "ops"); }
  function opsView() { var u = hv(); return u.role !== "captain" && (u.role === "admin" || u.role === "exec" || u.dept === "ops"); }
  function concernsField(name, val) {
    return '<fieldset class="ck-status concerns"><legend>What does it concern?</legend><label><input type="radio" name="' + name + '" value="team"' + (val !== "budget" ? " checked" : "") + '> Only the team (the captain approves)</label><label><input type="radio" name="' + name + '" value="budget"' + (val === "budget" ? " checked" : "") + "> The budget (Finance gets an expense request)</label></fieldset>";
  }
  function hubIdeas() {
    var list = visIdeas(), ops = opsView();
    var form = canSuggest() ? '<section class="panel"><div class="panel-head"><h2>' + (ops ? "New idea or request" : "Suggest something") + '</h2><span class="muted" style="font-size:12px">' + (ops ? "Goes to the captain for approval, and to Finance if it needs budget" : "Goes to the Operations associate of your team") + '</span></div><form class="form" id="idea-form">' +
      (visTeams().length > 1 ? '<label for="id-team">Team<select id="id-team">' + visTeams().map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label for="id-kind">Type<select id="id-kind">' + IDEA_KINDS.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("") + "</select></label>" +
      (ops ? '<label for="id-est">Estimated cost (€)<input id="id-est" type="number" min="0" step="1" inputmode="numeric" placeholder="Only if it needs budget"></label>' : "") +
      '<label for="id-text" style="grid-column:1/-1">' + (ops ? "Comment: what it is, dates, options, why" : "The idea") + '<textarea id="id-text" rows="3" maxlength="600" required placeholder="e.g. A friendly against another business school in December"></textarea></label>' +
      (ops ? '<div style="grid-column:1/-1">' + concernsField("id-concerns", "team") + "</div>" : "") +
      '<div><button class="btn solid" type="submit" id="id-send">' + (ops ? "Send to the captain" : "Send to Operations") + "</button></div></form></section>" : "";
    var rows = list.length ? '<ul class="ideas">' + list.map(function (i) {
      var id = String(i._id || i.id), com = i.comments || [];
      var actions = "";
      if (canRunIdea(i) && (i.status === "new" || i.status === "researching" || i.status === "planned")) actions =
        '<form class="form idea-upd" data-idea="' + id + '"><label>Estimated cost (€)<input name="estimate" type="number" min="0" step="1" value="' + (i.estimate || "") + '"></label>' +
        '<label style="grid-column:1/-1">Research notes<textarea name="note" rows="2" maxlength="1000" placeholder="Options found, dates, prices negotiated">' + esc(i.opsNote || "") + "</textarea></label>" +
        '<div style="grid-column:1/-1">' + concernsField("cc-" + id, i.concerns) + "</div>" +
        '<label style="grid-column:1/-1">Comment for the captain<textarea name="comment" rows="2" maxlength="600" placeholder="What you propose and why"></textarea></label>' +
        '<div class="idea-btns"><button class="btn sm solid" type="submit" data-do="send">Send to the captain</button><button class="btn sm" type="submit" data-do="note">Save notes</button><button class="btn sm ghost" type="submit" data-do="drop">Drop</button></div></form>';
      else if (canApproveIdea(i)) actions = '<div class="form idea-upd" data-idea-decide="' + id + '"><label style="grid-column:1/-1">Comment (optional)<textarea name="comment" rows="2" maxlength="600"></textarea></label><div class="idea-btns"><button class="btn sm solid" type="button" data-approve="1">Approve</button><button class="btn sm ghost" type="button" data-approve="0">Decline</button></div></div>';
      else if (canCommIdea(i)) actions = '<div class="idea-btns idea-upd"><span class="muted" style="font-size:13px">Communicated it?</span><button class="btn sm solid" type="button" data-comm="media" data-id="' + id + '">On the media accounts</button><button class="btn sm" type="button" data-comm="news" data-id="' + id + '">As platform news</button></div>';
      return '<li class="panel idea"><div class="idea-head"><span class="pill">' + esc(i.kind) + '</span><strong class="tname">' + esc(tLabel(team(i.team)) || i.team) + "</strong>" + pill(IDEA_STATUS, IDEA_STATUS[i.status] ? i.status : "new") + (i.concerns ? '<span class="pill">' + (i.concerns === "budget" ? "Needs budget" : "Team only") + "</span>" : "") + "</div><p>" + esc(i.text) + '</p><small class="muted">' + (i.origin === "ops" ? "Proposed by " : "Suggested by ") + esc(i.by) + " · " + esc(fmtDay(i.at)) + "</small>" +
        (i.opsNote || i.estimate ? '<div class="ops-note"><b>Operations</b>' + (i.opsNote ? "<p>" + esc(i.opsNote) + "</p>" : "") + (i.estimate ? "<p>Estimated cost: <b>" + EUR.format(i.estimate) + "</b>" + (i.expenseId || i.expense ? " · expense request sent to Finance" : "") + "</p>" : "") + "</div>" : "") +
        (i.status === "communicated" ? '<p class="done-note">Communicated ' + (i.channel === "news" ? "as platform news" : "on the media accounts") + (i.updatedBy ? " by " + esc(i.updatedBy) : "") + ".</p>" : "") +
        (com.length ? '<ul class="comments">' + com.map(function (c) { return "<li><b>" + esc(c.by) + '</b> <small class="muted">' + esc(fmtWhen(c.at)) + "</small><p>" + esc(c.text) + "</p></li>"; }).join("") + "</ul>" : "") +
        actions +
        (!hRO() && (!live() || i.canComment) ? '<form class="comment-f" data-comment="' + id + '"><input name="text" maxlength="600" placeholder="Add a comment" aria-label="Add a comment"><button class="btn sm" type="submit">Comment</button></form>' : "") + "</li>";
    }).join("") + "</ul>" : '<p class="empty">' + (live() && LIVE.ideas === null ? "Loading…" : "No ideas yet.") + "</p>";
    return '<div class="ph-head"><div><h1 class="display">Ideas &amp; logistics.</h1><p>Friendlies, tournaments, jerseys, travel, training and league facilities. Captains suggest and Operations researches, or Operations proposes. The captain approves, Finance gets the expense if it needs budget, and Marketing communicates it.</p></div></div>' +
      '<div class="flow"><span>Idea</span><span>Operations researches</span><span>Captain approves</span><span>Finance (if budget)</span><span>Marketing communicates</span></div>' + form + rows;
  }
  // Local (no database) version of the same flow, for the prototype preview.
  function localIdea(id, fn) { state.ideas.forEach(function (i) { if (String(i.id) === id) fn(i); }); save(); render(); }
  function localSend(i, concerns, est, comment) {
    i.status = "awaiting"; i.concerns = concerns; if (est) i.estimate = est; i.updatedBy = meLabel();
    if (comment) (i.comments = i.comments || []).push({ by: meLabel(), at: Date.now(), text: comment });
    if (concerns === "budget" && i.estimate && !i.expense) {
      var now = Date.now(), d = new Date(now);
      state.expenses.push({ id: state.nextId++, team: i.team, dept: "Operations", item: (i.kind + ": " + i.text).slice(0, 140), cat: IDEA_CAT[i.kind] || "Other", amount: i.estimate, by: meLabel(), date: d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()), status: "requested", history: [{ action: "requested", by: meLabel(), at: now, reason: "From Ideas & logistics" }] });
      i.expense = true; pushNotif({ team: i.team, dept: "Finance", title: "New expense request: " + i.kind, link: "hub-expenses" });
    }
    pushNotif({ team: i.team, captains: true, title: "Operations needs your approval: " + i.kind, body: comment || i.text, link: "hub-ideas" });
  }

  // ---- Notifications ----------------------------------------------------------------------------
  function pushNotif(n) { n.at = Date.now(); n.by = meLabel(); (state.notifs = state.notifs || []).unshift(n); state.notifs = state.notifs.slice(0, 60); save(); }
  function seeNotif(n) {
    var u = hv(), mine = (u.teams || []).indexOf(n.team) > -1;
    if (n.aud) return true; // first sign-ins etc.: Convex already sent only the ones for this person
    if (hFull()) return true;
    if (n.captains && u.role === "captain" && mine) return true;
    if (n.dept && DEPT_ID[n.dept] === u.dept && (u.role === "head" || (u.role === "associate" && mine))) return true;
    return false;
  }
  function notifData() {
    if (live()) { var d = LIVE.notifs || { items: [], seenAt: 0 }; return { items: (d.items || []).filter(seeNotif), seenAt: d.seenAt || 0 }; }
    return { items: (state.notifs || []).filter(seeNotif).slice(0, 40), seenAt: state.notifSeen || 0 };
  }
  function unreadCount() { var d = notifData(); return d.items.filter(function (n) { return n.at > d.seenAt; }).length; }
  function notifPanel() {
    var d = notifData(); if (!d.items.length) return "";
    var html = '<section class="panel notifs"><div class="panel-head"><h2>Notifications</h2>' + (unreadCount() ? '<span class="pill warn">' + unreadCount() + " new</span>" : "") + '</div><ul class="notif-list">' +
      d.items.slice(0, 6).map(function (n) { return '<li class="' + (n.at > d.seenAt ? "unread" : "") + '"><a href="#' + esc(n.link || "hub-overview") + '"><strong>' + esc(n.title) + "</strong>" + (n.body ? "<span>" + esc(n.body) + "</span>" : "") + '<small class="muted">' + esc(n.by) + " · " + esc(fmtWhen(n.at)) + "</small></a></li>"; }).join("") + "</ul></section>";
    // Opening the overview marks them as seen (after this render, so the "new" marks show once).
    if (unreadCount()) setTimeout(function () {
      if (live()) { if (backend.markNotifsSeen) Promise.resolve(backend.markNotifsSeen()).catch(console.error); }
      else { state.notifSeen = Date.now(); save(); }
    }, 1500);
    return html;
  }
  function hubTeamEditor() {
    var ts = visTeams(), selected = state.teamOpen && teamOk(state.teamOpen) ? state.teamOpen : ts[0].id, t = team(selected), info = teamInfoFor(selected), results = teamResultsFor(selected);
    var teamField = ts.length > 1 ? '<label for="ti-team">Team<select id="ti-team" data-nodraft>' + ts.map(function (x) { return '<option value="' + x.id + '"' + (x.id === selected ? ' selected' : '') + '>' + esc(tLabel(x)) + '</option>'; }).join('') + '</select></label>' : '<input type="hidden" id="ti-team" value="' + esc(selected) + '">';
    var rows = results.length ? results.slice().reverse().map(function (r) { return '<tr><td class="num">' + esc(r.date) + '</td><td class="opp">' + esc(r.opponent) + '</td><td>' + esc(r.side) + '</td><td class="num"><strong>' + esc(r.score) + '</strong></td><td>' + esc(r.status) + (r.canRemove ? ' <button type="button" class="btn sm ghost" data-res-del="' + esc(String(r.id)) + '" aria-label="Remove this result">' + ico("x") + "</button>" : "") + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="muted">No results yet.</td></tr>';
    return '<div class="ph-head"><div><h1 class="display">Team editor.</h1><p>Keep your team page current: team information, league source, venue and results. Manual updates are available immediately; live league syncing can be connected once the competition provides an API or approved feed.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Team information</h2><span class="muted">' + (can("teamEdit") ? "Saved for everyone" : "View only") + '</span></div><form class="form" id="team-info-form" data-team="' + esc(selected) + '">' + teamField +
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
  // ---- Try-outs inbox (live): try-out, "just for fun" and coach sign-ups (convex/admin.ts listTeamApplications).
  // Convex only returns the teams this account may see (captain: own teams; Operations: its teams; Board/admins: all);
  // the Hub then keeps the teams of the current view (Captain pages bar, "Demo as").
  var TRY_STATUSES = ["New", "Contacted", "Trial invited", "Accepted", "Declined"]; // same as convex/stages.ts
  function trySlug(s) { return String(s || "New").replace(/\s+/g, "-").toLowerCase(); }
  function visTryouts() { return live() && LIVE.tryouts ? LIVE.tryouts.filter(function (a) { return teamOk(a.teamSlug); }) : []; }
  function tryKind(a) { return a.kind === "coach" ? "Coach" : a.track === "social" ? "Just for fun" : "Try-out"; }
  function tryTeam(a) { var t = team(a.teamSlug); return t ? tLabel(t) : a.teamSlug; }
  function tryStatusSel(a) {
    var st = a.status || "New", opts = TRY_STATUSES.indexOf(st) > -1 ? TRY_STATUSES : [st].concat(TRY_STATUSES);
    return '<select class="stg-sel stg-' + trySlug(st) + '" data-try-status="' + esc(a._id) + '" aria-label="Status of ' + esc(a.firstName + " " + a.lastName) + '">' + opts.map(function (o) { return "<option" + (o === st ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
  }
  function tryStatusCell(a) { return hRO() ? '<span class="stg-chip stg-' + trySlug(a.status) + '">' + esc(a.status || "New") + "</span>" : tryStatusSel(a); }
  function hubTryoutsLive() {
    var head = '<div class="ph-head"><div><h1 class="display">Try-outs inbox.</h1><p>Try-out, "just for fun" and coach sign-ups from the website. Each captain sees their own team; Operations sees the teams it covers. Click a sign-up to see everything and add notes.</p></div></div>';
    if (LIVE.tryouts == null) return head + '<section class="panel"><p class="empty">Loading…</p></section>';
    head += mailWarnPanel(["tryout"]);
    var all = visTryouts(), f = state.tFilter || "all", tf = state.tTeam || "";
    var teams = visTeams().filter(function (t) { return all.some(function (a) { return a.teamSlug === t.id; }); });
    if (tf && !teams.some(function (t) { return t.id === tf; })) tf = "";
    var inTeam = all.filter(function (a) { return !tf || a.teamSlug === tf; });
    var rows = inTeam.filter(function (a) { return f === "all" || (a.status || "New") === f; });
    var cnt = function (k) { return inTeam.filter(function (a) { return (a.status || "New") === k; }).length; };
    var many = visTeams().length > 1, open = all.filter(function (a) { return a._id === state.tryOpen; })[0];
    return head + '<div class="grid-4">' + stat("New", String(cnt("New")), "not handled yet") + stat("Trial invited", String(cnt("Trial invited")), "invited to a session") + stat("Accepted", String(cnt("Accepted")), "joined the team") + stat("Total", String(inTeam.length), "sign-ups received") + "</div>" +
      '<section class="panel"><div class="chips" role="group" aria-label="Status">' + [["all", "All"]].concat(TRY_STATUSES.map(function (s) { return [s, s]; })).map(function (x) { return '<button class="chip" data-tf="' + esc(x[0]) + '" aria-pressed="' + (f === x[0]) + '">' + esc(x[1]) + (x[0] === "all" ? "" : " (" + cnt(x[0]) + ")") + "</button>"; }).join("") +
      (many && teams.length > 1 ? '<select id="try-team" aria-label="Team"><option value="">All teams</option>' + teams.map(function (t) { return '<option value="' + t.id + '"' + (t.id === tf ? " selected" : "") + ">" + esc(tLabel(t)) + "</option>"; }).join("") + "</select>" : "") + "</div>" +
      (rows.length ? '<div class="table-wrap"><table class="msg-table"><thead><tr><th>Applicant</th>' + (many ? "<th>Team</th>" : "") + "<th>Sign-up</th><th>Studies</th><th>Received</th><th>Status</th></tr></thead><tbody>" + rows.map(function (a) {
        var st = a.status || "New";
        return '<tr class="msg-row stg-row stg-' + trySlug(st) + (st === "New" && !a.openedAt ? " unread" : "") + '" data-try-open="' + esc(a._id) + '" tabindex="0" title="Open the sign-up">' +
          '<td><span class="msg-name">' + esc(a.firstName + " " + a.lastName) + "</span>" + mailFailPill(a) + '<br><small class="muted">' + esc(a.email) + " · " + esc(a.phone) + "</small></td>" +
          (many ? '<td class="tname">' + esc(tryTeam(a)) + "</td>" : "") +
          "<td>" + esc(tryKind(a)) + '<br><small class="muted">' + esc(a.level || "Level not given") + "</small>" + (a.notes ? '<br><span class="msg-more">Has notes →</span>' : "") + "</td>" +
          "<td>" + (a.esadeStudent ? "Esade student" : "Not at Esade") + (a.programme ? '<br><small class="muted">' + esc(a.programme) + "</small>" : "") + "</td>" +
          '<td class="num muted">' + esc(fmtDay(a._creationTime)) + "</td>" +
          "<td>" + tryStatusCell(a) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="empty">' + (all.length ? "No sign-up with this status." : "No try-out or coach sign-ups yet.") + "</p>") + "</section>" +
      (open ? tryDialog(open) : "");
  }
  function tryDialog(a) {
    var name = a.firstName + " " + a.lastName;
    return '<div class="match-modal"><div class="match-backdrop" data-try-close></div><section class="match-dialog msg-dialog" role="dialog" aria-modal="true" aria-labelledby="try-title">' +
      '<button class="match-close" type="button" data-try-close aria-label="Close">×</button>' +
      '<p class="eyebrow" style="color:var(--blue)">' + esc(tryTeam(a)) + " · " + esc(tryKind(a)) + '</p><h2 id="try-title">' + esc(name) + "</h2>" +
      '<dl class="match-details"><div><dt>Email</dt><dd><a href="mailto:' + esc(a.email) + '">' + esc(a.email) + "</a></dd></div><div><dt>Phone</dt><dd>" + esc(a.phone) + "</dd></div>" +
      "<div><dt>Esade student</dt><dd>" + (a.esadeStudent ? "Yes" : "No") + "</dd></div>" + (a.programme ? "<div><dt>Programme</dt><dd>" + esc(a.programme) + "</dd></div>" : "") +
      "<div><dt>Level</dt><dd>" + esc(a.level || "Not given") + "</dd></div><div><dt>Received</dt><dd>" + esc(new Date(a._creationTime).toLocaleString("en-GB")) + "</dd></div>" +
      "<div><dt>Status</dt><dd>" + tryStatusCell(a) + "</dd></div>" + (a.confirmEmail && seesMail() ? "<div><dt>Confirmation</dt><dd>" + (a.confirmEmail === "sent" ? "Sent" : mailFailPill(a)) + "</dd></div>" : "") + "</dl>" +
      (a.coachingExperience ? '<h3 class="msg-h3">Coaching experience</h3><p class="msg-body">' + esc(a.coachingExperience) + "</p>" : "") +
      (hRO() ? (a.notes ? '<h3 class="msg-h3">Notes</h3><p class="msg-body">' + esc(a.notes) + "</p>" : "") :
        '<form id="try-notes" data-id="' + esc(a._id) + '" class="msg-form"><label for="try-notes-text" class="msg-h3">Notes (only people who can see this sign-up read them)</label><textarea id="try-notes-text" name="notes" rows="4" maxlength="5000" placeholder="e.g. Called on Monday, comes to the trial on Thursday">' + esc(a.notes || "") + "</textarea>" +
        '<div class="msg-actions"><button type="submit" class="btn solid">Save notes</button><a class="btn" href="mailto:' + esc(a.email) + '">Email ' + esc(a.firstName) + '</a><button type="button" class="btn" data-try-unread="' + esc(a._id) + '">Mark as unread</button></div></form>') +
      "</section></div>";
  }
  function hubApplications() {
    if (live()) return hubTryoutsLive();
    var apps = visibleSportsApplications(), t = state.user.role === "captain" ? team(firstTeam()) : null, recipient = t ? captainForTeam(t.id) : null;
    return '<div class="ph-head"><div><h1 class="display">Try-outs inbox.</h1><p>' + (t ? 'Applications for ' + esc(tLabel(t)) + ' are routed to you as captain.' : 'Board view across every sports application folder. Each captain sees only applications for their own team.') + '</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>' + (t ? 'Your team applications' : 'All team applications') + '</h2><span class="muted num">' + apps.length + ' received</span></div><p class="muted" style="margin:0 0 18px">Folder: <strong>' + esc(t ? sportsApplicationsFolder(t.id) : 'Applications for sports/*') + '</strong>' + (recipient ? ' · Captain recipient: <strong>' + esc(captainName(recipient)) + ' · ' + esc(recipient.email) + '</strong>' : '') + '</p>' + sportsApplicationsTable(apps) + '</section>' +
      '<section class="panel"><div class="panel-head"><h2>Routing rule</h2><span class="pill ok">Active in prototype</span></div><p class="muted" style="margin:0">When a student applies to a team, their try-out or coaching information is stored in that team’s Applications for sports folder and is visible to the active captain for that team. In production, this same event should also send the captain a notification email.</p></section>';
  }
  function hubCaptains() {
    if (live()) {
      var trs = TEAMS.map(function (t) { var row = ((LIVE.people || {}).teams || []).filter(function (x) { return x.id === t.id; })[0], cs = row ? row.captains : [];
        return '<tr><td class="tname">' + esc(tLabel(t)) + "</td><td>" + (cs.length ? cs.map(function (c) { return "<strong>" + esc(c.name || c.email) + "</strong>" + (c.vice ? ' <span class="pill">Vice-captain</span>' : "") + '<br><small class="muted">' + esc(c.email) + "</small>"; }).join("<br>") : '<span class="muted">No captain approved yet</span>') + "</td></tr>"; }).join("");
      return '<div class="ph-head"><div><h1 class="display">Captains.</h1><p>The approved captain and vice-captains of every team. Vice-captains have the same access as the captain for their team. Captains request access on the Members page; the Board approves them in the members area.</p></div></div>' +
        '<section class="panel"><div class="panel-head"><h2>Captains by team</h2><a class="btn sm" href="/admin">Approve or add captains and vice-captains</a></div><div class="table-wrap"><table><thead><tr><th>Team</th><th>Captain and vice-captains</th></tr></thead><tbody>' + trs + "</tbody></table></div></section>";
    }
    var active = state.captains.filter(function (c) { return c.active; }), edit = !hRO();
    var rows = active.map(function (c) {
      return '<tr><td><strong>' + esc(captainName(c)) + '</strong><br><small class="muted">' + esc(c.email) + '</small></td><td class="tname">' + esc(tLabel(team(c.team))) + '</td><td>' + esc(c.role) + '</td><td>' + esc(c.programme) + '</td><td class="num">' + esc(c.start) + '</td><td class="r">' + (edit ? '<button class="btn sm" data-captain-deactivate="' + c.id + '">Deactivate</button>' : "") + '</td></tr>';
    }).join("");
    return '<div class="ph-head"><div><h1 class="display">Captains.</h1><p>One current record for every team, with a clear owner, role and start date. This demo stores changes in this browser; production data should move to the shared database.</p></div></div>' +
      '<section class="panel"><div class="panel-head"><h2>Active captains</h2><span class="muted">' + active.length + ' records</span></div><div class="table-wrap"><table><thead><tr><th>Captain</th><th>Team</th><th>Role</th><th>Programme</th><th>Since</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      (edit ?       '<section class="panel"><div class="panel-head"><h2>Add a captain</h2><span class="muted">Board only</span></div><form class="form" id="captain-form"><label>First name<input id="c-first" required placeholder="First name"></label><label>Last name<input id="c-last" required placeholder="Last name"></label><label>Email<input id="c-email" type="email" required placeholder="name@example.com"></label><label>Team<select id="c-team">' + TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + '</option>'; }).join('') + '</select></label><label>Role<select id="c-role"><option>Captain</option><option>Vice-captain</option></select></label><label>Programme<input id="c-programme" required placeholder="BBA, MSc..."></label><div><button class="btn solid" type="submit">Add captain</button></div></form></section>' : '<p class="muted">View only: changes are made by the Board.</p>');
  }
  function taskRowBase(t, deptId) {
    var meta = [t.owner || "Unassigned"]; if (t.team && team(t.team)) meta.push(tLabel(team(t.team))); if (t.due) meta.push("due " + t.due);
    var del = t.canRemove && canAddTask(deptId) ? '<button type="button" class="btn sm ghost" data-task-del="' + esc(t.key) + '" aria-label="Remove task ' + esc(t.title) + '">' + ico("x") + "</button>" : "";
    return "<li><span>" + esc(t.title) + '<small class="owner">' + esc(meta.join(" · ")) + "</small></span>" + del + (canSetTask(deptId) && (!live() || t.canSet) ? '<select data-task="' + t.key + '" aria-label="Status of ' + esc(t.title) + '">' + Object.keys(TASK_STATUS).map(function (o) { return '<option value="' + o + '"' + (o === t.status ? " selected" : "") + ">" + TASK_STATUS[o] + "</option>"; }).join("") + "</select>" : taskStatusPill(t.status)) + "</li>";
  }
  // A task with its work summaries and comments (everyone in the department sees them and can add to them).
  function taskRow(t, deptId) {
    var ups = taskUpdatesFor(t.key), n = ups.length, d = deptName(deptId) || (deptId === "board" ? "Board" : deptId), open = state.taskOpen === t.key;
    var base = taskRowBase(t, deptId);
    var list = ups.map(function (u) {
      var f = filesOf(u).map(function (x) { return /^image\//.test(x.type || "") ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener"><img class="tu-img" src="' + esc(x.url) + '" alt="' + esc(x.name) + '"></a>' : '<a class="tu-file" href="' + esc(x.url) + '" target="_blank" rel="noopener" download="' + esc(x.name) + '">' + esc(x.name) + "</a>"; }).join(" ");
      return '<li class="tu ' + u.kind + '"><div class="tu-head"><span class="pill ' + (u.kind === "summary" ? "info" : "") + '">' + (u.kind === "summary" ? "Work summary" : "Comment") + "</span><b>" + esc(u.by) + '</b><small class="muted">' + esc(fmtWhen(u.at)) + "</small></div>" + (u.text ? "<p>" + esc(u.text) + "</p>" : "") + (u.link ? '<p><a href="' + esc(u.link) + '" target="_blank" rel="noopener">' + esc(u.link.replace(/^https:\/\//, "").slice(0, 60)) + " " + ico("out") + "</a></p>" : "") + f + "</li>";
    }).join("");
    var form = canPostTask(deptId) ? '<form class="tu-form" data-tu="' + esc(t.key) + '" data-tu-dept="' + esc(d) + '"><div class="tu-kind"><label><input type="radio" name="kind" value="summary" checked> Work summary</label><label><input type="radio" name="kind" value="comment"> Comment</label></div>' +
      '<textarea name="text" rows="2" maxlength="2000" placeholder="What was done, what is next, what you need" aria-label="Update"></textarea><div class="tu-row"><input name="link" type="text" inputmode="url" placeholder="Link (optional)" aria-label="Link"><button class="btn sm solid" type="submit">Post</button></div>' + pickBox("tu:" + t.key, "image/*,application/pdf", "+ Images or PDFs") + "</form>" : "";
    return base.replace(/<\/li>$/, "") + '<details class="tupd"' + (open ? " open" : "") + ' data-tkey="' + esc(t.key) + '"><summary>' + (n ? n + " update" + (n === 1 ? "" : "s") : "Add a work summary") + "</summary>" + (list ? '<ul class="tu-list">' + list + "</ul>" : "") + form + "</details></li>";
  }
  function addTaskForm(d) {
    if (!canAddTask(d.id)) return "";
    var ppl = deptMembers(d.id);
    return '<form class="form add-task" data-add-task="' + d.id + '"><label class="at-title">New task<input name="title" required maxlength="120" placeholder="e.g. Book courts for the spring try-outs"></label><label>Who works on it<select name="owner"><option value="">Not assigned yet</option>' + ppl.map(function (n) { return '<option value="' + esc(n[1] + "|" + n[0]) + '">' + esc(n[0]) + "</option>"; }).join("") + "</select></label>" +
      (live() ? '<label>Team (optional)<select name="team"><option value="">Whole department</option>' + TEAMS.map(function (t) { return '<option value="' + t.id + '">' + esc(tLabel(t)) + "</option>"; }).join("") + '</select></label><label class="at-due">Due (optional)<input name="due" type="date"></label>' : "") +
      '<div class="at-go"><button class="btn solid" type="submit">Add task</button></div>' + (live() && !ppl.length ? '<p class="muted" style="grid-column:1/-1;margin:0;font-size:12px">Nobody is approved in this department yet: approve associates in the members area (/admin), then assign tasks to them.</p>' : "") + "</form>";
  }
  function hubDepts() {
    var open = null; visDepts().forEach(function (d) { if (d.id === state.deptOpen) open = d; });
    if (open) {
      var p = DEPT_PEOPLE[open.id], ts = deptTasks(open), team = [[p.head, p.headRole || "Head of " + open.name, null]].concat(p.associates.map(function (a) { return [a[0], a[2] || "Associate", a[1]]; }));
      return '<div class="ph-head"><div><p class="eyebrow"><a href="#hub-departments" data-dept-open="">← All departments</a></p><h1 class="display">' + esc(open.name) + '.</h1><p>' + esc(open.remit) + "</p></div></div>" +
        '<section class="panel"><div class="panel-head"><h2>The team</h2>' + (live() ? "" : '<span class="muted" style="font-size:12px">Example names</span>') + '</div><div class="table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Teams</th><th>Working on now</th></tr></thead><tbody>' +
        team.map(function (m) {
          var now = ts.filter(function (t) { return t.owner === m[0] && t.status !== "done"; });
          return '<tr><td><strong>' + esc(m[0]) + "</strong></td><td>" + esc(m[1]) + '</td><td class="muted">' + (m[2] ? (m[2].length === TEAMS.length ? "All teams" : esc(teamsText(m[2]))) : "All teams") + "</td><td>" + (now.length ? now.map(function (t) { return esc(t.title) + " " + taskStatusPill(t.status); }).join("<br>") : '<span class="muted">Nothing open</span>') + "</td></tr>";
        }).join("") + "</tbody></table></div></section>" +
        '<section class="panel"><div class="panel-head"><h2>Tasks and projects</h2><span class="muted" style="font-size:12px">' + (canAddTask(open.id) ? "You can add tasks here" : "Only the Board adds tasks") + '</span></div><ul class="tasks">' + ts.map(function (t) { return taskRow(t, open.id); }).join("") + "</ul>" + addTaskForm(open) + "</section>";
    }
    return '<div class="ph-head"><div><h1 class="display">Departments.</h1><p>Who leads each department, what it is responsible for, and where its work stands. Open a department to see its full team and who is working on what.</p></div></div>' +
      '<div class="dept-grid">' + visDepts().map(function (d) {
        return '<section class="dept"><div class="dept-title"><h2><a href="#hub-departments" data-dept-open="' + d.id + '">' + d.name + '</a></h2><small>' + d.size + ' people</small></div><div class="panel"><p style="margin:0"><strong>' + d.head + ' · ' + esc(DEPT_PEOPLE[d.id].head) + '</strong><br><span class="muted">' + d.remit + '</span></p><ul class="tasks">' +
          deptTasks(d).map(function (t) { return taskRowBase(t, d.id); }).join("") + '</ul><a class="btn sm" href="#hub-departments" data-dept-open="' + d.id + '">Open team and tasks →</a>' + addTaskForm(d) + "</div></section>";
      }).join("") + "</div>";
  }
  // "Add people" page. Follows the role the Hub is viewed as (incl. an admin's "Demo as"), and Convex
  // applies the same limits (org.addMember with `as`): admin = anyone; President/VP = anyone but the President;
  // head = associates of their own department, captains and vice-captains.
  var PEOPLE_KINDS = { president: "President", "vice-president": "Vice-president", head: "Head of department", associate: "Associate", captain: "Captain", vicecaptain: "Vice-captain", viewer: "View only (Student Council)" };
  var CONVEX_DEPTS = ["fin", "med", "ops", "par", "it"];
  function peopleKinds() {
    var r = hv().role;
    if (r === "admin") return ["president", "vice-president", "head", "associate", "captain", "vicecaptain", "viewer"];
    if (r === "exec") return ["vice-president", "head", "associate", "captain", "vicecaptain", "viewer"];
    return ["associate", "captain", "vicecaptain"];
  }
  function hubPeople() {
    var u = hv(), head = u.role === "head", kinds = peopleKinds(), k = state.pplKind && kinds.indexOf(state.pplKind) > -1 ? state.pplKind : kinds[0];
    var intro = head ? "As head of " + deptName(u.dept) + " you can add associates to your department, captains and vice-captains." : u.role === "exec" ? "As President or vice-president you can add anyone except the President (only an admin can)." : "As admin you can add anyone, including the President.";
    var top = '<div class="ph-head"><div><h1 class="display">Add people.</h1><p>' + esc(intro) + " They are approved straight away, then create their account on the Members page with the same email.</p></div></div>";
    if (!live()) return top + '<section class="panel"><p class="empty">Adding people works once you are signed in.</p></section>';
    var depts = head ? [u.dept] : CONVEX_DEPTS, needsDept = k === "associate" || k === "head", needsTeams = k === "associate" || k === "captain" || k === "vicecaptain";
    var f = '<form id="ppl-form" class="panel" novalidate><div class="fgrid">' +
      '<label class="field">Name<input name="name" required maxlength="100"></label>' +
      '<label class="field">Email they will sign in with<input name="email" type="email" required placeholder="name@example.com"></label>' +
      '<label class="field">Role<select name="kind" id="ppl-kind">' + kinds.map(function (x) { return '<option value="' + x + '"' + (x === k ? " selected" : "") + ">" + PEOPLE_KINDS[x] + "</option>"; }).join("") + "</select></label>" +
      (needsDept ? '<label class="field">Department<select name="dept"' + (head ? " disabled" : "") + ">" + depts.map(function (d) { return '<option value="' + d + '">' + esc(deptName(d)) + "</option>"; }).join("") + "</select></label>" : "") +
      "</div>" + (needsTeams ? '<fieldset class="field"><legend>' + (k === "associate" ? "Teams they work with" : "Team(s)") + '</legend><div class="checks">' + TEAMS.map(function (t) { return '<label><input type="checkbox" name="team" value="' + t.id + '"> ' + esc(tLabel(t)) + "</label>"; }).join("") + "</div></fieldset>" : "") +
      '<p class="err" id="ppl-err" role="alert"></p><button class="btn btn-blue" type="submit">Add</button></form>';
    return top + f +
      // Not while an admin previews another role: /admin always shows the real (admin) view.
      ((admin && u.role === "admin") || (!admin && captain && captain.scope && (captain.scope.exec || (captain.scope.heads || []).length)) ? '<p class="muted">Requests waiting for approval, and people you can remove, are in <a href="/admin">/admin</a>.</p>' : "");
  }
  function bindPeople() {
    var f = $("ppl-form"); if (!f) return;
    var kind = $("ppl-kind"); kind.addEventListener("change", function () { state.pplKind = kind.value; render(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var u = hv(), k = kind.value, err = $("ppl-err"), btn = f.querySelector("button[type=submit]");
      var q = function (n) { var el = f.querySelector("[name=" + n + "]"); return el ? el.value.trim() : ""; };
      var name = q("name"), email = q("email");
      var dept = u.role === "head" ? u.dept : q("dept");
      var teams = [].slice.call(f.querySelectorAll("input[name=team]:checked")).map(function (x) { return x.value; });
      var board = k === "president" || k === "vice-president" || k === "head";
      var a = { name: name, email: email, role: board ? "board" : k, position: board ? k : undefined,
        department: k === "associate" || k === "head" ? deptName(dept) : undefined,
        teams: k === "associate" || k === "captain" || k === "vicecaptain" ? teams : undefined,
        as: u.role === "head" ? { role: "head", department: deptName(u.dept) } : u.role === "exec" ? { role: "exec" } : undefined };
      if (!name || !email) { err.textContent = "Enter a name and an email."; return; }
      if (a.teams && !teams.length) { err.textContent = "Choose at least one team."; return; }
      btn.disabled = true; err.textContent = "";
      Promise.resolve(backend.run("addMember", a)).then(function () {
        toast(name + " was added as " + PEOPLE_KINDS[k] + "."); f.reset(); btn.disabled = false;
      }, function (x) { btn.disabled = false; err.textContent = errText(x); });
    });
  }
  function bindHub() {
    bindTournament();
    bindPeople();
    bindHandover();
    bindContracts();
    bindMedia();
    var da = $("demo-as"); if (da) da.addEventListener("change", function () { setDemo(da.value); });
    var ta = $("team-as"); if (ta) ta.addEventListener("change", function () { if (ta.value) setTeamView(ta.value); });
    hub.querySelectorAll("[data-team-exit]").forEach(function (b) { b.addEventListener("click", function () { setTeamView(""); }); });
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
      var ow = f.elements.owner.value.split("|");
      if (live()) {
        var bt = f.querySelector("button"); bt.disabled = true;
        Promise.resolve(backend.run("addTask", { dept: deptKey(d), title: title, ownerEmail: ow[0] || undefined, ownerName: ow[1] || undefined, team: f.elements.team.value || undefined, due: f.elements.due.value || undefined }))
          .then(function () { toast("Task added. Your department sees it."); }, function (x) { bt.disabled = false; toast(errText(x)); });
        return;
      }
      state.newTasks.push({ id: state.nextId++, dept: d, title: title.slice(0, 120), owner: ow[1] || "", status: "todo" }); save(); render(); toast("Task added.");
    }); });
    hub.querySelectorAll("[data-reject-cancel]").forEach(function (b) { b.addEventListener("click", function () { state.rejecting = state.reconsidering = state.esadeRefusing = null; render(); }); });
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
    function plOpen(e) { state.rosterEdit = e; render(); var f = hub.querySelector("#pl-form input, #pl-paste"); if (f) f.focus(); }
    hub.querySelectorAll("[data-pl-add]").forEach(function (b) { b.addEventListener("click", function () { plOpen({ team: b.getAttribute("data-pl-add"), i: -1 }); }); });
    hub.querySelectorAll("[data-pl-paste]").forEach(function (b) { b.addEventListener("click", function () { plOpen({ team: b.getAttribute("data-pl-paste"), paste: true }); }); });
    hub.querySelectorAll("[data-pl-edit]").forEach(function (el) {
      function go(ev) { if (ev && ev.target.closest("button") && ev.target.closest("button") !== el) return; plOpen({ team: el.getAttribute("data-team"), i: +el.getAttribute("data-pl-edit") }); }
      el.addEventListener("click", function (ev) { ev.stopPropagation(); go(ev); });
      if (el.tagName === "TR") el.addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target === el) { ev.preventDefault(); go(); } });
    });
    hub.querySelectorAll("[data-pl-close]").forEach(function (b) { b.addEventListener("click", function () { state.rosterEdit = null; render(); }); });
    var plf = $("pl-form"); if (plf) {
      bindDateSelects(plf);
      var plId = plf.getAttribute("data-team"), plI = +plf.getAttribute("data-i");
      plf.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var p = {}; plf.querySelectorAll("[data-f]").forEach(function (el) { var v = el.value.trim(); if (v) p[el.getAttribute("data-f")] = v; });
        if (!p.first && !p.last) { toast("Add at least a first or last name."); return; }
        var rows = rosterOf(plId).slice(); if (plI < 0) rows.push(p); else rows[plI] = p;
        saveRosterList(plId, rows, plI < 0 ? "Player added." : "Player updated.", plf.querySelector("[type=submit]"));
      });
      var del = plf.querySelector("[data-pl-del]"); if (del) del.addEventListener("click", function () {
        if (del.getAttribute("data-sure") !== "1") { del.setAttribute("data-sure", "1"); del.textContent = "Click again to remove"; return; }
        var rows = rosterOf(plId).slice(); rows.splice(plI, 1); saveRosterList(plId, rows, "Player removed.", del);
      });
    }
    var plp = $("pl-paste-form"); if (plp) plp.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var id = plp.getAttribute("data-team"), cur = rosterOf(id).slice(), key = function (p) { return ((p.first || "") + "|" + (p.last || "")).toLowerCase(); }, have = cur.map(key);
      var add = parseSheetRows($("pl-paste").value).filter(function (p) { return have.indexOf(key(p)) < 0; });
      if (!add.length) { toast("No new players found in the pasted rows."); return; }
      saveRosterList(id, cur.concat(add), add.length + " player" + (add.length === 1 ? "" : "s") + " added.", plp.querySelector("[type=submit]"));
    });
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
    hub.querySelectorAll("details.tupd").forEach(function (d) { d.addEventListener("toggle", function () { var k = d.getAttribute("data-tkey"); if (d.open) state.taskOpen = k; else if (state.taskOpen === k) state.taskOpen = null; }); });
    hub.querySelectorAll("form[data-tu]").forEach(function (f) { f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var key = f.getAttribute("data-tu"), dept = f.getAttribute("data-tu-dept"), kind = (f.querySelector("input[name=kind]:checked") || {}).value || "summary";
      var text = f.elements.text.value.trim(), link = f.elements.link.value.trim(), pk = "tu:" + key, files = picked(pk);
      if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
      if (link) link = link.replace(/^http:/i, "https:");
      if (!text && !link && !files.length) { f.elements.text.focus(); toast("Write a summary or a comment."); return; }
      state.taskOpen = key;
      var btn = f.querySelector("button[type=submit]");
      if (live()) {
        if (tooBig(files, 10)) { toast("A file is too big (max 10 MB each)."); return; }
        btn.disabled = true;
        uploadAll(files).then(function (up) {
          return backend.addTaskUpdate({ taskKey: key, dept: dept, kind: kind, text: text, link: link || undefined, files: up.length ? up : undefined });
        }).then(function () { PICKS[pk] = []; toast("Posted. Your department can see it."); render(); }, function (x) { btn.disabled = false; toast(errText(x)); });
        return;
      }
      function done(att) { PICKS[pk] = []; (state.tupd = state.tupd || []).push({ taskKey: key, dept: dept, kind: kind, text: text, link: link || undefined, files: att, by: meLabel(), at: Date.now() }); save(); render(); toast("Posted. Your department can see it."); }
      if (tooBig(files, 1.5)) { toast("A file is too big for the prototype (max 1.5 MB each)."); return; }
      readAll(files).then(done);
    }); });
    hub.querySelectorAll("[data-esade]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-id"), st = b.getAttribute("data-esade");
      if (st === "refused") { state.esadeRefusing = id; render(); var bx = $("er-" + id); if (bx) bx.focus(); return; }
      b.disabled = true; expAct("esade-" + st, id);
    }); });
    hub.querySelectorAll("[data-esade-confirm]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-esade-confirm"), box = $("er-" + id), note = box ? box.value.trim() : "";
      if (!note) { if (box) { box.focus(); box.classList.add("invalid"); } toast("Write what Esade said."); return; }
      expAct("esade-refused", id, note);
    }); });
    hub.querySelectorAll("[data-links-dept]").forEach(function (b) { b.addEventListener("click", function () { state.linksDept = b.getAttribute("data-links-dept"); render(); }); });
    var lf = $("link-form"); if (lf) lf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var dept = deptName(lf.getAttribute("data-dept")), title = lf.elements.title.value.trim(), url = lf.elements.url.value.trim(), note = lf.elements.note.value.trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      url = url.replace(/^http:/i, "https:");
      if (!title || !url) return;
      if (!live()) { (state.links = state.links || []).push({ id: state.nextId++, dept: dept, title: title.slice(0, 80), url: url.slice(0, 500), note: note.slice(0, 200) || undefined }); save(); render(); toast("Link added for the department."); return; }
      Promise.resolve(backend.addDeptLink({ dept: dept, title: title, url: url, note: note || undefined })).then(function () { toast("Link added for the department."); }, function (x) { toast(errText(x)); });
    });
    hub.querySelectorAll("[data-link-del]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-link-del");
      if (!live()) { state.links = (state.links || []).filter(function (l) { return String(l.id) !== id; }); save(); render(); return; }
      b.disabled = true; Promise.resolve(backend.removeDeptLink({ id: id })).then(function () { toast("Link removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    var actA = $("act-area"); if (actA) actA.addEventListener("change", function () { state.actArea = actA.value; state.actMore = false; render(); });
    hub.querySelectorAll("[data-act-open]").forEach(function (b) { b.addEventListener("click", function () { state.actOpen = !state.actOpen; state.actMore = false; render(); }); });
    hub.querySelectorAll("[data-act-more]").forEach(function (b) { b.addEventListener("click", function () { state.actMore = !state.actMore; render(); }); });
    ["hi-dept", "hi-team"].forEach(function (k) { var el = $(k); if (el) el.addEventListener("change", function () { if (k === "hi-dept") state.histDept = el.value; else state.histTeam = el.value; render(); }); });
    var idf = $("idea-form"); if (idf) idf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var text = $("id-text").value.trim(); if (!text) return;
      var row = { team: $("id-team") ? $("id-team").value : firstTeam(), kind: $("id-kind").value, text: text.slice(0, 600) }, ops = opsView();
      if (ops) { var c = idf.querySelector("input[name=id-concerns]:checked"); row.concerns = c ? c.value : "team"; var est = Math.round(+($("id-est") || {}).value) || 0; if (est) row.estimate = est; if (row.concerns === "budget" && !est) { $("id-est").focus(); toast("Add the estimated cost: it becomes the expense request for Finance."); return; } }
      var msg = ops ? (row.concerns === "budget" ? "Sent to the captain, and the expense request is with Finance." : "Sent to the captain for approval.") : "Sent to Operations.";
      if (!live()) {
        var i = { id: state.nextId++, team: row.team, kind: row.kind, text: row.text, status: ops ? "researching" : "new", origin: ops ? "ops" : "captain", by: meLabel(), at: Date.now(), comments: [] };
        state.ideas.unshift(i);
        if (ops) localSend(i, row.concerns, row.estimate, ""); else pushNotif({ team: row.team, dept: "Operations", title: "New idea from the captain: " + row.kind, body: row.text, link: "hub-ideas" });
        save(); render(); toast(msg); return;
      }
      $("id-send").disabled = true;
      Promise.resolve(backend.suggestIdea(row)).then(function () { toast(msg); }, function (x) { $("id-send").disabled = false; toast(errText(x)); });
    });
    hub.querySelectorAll("form[data-idea]").forEach(function (f) {
      var act = "note";
      f.querySelectorAll("[data-do]").forEach(function (b) { b.addEventListener("click", function () { act = b.getAttribute("data-do"); }); });
      f.addEventListener("submit", function (ev) {
        ev.preventDefault(); var id = f.getAttribute("data-idea"), note = f.elements.note.value.trim(), est = Math.round(+f.elements.estimate.value) || 0, comment = f.elements.comment.value.trim();
        var c = f.querySelector("input[type=radio]:checked"), concerns = c ? c.value : "team";
        if (act === "send" && concerns === "budget" && !est) { f.elements.estimate.focus(); toast("Add the estimated cost: it becomes the expense request for Finance."); return; }
        var msg = act === "send" ? (concerns === "budget" ? "Sent to the captain, and the expense request is with Finance." : "Sent to the captain for approval.") : act === "drop" ? "Dropped." : "Saved.";
        if (!live()) { localIdea(id, function (i) { i.opsNote = note || undefined; if (est) i.estimate = est; if (act === "drop") i.status = "dropped"; else if (act === "send") localSend(i, concerns, est, comment); else if (i.status === "new") i.status = "researching"; }); toast(msg); return; }
        Promise.resolve(backend.updateIdea({ id: id, action: act === "send" ? "send" : act === "drop" ? "drop" : "note", concerns: concerns, opsNote: note || undefined, estimate: est || undefined, comment: comment || undefined })).then(function () { toast(msg); }, function (x) { toast(errText(x)); });
      });
    });
    hub.querySelectorAll("[data-idea-decide] [data-approve]").forEach(function (b) { b.addEventListener("click", function () {
      var box = b.closest("[data-idea-decide]"), id = box.getAttribute("data-idea-decide"), ok = b.getAttribute("data-approve") === "1", comment = box.querySelector("textarea").value.trim();
      var msg = ok ? "Approved. Marketing has been notified to communicate it." : "Declined. Operations has been notified.";
      if (!live()) { localIdea(id, function (i) { i.status = ok ? "approved" : "dropped"; if (comment) (i.comments = i.comments || []).push({ by: meLabel(), at: Date.now(), text: comment }); pushNotif(ok ? { team: i.team, dept: "Media & Marketing", title: "To communicate: " + i.kind, body: "Approved by the captain. Post it on the media accounts or as platform news.", link: "hub-ideas" } : { team: i.team, dept: "Operations", title: "Declined by the captain: " + i.kind, body: comment, link: "hub-ideas" }); }); toast(msg); return; }
      b.disabled = true;
      Promise.resolve(backend.decideIdea({ id: id, approve: ok, comment: comment || undefined })).then(function () { toast(msg); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-comm]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-id"), ch = b.getAttribute("data-comm"), msg = "Marked as communicated. The captain has been notified.";
      if (!live()) { localIdea(id, function (i) { i.status = "communicated"; i.channel = ch; i.updatedBy = meLabel(); pushNotif({ team: i.team, captains: true, title: "Communicated: " + i.kind, body: ch === "media" ? "Posted on the media accounts." : "Published as platform news.", link: "hub-ideas" }); }); toast(msg); return; }
      b.disabled = true;
      Promise.resolve(backend.communicatedIdea({ id: id, channel: ch })).then(function () { toast(msg); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    hub.querySelectorAll("form[data-comment]").forEach(function (f) { f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var id = f.getAttribute("data-comment"), text = f.elements.text.value.trim(); if (!text) return;
      if (!live()) { localIdea(id, function (i) { (i.comments = i.comments || []).push({ by: meLabel(), at: Date.now(), text: text.slice(0, 600) }); }); return; }
      Promise.resolve(backend.commentIdea({ id: id, text: text })).then(function () { f.elements.text.value = ""; }, function (x) { toast(errText(x)); });
    }); });
    hub.querySelectorAll("[data-hteam]").forEach(function (r) {
      function open() { state.teamOpen = r.getAttribute("data-hteam"); render(); var d = $("team-detail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      r.addEventListener("click", open); r.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
    hub.querySelectorAll("[data-filter]").forEach(function (c) { c.addEventListener("click", function () { state.hubFilter = c.getAttribute("data-filter"); render(); }); });
    hub.querySelectorAll("[data-task]").forEach(function (s) { s.addEventListener("change", function () {
      if (live()) { Promise.resolve(backend.run("setTask", { id: s.getAttribute("data-task"), status: s.value })).then(function () { toast("Task updated for everyone."); }, function (x) { toast(errText(x)); }); return; }
      state.tasks[s.getAttribute("data-task")] = s.value; save(); toast("Task updated.");
    }); });
    hub.querySelectorAll("[data-task-del]").forEach(function (b) { b.addEventListener("click", function () {
      b.disabled = true; Promise.resolve(backend.run("removeTask", { id: b.getAttribute("data-task-del") })).then(function () { toast("Task removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    var f = $("req"); if (f) f.addEventListener("submit", function (ev) {
      ev.preventDefault(); var amt = Math.round(+$("r-amt").value), item = $("r-item").value.trim(); if (!item || !(amt > 0)) return;
      var link = $("r-link").value.trim(), files = picked("r-file"), tm = $("r-team") ? $("r-team").value : firstTeam(), dept = $("r-dept").value, cat = $("r-cat").value;
      if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
      if (link) link = link.replace(/^http:/i, "https:");
      if (live()) {
        if (tooBig(files, 10)) { toast("A file is too big (max 10 MB each)."); return; }
        var btn = $("r-send"); btn.disabled = true; btn.textContent = "Sending…";
        uploadAll(files).then(function (up) {
          return backend.requestExpense({ team: tm, dept: dept, item: item, cat: cat, amount: amt, link: link || undefined, files: up.length ? up : undefined });
        }).then(function () { PICKS["r-file"] = []; state.hubFilter = "all"; toast("Request sent to Finance."); render(); }, function (x) { btn.disabled = false; btn.textContent = "Send request"; toast(errText(x)); });
        return;
      }
      function done(att) {
        var now = Date.now(), d = new Date(now), day = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        state.expenses.push({ id: state.nextId++, team: tm, dept: dept, item: item, cat: cat, amount: amt, by: meLabel(), date: day, status: "requested", link: link || undefined, files: att, history: [{ action: "requested", by: meLabel(), at: now }] });
        PICKS["r-file"] = []; state.hubFilter = "all"; save(); render(); toast("Request sent to Finance.");
      }
      if (tooBig(files, 1.5)) { toast("A file is too big for the prototype (max 1.5 MB each)."); return; }
      readAll(files).then(done);
    });
    hub.querySelectorAll("[data-captain-deactivate]").forEach(function (b) { b.addEventListener("click", function () {
      var id = +b.getAttribute("data-captain-deactivate"); state.captains.forEach(function (c) { if (c.id === id) c.active = false; }); save(); render(); toast("Captain deactivated.");
    }); });
    var cf = $("captain-form"); if (cf) cf.addEventListener("submit", function (ev) {
      ev.preventDefault();
      state.captains.push({ id: state.nextId++, first: $("c-first").value.trim(), last: $("c-last").value.trim(), email: $("c-email").value.trim(), team: $("c-team").value, role: $("c-role").value, programme: $("c-programme").value.trim(), start: "2026-11-12", active: true });
      save(); render(); toast("Captain added.");
    });
    // Partnerships tracker
    function pRun(key, args, ok) { return Promise.resolve(backend.run(key, args)).then(function () { if (ok) toast(ok); }, function (x) { toast(errText(x)); throw x; }); }
    function pFind(id) { return (((LIVE.partners || {}).partners) || []).filter(function (p) { return p._id === id; })[0]; }
    hub.querySelectorAll("[data-pf]").forEach(function (b) { b.addEventListener("click", function () { state.pFilter = b.getAttribute("data-pf"); render(); }); });
    var ptf = $("p-team-f"); if (ptf) ptf.addEventListener("change", function () { state.pTeam = ptf.value; render(); });
    hub.querySelectorAll("[data-p-new]").forEach(function (b) { b.addEventListener("click", function () { state.pEdit = "new"; state.pPrefill = null; render(); var f = $("partner-edit"); if (f) f.elements.company.focus(); }); });
    hub.querySelectorAll("[data-p-edit]").forEach(function (b) { b.addEventListener("click", function () { state.pEdit = b.getAttribute("data-p-edit"); render(); var f = $("partner-edit"); if (f) f.scrollIntoView({ block: "center" }); }); });
    hub.querySelectorAll("[data-p-cancel]").forEach(function (b) { b.addEventListener("click", function () { state.pEdit = null; state.pPrefill = null; render(); }); });
    hub.querySelectorAll("[data-p-del]").forEach(function (b) { b.addEventListener("click", function () { b.disabled = true; pRun("removePartner", { id: b.getAttribute("data-p-del") }, "Partner removed.").catch(function () { b.disabled = false; }); }); });
    hub.querySelectorAll("[data-pstage]").forEach(function (sel) { sel.addEventListener("change", function () { var p = pFind(sel.getAttribute("data-pstage")); if (!p) return; pRun("updatePartner", Object.assign({ id: p._id }, partnerArgs(p, { stage: sel.value })), "Stage updated."); }); });
    bindChat();
    hub.querySelectorAll("[data-tf]").forEach(function (b) { b.addEventListener("click", function () { state.tFilter = b.getAttribute("data-tf"); render(); }); });
    var trt = $("try-team"); if (trt) trt.addEventListener("change", function () { state.tTeam = trt.value; render(); });
    hub.querySelectorAll("[data-try-status]").forEach(function (sel) {
      sel.addEventListener("click", function (e) { e.stopPropagation(); });
      sel.addEventListener("change", function () { sel.disabled = true; pRun("setTryStatus", { id: sel.getAttribute("data-try-status"), status: sel.value }, "Status changed to " + sel.value + ".").catch(function () { render(); }); });
    });
    function openTry(id) {
      state.tryOpen = id; render();
      var t = (LIVE.tryouts || []).filter(function (x) { return x._id === id; })[0];
      if (t && !t.openedAt && !hRO()) Promise.resolve(backend.run("openTry", { id: id, opened: true })).catch(function () {}); // silent: only clears the notification
    }
    hub.querySelectorAll("[data-try-open]").forEach(function (tr) {
      tr.addEventListener("click", function (e) { if (e.target.closest("a, select, button")) return; openTry(tr.getAttribute("data-try-open")); });
      tr.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === tr) { e.preventDefault(); openTry(tr.getAttribute("data-try-open")); } });
    });
    hub.querySelectorAll("[data-try-close]").forEach(function (b) { b.addEventListener("click", function () { state.tryOpen = null; render(); }); });
    hub.querySelectorAll("[data-try-unread]").forEach(function (b) { b.addEventListener("click", function () { state.tryOpen = null; pRun("openTry", { id: b.getAttribute("data-try-unread"), opened: false }, "Marked as unread.").catch(function () {}); render(); }); });
    var tnf = $("try-notes");
    if (tnf) tnf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var btn = tnf.querySelector("button[type=submit]"); btn.disabled = true;
      pRun("setTryNotes", { id: tnf.getAttribute("data-id"), notes: tnf.elements.notes.value }, "Notes saved.").then(function () { btn.disabled = false; tnf.elements.notes.blur(); }, function () { btn.disabled = false; });
    });
    hub.querySelectorAll("[data-mf]").forEach(function (b) { b.addEventListener("click", function () { state.mFilter = b.getAttribute("data-mf"); render(); }); });
    hub.querySelectorAll("[data-af]").forEach(function (b) { b.addEventListener("click", function () { state.aFilter = b.getAttribute("data-af"); render(); }); });
    hub.querySelectorAll("[data-aview]").forEach(function (b) { b.addEventListener("click", function () { state.aView = b.getAttribute("data-aview"); save(); render(); }); });
    hub.querySelectorAll("[data-msg]").forEach(function (sel) {
      sel.addEventListener("click", function (e) { e.stopPropagation(); });
      sel.addEventListener("change", function () { pRun("setMessage", { id: sel.getAttribute("data-msg"), status: sel.value }, "Status updated."); });
    });
    function openMsg(id) {
      state.msgOpen = id; render();
      var m = visMsgs().filter(function (x) { return x._id === id; })[0];
      if (m && m.status === "new" && !hRO()) pRun("setMessage", { id: id, status: "read" });
    }
    hub.querySelectorAll("[data-msg-open]").forEach(function (tr) {
      tr.addEventListener("click", function (e) { if (e.target.closest("a, select, button")) return; openMsg(tr.getAttribute("data-msg-open")); });
      tr.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === tr) { e.preventDefault(); openMsg(tr.getAttribute("data-msg-open")); } });
    });
    hub.querySelectorAll("[data-msg-close]").forEach(function (b) { b.addEventListener("click", function () { state.msgOpen = null; render(); }); });
    hub.querySelectorAll("[data-msg-unread]").forEach(function (b) { b.addEventListener("click", function () { var id = b.getAttribute("data-msg-unread"); state.msgOpen = null; pRun("setMessage", { id: id, status: "new" }, "Marked as unread."); render(); }); });
    var mr = $("msg-reply");
    if (mr) mr.addEventListener("submit", function (ev) {
      ev.preventDefault(); var btn = mr.querySelector("button[type=submit]"), t = mr.elements.text.value.trim(); if (!t) return;
      btn.disabled = true; btn.textContent = "Sending…";
      pRun("replyMessage", { id: mr.getAttribute("data-id"), text: t }, "Reply sent.").then(function () { mr.elements.text.value = ""; render(); }, function () { btn.disabled = false; btn.textContent = "Send reply"; });
    });
    hub.querySelectorAll("[data-app-open]").forEach(function (el) {
      var openApp = function () {
        var id = el.getAttribute("data-app-open"), x = (LIVE.assocApps || []).filter(function (y) { return y._id === id; })[0];
        state.appOpen = id; render();
        if (x && !x.openedAt && !hRO()) Promise.resolve(backend.run("openApp", { id: id, opened: true })).catch(function () {}); // silent: only clears the notification
      };
      el.addEventListener("click", function (e) { if (e.target.closest("a, select, button, details, input, textarea")) return; openApp(); });
      el.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); openApp(); } });
    });
    hub.querySelectorAll("[data-app-close]").forEach(function (b) { b.addEventListener("click", function () { state.appOpen = null; render(); }); });
    hub.querySelectorAll("[data-app-unread]").forEach(function (b) { b.addEventListener("click", function () { state.appOpen = null; pRun("openApp", { id: b.getAttribute("data-app-unread"), opened: false }, "Marked as unread.").catch(function () {}); render(); }); });
    var anf = $("app-notes");
    if (anf) anf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var btn = anf.querySelector("button[type=submit]"); btn.disabled = true;
      pRun("setAppNotes", { id: anf.getAttribute("data-id"), notes: anf.elements.notes.value }, "Notes saved.").then(function () { btn.disabled = false; anf.elements.notes.blur(); }, function () { btn.disabled = false; });
    });
    hub.querySelectorAll("[data-app-stage]").forEach(function (sel) { sel.addEventListener("change", function () { pRun("setAppStage", { id: sel.getAttribute("data-app-stage"), stage: sel.value }, "Stage updated."); }); });
    hub.querySelectorAll("[data-inq]").forEach(function (sel) { sel.addEventListener("change", function () { pRun("setInquiry", { id: sel.getAttribute("data-inq"), status: sel.value }, "Status updated."); }); });
    hub.querySelectorAll("[data-inq-add]").forEach(function (b) { b.addEventListener("click", function () {
      var i = (((LIVE.partners || {}).inquiries) || []).filter(function (x) { return x._id === b.getAttribute("data-inq-add"); })[0]; if (!i) return;
      state.pEdit = "new"; state.pPrefill = { company: i.company, contactName: i.name, contactEmail: i.email, kind: INTEREST_KIND[i.interest] || "Other", stage: "contacted", notes: i.message || "", inquiryId: i._id };
      render(); window.scrollTo(0, 0);
    }); });
    var pe = $("partner-edit"); if (pe) pe.addEventListener("submit", function (ev) {
      ev.preventDefault(); var e = pe.elements, ow = e.owner.value.split("|"), id = pe.getAttribute("data-id"), inq = pe.getAttribute("data-inq");
      var args = partnerArgs({ company: e.company.value.trim(), kind: e.kind.value, team: e.team.value, stage: e.stage.value, contactName: e.contactName.value.trim(), contactEmail: e.contactEmail.value.trim(), value: e.value.value === "" ? undefined : +e.value.value, ownerEmail: ow[0], ownerName: ow[1], nextStep: e.nextStep.value.trim(), nextDate: e.nextDate.value, notes: e.notes.value.trim() });
      if (id) args.id = id; else if (inq) args.inquiryId = inq;
      var b = pe.querySelector('button[type="submit"]'); b.disabled = true;
      pRun(id ? "updatePartner" : "addPartner", args, id ? "Partner saved." : "Partner added. Partnerships sees it.").then(function () { state.pEdit = null; state.pPrefill = null; render(); }, function () { b.disabled = false; });
    });
    // Goals
    hub.querySelectorAll("[data-term]").forEach(function (b) { b.addEventListener("click", function () { state.goalTerm = b.getAttribute("data-term"); render(); }); });
    var gta = $("goal-term-add");
    if (gta) gta.addEventListener("click", function () {
      var t = gta.getAttribute("data-next"); gta.disabled = true;
      Promise.resolve(backend.run("addGoalTerm", { term: t })).then(function () { state.goalTerm = t; render(); toast(termLabel(t) + " added."); }, function (x) { gta.disabled = false; toast(errText(x)); });
    });
    hub.querySelectorAll("[data-gi]").forEach(function (b) { b.addEventListener("click", function () {
      var x = GOAL_IDEAS[+b.getAttribute("data-gi")], f = $("goal-form"); if (!f) return;
      f.elements.title.value = x[0]; f.elements.source.value = x[1]; f.elements.unit.value = x[2]; f.elements.dept.value = x[3] || ""; f.elements.target.focus();
    }); });
    var gf = $("goal-form"); if (gf) gf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var e = gf.elements, b = gf.querySelector("button"); b.disabled = true;
      pRun("addGoal", { term: goalTerm(), title: e.title.value.trim(), target: +e.target.value, unit: e.unit.value.trim() || "#", source: e.source.value, dept: e.dept.value || undefined, note: e.note.value.trim() || undefined }, "Goal added.").catch(function () { b.disabled = false; });
    });
    hub.querySelectorAll("[data-goal-actual]").forEach(function (f) { f.addEventListener("submit", function (ev) {
      ev.preventDefault(); if (f.elements.v.value === "") return;
      pRun("setGoalActual", { id: f.getAttribute("data-goal-actual"), actual: +f.elements.v.value }, "Number saved.");
    }); });
    hub.querySelectorAll("[data-goal-del]").forEach(function (b) { b.addEventListener("click", function () { b.disabled = true; pRun("removeGoal", { id: b.getAttribute("data-goal-del") }, "Goal removed.").catch(function () { b.disabled = false; }); }); });
    hub.querySelectorAll("[data-res-del]").forEach(function (b) { b.addEventListener("click", function () {
      b.disabled = true; Promise.resolve(backend.run("removeResult", { id: b.getAttribute("data-res-del") })).then(function () { PUBLIC_RESULTS = null; loadResults(); toast("Result removed."); }, function (x) { b.disabled = false; toast(errText(x)); });
    }); });
    var bf = $("budget-form"); if (bf) bf.addEventListener("submit", function (ev) {
      ev.preventDefault(); var b = bf.querySelector("button"); b.disabled = true;
      Promise.resolve(backend.run("setBudget", { team: bf.getAttribute("data-team"), total: +bf.elements.total.value, opsShare: +bf.elements.ops.value, status: bf.elements.status.value, note: bf.elements.note.value.trim() || undefined }))
        .then(function () { toast("Budget saved. The captain and the departments see it."); }, function (x) { b.disabled = false; toast(errText(x)); });
    });
    var tif = $("team-info-form");
    if (tif && $("ti-team").tagName === "SELECT") $("ti-team").addEventListener("change", function () { state.teamOpen = $("ti-team").value; render(); });
    if (tif && backend && backend.getTeamInfo) Promise.resolve(backend.getTeamInfo($("ti-team").value)).then(function (r) {
      if (!r || !$("team-info-form")) return;
      [["ti-about", "about"], ["ti-contact", "contact"], ["ti-venue", "venue"], ["ti-venue-address", "venueAddress"], ["ti-venue-cname", "venueContactName"], ["ti-venue-cemail", "venueContactEmail"], ["ti-venue-cphone", "venueContactPhone"], ["ti-league", "league"], ["ti-league-url", "leagueUrl"], ["ti-league-cname", "leagueContactName"], ["ti-league-cemail", "leagueContactEmail"], ["ti-league-cphone", "leagueContactPhone"]].forEach(function (f) { if ($(f[0]) && r[f[1]] && !$(f[0]).hasAttribute("data-drafted")) { $(f[0]).value = r[f[1]]; $(f[0]).defaultValue = r[f[1]]; } });
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
      if (live()) {
        var mb = mf.querySelector('button[type="submit"]'); mb.disabled = true;
        Promise.resolve(backend.run("addResult", { team: id, date: $("m-date").value, opponent: $("m-opponent").value.trim(), side: $("m-side").value, score: $("m-score").value.trim() || undefined, status: $("m-status").value, competition: $("m-comp").value.trim() || undefined }))
          .then(function () { state.teamOpen = id; PUBLIC_RESULTS = null; loadResults(); toast("Result added. It shows on the team page."); }, function (x) { mb.disabled = false; toast(errText(x)); });
        return;
      }
      if (!state.teamResults[id]) state.teamResults[id] = [];
      state.teamResults[id].push({ date: $("m-date").value, opponent: $("m-opponent").value.trim(), side: $("m-side").value, score: $("m-score").value.trim(), status: $("m-status").value, competition: $("m-comp").value.trim() });
      if ($("m-status").value === "Final" && !$("m-score").value.trim()) { state.teamResults[id].pop(); toast("Add the score for a final result."); return; }
      state.teamOpen = id; save(); render(); toast("Result added.");
    });
  }

  // ================= Form drafts =================
  // Nothing a visitor types is lost: what they change in any form is kept in this browser tab (sessionStorage)
  // and put back after a re-render, a language switch, a hash change, a link click or a reload.
  // Cleared when the form is sent. Never stored: passwords, files, ID/passport numbers, hidden or honeypot fields.
  var DRAFT_KEY = "es-drafts", draftSent = {};
  var DRAFT_SKIP = /pass|passport|dni|nie\b|id-?num|idnum|iddoc|tn-id|iban|card|code|website/i;
  // Controls that save or switch the view as soon as they change: never put back from a draft.
  var DRAFT_NOT = /^(cal-team|p-team-f|demo-as|team-as|ck-team|hi-dept|hi-team|ti-team|act-area)$/;
  var DRAFT_LIVE_ATTRS = ["data-task", "data-pstage", "data-msg", "data-app-stage", "data-inq", "data-bd", "data-key", "data-tn-file", "data-ho-file"];
  function draftRead() { try { var d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); return d && typeof d === "object" ? d : {}; } catch (e) { return {}; } }
  function draftWrite(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {} }
  function draftFormKey(f) {
    if (f.__dk) return f.__dk; // fixed when the form is first seen, so a hash change does not move its draft
    var cls = function (x) { return String(x.className || "").split(" ")[0] || "form"; };
    var area = pub.contains(f) ? "pub" : (location.hash.slice(1) || "home"), sig = f.id || cls(f);
    Array.prototype.forEach.call(f.attributes, function (a) { if (a.name.indexOf("data-") === 0 && a.name.indexOf("data-o-") !== 0 && a.name !== "data-drafted") sig += "|" + a.name + "=" + a.value; });
    if (!f.id) { var same = 0, all = document.querySelectorAll("form"); for (var i = 0; i < all.length && all[i] !== f; i++) if (!all[i].id && cls(all[i]) === cls(f)) same++; sig += "#" + same; }
    return (f.__dk = area + "::" + sig);
  }
  function draftFields(f) {
    return Array.prototype.filter.call(f.elements, function (el) {
      var t = (el.type || "").toLowerCase(), n = el.id || el.name || el.getAttribute("data-f") || "";
      if (!n || el.disabled || el.hasAttribute("data-nodraft") || el.closest(".hp") || DRAFT_NOT.test(n)) return false;
      if (DRAFT_LIVE_ATTRS.some(function (a) { return el.hasAttribute(a); })) return false;
      if (/^(password|file|hidden|submit|button|reset|image)$/.test(t) || el.tabIndex < 0 || el.getAttribute("autocomplete") === "off" || el.getAttribute("autocomplete") === "one-time-code") return false;
      return !DRAFT_SKIP.test(n);
    });
  }
  function draftFieldKey(el) { return el.type === "radio" ? "r:" + el.name : (el.id || el.name || "f:" + el.getAttribute("data-f")) + (el.type === "checkbox" && !el.id ? ":" + el.value : ""); }
  function draftCollect(f) {
    var out = {}, any = false;
    draftFields(f).forEach(function (el) {
      var k = draftFieldKey(el), t = el.type;
      if (t === "radio") { if (el.checked && !el.defaultChecked) { out[k] = { v: el.value }; any = true; } }
      else if (t === "checkbox") { if (el.checked !== el.defaultChecked) { out[k] = { c: el.checked }; any = true; } }
      else if (el.tagName === "SELECT") {
        var def = 0; Array.prototype.forEach.call(el.options, function (o, i) { if (o.defaultSelected) def = i; });
        if (el.selectedIndex !== def && el.selectedIndex >= 0) { out[k] = { v: el.value, i: el.selectedIndex }; any = true; }
      } else if (el.value !== el.defaultValue) { out[k] = { v: el.value }; any = true; }
    });
    return any ? out : null;
  }
  function draftVisible(f) { return f.isConnected && !f.hidden && !f.closest("[hidden]"); }
  function draftSave(f, d) {
    var write = !d; d = d || draftRead();
    var k = draftFormKey(f);
    if (draftSent[k]) delete d[k];
    else if (draftVisible(f)) { var v = draftCollect(f); if (v) d[k] = { t: Date.now(), f: v }; else if (f.__dr) delete d[k]; } // __dr: drafts already put back in this form
    if (write) draftWrite(d);
    return d;
  }
  function draftSaveAll() { var d = draftRead(); document.querySelectorAll("form").forEach(function (f) { draftSave(f, d); }); draftWrite(d); }
  function draftRestoreAll() {
    var d = draftRead(), now = Date.now(), changed = false;
    Object.keys(d).forEach(function (k) { if (!d[k] || now - d[k].t > 864e5) { delete d[k]; changed = true; } });
    if (changed) draftWrite(d);
    document.querySelectorAll("form").forEach(function (f) {
      var k = draftFormKey(f), e = d[k]; f.__dr = true; if (!e || draftSent[k]) return;
      draftFields(f).forEach(function (el) {
        var s = e.f[draftFieldKey(el)], t = el.type, set = false; if (!s) return;
        if (t === "radio") { if (el.value === s.v && !el.checked) { el.checked = true; set = true; } }
        else if (t === "checkbox") { if (el.checked !== s.c) { el.checked = s.c; set = true; } }
        else if (el.tagName === "SELECT") {
          if (el.value !== s.v) { var before = el.selectedIndex; el.value = s.v; if (el.selectedIndex < 0 || el.value !== s.v) { el.selectedIndex = s.i < el.options.length ? s.i : before; } set = el.selectedIndex !== before; }
        } else if (el.value !== s.v) { el.value = s.v; set = true; }
        if (!set) return;
        el.setAttribute("data-drafted", "");
        // Let the form update what depends on the field (counters, hidden sections). Fields that save on change are skipped above.
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  }
  function draftOnEdit(e) {
    var f = e.target && e.target.form; if (!f) return;
    var k = draftFormKey(f); f.__dr = true; if (e.isTrusted) delete draftSent[k];
    draftSave(f);
  }
  document.addEventListener("input", draftOnEdit, true);
  document.addEventListener("change", draftOnEdit, true);
  // Sent: forget the draft so a fresh empty form is not refilled. Typing again in it starts a new draft.
  document.addEventListener("submit", function (e) { var f = e.target; if (!f || f.tagName !== "FORM") return; var k = draftFormKey(f), d = draftRead(); draftSent[k] = true; delete d[k]; draftWrite(d); }, true);
  // An explicit Cancel inside a form throws its draft away (clicking outside a dialog keeps it).
  document.addEventListener("click", function (e) {
    var c = e.target.closest && e.target.closest("form button[type=button]"); if (!c) return;
    if (!c.hasAttribute("data-pl-close") && !/^\s*cancel/i.test(c.textContent)) return;
    var f = c.form || c.closest("form"), k = draftFormKey(f), d = draftRead(); draftSent[k] = true; delete d[k]; draftWrite(d);
  }, true);
  window.addEventListener("pagehide", draftSaveAll);
  document.addEventListener("visibilitychange", function () { if (document.hidden) draftSaveAll(); });
  // Links inside a form (privacy policy, terms...) open in a new tab, so the form stays as it is.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("form a[href]"); if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!href || href === "#" || /^(mailto:|tel:|javascript:)/i.test(href) || a.hasAttribute("download") || a.target) return;
    for (var i = 0; i < a.attributes.length; i++) if (a.attributes[i].name.indexOf("data-") === 0) return;
    a.target = "_blank"; a.rel = "noopener";
  }, true);

  function langSwitch() { return '<div class="lang" role="group" aria-label="Language">' + ["en", "ca", "es"].map(function (l) { return '<button type="button" data-lang="' + l + '" aria-pressed="' + (window.__lang === l) + '">' + l.toUpperCase() + "</button>"; }).join("") + "</div>"; }
  // ================= Router =================
  function go(h) { if (location.hash.slice(1) === h) render(); else location.hash = h; }
  function show(which) {
    pub.hidden = which !== "pub"; page.hidden = which !== "page"; hub.hidden = which !== "hub";
    siteHead.hidden = which === "hub"; siteFoot.hidden = which === "hub";
  }
  // Every redraw keeps what people typed: save the open forms, redraw, then put the drafts back.
  function render() { draftSaveAll(); renderView(); draftRestoreAll(); }
  function renderView() {
    var h = location.hash.slice(1), html = null;
    document.querySelector(".head").classList.remove("open");
    if (h.indexOf("hub-") === 0) {
      if (admin === undefined && !captain) { page.innerHTML = '<section class="band"><div class="wrap"><h1 class="display">Checking your login…</h1></div></section>'; show("page"); return; }
      if (!admin && !captain) { location.replace("#signin"); return; }
      if (demoPublic) { demoPublic = false; industryVisibility(); }
      applyPeople(); applyBudgets();
      if (!isHub() || !viewAllowed(state.user)) { var dv = allowedViews()[0]; if (!dv) { location.replace("#signin"); return; } state.user = dv; save(); renderAcct(); }
      if (h === "hub-expenses" && !can("expenses")) h = "hub-overview";
      if (h === "hub-departments" && !can("depts")) h = "hub-overview";
      if (h === "hub-report" && !can("reports")) h = "hub-overview";
      if (h === "hub-captains" && !can("captains")) h = "hub-overview";
      if (h === "hub-team-editor" && !can("teamEdit")) h = "hub-overview";
      if (h === "hub-applications" && !can("applications")) h = "hub-overview";
      if (h === "hub-ideas" && !can("ideas")) h = "hub-overview";
      if (h === "hub-partners" && !can("partners")) h = "hub-overview";
      if (h === "hub-goals" && !can("goals")) h = "hub-overview";
      if ((h === "hub-messages" || h === "hub-assoc-apps") && !can("board")) h = "hub-overview";
      if (h === "hub-chat" && !can("chat")) h = "hub-overview";
      if (h === "hub-tournament" && !can("tournament")) h = "hub-overview";
      if (h === "hub-people" && !can("people")) h = "hub-overview";
      // A link to a page this person cannot open: say so and go to the overview, instead of silently doing nothing.
      if (h !== location.hash.slice(1)) { var lbl = HUBV.filter(function (v) { return v[0] === location.hash.slice(1); })[0]; toast((lbl ? lbl[1] : "This page") + " is not part of your access. Ask your head of department or the Board if you need it."); location.replace("#hub-overview"); return; }
      var inner = h === "hub-tournament" ? hubTournament() : h === "hub-handover" ? hubHandover() : h === "hub-contracts" ? hubContracts() : h === "hub-chat" ? hubChat() : h === "hub-messages" ? hubMessages() : h === "hub-assoc-apps" ? hubAssocApps() : h === "hub-partners" ? hubPartners() : h === "hub-goals" ? hubGoals() : h === "hub-teams" ? hubTeams() : h === "hub-team-editor" ? hubTeamEditor() : h === "hub-applications" ? hubApplications() : h === "hub-captains" ? hubCaptains() : h === "hub-people" ? hubPeople() : h === "hub-expenses" ? hubExpenses() : h === "hub-departments" ? hubDepts() : h === "hub-report" || h === "hub-checkups" ? hubCheckups() : h === "hub-ideas" ? hubIdeas() : h === "hub-history" ? hubHistory() : hubOverview();
      hub.innerHTML = hubShell(h, inner); show("hub"); bindHub(); bindBell(); updateTitle(); showTab(); return;
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
    if (row) { if (row.tagName === "A") e.preventDefault(); openMatch(row.getAttribute("data-match-id")); }
    if (e.target.closest && e.target.closest("[data-match-close]")) closeMatch();
  });
  document.addEventListener("keydown", function (e) {
    var row = e.target.closest && e.target.closest("[data-match-id]");
    if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMatch(row.getAttribute("data-match-id")); }
    if (e.key === "Escape") closeMatch();
    if (e.key === "Escape" && state.rosterEdit) { state.rosterEdit = null; render(); }
    if (e.key === "Escape" && state.msgOpen && location.hash === "#hub-messages") { state.msgOpen = null; render(); }
    if (e.key === "Escape" && state.tryOpen && location.hash === "#hub-applications") { state.tryOpen = null; render(); }
    if (e.key === "Escape" && state.appOpen && location.hash === "#hub-assoc-apps") { state.appOpen = null; render(); }
  });
  var pf = $("partner-form");
  pf.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!$("p-company").value.trim() || !$("p-name").value.trim() || !$("p-email").value.trim()) { $("p-err").hidden = false; return; }
    $("p-err").hidden = true;
    var data = { company: $("p-company").value.trim(), name: $("p-name").value.trim(), email: $("p-email").value.trim(), interest: $("p-type").value, message: $("p-msg").value.trim() || undefined, lang: window.__lang };
    function done() { pf.hidden = true; $("p-done").hidden = false; }
    if (!backend || !backend.submitPartnerInquiry) { done(); return; }
    var btn = pf.querySelector('button[type="submit"]'); btn.disabled = true;
    // Saved in the database: the Partnerships team follows it up in the Hub.
    Promise.resolve(backend.submitPartnerInquiry(data)).then(done, function (x) {
      console.error(x); btn.disabled = false;
      $("p-err").textContent = "Your message could not be sent. Please check the fields and try again."; $("p-err").hidden = false;
    });
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
  window.addEventListener("hashchange", function () { state.teamOpen = null; state.tnOpen = null; state.tnEv = null; bellOpen = false; render(); updateTitle(); });
  // A live update that arrived while someone was typing in the Hub is shown once they leave the field.
  hub.addEventListener("focusout", function () { if (LIVE.dirty) setTimeout(function () { if (LIVE.dirty && !hubBusy()) { LIVE.dirty = false; render(); } }, 400); });
  homeGames(); homeEvents(); setInterval(function () { homeGames(); homeEvents(); }, 60000);
  renderAcct(); render(); loadAlumni(); loadTeamInfo(); loadResults();
  return { setAdmin: setAdmin };

}
