import { HERO_IMAGE } from "@/lib/images";

// Static markup of the original single-page prototype (header, home sections, footer).
// Dynamic views (team pages, alumni, forms, Hub) are rendered by site.js.
export const SITE_MARKUP = `

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="es" viewBox="0 0 132 72">
      <text class="e" style="fill:currentColor;font-family:var(--font)" x="2" y="64" font-weight="900" font-style="italic" font-size="84">E</text>
      <text class="s" style="fill:var(--mono-bg,#fff);stroke:currentColor;stroke-width:5;paint-order:stroke;stroke-linejoin:round;font-family:var(--font)" x="44" y="64" font-weight="900" font-style="italic" font-size="84">S</text>
    </symbol>
  </defs>
</svg>

<header class="head" id="top">
  <div class="wrap">
    <a class="lockup" href="#home" aria-label="Esade Sports, home">
      <svg class="mono" viewBox="0 0 132 72" aria-hidden="true"><use href="#es"/></svg>
      <span>ESADE SPORTS</span>
    </a>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="#teams">Teams</a>
      <a href="#fixtures">Fixtures</a>
      <a href="#events">Events</a>
      <a href="#about">About</a>
      <a href="#alumni">Alumni</a>
      <a href="#join">Recruitment</a>
      <a href="#partners">Partner with us!</a>
      <span id="acct"></span>
      <div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="true">EN</button><button type="button" data-lang="ca" aria-pressed="false">CA</button><button type="button" data-lang="es" aria-pressed="false">ES</button></div>
      <span id="member"></span>
    </nav>
  </div>
</header>

<div id="public">
<main>
  <section class="hero navy" style="--mono-bg: var(--navy)">
    <div class="wrap">
      <div>
        <p class="eyebrow rise">Season 2026–27 · Sign-ups open</p>
        <h1 class="display rise d1">Play for<br>Esade.</h1>
        <p class="sub rise d2">Competitive teams, social leagues and events for every Esade student. Find your sport and join a squad.</p>
        <div class="ctas rise d3">
          <a class="btn btn-solid-white" href="#apply">Join a team</a>
          <a class="btn btn-ghost-white" href="#fixtures">See fixtures</a>
        </div>
      </div>
      <div class="plate">
        <img class="plate-img" src="${HERO_IMAGE}" alt="Students huddling before a football match" fetchpriority="high">
        <div class="stripes"></div>
      </div>
    </div>
  </section>

  <section class="sec prototype-preview" id="industry" aria-label="Presentation-only industry platform preview">
    <div class="wrap industry">
      <div class="copy">
        <p class="eyebrow" style="color:var(--blue);margin:0">Presentation preview · Eva Morta / Student Council</p>
        <span class="badge">Prototype only · Coming 2027–28</span>
        <h2 class="h2">The Esade Sports Industry Platform</h2>
        <p class="lede">One place where Esade students build a profile that sports companies can browse, and find sports internships and jobs. Built to complement Esade’s careers services.</p>
        <a class="btn btn-ghost-navy" href="#industry">Register interest</a>
        <p class="preview-note">This presentation block is kept for the Eva Morta and Student Council prototype review and can be hidden before the public launch.</p>
      </div>
      <ul>
        <li><b>Students</b><span>A profile sports companies can browse, internships and jobs in one place, direct contact with partners at events.</span></li>
        <li><b>Companies</b><span>Access to Esade students interested in sport, a curated sports-industry CV book, a channel to share roles.</span></li>
        <li><b>Esade</b><span>A dedicated route into the sports industry and a growing network of partner companies.</span></li>
      </ul>
    </div>
  </section>

  <section class="strip" aria-label="Next match">
    <div class="wrap">
      <p class="eyebrow">Next match · Football 7</p>
      <p class="vs" style="margin:0">EUBS <b>vs</b> Esade FC</p>
      <div class="meta">
        <span>Sat 14/11 · 17:00 · Field A</span>
        <a class="link-arrow" href="#team-football7-men-schedule">Match details →</a>
      </div>
    </div>
  </section>

  <section class="sec" id="teams">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Twelve official teams, one family</p>
          <h2 class="h2">Our teams</h2>
        </div>
        <a class="link-arrow" href="#teams">All sports →</a>
      </div>
      <ul class="teams" id="teams-grid"></ul>
    </div>
  </section>

  <section class="sec" id="fixtures" style="padding-top:0">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Fixtures and results</p>
          <h2 class="h2">This week at Esade</h2>
        </div>
        <a class="link-arrow" href="#fixtures">Full calendar →</a>
      </div>
      <div class="fx-grid">
        <div>
          <div class="tabs" role="tablist" aria-label="Fixtures or results">
            <button role="tab" id="tab-up" aria-selected="true" aria-controls="list-up">Upcoming</button>
            <button role="tab" id="tab-res" aria-selected="false" aria-controls="list-res">Results</button>
          </div>
          <ul class="rows" id="list-up" role="tabpanel" aria-labelledby="tab-up">
            <li class="row match-button" data-match-id="football-7" role="button" tabindex="0" aria-label="View Football 7 match details"><span class="when"><b>Sat 14/11</b>17:00</span><span class="match"><span class="sport">Football 7 · Men</span><div class="teamsline">EUBS vs Esade FC</div><span class="where">Field A · UniBall Elite</span></span><span class="tag">Away</span></li>
            <li class="row match-button" data-match-id="basketball-men" role="button" tabindex="0" aria-label="View Basketball men match details"><span class="when"><b>Tue 17/11</b>21:00</span><span class="match"><span class="sport">Basketball · Men</span><div class="teamsline">Esade vs FE NATURAL</div><span class="where">Thau Pedralbes · CSS 1ª Divisió</span></span><span class="tag">Home</span></li>
            <li class="row match-button" data-match-id="basketball-women" role="button" tabindex="0" aria-label="View Basketball women match details"><span class="when"><b>Sat 21/11</b>12:00</span><span class="match"><span class="sport">Basketball · Women <em class="ex">Example</em></span><div class="teamsline">Esade vs GBSB Global</div><span class="where">Court 2 · Barcelona Sports Hub</span></span><span class="tag">Home</span></li>
            <li class="row match-button" data-match-id="volleyball-men" role="button" tabindex="0" aria-label="View Volleyball men match details"><span class="when"><b>Sun 22/11</b>11:00</span><span class="match"><span class="sport">Volleyball · Men <em class="ex">Example</em></span><div class="teamsline">Esade vs TBS United</div><span class="where">Court 1 · Esade Pedralbes Campus</span></span><span class="tag">Home</span></li>
            <li class="row match-button" data-match-id="padel-women" role="button" tabindex="0" aria-label="View Padel women match details"><span class="when"><b>Wed 25/11</b>18:30</span><span class="match"><span class="sport">Padel · Women <em class="ex">Example</em></span><div class="teamsline">Esade vs EU Business School</div><span class="where">Padel Court 4 · Vall d’Hebron Sports Centre</span></span><span class="tag">Home</span></li>
          </ul>
          <ul class="rows" id="list-res" role="tabpanel" aria-labelledby="tab-res" hidden>
            <li class="row match-button" data-match-id="futsal-women-result" role="button" tabindex="0" aria-label="View Futsal women result details"><span class="when"><b>Sat 07/11</b>Final</span><span class="match"><span class="sport">Futsal · Women <em class="ex">Example</em></span><div class="teamsline">Esade 4–2 Sant Cugat FC</div><span class="where">Court 3 · Esade Pedralbes Campus</span></span><span class="score">4–2</span></li>
            <li class="row match-button" data-match-id="basketball-men-result" role="button" tabindex="0" aria-label="View Basketball men result details"><span class="when"><b>Tue 10/11</b>Final</span><span class="match"><span class="sport">Basketball · Men</span><div class="teamsline">Esade vs TOP</div><span class="where">Thau Pedralbes · CSS 1ª Divisió</span></span><span class="score">56–37</span></li>
            <li class="row match-button" data-match-id="volleyball-women-result" role="button" tabindex="0" aria-label="View Volleyball women result details"><span class="when"><b>Wed 04/11</b>Final</span><span class="match"><span class="sport">Volleyball · Women <em class="ex">Example</em></span><div class="teamsline">Esade 2–1 ESADE Business School</div><span class="where">Court 2 · Esade Pedralbes Campus</span></span><span class="score">2–1</span></li>
          </ul>
        </div>
        <aside class="fx-side" aria-label="Match day">
          <p class="eyebrow">Basketball · Home game</p>
          <h3 class="display">Match<br>day.</h3>
          <p>Come and support your classmates. Every home game is open to all Esade students.</p>
          <dl>
            <div><dt>When</dt><dd>Tue 17/11 · 21:00</dd></div>
            <div><dt>Where</dt><dd>Thau Pedralbes</dd></div>
            <div><dt>Against</dt><dd>FE NATURAL</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  </section>

  <section class="sec pillars-sec about" id="about" aria-labelledby="about-title">
    <div class="wrap">
      <p class="eyebrow" style="color:var(--blue);margin-bottom:16px">About Esade Sports</p>
      <h2 class="display about-title" id="about-title">The home of<br>sport at Esade.</h2>
      <div class="about-grid">
        <div class="about-text">
          <p class="about-lead">Esade Sports is the student sports association of Esade. We run the official Esade teams, organise events for the community and connect students with the sports industry.</p>
          <p>We are an amateur, student-run association: every player, captain, coach and associate is a volunteer. There are no professional players and no paid staff, just students and alumni who love their sport.</p>
        </div>
        <div class="about-what">
          <p class="eyebrow">What we do</p>
          <ul>
            <li><b>Inform</b><span>Teams, fixtures, results and the Esade sports community, alumni included.</span></li>
            <li><b>Recruit</b><span>Try-outs for players, volunteer coaches (Esade students or not) and associates for our departments.</span></li>
            <li><b>Partner</b><span>Sponsors for the teams and companies for sports-business events.</span></li>
            <li><b>Organise</b><span>One place for captains, the Board and the Student Council to share requests, decisions and follow-up.</span></li>
          </ul>
        </div>
      </div>
      <dl class="about-stats">
        <div><dt>Sports</dt><dd>7</dd></div>
        <div><dt>Teams</dt><dd>12</dd></div>
        <div><dt>Departments</dt><dd>4</dd></div>
        <div><dt>Student-run</dt><dd>100%</dd></div>
      </dl>
      <div class="pillars">
        <div class="pillar"><p class="eyebrow">Pillar 01</p><h3>Teams</h3><p>Well-run, well-supported and visible official teams. Every team gets a dedicated finance, media and operations associate.</p></div>
        <div class="pillar"><p class="eyebrow">Pillar 02</p><h3>Events</h3><p>Tournaments for the community, and real sports-business events with people from the industry.</p></div>
        <div class="pillar"><p class="eyebrow">Pillar 03</p><h3>Industry</h3><p>A bridge between Esade students and sports-industry companies, through the Industry Platform.</p></div>
      </div>
      <div class="about-board">
        <div class="sec-head"><div><p class="eyebrow">The team</p><h3 class="h2">The Board</h3></div><span class="tbc-note">Names to be confirmed</span></div>
        <ul class="board-grid">
          <li><b>President</b><span>To be confirmed</span></li>
          <li><b>Vice-President</b><span>To be confirmed</span></li>
          <li><b>Head of Finance</b><span>To be confirmed</span></li>
          <li><b>Head of Media &amp; Marketing</b><span>To be confirmed</span></li>
          <li><b>Head of Operations</b><span>To be confirmed</span></li>
          <li><b>Head of Partnerships</b><span>To be confirmed</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="sec" id="events">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Events</p>
          <h2 class="h2">For the community and for the industry</h2>
        </div>
        <a class="link-arrow" href="#events">All events →</a>
      </div>
      <div class="events">
        <article class="event">
          <div class="title"><p class="eyebrow">Esade Sports presents</p><h3 class="display">World<br>Cup.</h3></div>
          <dl><div><dt>When</dt><dd>Saturday 06/02/2027 · 10:00</dd></div><div><dt>Where</dt><dd>UniBall Elite · Barcelona</dd></div><div><dt>Format</dt><dd>Football · open to all</dd></div></dl>
        </article>
        <article class="event">
          <div class="title"><p class="eyebrow">Esade Sports presents</p><h3 class="display">Padel<br>Tour.</h3></div>
          <dl><div><dt>When</dt><dd>Saturday 20/02/2027 · 12:00</dd></div><div><dt>Where</dt><dd>Vall d'Hebron Sports Centre</dd></div><div><dt>Format</dt><dd>Padel · open to all</dd></div></dl>
        </article>
        <article class="event">
          <div class="title"><p class="eyebrow">Sports business</p><h3 class="display">Talks &amp;<br>panels.</h3></div>
          <dl><div><dt>When</dt><dd>Thursday 04/03/2027 · 18:30</dd></div><div><dt>Speaker</dt><dd>Laia Martín · Sports Partnerships Director</dd></div><div><dt>Format</dt><dd>Talk, panel or workshop</dd></div></dl>
        </article>
      </div>
    </div>
  </section>

  <section class="join navy" id="join">
    <div class="wrap">
      <div class="top">
        <div style="display:grid;gap:14px">
          <p class="eyebrow">Membership · Open recruitment</p>
          <h2 class="display">Build it<br>with us.</h2>
        </div>
        <p>Join a team through try-outs or as a volunteer coach, or join the association as an associate in Finance, Media &amp; Marketing, Operations or Partnerships. Recruitment is in English and open to every Esade student, whatever their nationality or language.</p>
      </div>
      <ol class="steps" aria-label="How recruitment works">
        <li><span class="k">STEP 1</span><strong>Open call</strong><p>Published on every channel, in English.</p></li>
        <li><span class="k">STEP 2</span><strong>Apply</strong><p>CV, cover letter and a short video, through this website.</p></li>
        <li><span class="k">STEP 3</span><strong>Review</strong><p>Chosen by the Board: executive board and Heads.</p></li>
        <li><span class="k">STEP 4</span><strong>Interview</strong><p>Formal, with set questions and a code of conduct.</p></li>
        <li><span class="k">STEP 5</span><strong>Offer</strong><p>Offer and onboarding into your department.</p></li>
      </ol>
      <div class="ctas">
        <a class="btn btn-solid-white" href="#apply-associate">Apply to the association</a>
        <a class="btn btn-ghost-white" href="#apply">Join a team as player or coach</a>
      </div>
    </div>
  </section>

  <section class="partners" id="partners">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="eyebrow">Partner with us!</p>
          <h2 class="h2">Partner with Esade Sports</h2>
        </div>
      </div>
      <p class="lede" style="margin-bottom:28px">Twelve student teams, tournaments open to the whole school, and a growing sports-business programme. Partners help the teams first, and meet Esade students who want to work in sport.</p>
      <div class="ptypes">
        <article class="ptype"><p class="eyebrow">Teams</p><h3>Team sponsor</h3><p>Your logo on a team's kit and on its social media, and visibility at every home game.</p></article>
        <article class="ptype"><p class="eyebrow">Events</p><h3>Event partner</h3><p>Co-host a tournament or a sports-business talk, panel or workshop with our students.</p></article>
        <article class="ptype"><p class="eyebrow">Industry</p><h3>Industry Platform partner</h3><p>Meet Esade students interested in sport, share internships and jobs, and access the CV book.</p></article>
      </div>
      <div class="pgrid">
        <div class="plogos">
          <p class="eyebrow">Our partners</p>
          <ul>
            <li>[Partner logo]</li><li>[Partner logo]</li><li>[Partner logo]</li><li>[Partner logo]</li>
          </ul>
          <p class="muted" style="margin:0;font-size:13px">Our first partners will appear here.</p>
        </div>
        <form class="pform-c" id="partner-form" novalidate>
          <h3>Become a partner</h3>
          <div class="fgrid">
            <label class="field" for="p-company">Company<input id="p-company" required autocomplete="organization"></label>
            <label class="field" for="p-name">Your name<input id="p-name" required autocomplete="name"></label>
            <label class="field" for="p-email">Work email<input id="p-email" type="email" required autocomplete="email"></label>
            <label class="field" for="p-type">Interested in<select id="p-type"><option>Team sponsor</option><option>Event partner</option><option>Industry Platform partner</option><option>Not sure yet</option></select></label>
            <label class="field full" for="p-msg">Message<textarea id="p-msg" rows="3" placeholder="Tell us about your company and what you have in mind"></textarea></label>
          </div>
          <p class="err" id="p-err" hidden>Please add your company, name and work email.</p>
          <div class="form-actions"><button class="btn btn-blue" type="submit">Contact us</button><span class="muted" style="font-size:13px">Or email <a href="mailto:esadesports@alumni.esade.edu">esadesports@alumni.esade.edu</a>.</span></div>
        </form>
        <div class="locked" id="p-done" hidden><p class="eyebrow" style="color:var(--blue)">Ready</p><h2>Your email draft is ready</h2><p>Your email application should open with the proposal addressed to <a href="mailto:esadesports@alumni.esade.edu">esadesports@alumni.esade.edu</a>.</p></div>
      </div>
    </div>
  </section>
</main>
</div>
<div class="match-modal" id="match-modal" hidden>
  <div class="match-backdrop" data-match-close></div>
  <section class="match-dialog" role="dialog" aria-modal="true" aria-labelledby="match-modal-title">
    <button class="match-close" type="button" data-match-close aria-label="Close match details">×</button>
    <p class="eyebrow" id="match-modal-sport" style="color:var(--blue)">Match details</p>
    <h2 id="match-modal-title">Match</h2>
    <p class="match-meta" id="match-modal-meta"></p>
    <dl class="match-details">
      <div><dt>Location</dt><dd id="match-modal-location"></dd></div>
      <div><dt>League / event</dt><dd id="match-modal-league"></dd></div>
      <div><dt>Status</dt><dd id="match-modal-status"></dd></div>
    </dl>
  </section>
</div>
<div id="page" class="page" hidden></div>
<div id="hub" hidden></div>

<footer class="foot" id="site-foot">
  <div class="wrap">
    <a class="lockup" href="#home" aria-label="Esade Sports, back to home">
      <svg class="mono" viewBox="0 0 132 72" aria-hidden="true"><use href="#es"/></svg>
      <span>ESADE SPORTS</span>
    </a>
    <nav aria-label="Footer">
      <a href="#top">Instagram</a>
      <a href="#top">TikTok</a>
      <a href="#top">LinkedIn</a>
      <a href="#partners">Partner with us!</a>
      <a href="mailto:esadesports@alumni.esade.edu">Contact</a>
      <a href="#privacy">Privacy</a>
      <a class="foot-members" href="#signin">Members</a>
    </nav>
    <small><a class="foot-email" href="mailto:esadesports@alumni.esade.edu">esadesports@alumni.esade.edu</a><br>© Esade Sports 2026</small>
  </div>
</footer>
<div class="proto"><div class="wrap"><b>Prototype</b><span>Items in [brackets] are placeholders. Profiles, figures and tasks are examples. Logins are simulated.</span></div></div>

`;
