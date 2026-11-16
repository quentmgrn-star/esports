"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/components/ConvexClientProvider";
import { TEAMS, teamLabel } from "@/lib/teams";
import { enableBoardDrag } from "@/lib/dragBoard";

type Application = {
  _id: string;
  _creationTime: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  programme: string;
  year: string;
  linkedin?: string;
  pref1: string;
  pref2?: string;
  motivation: string;
  acceptsRedirect: boolean;
  confirmsAccuracy: boolean;
  cvUrl: string | null;
  moreDocLinks?: { url: string; name: string }[];
  videoUrl: string | null;
  stage?: Stage;
  stageChangedAt?: number;
  notes?: string;
  confirmEmail?: string;
};

// Recruitment pipeline (same values as convex/stages.ts).
type Stage = "applied" | "review" | "interview" | "case" | "offer" | "accepted" | "declined" | "rejected";
const STAGE_LABEL: Record<Stage, string> = {
  applied: "Applied",
  review: "Under review",
  interview: "Interview",
  case: "Case interview",
  offer: "Offer sent",
  accepted: "Offer accepted",
  declined: "Offer declined",
  rejected: "Not accepted",
};
const STAGES = Object.keys(STAGE_LABEL) as Stage[];
const DECISION: Stage[] = ["offer", "accepted", "declined", "rejected"];
type Tab = "all" | "applied" | "review" | "interview" | "case" | "decision";
const TABS: [Tab, string][] = [
  ["all", "All"],
  ["applied", "Applied"],
  ["review", "Under review"],
  ["interview", "Interview"],
  ["case", "Case interview"],
  ["decision", "Decision"],
];
const stageOf = (a: Application): Stage => a.stage ?? "applied";
const inTab = (a: Application, tab: Tab) =>
  tab === "all" || (tab === "decision" ? DECISION.includes(stageOf(a)) : stageOf(a) === tab);

function StageSelect({ app }: { app: Application }) {
  const setStage = useMutation(api.admin.setApplicationStage);
  const [busy, setBusy] = useState(false);
  return (
    <select
      className={`adm-stage stg-sel stg-${stageOf(app)}`}
      value={stageOf(app)}
      disabled={busy}
      aria-label={`Stage for ${app.firstName} ${app.lastName}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={async (e) => {
        setBusy(true);
        try {
          await setStage({ id: app._id, stage: e.target.value });
        } catch (err) {
          alert(`Could not change the stage: ${err instanceof Error ? err.message : String(err)}`);
        }
        setBusy(false);
      }}
    >
      {STAGES.map((st) => (
        <option key={st} value={st}>
          {STAGE_LABEL[st]}
        </option>
      ))}
    </select>
  );
}

// ---- Kanban board: one colour-coded column per stage; drag a card into another column to change it ----
// Mouse: drag. Phone: press and hold, then drag. The drop-down on each card stays as a fallback.
type KbCol = { id: string; label: string };
function Kanban<T extends { _id: string }>(props: {
  cols: KbCol[];
  items: T[];
  colOf: (it: T) => string;
  cardClass: (it: T, col: string) => string;
  canMove: boolean;
  onMove: (it: T, col: string) => Promise<unknown>;
  onOpen: (it: T) => void;
  children: (it: T) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState<Record<string, string>>({});
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (!ref.current || !props.canMove) return;
    return enableBoardDrag(ref.current, (id, col) => {
      const it = latest.current.items.find((x) => x._id === id);
      if (!it) return;
      setMoved((m) => ({ ...m, [id]: col }));
      latest.current
        .onMove(it, col)
        .catch((err) => alert(`Could not move it: ${err instanceof Error ? err.message : String(err)}`))
        .finally(() => setMoved((m) => { const n = { ...m }; delete n[id]; return n; }));
    });
  }, [props.canMove]);
  const where = (it: T) => moved[it._id] ?? props.colOf(it);
  return (
    <div className="kb" ref={ref}>
      {props.cols.map((c) => {
        const list = props.items.filter((it) => where(it) === c.id);
        return (
          <section key={c.id} className={`kb-col stg-${c.id}`} data-drop={c.id} aria-label={c.label}>
            <h3>
              {c.label}
              <b>{list.length}</b>
            </h3>
            <div className="kb-list">
              {list.length ? (
                list.map((it) => (
                  <article
                    key={it._id}
                    className={`kb-card stg-${props.cardClass(it, where(it))}`}
                    data-card={props.canMove ? it._id : undefined}
                    data-col={where(it)}
                    tabIndex={0}
                    title={props.canMove ? "Drag to another column, or click to open" : "Click to open"}
                    onClick={() => props.onOpen(it)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), props.onOpen(it))}
                  >
                    {props.children(it)}
                  </article>
                ))
              ) : (
                <p className="kb-empty">{props.canMove ? "Drop here" : "Nobody here"}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ViewSwitch({ view, setView, hint }: { view: "board" | "table"; setView: (v: "board" | "table") => void; hint?: string }) {
  return (
    <div className="kb-bar">
      <div className="kb-switch" role="group" aria-label="Layout">
        <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
          Board
        </button>
        <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
          Table
        </button>
      </div>
      {view === "board" && hint && <p className="kb-hint">{hint}</p>}
    </div>
  );
}
const DRAG_HINT = "Drag a card into another column to change its stage (on a phone: press and hold, then drag). Click a card to open it.";
const statusSlug = (s: string) => s.replace(/\s+/g, "-").toLowerCase();

type Me = {
  name: string;
  email: string;
  isAdmin: boolean;
  exec: boolean; // president or vice-president
  heads: string[]; // departments they head
  assoc: { department: string; teams: string[] }[];
  teams: string[]; // teams they captain
  viewer: boolean;
  full: boolean; // sees everything
  readOnly: boolean;
  board: boolean;
  label: string;
} | null;
// Same rules as convex/roles.ts (the server enforces them; this only decides which tabs to show).
const deptsOf = (me: NonNullable<Me>) => [...me.heads, ...me.assoc.map((x) => x.department)];
const roleLabel = (me: NonNullable<Me>) => me.label || (me.isAdmin ? "Admin" : "Member");
// Set when a sign-in or sign-up succeeds on this page; read once when the account has loaded.
const JUST_SIGNED_IN = "es-just-signed-in";
function markJustSignedIn() {
  try {
    sessionStorage.setItem(JUST_SIGNED_IN, "1");
  } catch {}
}
function takeJustSignedIn(): boolean {
  try {
    const v = sessionStorage.getItem(JUST_SIGNED_IN) === "1";
    sessionStorage.removeItem(JUST_SIGNED_IN);
    return v;
  } catch {
    return false;
  }
}

export default function AdminApp() {
  return (
    <div className="adm">
      <header className="adm-head">
        <div className="wrap">
          <a className="lockup" href="/">
            <span>ESADE SPORTS</span>
          </a>
          {convex ? <HeaderStatus /> : <span className="eyebrow">Admin</span>}
        </div>
      </header>
      {convex ? <Gate /> : <Panel title="Not configured">Convex is not configured for this deployment.</Panel>}
    </div>
  );
}

// Always says, in the header, whether you are signed in and as whom.
function HeaderStatus() {
  const { isAuthenticated } = useConvexAuth();
  const session = authClient.useSession();
  const me = useQuery(api.admin.me, isAuthenticated ? {} : "skip") as Me | undefined;
  const email = me?.email ?? session.data?.user?.email;
  return (
    <div className="adm-status">
      <a href="/">← Public site</a>
      {me?.label && <a href="/#hub-overview">Hub</a>}
      {email ? (
        <>
          <span className="adm-badge">
            <i>{me?.isAdmin ? "Admin" : me?.teams?.length ? "Captain" : "Signed in"}</i> {email}
          </span>
          <button type="button" onClick={() => authClient.signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <span className="adm-badge adm-badge-off">
          <i>Not signed in</i>
        </span>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="wrap adm-main">
      <div className="adm-card">
        <h1 className="display adm-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function Gate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const session = authClient.useSession();
  const me = useQuery(api.admin.me, isAuthenticated ? {} : "skip") as Me | undefined;
  const mustChange = useQuery(api.passwords.mustChange, isAuthenticated ? {} : "skip") as boolean | undefined;
  const signedInEmail = session.data?.user?.email;
  // First successful sign-in: recorded once in Convex, which notifies the right people (also done on the site).
  const recordFirstLogin = useMutation(api.notifications.recordFirstLogin);
  const memberEmail = me?.label ? me.email : "";
  useEffect(() => {
    if (memberEmail) recordFirstLogin({}).catch(() => {});
  }, [memberEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Forgot password?" email link: /admin?reset=<token>&lang=xx
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const l = q.get("lang");
    if (l === "en" || l === "ca" || l === "es") {
      try {
        localStorage.setItem("es-lang", l);
      } catch {}
    }
    if (q.get("reset")) setResetToken(q.get("reset"));
  }, []);

  if (resetToken)
    return (
      <ResetPassword
        token={resetToken}
        onDone={(msg) => {
          window.history.replaceState(null, "", "/admin");
          setResetToken(null);
          setNotice(msg);
        }}
      />
    );
  if (isLoading || session.isPending || (isAuthenticated && me === undefined)) {
    return <Panel title="Loading">Checking your session…</Panel>;
  }
  // Signed in with Better Auth, but Convex has not accepted the session (yet).
  if (signedInEmail && (!isAuthenticated || !me)) return <Connecting email={signedInEmail} convexOk={isAuthenticated} />;
  if (!isAuthenticated || !me) return <AuthForm notice={notice} />;
  // Signed in with a temporary password set by an admin: choose your own first.
  if (mustChange) return <ChooseOwnPassword />;
  // Right after signing in or creating an account, everyone except admins, the President and VPs
  // goes to the Hub (their home). /admin stays reachable from the Hub for requests, try-outs, etc.
  if (takeJustSignedIn() && me.label && !me.isAdmin && !me.exec) {
    window.location.replace("/#hub-overview");
    return <Panel title="Opening the Hub">Taking you to the Hub…</Panel>;
  }
  if (!me.label) {
    return (
      <Panel title="No access">
        <p className="adm-p">
          {me.email} has no approved role yet. Request access on the <a href="/#signin">Members page</a>; the Board or an
          admin will approve it.
        </p>
        <SignOut />
      </Panel>
    );
  }
  return <Dashboard me={me} />;
}

// Shown between a successful sign-in and Convex accepting the session. After a few
// seconds it checks the Convex token itself and says what is wrong.
function Connecting({ email, convexOk }: { email: string; convexOk: boolean }) {
  const [detail, setDetail] = useState("");
  useEffect(() => {
    const t = setTimeout(async () => {
      if (convexOk) {
        setDetail("Convex accepted your session but could not find your user. Sign out and sign in again.");
        return;
      }
      try {
        const res = (await authClient.$fetch("/convex/token", { method: "GET" })) as {
          data?: { token?: string } | null;
          error?: { status?: number; message?: string } | null;
        };
        if (res.error || !res.data?.token) {
          setDetail(`Could not get a Convex token: ${res.error?.message || "no token"}${res.error?.status ? ` (HTTP ${res.error.status})` : ""}.`);
        } else {
          setDetail("A Convex token was issued, but Convex rejected it. The Convex functions or auth config on this deployment are probably out of date: redeploy so the build runs \"npx convex deploy\".");
        }
      } catch (e) {
        setDetail(`Could not reach the sign-in service: ${e instanceof Error ? e.message : String(e)}.`);
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [convexOk]);

  return (
    <Panel title="Signing in">
      <p className="adm-p">Signed in as {email}. Connecting to the database…</p>
      {detail && <p className="err">{detail}</p>}
      <SignOut />
    </Panel>
  );
}

function SignOut() {
  return (
    <button className="btn btn-ghost-navy" type="button" onClick={() => authClient.signOut()}>
      Sign out
    </button>
  );
}

// Turns a Better Auth error into something actionable, including the HTTP status.
function describeError(e: { message?: string; status?: number; statusText?: string }) {
  const status = e.status ? ` (HTTP ${e.status}${e.statusText ? " " + e.statusText : ""})` : "";
  if (e.message) return e.message + status;
  if (e.status === 404)
    return "The sign-in service was not found on Convex: the Convex functions are probably not deployed to this deployment" + status + ".";
  if (e.status && e.status >= 500)
    return "Server error in Convex. Open the Convex dashboard, Logs tab, for the details (often BETTER_AUTH_SECRET or SITE_URL missing on this deployment)" + status + ".";
  return "Something went wrong" + status + ". Please try again.";
}

// Same three languages as the public site; uses the language picked there (saved as "es-lang").
const MEMBERS_ONLY = {
  en: ["Members-only access", "Reserved for Esade Sports association members and team captains. Not for visitors or students in general.", "Want to get involved?", "Join the association"],
  ca: ["Accés només per a membres", "Reservat als membres de l'associació Esade Sports i als capitans dels equips. No és per a visitants ni per a estudiants en general.", "Vols implicar-t'hi?", "Uneix-te a l'associació"],
  es: ["Acceso solo para miembros", "Reservado a los miembros de la asociación Esade Sports y a los capitanes de los equipos. No es para visitantes ni para estudiantes en general.", "¿Quieres participar?", "Únete a la asociación"],
};

type Lang = keyof typeof MEMBERS_ONLY;
// The language picked on the public site or on this page (saved as "es-lang").
function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const v = localStorage.getItem("es-lang");
      if (v === "ca" || v === "es") setLang(v);
    } catch {}
  }, []);
  return [
    lang,
    (l: Lang) => {
      setLang(l);
      try {
        localStorage.setItem("es-lang", l);
      } catch {}
    },
  ];
}

function MembersOnlyNotice({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [title, body, ask, link] = MEMBERS_ONLY[lang];
  return (
    <div className="members-only" role="note">
      <strong>{title}</strong>
      <p>{body}</p>
      <p className="mo-join">
        {ask}{" "}
        <a href="/#apply-associate" target="_blank" rel="noopener">
          {link}
        </a>
      </p>
      <div className="lang" role="group" aria-label="Language">
        {(["en", "ca", "es"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Password help texts (sign-in page, reset link page, temporary password).
const PW = {
  en: {
    forgot: "Forgot password?",
    forgotTitle: "Reset your password",
    forgotIntro: "Enter the email of your account. We will email you a link to choose a new password.",
    send: "Email me a link",
    sent: "If an account exists for this email, a link to choose a new password is on its way. It works for 1 hour.",
    noEmail: "No email after a few minutes? Check your spam folder, or ask an association admin (or the President or a Vice-president) to set a temporary password for you.",
    back: "Back to sign in",
    newTitle: "Choose a new password",
    newPw: "New password (at least 8 characters)",
    again: "Type it again",
    mismatch: "The two passwords are not the same.",
    save: "Save my new password",
    done: "Password changed. Sign in with your new password.",
    expired: "This link has expired or was already used. Ask for a new one with \"Forgot password?\".",
    tempTitle: "Choose your own password",
    tempIntro: "You signed in with a temporary password. Choose your own password to continue.",
    tempCurrent: "Temporary password",
    wait: "Please wait…",
  },
  ca: {
    forgot: "Has oblidat la contrasenya?",
    forgotTitle: "Restableix la contrasenya",
    forgotIntro: "Escriu el correu del teu compte. T'enviarem un enllaç per triar una contrasenya nova.",
    send: "Envia'm un enllaç",
    sent: "Si hi ha un compte amb aquest correu, t'arribarà un enllaç per triar una contrasenya nova. Funciona durant 1 hora.",
    noEmail: "No t'arriba cap correu al cap d'uns minuts? Mira la carpeta de correu brossa, o demana a un administrador de l'associació (o al president o a un vicepresident) que et posi una contrasenya temporal.",
    back: "Torna a iniciar sessió",
    newTitle: "Tria una contrasenya nova",
    newPw: "Contrasenya nova (mínim 8 caràcters)",
    again: "Escriu-la una altra vegada",
    mismatch: "Les dues contrasenyes no són iguals.",
    save: "Desa la contrasenya nova",
    done: "Contrasenya canviada. Inicia sessió amb la contrasenya nova.",
    expired: "Aquest enllaç ha caducat o ja s'ha fet servir. Demana'n un de nou amb \"Has oblidat la contrasenya?\".",
    tempTitle: "Tria la teva contrasenya",
    tempIntro: "Has iniciat sessió amb una contrasenya temporal. Tria la teva pròpia contrasenya per continuar.",
    tempCurrent: "Contrasenya temporal",
    wait: "Un moment…",
  },
  es: {
    forgot: "¿Has olvidado la contraseña?",
    forgotTitle: "Restablece tu contraseña",
    forgotIntro: "Escribe el correo de tu cuenta. Te enviaremos un enlace para elegir una contraseña nueva.",
    send: "Envíame un enlace",
    sent: "Si existe una cuenta con este correo, te llegará un enlace para elegir una contraseña nueva. Funciona durante 1 hora.",
    noEmail: "¿No te llega ningún correo al cabo de unos minutos? Mira la carpeta de spam, o pide a un administrador de la asociación (o al presidente o a un vicepresidente) que te ponga una contraseña temporal.",
    back: "Volver a iniciar sesión",
    newTitle: "Elige una contraseña nueva",
    newPw: "Contraseña nueva (mínimo 8 caracteres)",
    again: "Escríbela otra vez",
    mismatch: "Las dos contraseñas no son iguales.",
    save: "Guardar la contraseña nueva",
    done: "Contraseña cambiada. Inicia sesión con tu contraseña nueva.",
    expired: "Este enlace ha caducado o ya se ha usado. Pide uno nuevo con \"¿Has olvidado la contraseña?\".",
    tempTitle: "Elige tu propia contraseña",
    tempIntro: "Has iniciado sesión con una contraseña temporal. Elige tu propia contraseña para continuar.",
    tempCurrent: "Contraseña temporal",
    wait: "Un momento…",
  },
};

// Opened from the "Forgot password?" email: choose a new password with the one-hour token.
function ResetPassword({ token, onDone }: { token: string; onDone: (notice: string) => void }) {
  const [lang] = useLang();
  const t = PW[lang];
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError(t.mismatch);
    setError("");
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ newPassword: pw, token });
      if (res.error) setError(res.error.code === "INVALID_TOKEN" || res.error.status === 400 ? t.expired : describeError(res.error));
      else return onDone(t.done);
    } catch (err) {
      setError(`Could not reach the server (${err instanceof Error ? err.message : String(err)}).`);
    }
    setBusy(false);
  }
  return (
    <Panel title={t.newTitle}>
      <form className="adm-form" onSubmit={submit}>
        <label className="field">
          {t.newPw}
          <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="field">
          {t.again}
          <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn btn-blue" type="submit" disabled={busy}>
          {busy ? t.wait : t.save}
        </button>
      </form>
      <button className="adm-link" type="button" onClick={() => onDone("")}>
        {t.back}
      </button>
    </Panel>
  );
}

// Signed in with a temporary password set by an admin / President / VP.
function ChooseOwnPassword() {
  const [lang] = useLang();
  const t = PW[lang];
  const done = useMutation(api.passwords.changed);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError(t.mismatch);
    setError("");
    setBusy(true);
    try {
      const res = await authClient.changePassword({ currentPassword: current, newPassword: pw, revokeOtherSessions: true });
      if (res.error) setError(describeError(res.error));
      else await done({});
    } catch (err) {
      setError(`Could not reach the server (${err instanceof Error ? err.message : String(err)}).`);
    }
    setBusy(false);
  }
  return (
    <Panel title={t.tempTitle}>
      <p className="adm-p">{t.tempIntro}</p>
      <form className="adm-form" onSubmit={submit}>
        <label className="field">
          {t.tempCurrent}
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="field">
          {t.newPw}
          <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </label>
        <label className="field">
          {t.again}
          <input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn btn-blue" type="submit" disabled={busy}>
          {busy ? t.wait : t.save}
        </button>
      </form>
      <SignOut />
    </Panel>
  );
}

function AuthForm({ notice = "" }: { notice?: string }) {
  const [lang, setLang] = useLang();
  const t = PW[lang];
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    if (mode === "forgot") {
      try {
        // Same answer whether or not the account exists (Better Auth), so nobody can check who has one.
        const res = await authClient.requestPasswordReset({ email, redirectTo: `/admin?lang=${lang}` });
        if (res.error) setError(describeError(res.error));
        else setSent(true);
      } catch (err) {
        setError(`Could not reach the server (${err instanceof Error ? err.message : String(err)}).`);
      }
      setBusy(false);
      return;
    }
    try {
      const res =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email });
      if (!res.error) markJustSignedIn();
      if (res.error) {
        // First-timers often press "Sign in" before creating their account: say what to do, not only "Invalid email or password".
        const firstTime =
          mode === "signin" && (res.error.status === 401 || /invalid email or password/i.test(res.error.message || ""))
            ? ' First time here? Click "No account yet? Create one" below and use the email the Board approved.'
            : "";
        setError(describeError(res.error) + firstTime);
      }
    } catch (err) {
      setError(`Could not reach the server (${err instanceof Error ? err.message : String(err)}).`);
    }
    setBusy(false);
  }

  if (mode === "forgot")
    return (
      <Panel title={t.forgotTitle}>
        <MembersOnlyNotice lang={lang} setLang={setLang} />
        {sent ? (
          <p className="adm-p adm-ok" role="status">
            {t.sent}
          </p>
        ) : (
          <>
            <p className="adm-p">{t.forgotIntro}</p>
            <form className="adm-form" onSubmit={submit}>
              <label className="field">
                Email
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              {error && <p className="err">{error}</p>}
              <button className="btn btn-blue" type="submit" disabled={busy}>
                {busy ? t.wait : t.send}
              </button>
            </form>
          </>
        )}
        <p className="adm-p adm-sub">{t.noEmail}</p>
        <button
          className="adm-link"
          type="button"
          onClick={() => {
            setMode("signin");
            setSent(false);
            setError("");
          }}
        >
          {t.back}
        </button>
      </Panel>
    );

  return (
    <Panel title={mode === "signin" ? "Sign in" : "Create account"}>
      <MembersOnlyNotice lang={lang} setLang={setLang} />
      {notice && (
        <p className="adm-p adm-ok" role="status">
          {notice}
        </p>
      )}
      <p className="adm-p">
        {mode === "signin"
          ? "Members area for approved captains, Board members and associates. First time? Create your account first (link below)."
          : "Use the exact email the Board approved (or an admin added). Not approved yet? Send a request on the Members page first."}
      </p>
      <form className="adm-form" onSubmit={submit}>
        {mode === "signup" && (
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn btn-blue" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      {mode === "signin" && (
        <button
          className="adm-link"
          type="button"
          onClick={() => {
            setMode("forgot");
            setError("");
          }}
        >
          {t.forgot}
        </button>
      )}
      <button
        className="adm-link"
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
      >
        {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
      </button>
    </Panel>
  );
}

// Phone with a WhatsApp link (wa.me needs digits only).
function Phone({ value }: { value?: string }) {
  if (!value) return <>—</>;
  const digits = value.replace(/\D/g, "");
  return (
    <>
      <a href={`tel:${value}`}>{value}</a>
      {" · "}
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
    </>
  );
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Top-level switch between the admin sections.
type Section = "applications" | "tryouts" | "messages" | "organisation" | "requests" | "chat" | "captains" | "alumni";
const SECTION_TITLE: Record<Section, string> = {
  applications: "Applications",
  tryouts: "Try-outs & coaches",
  messages: "Contact messages",
  organisation: "Organisation",
  requests: "People & requests",
  chat: "Chat",
  captains: "Captains",
  alumni: "Alumni profiles",
};

// Confirmation email to the person who filled in the form (convex/mail.ts stores "sent" or why not).
// Older submissions (before 15 Nov 2026) have no status.
function ConfirmEmail({ status }: { status?: string }) {
  if (!status) return <>Not recorded</>;
  if (status === "sent") return <>Sent</>;
  return <span className="adm-mailfail" title={status}>Email not sent · {status}</span>;
}

// Warning box at the top of /admin: confirmation emails that did not reach the person.
// Convex (admin.emailProblems) only returns the ones this account handles: its department, its team,
// or all of them for admins, President, VPs and IT.
type MailRow = { key: string; at: number; form: string; name: string; email: string; about: string; why: string; canRetry: boolean; handledBy?: string; handledAt?: number };
function EmailProblems({ readOnly }: { readOnly: boolean }) {
  const rows = useQuery(api.admin.emailProblems, {}) as MailRow[] | undefined;
  const mark = useMutation(api.admin.markEmailHandled);
  const resend = useMutation(api.admin.resendEmail);
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [note, setNote] = useState("");
  if (!rows?.length) return null;
  const todo = rows.filter((r) => !r.handledBy);
  const done = rows.filter((r) => r.handledBy);
  const act = (p: Promise<unknown>, ok: string) =>
    p.then(() => setNote(ok), (e) => setNote(e instanceof Error ? e.message.replace(/^.*ConvexError: /, "") : "Something went wrong."));
  const item = (r: MailRow) => (
    <li key={r.key}>
      <strong>{r.name}</strong> · <a href={`mailto:${r.email}`}>{r.email}</a> · {r.form}
      {r.about ? ` (${r.about})` : ""} · {new Date(r.at).toLocaleString("en-GB")}
      <span className="adm-sub">{r.handledBy ? `Handled by ${r.handledBy} · ${new Date(r.handledAt!).toLocaleString("en-GB")}` : r.why}</span>
      {!readOnly && (
        <span className="adm-mailact">
          {r.handledBy ? (
            <button type="button" className="btn btn-ghost-navy" onClick={() => act(mark({ key: r.key, undo: true }), "Put back in the list.")}>
              Undo
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost-navy" onClick={() => act(mark({ key: r.key }), "Marked as handled.")}>
                I wrote to them
              </button>
              {r.canRetry && (
                <button type="button" className="btn btn-ghost-navy" onClick={() => act(resend({ key: r.key }), "Sending again… it leaves the list if it goes through.")}>
                  Resend email
                </button>
              )}
            </>
          )}
        </span>
      )}
    </li>
  );
  return (
    <section className="adm-mailwarn" role={todo.length ? "alert" : undefined}>
      <strong>
        {todo.length ? `Email not sent to ${todo.length} ${todo.length === 1 ? "person" : "people"}` : "All email problems handled"}
      </strong>
      {todo.length > 0 && (
        <p className="adm-p">
          These people filled in a form, and their form was saved, but they did not get their confirmation email. Write to them by hand,
          then click “I wrote to them” so the others know. “Resend email” only works once a sending domain is verified in Resend.
        </p>
      )}
      {todo.length > 0 && (
        <button type="button" className="btn btn-ghost-navy" onClick={() => setOpen(!open)}>
          {open ? "Hide the list" : "Show who"}
        </button>
      )}{" "}
      {done.length > 0 && (
        <button type="button" className="btn btn-ghost-navy" onClick={() => setShowDone(!showDone)}>
          {showDone ? "Hide handled" : `Handled (${done.length})`}
        </button>
      )}
      {note && <p className="adm-sub" role="status">{note}</p>}
      {open && todo.length > 0 && <ul className="adm-maillist">{todo.map(item)}</ul>}
      {showDone && <ul className="adm-maillist">{done.map(item)}</ul>}
    </section>
  );
}

function Dashboard({ me }: { me: NonNullable<Me> }) {
  const d = deptsOf(me);
  const seesTryouts = me.full || me.teams.length > 0 || d.includes("Operations");
  const seesMessages = seesTryouts || me.board; // admins, President, VPs and every head of department
  const seesApplications = me.full || me.heads.length > 0;
  const approves = me.board && !me.readOnly;
  // Organisation (every member and email): admins, President and VPs only.
  const seesOrg = me.isAdmin || me.exec;
  const [section, setSection] = useState<Section>(seesApplications ? "applications" : seesMessages ? "messages" : seesOrg ? "organisation" : "chat");
  // /admin#people (link from the Hub) opens "People & requests".
  useEffect(() => {
    if (approves && window.location.hash === "#people") setSection("requests");
  }, [approves]);
  const messages = useQuery(api.admin.listContactMessages, seesMessages ? {} : "skip") as ContactMessage[] | undefined;
  const requests = useQuery(api.org.manageable, approves ? {} : "skip") as MemberRow[] | null | undefined;
  const unread = (messages ?? []).filter((m) => m.status === "new").length;
  const waiting = (requests ?? []).filter((r) => r.status === "requested").length;
  const tabs: [Section, boolean, number?][] = [
    ["applications", seesApplications],
    ["tryouts", seesTryouts],
    ["messages", seesMessages, unread],
    ["organisation", seesOrg],
    ["requests", approves, waiting],
    ["chat", true],
    ["captains", me.full],
    ["alumni", me.full],
  ];
  const label = (k: Section) => (k === "applications" ? "Association applications" : SECTION_TITLE[k]);
  return (
    <main className="wrap adm-main">
      <div className="adm-top">
        <div>
          <p className="eyebrow">
            Signed in as {me.email} · {roleLabel(me)}
          </p>
          <h1 className="display adm-title">{SECTION_TITLE[section]}</h1>
        </div>
        <div className="adm-user">
          <a className="btn btn-blue" href="/#hub-overview">
            Open the Hub
          </a>
          <SignOut />
        </div>
      </div>
      <nav className="adm-sections" aria-label="Admin sections">
        {tabs
          .filter(([, show]) => show)
          .map(([k, , n]) => (
            <button key={k} type="button" aria-pressed={section === k} onClick={() => setSection(k)}>
              {label(k)}
              {!!n && <span>{n}</span>}
            </button>
          ))}
      </nav>
      {tabs.filter(([, show]) => show).length === 1 && (
        <p className="adm-p">
          Your pages (tasks, My week, reports, chat and more) are in the <a href="/#hub-overview">Hub</a>. This page only has the
          team chat.
        </p>
      )}
      <EmailProblems readOnly={me.readOnly} />
      {me.readOnly && (
        <p className="adm-p adm-readonly">View-only access: you can see everything, but not change anything.</p>
      )}
      {section === "applications" && seesApplications ? (
        <Applications canMove={!me.readOnly} />
      ) : section === "tryouts" && seesTryouts ? (
        <Tryouts me={me} canMove={!me.readOnly} />
      ) : section === "messages" && seesMessages ? (
        <Messages messages={messages} />
      ) : section === "requests" && approves ? (
        <Requests me={me} rows={requests ?? undefined} />
      ) : section === "organisation" && seesOrg ? (
        <Organisation me={me} />
      ) : section === "captains" && me.full ? (
        <Captains />
      ) : section === "alumni" && me.full ? (
        <AlumniProfiles />
      ) : (
        <Chat />
      )}
    </main>
  );
}

const APP_COLS: KbCol[] = [
  { id: "applied", label: "Applied" },
  { id: "review", label: "Under review" },
  { id: "interview", label: "Interview" },
  { id: "case", label: "Case interview" },
  { id: "decision", label: "Decision" },
];
const appCol = (a: Application) => (DECISION.includes(stageOf(a)) ? "decision" : stageOf(a));

function Applications({ canMove }: { canMove: boolean }) {
  const apps = useQuery(api.admin.listAssociationApplications, {}) as Application[] | undefined;
  const setStage = useMutation(api.admin.setApplicationStage);
  const [view, setView] = useState<"board" | "table">("board");
  const [first, setFirst] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [dept, setDept] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = apps ?? [];
  const open = list.find((a) => a._id === openId) ?? null;
  const options = useMemo(
    () => ({
      programmes: uniq(list.map((a) => a.programme)),
      years: uniq(list.map((a) => a.year)),
      depts: uniq(list.flatMap((a) => [a.pref1, a.pref2 ?? ""])),
    }),
    [list],
  );
  const filtered = list.filter(
    (a) =>
      (!first || a.firstName.toLowerCase().includes(first.trim().toLowerCase())) &&
      (!programme || a.programme === programme) &&
      (!year || a.year === year) &&
      (!dept || a.pref1 === dept || a.pref2 === dept),
  );
  const shown = filtered.filter((a) => inTab(a, tab));

  return (
    <>
      <ViewSwitch view={view} setView={setView} hint={canMove ? DRAG_HINT : undefined} />
      {view === "table" && (
      <div className="adm-tabs" role="tablist" aria-label="Recruitment stage">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="adm-tab"
            onClick={() => setTab(id)}
          >
            {label} <span>{filtered.filter((a) => inTab(a, id)).length}</span>
          </button>
        ))}
      </div>
      )}

      <div className="adm-filters">
        <label className="field">
          First name
          <input type="search" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Search" />
        </label>
        <label className="field">
          Programme
          <select value={programme} onChange={(e) => setProgramme(e.target.value)}>
            <option value="">All programmes</option>
            {options.programmes.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {options.years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Department
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {options.depts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="adm-count">
        {apps === undefined
          ? "Loading…"
          : `${view === "board" ? filtered.length : shown.length} shown · ${list.length} application${list.length === 1 ? "" : "s"} in total`}
      </p>

      {view === "board" ? (
        <Kanban
          cols={APP_COLS}
          items={filtered}
          colOf={appCol}
          cardClass={(a, col) => (col === appCol(a) ? stageOf(a) : col === "decision" ? "offer" : col)}
          canMove={canMove}
          onMove={(a, col) => setStage({ id: a._id, stage: col === "decision" ? (DECISION.includes(stageOf(a)) ? stageOf(a) : "offer") : col })}
          onOpen={(a) => setOpenId(a._id)}
        >
          {(a) => (
            <>
              <strong>
                {a.firstName} {a.lastName}
              </strong>
              <small>
                {a.programme} · {a.year}
              </small>
              <small>
                {a.pref1}
                {a.pref2 ? ` · then ${a.pref2}` : ""}
              </small>
              <div className="kb-foot">
                <span className={`stg-chip stg-${stageOf(a)}`}>{STAGE_LABEL[stageOf(a)]}</span>
                <small>{fmtDate(a._creationTime)}</small>
              </div>
              {canMove && (
                <div className="kb-foot">
                  <StageSelect app={a} />
                </div>
              )}
            </>
          )}
        </Kanban>
      ) : (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Programme</th>
              <th>Year</th>
              <th>Preference 1</th>
              <th>Preference 2</th>
              <th>Submitted</th>
              <th>Stage</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr
                key={a._id}
                className={`stg-row stg-${stageOf(a)}`}
                tabIndex={0}
                onClick={() => setOpenId(a._id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(a._id))}
              >
                <td>
                  <strong>
                    {a.firstName} {a.lastName}
                  </strong>
                  <span className="adm-sub">{a.email}</span>
                </td>
                <td>{a.programme}</td>
                <td>{a.year}</td>
                <td>{a.pref1}</td>
                <td>{a.pref2 || "—"}</td>
                <td>{fmtDate(a._creationTime)}</td>
                <td>
                  <StageSelect app={a} />
                  {a.stageChangedAt && <span className="adm-sub">since {fmtDate(a.stageChangedAt)}</span>}
                </td>
              </tr>
            ))}
            {apps !== undefined && shown.length === 0 && (
              <tr className="adm-empty">
                <td colSpan={7}>{list.length ? "No applications in this stage match these filters." : "No applications yet."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {open && <Detail app={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

type ContactMessage = {
  confirmEmail?: string;
  _id: string;
  _creationTime: number;
  topic: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  sport?: string;
  phone?: string;
  status: "new" | "read" | "answered";
  emailStatus?: string;
  replies?: { text: string; byName: string; byEmail: string; at: number; emailStatus?: string }[];
};
// "answered" is the stored value; it is shown as "Sent".
const MSG_STATUS: Record<ContactMessage["status"], string> = { new: "New", read: "Read", answered: "Sent" };

function Messages({ messages }: { messages: ContactMessage[] | undefined }) {
  const setStatus = useMutation(api.admin.setContactStatus);
  const [topic, setTopic] = useState("");
  const [status, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = messages ?? [];
  const topics = uniq(list.map((m) => m.topic));
  const shown = list.filter((m) => (!topic || m.topic === topic) && (!status || m.status === status));
  const open = list.find((m) => m._id === openId) ?? null;
  const change = (id: string, st: ContactMessage["status"]) =>
    setStatus({ id, status: st }).catch((e: unknown) => alert(`Could not update: ${e instanceof Error ? e.message : String(e)}`));

  return (
    <>
      <div className="adm-filters">
        <label className="field">
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="answered">Sent</option>
          </select>
        </label>
      </div>
      <p className="adm-count">
        {messages === undefined ? "Loading…" : `${shown.length} shown · ${list.length} message${list.length === 1 ? "" : "s"} in total`}
      </p>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>From</th>
              <th>Topic</th>
              <th>Subject</th>
              <th>Received</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr
                key={m._id}
                tabIndex={0}
                className={m.status === "new" ? "adm-unread" : undefined}
                onClick={() => {
                  setOpenId(m._id);
                  if (m.status === "new") change(m._id, "read");
                }}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(m._id))}
              >
                <td>
                  <strong>{m.name}</strong>
                  <span className="adm-sub">{m.email}</span>
                </td>
                <td>
                  {m.topic}
                  {m.sport && <span className="adm-sub">{m.sport}</span>}
                </td>
                <td>{m.subject}</td>
                <td>{fmtDate(m._creationTime)}</td>
                <td>
                  <span className={`adm-pill adm-pill-${m.status}`}>{MSG_STATUS[m.status]}</span>
                </td>
              </tr>
            ))}
            {messages !== undefined && shown.length === 0 && (
              <tr className="adm-empty">
                <td colSpan={5}>{list.length ? "No messages match these filters." : "No messages yet."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && <MessageDetail m={open} onClose={() => setOpenId(null)} onStatus={(st) => change(open._id, st)} />}
    </>
  );
}

function MessageDetail({
  m,
  onClose,
  onStatus,
}: {
  m: ContactMessage;
  onClose: () => void;
  onStatus: (s: ContactMessage["status"]) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const reply = `mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`;
  const send = useMutation(api.admin.replyToMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await send({ id: m._id as never, text });
      setText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg.replace(/^.*ConvexError: /s, "").split("\n")[0]);
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="match-modal">
      <div className="match-backdrop" onClick={onClose} />
      <section className="match-dialog adm-dialog" role="dialog" aria-modal="true" aria-labelledby="msg-title">
        <button className="match-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow" style={{ color: "var(--blue)" }}>
          {m.topic}
          {m.sport ? ` · ${m.sport}` : ""}
        </p>
        <h2 id="msg-title">{m.subject}</h2>
        <dl className="match-details">
          <div>
            <dt>From</dt>
            <dd>{m.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${m.email}`}>{m.email}</a>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <Phone value={m.phone} />
            </dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{new Date(m._creationTime).toLocaleString("en-GB")}</dd>
          </div>
          <div>
            <dt>Sent to</dt>
            <dd>{m.sport ? `Captains of ${m.sport}` : "Admins (general message)"}</dd>
          </div>
          <div>
            <dt>Email copy</dt>
            <dd>{m.emailStatus ?? "Pending"}</dd>
          </div>
          <div>
            <dt>Confirmation to sender</dt>
            <dd>
              <ConfirmEmail status={m.confirmEmail} />
            </dd>
          </div>
        </dl>
        <h3 className="adm-h3">Message</h3>
        <p className="adm-motivation">{m.message}</p>
        {(m.replies ?? []).length > 0 && (
          <>
            <h3 className="adm-h3">Replies</h3>
            {m.replies!.map((r, i) => (
              <div key={i} style={{ borderLeft: "3px solid var(--blue)", padding: "6px 12px", marginBottom: 10 }}>
                <span className="adm-sub">
                  {r.byName} · {new Date(r.at).toLocaleString("en-GB")} ·{" "}
                  {r.emailStatus === "sent" ? "Emailed" : r.emailStatus === "sending" ? "Sending…" : `Not sent (${r.emailStatus ?? "unknown"})`}
                </span>
                <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{r.text}</p>
              </div>
            ))}
          </>
        )}
        <form onSubmit={submit}>
          <h3 className="adm-h3">Reply to {m.name}</h3>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Emailed to ${m.email}; their answer comes back to your inbox.`}
            style={{ width: "100%", padding: 10, font: "inherit", border: "1.5px solid var(--navy)" }}
          />
          <div className="adm-notes-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-blue" type="submit" disabled={sending || !text.trim()}>
              {sending ? "Sending…" : "Send reply"}
            </button>
            <a className="btn btn-ghost-navy" href={reply} onClick={() => onStatus("answered")}>
              Reply in my email app
            </a>
          </div>
        </form>
        <div className="adm-notes-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {m.status !== "answered" ? (
            <button className="btn btn-ghost-navy" type="button" onClick={() => onStatus("answered")}>
              Mark as sent
            </button>
          ) : (
            <button className="btn btn-ghost-navy" type="button" onClick={() => onStatus("read")}>
              Mark as not sent
            </button>
          )}
          <button className="btn btn-ghost-navy" type="button" onClick={() => onStatus("new")}>
            Mark as unread
          </button>
        </div>
      </section>
    </div>
  );
}

function Detail({ app, onClose }: { app: Application; onClose: () => void }) {
  const saveNotes = useMutation(api.admin.setApplicationNotes);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const linkedin = app.linkedin ? (/^https?:\/\//.test(app.linkedin) ? app.linkedin : `https://${app.linkedin}`) : "";
  const rows: [string, React.ReactNode][] = [
    ["Email", <a href={`mailto:${app.email}`}>{app.email}</a>],
    ["Phone", <Phone value={app.phone} />],
    ["Programme", app.programme],
    ["Year", app.year],
    ["LinkedIn", linkedin ? <a href={linkedin} target="_blank" rel="noopener noreferrer">{app.linkedin}</a> : "—"],
    ["Preference 1", app.pref1],
    ["Preference 2", app.pref2 || "—"],
    ["CV", app.cvUrl ? <a href={app.cvUrl} target="_blank" rel="noopener noreferrer">Open CV (PDF)</a> : "—"],
    [
      "Other PDFs",
      app.moreDocLinks?.length
        ? app.moreDocLinks.map((d, i) => (
            <span key={d.url}>
              {i > 0 && " · "}
              <a href={d.url} target="_blank" rel="noopener noreferrer">
                {d.name}
              </a>
            </span>
          ))
        : "—",
    ],
    ["Video", app.videoUrl ? <a href={app.videoUrl} target="_blank" rel="noopener noreferrer">Open video</a> : "—"],
    ["Accepts redirection", app.acceptsRedirect ? "Yes" : "No"],
    ["Confirms accuracy", app.confirmsAccuracy ? "Yes" : "No"],
    ["Submitted", new Date(app._creationTime).toLocaleString("en-GB")],
    ["Confirmation email", <ConfirmEmail status={app.confirmEmail} />],
  ];

  return (
    <div className="match-modal">
      <div className="match-backdrop" onClick={onClose} />
      <section className="match-dialog adm-dialog" role="dialog" aria-modal="true" aria-labelledby="adm-dialog-title">
        <button className="match-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow" style={{ color: "var(--blue)" }}>
          Application
        </p>
        <h2 id="adm-dialog-title">
          {app.firstName} {app.lastName}
        </h2>
        <dl className="match-details">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="adm-stagebox">
          <label className="field">
            Stage
            <StageSelect app={app} />
          </label>
          {app.stageChangedAt && <span className="adm-sub">In this stage since {fmtDate(app.stageChangedAt)}</span>}
        </div>
        <Notes value={app.notes} save={(notes) => saveNotes({ id: app._id, notes })} />
        <h3 className="adm-h3">Motivation</h3>
        <p className="adm-motivation">{app.motivation}</p>
      </section>
    </div>
  );
}

// Internal notes, only visible in the admin area.
function Notes({ value, save }: { value?: string; save: (notes: string) => Promise<unknown> }) {
  const [text, setText] = useState(value ?? "");
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const dirty = text.trim() !== (value ?? "");
  return (
    <div className="adm-notes">
      <h3 className="adm-h3">Internal notes</h3>
      <textarea
        value={text}
        rows={4}
        placeholder="Interview feedback, next steps… Only admins can see this."
        onChange={(e) => {
          setText(e.target.value);
          setState("");
        }}
      />
      <div className="adm-notes-actions">
        <button
          className="btn btn-ghost-navy"
          type="button"
          disabled={!dirty || state === "saving"}
          onClick={async () => {
            setState("saving");
            try {
              await save(text);
              setState("saved");
            } catch {
              setState("error");
            }
          }}
        >
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
        {state === "saved" && <span className="adm-sub">Saved.</span>}
        {state === "error" && <span className="err">Could not save. Try again.</span>}
      </div>
    </div>
  );
}

// ---------- Try-outs & coaches (teamApplications) ----------
type TeamApp = {
  confirmEmail?: string;
  _id: string;
  _creationTime: number;
  teamSlug: string;
  kind: "tryout" | "coach";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  esadeStudent: boolean;
  programme?: string;
  level?: string;
  track?: "competitive" | "social";
  coachingExperience?: string;
  status: string;
  statusChangedAt?: number;
  notes?: string;
};
const TEAM_STATUSES = ["New", "Contacted", "Trial invited", "Accepted", "Declined"]; // same as convex/stages.ts
const kindLabel = (k: TeamApp["kind"]) => (k === "coach" ? "Coach" : "Play");

function TeamStatusSelect({ app }: { app: TeamApp }) {
  const setStatus = useMutation(api.admin.setTeamApplicationStatus);
  const [busy, setBusy] = useState(false);
  return (
    <select
      className={`adm-stage stg-sel stg-${statusSlug(app.status)}`}
      value={app.status}
      disabled={busy}
      aria-label={`Status for ${app.firstName} ${app.lastName}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onChange={async (e) => {
        setBusy(true);
        try {
          await setStatus({ id: app._id, status: e.target.value });
        } catch (err) {
          alert(`Could not change the status: ${err instanceof Error ? err.message : String(err)}`);
        }
        setBusy(false);
      }}
    >
      {(TEAM_STATUSES.includes(app.status) ? TEAM_STATUSES : [app.status, ...TEAM_STATUSES]).map((st) => (
        <option key={st}>{st}</option>
      ))}
    </select>
  );
}

const TRY_COLS: KbCol[] = TEAM_STATUSES.map((st) => ({ id: st, label: st }));

function Tryouts({ me, canMove }: { me: NonNullable<Me>; canMove: boolean }) {
  const setTeamStatus = useMutation(api.admin.setTeamApplicationStatus);
  const [view, setView] = useState<"board" | "table">("board");
  const opsTeams = me.assoc.filter((x) => x.department === "Operations").flatMap((x) => x.teams);
  const myTeams = me.full || me.heads.includes("Operations") ? TEAMS : TEAMS.filter((t) => me.teams.includes(t.id) || opsTeams.includes(t.id));
  const apps = useQuery(api.admin.listTeamApplications, {}) as TeamApp[] | undefined;
  const [team, setTeam] = useState(""); // "" = all teams
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [level, setLevel] = useState("");
  const [esade, setEsade] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = apps ?? [];
  const levels = uniq(list.map((a) => a.level ?? ""));
  const filtered = list.filter(
    (a) =>
      (!name || `${a.firstName} ${a.lastName}`.toLowerCase().includes(name.trim().toLowerCase())) &&
      (!kind || a.kind === kind) &&
      (!level || a.level === level) &&
      (!esade || (esade === "yes") === a.esadeStudent) &&
      (!status || a.status === status),
  );
  const shown = filtered.filter((a) => !team || a.teamSlug === team);
  const count = (id: string) => filtered.filter((a) => a.teamSlug === id).length;
  const open = list.find((a) => a._id === openId) ?? null;

  return (
    <>
      <ViewSwitch view={view} setView={setView} hint={canMove ? DRAG_HINT : undefined} />
      <div className="adm-teams" role="group" aria-label="Team">
        <button type="button" aria-pressed={team === ""} onClick={() => setTeam("")}>
          <strong>All teams</strong>
          <span>{filtered.length}</span>
        </button>
        {myTeams.map((t) => (
          <button key={t.id} type="button" aria-pressed={team === t.id} onClick={() => setTeam(t.id)}>
            <strong>{t.sport}</strong>
            <small>{t.squad}</small>
            <span>{count(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="adm-filters">
        <label className="field">
          Name
          <input type="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="Search" />
        </label>
        <label className="field">
          Play or coach
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Both</option>
            <option value="tryout">Play (try-outs)</option>
            <option value="coach">Coach</option>
          </select>
        </label>
        <label className="field">
          Level
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Esade student
          <select value={esade} onChange={(e) => setEsade(e.target.value)}>
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {TEAM_STATUSES.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="adm-count">
        {apps === undefined
          ? "Loading…"
          : `${team ? teamLabel(team) + " · " : ""}${shown.length} shown · ${list.length} sign-up${list.length === 1 ? "" : "s"} in total`}
      </p>

      {view === "board" ? (
        <Kanban
          cols={TRY_COLS}
          items={shown}
          colOf={(a) => (TEAM_STATUSES.includes(a.status) ? a.status : "New")}
          cardClass={(_a, col) => statusSlug(col)}
          canMove={canMove}
          onMove={(a, col) => setTeamStatus({ id: a._id, status: col })}
          onOpen={(a) => setOpenId(a._id)}
        >
          {(a) => (
            <>
              <strong>
                {a.firstName} {a.lastName}
              </strong>
              <small>
                {teamLabel(a.teamSlug)} · {kindLabel(a.kind)}
                {a.track === "social" ? " · just for fun" : ""}
              </small>
              <small>
                {a.level || "Level not given"} · {a.esadeStudent ? "Esade student" : "Not at Esade"}
              </small>
              <div className="kb-foot">
                <span className={`stg-chip stg-${statusSlug(a.status)}`}>{a.status}</span>
                <small>{fmtDate(a._creationTime)}</small>
              </div>
            </>
          )}
        </Kanban>
      ) : (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team</th>
              <th>Role</th>
              <th>Esade student</th>
              <th>Level</th>
              <th>Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr
                key={a._id}
                className={`stg-row stg-${statusSlug(a.status)}`}
                tabIndex={0}
                onClick={() => setOpenId(a._id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(a._id))}
              >
                <td>
                  <strong>
                    {a.firstName} {a.lastName}
                  </strong>
                  <span className="adm-sub">{a.email}</span>
                </td>
                <td>{teamLabel(a.teamSlug)}</td>
                <td>{kindLabel(a.kind)}{a.track === "social" ? " · just for fun" : ""}</td>
                <td>{a.esadeStudent ? "Yes" : "No"}</td>
                <td>{a.level || "—"}</td>
                <td>{fmtDate(a._creationTime)}</td>
                <td>
                  <TeamStatusSelect app={a} />
                </td>
              </tr>
            ))}
            {apps !== undefined && shown.length === 0 && (
              <tr className="adm-empty">
                <td colSpan={7}>{list.length ? "No sign-ups match these filters." : "No try-out or coach sign-ups yet."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {open && <TeamAppDetail app={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function TeamAppDetail({ app, onClose }: { app: TeamApp; onClose: () => void }) {
  const saveNotes = useMutation(api.admin.setTeamApplicationNotes);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const rows: [string, React.ReactNode][] = [
    ["Team", teamLabel(app.teamSlug)],
    ["Wants to", app.kind === "coach" ? "Coach the team" : "Play (sign up for try-outs)"],
    ["Email", <a href={`mailto:${app.email}`}>{app.email}</a>],
    ["Phone", <Phone value={app.phone} />],
    ["Esade student", app.esadeStudent ? "Yes" : "No"],
    ["Programme and year", app.programme || "—"],
    ["Level", app.level || "—"],
    ["Wants to play", app.kind === "coach" ? "—" : app.track === "social" ? "Just for fun (no try-out)" : "Competitive squad (try-outs)"],
    ["Submitted", new Date(app._creationTime).toLocaleString("en-GB")],
    ["Confirmation email", <ConfirmEmail status={app.confirmEmail} />],
  ];
  return (
    <div className="match-modal">
      <div className="match-backdrop" onClick={onClose} />
      <section className="match-dialog adm-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-title">
        <button className="match-close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow" style={{ color: "var(--blue)" }}>
          {app.kind === "coach" ? "Coach application" : "Try-out sign-up"}
        </p>
        <h2 id="ta-title">
          {app.firstName} {app.lastName}
        </h2>
        <dl className="match-details">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {app.kind === "coach" && (
          <>
            <h3 className="adm-h3">Coaching experience</h3>
            <p className="adm-motivation">{app.coachingExperience || "—"}</p>
          </>
        )}
        <div className="adm-stagebox">
          <label className="field">
            Status
            <TeamStatusSelect app={app} />
          </label>
          {app.statusChangedAt && <span className="adm-sub">Since {fmtDate(app.statusChangedAt)}</span>}
        </div>
        <Notes value={app.notes} save={(notes) => saveNotes({ id: app._id, notes })} />
      </section>
    </div>
  );
}

// ---------- Captains (admins only) ----------
type Captain = { _id: string; email: string; name?: string; teams: string[]; vice?: string[] };

function Captains() {
  const captains = useQuery(api.admin.listCaptains, {}) as Captain[] | undefined;
  const save = useMutation(api.admin.saveCaptain);
  const remove = useMutation(api.admin.removeCaptain);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [vice, setVice] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setTeams((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await save({ email, name: name || undefined, teams, vice });
      setEmail("");
      setName("");
      setTeams([]);
      setVice(false);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*ConvexError:\s*/, "") : String(err));
    }
    setBusy(false);
  }

  return (
    <>
      <form className="adm-captain-form" onSubmit={submit}>
        <h2 className="adm-h3" style={{ marginTop: 0 }}>
          Add a captain or vice-captain
        </h2>
        <p className="adm-p">
          The captain then creates an account on /admin with this email. They see the messages about their sport and the
          sign-ups for their team, and get an email copy of each message about their sport. Adding an existing email
          replaces their teams.
        </p>
        <div className="adm-filters" style={{ padding: 0 }}>
          <label className="field">
            Email they will sign in with
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </label>
          <label className="field">
            Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <fieldset className="adm-team-checks">
          <legend>Teams</legend>
          {TEAMS.map((t) => (
            <label key={t.id}>
              <input type="checkbox" checked={teams.includes(t.id)} onChange={() => toggle(t.id)} /> {teamLabel(t.id)}
            </label>
          ))}
        </fieldset>
        <label className="adm-check" style={{ display: "block", margin: "10px 0" }}>
          <input type="checkbox" checked={vice} onChange={(e) => setVice(e.target.checked)} /> Vice-captain (same access as the captain)
        </label>
        {error && <p className="err">{error}</p>}
        <button className="btn btn-blue" type="submit" disabled={busy || !email || teams.length === 0}>
          {busy ? "Saving…" : "Save captain"}
        </button>
      </form>

      <div className="adm-table-wrap" style={{ marginTop: 24 }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Captain / vice-captain</th>
              <th>Teams</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(captains ?? []).map((c) => (
              <tr key={c._id} className="adm-empty-click">
                <td>
                  <strong>{c.name || c.email}</strong>
                  {c.name && <span className="adm-sub">{c.email}</span>}
                </td>
                <td>
                  {c.teams.map((t) => teamLabel(t) + ((c.vice ?? []).includes(t) ? " (vice-captain)" : "")).join(", ")}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-ghost-navy"
                    type="button"
                    onClick={() => {
                      setEmail(c.email);
                      setName(c.name ?? "");
                      setTeams(c.teams);
                      setVice(c.teams.length > 0 && c.teams.every((t) => (c.vice ?? []).includes(t)));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn btn-ghost-navy"
                    type="button"
                    onClick={() => confirm(`Remove ${c.email} as captain?`) && remove({ id: c._id })}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {captains !== undefined && captains.length === 0 && (
              <tr className="adm-empty">
                <td colSpan={3}>No captains yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

type AlumniStatus = "pending" | "approved" | "rejected";
type AlumniProfile = {
  confirmEmail?: string;
  _id: string;
  _creationTime: number;
  first: string;
  last: string;
  nationality: string;
  programme: string;
  grad: number;
  sports: string[];
  esadeRole?: string;
  headline?: string;
  exUni: string;
  exCity: string;
  inCo: string;
  inRole: string;
  interns: { co: string; role: string; year?: string }[];
  assocs: { name: string }[];
  linkedin?: string;
  photo?: string;
  email: string;
  phone?: string;
  status: AlumniStatus;
};
const ALUMNI_TABS: [AlumniStatus, string][] = [
  ["pending", "Waiting for approval"],
  ["approved", "On the website"],
  ["rejected", "Rejected"],
];

// Profiles sent from the Alumni corner. Approving one publishes it (without email and phone).
function AlumniProfiles() {
  const rows = useQuery(api.admin.listAlumniProfiles, {}) as AlumniProfile[] | undefined;
  const setStatus = useMutation(api.admin.setAlumniStatus);
  const remove = useMutation(api.admin.deleteAlumniProfile);
  const [tab, setTab] = useState<AlumniStatus>("pending");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const list = (rows ?? []).filter((r) => r.status === tab);
  return (
    <>
      <p className="adm-p">
        Alumni send their profile from the Alumni corner, without an account. Approve it to show it on the website. Email
        and phone are never shown publicly, only here.
      </p>
      <nav className="adm-tabs" role="tablist" aria-label="Profile status">
        {ALUMNI_TABS.map(([k, label]) => (
          <button key={k} type="button" className="adm-tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label} <span>{(rows ?? []).filter((r) => r.status === k).length}</span>
          </button>
        ))}
      </nav>
      {rows === undefined ? (
        <p className="adm-p">Loading…</p>
      ) : list.length === 0 ? (
        <p className="adm-p">No profiles here.</p>
      ) : (
        <div className="adm-alumni">
          {list.map((r) => (
            <article key={r._id} className="adm-alumni-card">
              <header>
                {r.photo ? <img src={r.photo} alt="" /> : <div className="adm-av">{(r.first[0] ?? "") + (r.last[0] ?? "")}</div>}
                <div>
                  <strong>
                    {r.first} {r.last}
                  </strong>
                  <span className="adm-sub">
                    {r.programme} · Class of {r.grad} · {r.nationality}
                  </span>
                  <span className="adm-sub">Sent {new Date(r._creationTime).toLocaleDateString("en-GB")}</span>
                </div>
              </header>
              <dl>
                {r.confirmEmail && r.confirmEmail !== "sent" && (
                  <>
                    <dt>Confirmation</dt>
                    <dd>
                      <ConfirmEmail status={r.confirmEmail} />
                    </dd>
                  </>
                )}
                <dt>Sports</dt>
                <dd>{r.sports.join(", ")}{r.esadeRole ? ` · ${r.esadeRole}` : ""}</dd>
                {r.headline && (
                  <>
                    <dt>Now</dt>
                    <dd>{r.headline}</dd>
                  </>
                )}
                <dt>Exchange</dt>
                <dd>
                  {r.exUni}, {r.exCity}
                </dd>
                <dt>Internship</dt>
                <dd>
                  {r.inRole}, {r.inCo}
                  {r.interns.map((x, i) => (
                    <span key={i} className="adm-sub">
                      {x.role} {x.co && `· ${x.co}`} {x.year && `· ${x.year}`}
                    </span>
                  ))}
                </dd>
                <dt>Associations</dt>
                <dd>{r.assocs.map((x) => x.name).join(", ")}</dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </dd>
                {r.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>
                      <Phone value={r.phone} />
                    </dd>
                  </>
                )}
                {r.linkedin && (
                  <>
                    <dt>LinkedIn</dt>
                    <dd>
                      <a href={`https://${r.linkedin}`} target="_blank" rel="noopener noreferrer">
                        {r.linkedin}
                      </a>
                    </dd>
                  </>
                )}
              </dl>
              <div className="adm-alumni-actions">
                {r.status !== "approved" && (
                  <button className="btn btn-blue" type="button" onClick={() => setStatus({ id: r._id as never, status: "approved" })}>
                    Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button className="btn btn-ghost-navy" type="button" onClick={() => setStatus({ id: r._id as never, status: "rejected" })}>
                    {r.status === "approved" ? "Hide from website" : "Reject"}
                  </button>
                )}
                {confirmDelete === r._id ? (
                  <button className="btn btn-ghost-navy adm-danger" type="button" onClick={() => remove({ id: r._id as never })}>
                    Confirm delete
                  </button>
                ) : (
                  <button className="btn btn-ghost-navy" type="button" onClick={() => setConfirmDelete(r._id)}>
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Organisation, requests and chat ----------
type Person = { name: string | null; email: string; teams?: string[]; position?: string };
type MemberRow = {
  _id: string;
  email: string;
  name: string;
  role: "board" | "associate" | "captain" | "vicecaptain" | "viewer";
  position?: Position;
  department?: string;
  teams?: string[];
  note?: string;
  status: "requested" | "approved" | "rejected" | "revoked";
  requestedAt: number;
  decidedBy?: string;
  decidedAt?: number;
};
type Position = "president" | "vice-president" | "head";
type AddKind = Position | "associate" | "captain" | "vicecaptain" | "viewer";
const ADD_LABEL: Record<AddKind, string> = {
  president: "President",
  "vice-president": "Vice-president",
  head: "Head of department",
  associate: "Associate",
  captain: "Captain",
  vicecaptain: "Vice-captain",
  viewer: "View only (Student Council)",
};
const ROLE_LABEL = { board: "Board", associate: "Associate", captain: "Captain", vicecaptain: "Vice-captain", viewer: "View only (Student Council)" };
const POSITION_LABEL: Record<Position, string> = { president: "President", "vice-president": "Vice-president", head: "Head of department" };
const whereOf = (m: Pick<MemberRow, "role" | "department" | "teams" | "position">) =>
  [m.role === "board" ? POSITION_LABEL[m.position ?? "head"] : "", m.department ?? "", (m.teams ?? []).map(teamLabel).join(", ")]
    .filter(Boolean)
    .join(" · ");
const errText = (err: unknown) => (err instanceof Error ? err.message.replace(/^[\s\S]*ConvexError:\s*/, "").split("\n")[0] : String(err));

function PersonLine({ p, tag, reset }: { p: Person; tag?: string; reset?: boolean }) {
  return (
    <li>
      <strong>{p.name || p.email.split("@")[0]}</strong>
      {tag && <i className="adm-tag">{tag}</i>}
      <a className="adm-sub" href={`mailto:${p.email}`}>
        {p.email}
      </a>
      {reset && <TempPassword email={p.email} name={p.name || p.email} />}
    </li>
  );
}

// Organisation tab: set a temporary password for someone who forgot theirs. Shown once, never emailed or stored.
function TempPassword({ email, name }: { email: string; name: string }) {
  const setTemporary = useAction(api.passwords.setTemporary);
  const [step, setStep] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  async function go() {
    setStep("busy");
    setError("");
    try {
      const r = await setTemporary({ email });
      setPw(r.password);
      setStep("done");
    } catch (e) {
      const data = (e as { data?: unknown }).data;
      setError(typeof data === "string" ? data : e instanceof Error ? e.message : String(e));
      setStep("idle");
    }
  }
  if (step === "idle")
    return (
      <span className="adm-temp-line">
        <button className="adm-link adm-temp-btn" type="button" onClick={() => setStep("confirm")}>
          Temporary password
        </button>
        {error && <span className="err">{error}</span>}
      </span>
    );
  if (step === "done")
    return (
      <div className="adm-temp" role="status">
        <p>
          Temporary password for <strong>{name}</strong>:
        </p>
        <p className="adm-temp-pw">
          <code>{pw}</code>
          <button
            type="button"
            className="btn btn-ghost-navy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pw);
                setCopied(true);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </p>
        <p className="adm-sub">
          Shown only once. Give it to them in person or by private message (not by email). When they sign in, they will be asked to
          choose their own password.
        </p>
        <button
          className="adm-link"
          type="button"
          onClick={() => {
            setPw("");
            setCopied(false);
            setStep("idle");
          }}
        >
          Done, hide it
        </button>
      </div>
    );
  return (
    <div className="adm-temp">
      <p>
        Set a temporary password for <strong>{name}</strong>? Their current password stops working and they are signed out
        everywhere.
      </p>
      <p className="adm-temp-pw">
        <button className="btn btn-blue" type="button" disabled={step === "busy"} onClick={go}>
          {step === "busy" ? "Please wait…" : "Yes, set it"}
        </button>
        <button className="btn btn-ghost-navy" type="button" disabled={step === "busy"} onClick={() => setStep("idle")}>
          Cancel
        </button>
      </p>
    </div>
  );
}

// Last password resets (temporary passwords and "Forgot password?" emails), newest first.
function PasswordHistory() {
  const rows = useQuery(api.passwords.recent, {}) as
    | { email: string; kind: "temporary" | "reset-email"; by: string | null; at: number; mustChange: boolean; emailStatus: string | null }[]
    | undefined;
  return (
    <section>
      <h2 className="adm-h3">Password help</h2>
      <p className="adm-p">
        Forgot their password? They click &quot;Forgot password?&quot; on the sign-in page and get a link by email. If no email arrives,
        click &quot;Temporary password&quot; next to their name above and pass it on in person.
      </p>
      {rows?.length ? (
        <ul className="adm-people">
          {rows.map((r, i) => (
            <li key={i}>
              <strong>{r.email}</strong>
              <i className="adm-tag">{r.kind === "temporary" ? "Temporary password" : "Reset link"}</i>
              <span className="adm-sub">
                {new Date(r.at).toLocaleString("en-GB")}
                {r.kind === "temporary"
                  ? ` · set by ${r.by ?? "?"}${r.mustChange ? " · not changed yet" : " · own password chosen"}`
                  : r.emailStatus === "sent"
                    ? " · email sent"
                    : r.emailStatus === "sending"
                      ? " · sending"
                      : ` · email not sent (${r.emailStatus ?? "?"})`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-sub">No password resets yet.</p>
      )}
    </section>
  );
}

function Organisation({ me }: { me: NonNullable<Me> }) {
  const o = useQuery(api.org.overview, {}) as
    | {
        admins: Person[];
        exec: Person[];
        departments: { name: string; heads: Person[]; associates: Person[] }[];
        teams: { id: string; captains: (Person & { vice?: boolean })[] }[];
        viewers: Person[];
      }
    | null
    | undefined;
  if (o === undefined) return <p className="adm-p">Loading…</p>;
  if (o === null) return <p className="adm-p">Not authorised.</p>;
  const sports = [...new Set(TEAMS.map((t) => t.sport))];
  // Same rule as convex/passwords.ts: not yourself; only an admin resets an admin, the President or a VP.
  const canReset = (p: Person, top = false) => !me.readOnly && p.email !== me.email && (me.isAdmin || (me.exec && !top));
  return (
    <div className="adm-org">
      <section>
        <h2 className="adm-h3">Admin</h2>
        <ul className="adm-people">
          {o.admins.map((p) => (
            <PersonLine key={p.email} p={p} tag="Admin" reset={canReset(p, true)} />
          ))}
        </ul>
      </section>
      <section>
        <h2 className="adm-h3">President and vice-presidents</h2>
        <ul className="adm-people">
          {o.exec.length ? o.exec.map((p) => <PersonLine key={p.email} p={p} tag={p.position} reset={canReset(p, true)} />) : <li className="adm-sub">Not set yet</li>}
        </ul>
      </section>
      <section>
        <h2 className="adm-h3">Departments (head first, then associates)</h2>
        <div className="adm-org-grid">
          {o.departments.map((d) => (
            <article key={d.name} className="adm-org-card">
              <h3>{d.name}</h3>
              <ul className="adm-people">
                {d.heads.length ? d.heads.map((p) => <PersonLine key={p.email} p={p} tag="Head" reset={canReset(p)} />) : <li className="adm-sub">No head yet</li>}
                {d.associates.map((p) => (
                  <PersonLine key={p.email} p={p} tag={(p.teams ?? []).map(teamLabel).join(", ")} reset={canReset(p)} />
                ))}
              </ul>
              {!d.associates.length && <p className="adm-sub">No associates yet</p>}
            </article>
          ))}
        </div>
      </section>
      {o.viewers.length > 0 && (
        <section>
          <h2 className="adm-h3">View only</h2>
          <ul className="adm-people">
            {o.viewers.map((p) => (
              <PersonLine key={p.email} p={p} tag="Student Council" reset={canReset(p)} />
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="adm-h3">Team captains</h2>
        <div className="adm-org-grid">
          {sports.map((sp) => (
            <article key={sp} className="adm-org-card">
              <h3>{sp}</h3>
              <ul className="adm-people">
                {o.teams
                  .filter((t) => TEAMS.find((x) => x.id === t.id)?.sport === sp)
                  .map((t) => {
                    const squad = TEAMS.find((x) => x.id === t.id)?.squad;
                    return t.captains.length ? (
                      t.captains.map((p) => (
                        <PersonLine key={t.id + p.email} p={p} tag={p.vice ? `${squad} · vice-captain` : squad} reset={canReset(p)} />
                      ))
                    ) : (
                      <li key={t.id} className="adm-sub">
                        {squad}: no captain yet
                      </li>
                    );
                  })}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <PasswordHistory />
    </div>
  );
}

const DEPARTMENT_LIST = ["Finance", "Media & Marketing", "Operations", "Partnerships", "IT"]; // same as convex/roles.ts

function Requests({ me, rows }: { me: NonNullable<Me>; rows: MemberRow[] | undefined }) {
  const decide = useMutation(api.org.decide);
  const add = useMutation(api.org.addMember);
  const [tab, setTab] = useState<"requested" | "approved" | "closed">("requested");
  const [error, setError] = useState("");
  // Admin, President and VPs add anyone; heads add associates of their own department only (checked again in Convex: org.canAdd).
  const addsAnyone = me.isAdmin || me.exec;
  // Only an admin adds (or removes) the President.
  const kinds: AddKind[] = me.isAdmin
    ? ["president", "vice-president", "head", "associate", "captain", "vicecaptain", "viewer"]
    : me.exec
      ? ["vice-president", "head", "associate", "captain", "vicecaptain", "viewer"]
      : ["associate"];
  const depts = addsAnyone ? DEPARTMENT_LIST : me.heads;
  const [f, setF] = useState({ email: "", name: "", kind: kinds[0], department: depts[0] ?? "", teams: [] as string[] });
  const isBoard = f.kind === "president" || f.kind === "vice-president" || f.kind === "head";
  const role: MemberRow["role"] = isBoard ? "board" : (f.kind as MemberRow["role"]);
  const needsDept = f.kind === "associate" || f.kind === "head";
  const needsTeams = f.kind === "associate" || f.kind === "captain" || f.kind === "vicecaptain";
  const [added, setAdded] = useState("");
  const [busy, setBusy] = useState(false);
  const list = (rows ?? []).filter((r) => (tab === "closed" ? r.status === "rejected" || r.status === "revoked" : r.status === tab));
  async function act(id: string, decision: "approved" | "rejected" | "revoked") {
    setError("");
    try {
      await decide({ id: id as never, decision });
    } catch (err) {
      setError(errText(err));
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setAdded("");
    setBusy(true);
    try {
      await add({
        email: f.email,
        name: f.name,
        role,
        position: isBoard ? (f.kind as Position) : undefined,
        department: needsDept ? f.department : undefined,
        teams: needsTeams ? f.teams : undefined,
      });
      setAdded(`${f.name.trim()} was added as ${ADD_LABEL[f.kind]}${needsDept ? ` (${f.department})` : ""}. They can now create their account on /admin with ${f.email.trim()}.`);
      setF({ ...f, email: "", name: "", teams: [] });
    } catch (err) {
      setError(errText(err));
    }
    setBusy(false);
  }
  return (
    <>
      <p className="adm-p">
        {me.isAdmin
          ? "As admin you can add, approve or remove anyone, including the President, vice-presidents and heads of department."
          : me.exec
            ? "As President or vice-president you can add, approve or remove anyone except the President (only an admin can change the President)."
            : `As head of ${me.heads.join(", ")} you add and approve your department's associates, and approve captain requests.`}{" "}
        People request access on the Members page of the website; once approved they create their account on /admin with the
        same email.
      </p>
      <form className="adm-captain-form" onSubmit={submit} style={{ marginBottom: 28 }}>
        <h2 className="adm-h3" style={{ marginTop: 0 }}>
          Add someone directly
        </h2>
        <p className="adm-p" style={{ marginTop: 0 }}>
          {addsAnyone
            ? `Add ${me.isAdmin ? "a President, " : ""}vice-presidents, heads of department, associates, captains or a view-only account. They are approved straight away.`
            : `As head of ${me.heads.join(", ")} you can add associates to your department. They are approved straight away.`}
        </p>
        <div className="adm-filters" style={{ padding: 0 }}>
          <label className="field">
            Name
            <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="field">
            Email they will sign in with
            <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@example.com" />
          </label>
          <label className="field">
            Role
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as AddKind })} disabled={kinds.length === 1}>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {ADD_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {needsDept && (
            <label className="field">
              Department
              <select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}>
                {depts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {needsTeams && (
          <fieldset className="adm-team-checks">
            <legend>{f.kind === "associate" ? "Teams they work with" : "Teams"}</legend>
            {TEAMS.map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  checked={f.teams.includes(t.id)}
                  onChange={() => setF({ ...f, teams: f.teams.includes(t.id) ? f.teams.filter((x) => x !== t.id) : [...f.teams, t.id] })}
                />{" "}
                {teamLabel(t.id)}
              </label>
            ))}
          </fieldset>
        )}
        <button className="btn btn-blue" type="submit" disabled={busy || !f.email || !f.name || (needsTeams && !f.teams.length)}>
          {busy ? "Saving…" : "Add"}
        </button>
        {added && (
          <p className="adm-p" role="status" style={{ marginBottom: 0 }}>
            {added}
          </p>
        )}
      </form>
      <nav className="adm-tabs" role="tablist" aria-label="Request status">
        {(
          [
            ["requested", "Waiting"],
            ["approved", "Approved"],
            ["closed", "Rejected or removed"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className="adm-tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}{" "}
            <span>
              {(rows ?? []).filter((r) => (k === "closed" ? r.status === "rejected" || r.status === "revoked" : r.status === k)).length}
            </span>
          </button>
        ))}
      </nav>
      {error && <p className="err">{error}</p>}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Note</th>
              <th>{tab === "requested" ? "Requested" : "Decided"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows === undefined ? (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5}>Nothing here.</td>
              </tr>
            ) : (
              list.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.name}</strong>
                    <span className="adm-sub">{r.email}</span>
                  </td>
                  <td>
                    {ROLE_LABEL[r.role]}
                    <span className="adm-sub">{whereOf(r)}</span>
                  </td>
                  <td>{r.note ?? ""}</td>
                  <td>
                    {new Date(r.decidedAt ?? r.requestedAt).toLocaleDateString("en-GB")}
                    {r.decidedBy && <span className="adm-sub">by {r.decidedBy}</span>}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.status === "requested" && (
                      <>
                        <button className="btn btn-blue" type="button" onClick={() => act(r._id, "approved")}>
                          Approve
                        </button>{" "}
                        <button className="btn btn-ghost-navy" type="button" onClick={() => act(r._id, "rejected")}>
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <button className="btn btn-ghost-navy" type="button" onClick={() => act(r._id, "revoked")}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </>
  );
}

type ChatChannel = { id: string; label: string; kind: string; lastAt: number; role?: string };
type ChatMsg = {
  _id: string;
  _creationTime: number;
  authorName: string;
  authorRole: string;
  body: string;
  editedAt?: number;
  mine: boolean;
  canDelete: boolean;
  canPost: boolean;
};
const seenKey = (id: string) => `es-chat-seen:${id}`;
const getSeen = (id: string) => {
  try {
    return Number(localStorage.getItem(seenKey(id)) || 0);
  } catch {
    return 0;
  }
};

function Chat() {
  const channels = useQuery(api.chat.channels, {}) as ChatChannel[] | null | undefined;
  const [current, setCurrent] = useState("general");
  const msgs = useQuery(api.chat.list, { channel: current }) as ChatMsg[] | null | undefined;
  const send = useMutation(api.chat.send);
  const edit = useMutation(api.chat.edit);
  const remove = useMutation(api.chat.remove);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [, setTick] = useState(0);
  const lastAt = channels?.find((c) => c.id === current)?.lastAt ?? 0;
  useEffect(() => {
    try {
      localStorage.setItem(seenKey(current), String(Date.now()));
    } catch {}
    setTick((t) => t + 1);
  }, [current, lastAt]);
  useEffect(() => {
    const el = document.getElementById("chat-list");
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs?.length, current]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    try {
      await send({ channel: current, body: text });
      setText("");
    } catch (err) {
      setError(errText(err));
    }
  }
  const groups: [string, string][] = [
    ["general", "Everyone"],
    ["board", "Board"],
    ["captains", "Captains"],
    ["dept", "Departments"],
    ["sport", "Teams"],
    ["dm", "Direct messages"],
  ];
  const cur = channels?.find((c) => c.id === current);
  return (
    <div className="adm-chat">
      <aside className="adm-chat-channels" aria-label="Channels">
        {groups.map(([kind, title]) => {
          const list = (channels ?? []).filter((c) => c.kind === kind);
          if (!list.length) return null;
          return (
            <div key={kind}>
              <p className="adm-chat-group">{title}</p>
              {list.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === current} onClick={() => setCurrent(c.id)} title={c.role}>
                  {c.kind === "dm" ? (
                    <span>
                      {c.label}
                      {c.role && <small className="adm-chat-role">{c.role}</small>}
                    </span>
                  ) : (
                    `# ${c.label}`
                  )}
                  {c.id !== current && c.lastAt > getSeen(c.id) && <span className="adm-dot" aria-label="New messages" />}
                </button>
              ))}
            </div>
          );
        })}
      </aside>
      <section className="adm-chat-main">
        <div id="chat-list" className="adm-chat-list">
          {msgs === undefined ? (
            <p className="adm-sub">Loading…</p>
          ) : msgs === null || msgs.length === 0 ? (
            <p className="adm-sub">No messages yet. Say hello!</p>
          ) : (
            msgs.map((m) => (
              <article key={m._id} className={"adm-msg" + (m.mine ? " mine" : "")}>
                <header>
                  <strong>{m.authorName}</strong>
                  <i className="adm-tag">{m.authorRole}</i>
                  <time>
                    {new Date(m._creationTime).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {m.editedAt && " · edited"}
                  </time>
                </header>
                {editing === m._id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await edit({ id: m._id as never, body: draft });
                        setEditing(null);
                      } catch (err) {
                        setError(errText(err));
                      }
                    }}
                  >
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
                    <button className="adm-link" type="submit">Save</button>
                    <button className="adm-link" type="button" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <p>{m.body}</p>
                )}
                {(m.mine || m.canDelete) && editing !== m._id && (
                  <div className="adm-msg-actions">
                    {m.mine && (
                      <button
                        className="adm-link"
                        type="button"
                        onClick={() => {
                          setEditing(m._id);
                          setDraft(m.body);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {m.canDelete && (
                      <button className="adm-link" type="button" onClick={() => remove({ id: m._id as never }).catch((err) => setError(errText(err)))}>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
        {error && <p className="err">{error}</p>}
        {msgs && msgs.length > 0 && !msgs[0].canPost ? (
          <p className="adm-sub">View-only access: you can read but not post.</p>
        ) : (
        <form className="adm-chat-form" onSubmit={submit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={cur?.kind === "dm" ? `Message ${cur.label}` : `Message #${cur?.label ?? ""}`}
            aria-label="Message"
          />
          <button className="btn btn-blue" type="submit" disabled={!text.trim()}>
            Send
          </button>
        </form>
        )}
        <p className="adm-sub">
          {cur?.kind === "dm"
            ? "Direct message: only the two of you see it."
            : "Be kind and keep it about Esade Sports. Messages are seen by everyone in the channel; the Board and admins can remove messages."}
        </p>
      </section>
    </div>
  );
}
