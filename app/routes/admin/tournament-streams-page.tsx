import { useMemo, useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  addTournamentWebcast,
  removeTournamentWebcast,
  setTournamentTbaEventKey,
} from "~/common/storage/rb.ts";
import { minutesAgo } from "~/common/storage/serverTime.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import Spinner from "~/common/Spinner.tsx";
import TournamentPicker from "~/common/components/TournamentPicker.tsx";

function safeHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    /* invalid URL */
  }
  return "";
}

/**
 * Best-effort parse of the merged webcasts field. After the TBA data foundation (P0), the server
 * returns a pre-canonicalized string[]. The legacy JSON-array-string shape is kept as a fallback
 * for the first render after upgrade when IndexedDB may still hold older entries.
 */
function parseWebcasts(tournament: RBTournament): string[] {
  const raw = tournament.webcasts;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  return [];
}

/** Humanize "time since" for the staleness banner without pulling in a date library. */
function relativeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (isNaN(then)) return iso;
  // minutesAgo() corrects for any device clock skew using the server-time header.
  const minutes = minutesAgo(then);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Client-side regex matching the server's TBA event-key validation exactly. */
const TBA_EVENT_KEY_RE = /^20\d{2}[a-z][a-z0-9]{1,15}$/;

/**
 * Best-effort TBA event-key guess derived from RB's tournament id. FRC event codes and TBA event
 * codes align for the vast majority of events — mostly divergent cases are district championship
 * divisions, FIRST Championship divisions, and offseason events. Shown as a pre-filled input value
 * when the server has no key yet so admins one-click save the common case.
 */
function suggestedTbaEventKey(t: RBTournament): string {
  const code = t.id.startsWith(String(t.season)) ? t.id.slice(String(t.season).length) : t.id;
  return `${t.season}${code.toLowerCase()}`;
}

function TournamentRow({ tournament }: { tournament: RBTournament }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [streams, setStreams] = useState<string[]>(parseWebcasts(tournament));
  const [tbaKeyDraft, setTbaKeyDraft] = useState<string>(
    tournament.tbaEventKey ?? suggestedTbaEventKey(tournament),
  );
  const [tbaSaving, setTbaSaving] = useState(false);
  const [tbaMsg, setTbaMsg] = useState<string | null>(null);

  const tbaKeyValid =
    tbaKeyDraft.trim() === "" || TBA_EVENT_KEY_RE.test(tbaKeyDraft.trim().toLowerCase());

  const tbaSet = useMemo(
    () => new Set(tournament.webcastsFromTba ?? []),
    [tournament.webcastsFromTba],
  );
  const isTbaSourced = (u: string) => tbaSet.has(u);

  const stalenessMessage = useMemo(() => {
    if (!tournament.webcastsStale) return null;
    if (tournament.webcastsLastSync) {
      return `(i) Webcast data last synced ${relativeAgo(tournament.webcastsLastSync)} — may be out of date.`;
    }
    return "(i) Webcast data has not yet synced — the TBA event key may be incorrect or no key is configured.";
  }, [tournament.webcastsStale, tournament.webcastsLastSync]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setSaving(true);
    setMsg(null);
    const ok = await addTournamentWebcast(tournament.id, trimmed);
    setSaving(false);
    if (ok) {
      setStreams((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setUrl("");
      setMsg("Added");
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg("Failed to add");
    }
  };

  const handleSaveTbaKey = async () => {
    if (tbaSaving) return;
    const draft = tbaKeyDraft.trim().toLowerCase();
    if (draft !== "" && !TBA_EVENT_KEY_RE.test(draft)) {
      setTbaMsg("Invalid key format. e.g. 2026onto");
      return;
    }
    setTbaSaving(true);
    setTbaMsg(null);
    const result = await setTournamentTbaEventKey(tournament.id, draft === "" ? null : draft);
    setTbaSaving(false);
    if (result.ok) {
      setTbaKeyDraft(draft); // canonicalize the input box
      setTbaMsg("Saved");
      setTimeout(() => setTbaMsg(null), 1500);
    } else {
      setTbaMsg(`Failed: ${result.reason}`);
    }
  };

  const handleClearTbaKey = async () => {
    setTbaKeyDraft("");
    setTbaSaving(true);
    setTbaMsg(null);
    const result = await setTournamentTbaEventKey(tournament.id, null);
    setTbaSaving(false);
    if (result.ok) {
      setTbaMsg("Cleared");
      setTimeout(() => setTbaMsg(null), 1500);
    } else {
      setTbaMsg(`Failed: ${result.reason}`);
    }
  };

  const handleRemove = async (streamUrl: string) => {
    setRemoving(streamUrl);
    const ok = await removeTournamentWebcast(tournament.id, streamUrl);
    setRemoving(null);
    if (ok) {
      setStreams((prev) => prev.filter((s) => s !== streamUrl));
    } else {
      setMsg("Failed to remove");
      setTimeout(() => setMsg(null), 2000);
    }
  };

  return (
    <div className="admin-stream-tournament">
      <h3>{tournament.name}</h3>
      <div className="admin-stream-tba-key">
        <label className="admin-stream-tba-key-label" htmlFor={`tba-key-${tournament.id}`}>
          TBA event key
        </label>
        <input
          id={`tba-key-${tournament.id}`}
          type="text"
          className="admin-stream-tba-key-input"
          value={tbaKeyDraft}
          onChange={(e) => setTbaKeyDraft(e.target.value)}
          placeholder="e.g. 2026onto"
          spellCheck={false}
          disabled={tbaSaving}
        />
        <button
          type="button"
          onClick={handleSaveTbaKey}
          disabled={tbaSaving || !tbaKeyValid}
          title={tbaKeyValid ? "Save TBA event key" : "Invalid key format"}
        >
          {tbaSaving ? "..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleClearTbaKey}
          disabled={tbaSaving || tbaKeyDraft === ""}
          title="Clear the TBA event key"
        >
          Clear
        </button>
        {tbaMsg && <span className="admin-stream-msg">{tbaMsg}</span>}
        <span className="admin-stream-tba-key-hint">
          Matches the TBA event URL. Pre-filled with the likely key — save as-is, or edit before
          saving if TBA uses a different code (common for district/championship divisions).
        </span>
      </div>
      {stalenessMessage && (
        <div className="banner banner-info admin-stream-staleness">{stalenessMessage}</div>
      )}
      {streams.length > 0 ? (
        <ul className="admin-stream-list">
          {streams.map((s, i) => {
            const fromTba = isTbaSourced(s);
            return (
              <li key={i} className="admin-stream-item">
                <a href={safeHref(s)} target="_blank" rel="noopener noreferrer">
                  {s}
                </a>
                <span className={fromTba ? "badge-tba" : "badge-manual"}>
                  {fromTba ? "From TBA" : "Manual override"}
                </span>
                <button
                  className="admin-stream-remove"
                  onClick={() => handleRemove(s)}
                  disabled={fromTba || removing === s}
                  title={
                    fromTba
                      ? "Served by TBA — remove by clearing the TBA event key or contacting TBA."
                      : "Remove stream"
                  }
                >
                  {removing === s ? "..." : "\u00D7"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="admin-stream-empty">No streams configured</p>
      )}
      <form onSubmit={handleAdd} className="admin-stream-form">
        <input
          type="url"
          placeholder="Paste YouTube or Twitch URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="admin-stream-input"
        />
        <button type="submit" disabled={saving || !url.trim()}>
          {saving ? "Adding..." : "Add Stream"}
        </button>
        {msg && <span className="admin-stream-msg">{msg}</span>}
      </form>
    </div>
  );
}

const TournamentStreamsPage = () => {
  const { list: tournaments, loading } = useTournamentList();

  return (
    <main>
      <div className="page-header">
        <h1>Tournament Streams</h1>
        <p>Add custom livestream URLs for the pit kiosk display.</p>
      </div>
      <RequireLogin>
        {loading ? (
          <Spinner />
        ) : (
          <TournamentPicker
            tournaments={tournaments}
            showTypeahead={false}
            groupBy="week"
            renderTournament={(t) => <TournamentRow tournament={t} />}
            emptyMessage="No tournaments found. Sync tournament data first."
          />
        )}
      </RequireLogin>
    </main>
  );
};

export default TournamentStreamsPage;
