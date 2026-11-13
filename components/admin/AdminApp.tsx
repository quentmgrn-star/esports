"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/components/ConvexClientProvider";

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
  videoUrl: string | null;
  stage?: Stage;
  stageChangedAt?: number;
  notes?: string;
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
      className={`adm-stage adm-stage-${stageOf(app)}`}
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

type Me = { name: string; email: string; isAdmin: boolean } | null;

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
      {me?.isAdmin && <a href="/#hub-overview">Hub</a>}
      {email ? (
        <>
          <span className="adm-badge">
            <i>{me?.isAdmin ? "Admin" : "Signed in"}</i> {email}
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
  const signedInEmail = session.data?.user?.email;

  if (isLoading || session.isPending || (isAuthenticated && me === undefined)) {
    return <Panel title="Loading">Checking your session…</Panel>;
  }
  // Signed in with Better Auth, but Convex has not accepted the session (yet).
  if (signedInEmail && (!isAuthenticated || !me)) return <Connecting email={signedInEmail} convexOk={isAuthenticated} />;
  if (!isAuthenticated || !me) return <AuthForm />;
  if (!me.isAdmin) {
    return (
      <Panel title="No access">
        <p className="adm-p">{me.email} is not approved for the admin area.</p>
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

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email });
      if (res.error) setError(describeError(res.error));
    } catch (err) {
      setError(`Could not reach the server (${err instanceof Error ? err.message : String(err)}).`);
    }
    setBusy(false);
  }

  return (
    <Panel title={mode === "signin" ? "Sign in" : "Create account"}>
      <p className="adm-p">
        {mode === "signin"
          ? "Admin area of Esade Sports. Sign in with your admin account."
          : "Only approved emails can create an admin account."}
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

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Top-level switch between the admin sections.
function Dashboard({ me }: { me: NonNullable<Me> }) {
  const [section, setSection] = useState<"applications" | "messages">("applications");
  const messages = useQuery(api.admin.listContactMessages, {}) as ContactMessage[] | undefined;
  const unread = (messages ?? []).filter((m) => m.status === "new").length;
  return (
    <main className="wrap adm-main">
      <div className="adm-top">
        <div>
          <p className="eyebrow">Signed in as {me.email}</p>
          <h1 className="display adm-title">{section === "applications" ? "Applications" : "Messages"}</h1>
        </div>
        <div className="adm-user">
          <a className="btn btn-blue" href="/#hub-overview">Open the Hub</a>
          <SignOut />
        </div>
      </div>
      <nav className="adm-sections" aria-label="Admin sections">
        <button type="button" aria-pressed={section === "applications"} onClick={() => setSection("applications")}>
          Applications
        </button>
        <button type="button" aria-pressed={section === "messages"} onClick={() => setSection("messages")}>
          Messages{unread > 0 && <span>{unread}</span>}
        </button>
      </nav>
      {section === "applications" ? <Applications /> : <Messages messages={messages} />}
    </main>
  );
}

function Applications() {
  const apps = useQuery(api.admin.listAssociationApplications, {}) as Application[] | undefined;
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
          : `${shown.length} shown · ${list.length} application${list.length === 1 ? "" : "s"} in total`}
      </p>

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

      {open && <Detail app={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

type ContactMessage = {
  _id: string;
  _creationTime: number;
  topic: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  sport?: string;
  status: "new" | "read" | "answered";
};
const MSG_STATUS: Record<ContactMessage["status"], string> = { new: "New", read: "Read", answered: "Answered" };

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
            <option value="answered">Answered</option>
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
            <dt>Received</dt>
            <dd>{new Date(m._creationTime).toLocaleString("en-GB")}</dd>
          </div>
        </dl>
        <h3 className="adm-h3">Message</h3>
        <p className="adm-motivation">{m.message}</p>
        <div className="adm-notes-actions" style={{ marginTop: 20, flexWrap: "wrap" }}>
          <a className="btn btn-blue" href={reply} onClick={() => onStatus("answered")}>
            Reply by email
          </a>
          {m.status !== "answered" ? (
            <button className="btn btn-ghost-navy" type="button" onClick={() => onStatus("answered")}>
              Mark as answered
            </button>
          ) : (
            <button className="btn btn-ghost-navy" type="button" onClick={() => onStatus("read")}>
              Mark as not answered
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const linkedin = app.linkedin ? (/^https?:\/\//.test(app.linkedin) ? app.linkedin : `https://${app.linkedin}`) : "";
  const rows: [string, React.ReactNode][] = [
    ["Email", <a href={`mailto:${app.email}`}>{app.email}</a>],
    ["Phone", <a href={`tel:${app.phone}`}>{app.phone}</a>],
    ["Programme", app.programme],
    ["Year", app.year],
    ["LinkedIn", linkedin ? <a href={linkedin} target="_blank" rel="noopener noreferrer">{app.linkedin}</a> : "—"],
    ["Preference 1", app.pref1],
    ["Preference 2", app.pref2 || "—"],
    ["CV", app.cvUrl ? <a href={app.cvUrl} target="_blank" rel="noopener noreferrer">Open CV (PDF)</a> : "—"],
    ["Video", app.videoUrl ? <a href={app.videoUrl} target="_blank" rel="noopener noreferrer">Open video</a> : "—"],
    ["Accepts redirection", app.acceptsRedirect ? "Yes" : "No"],
    ["Confirms accuracy", app.confirmsAccuracy ? "Yes" : "No"],
    ["Submitted", new Date(app._creationTime).toLocaleString("en-GB")],
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
        <Notes app={app} />
        <h3 className="adm-h3">Motivation</h3>
        <p className="adm-motivation">{app.motivation}</p>
      </section>
    </div>
  );
}

// Internal notes, only visible in the admin area.
function Notes({ app }: { app: Application }) {
  const save = useMutation(api.admin.setApplicationNotes);
  const [text, setText] = useState(app.notes ?? "");
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const dirty = text.trim() !== (app.notes ?? "");
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
              await save({ id: app._id, notes: text });
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
