import { useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  addTournamentWebcast,
  removeTournamentWebcast,
} from "~/common/storage/rb.ts";
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

function TournamentRow({ tournament }: { tournament: RBTournament }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [streams, setStreams] = useState<string[]>(parseWebcasts(tournament));

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
      {streams.length > 0 ? (
        <ul className="admin-stream-list">
          {streams.map((s, i) => (
            <li key={i} className="admin-stream-item">
              <a href={safeHref(s)} target="_blank" rel="noopener noreferrer">
                {s}
              </a>
              <button
                className="admin-stream-remove"
                onClick={() => handleRemove(s)}
                disabled={removing === s}
                title="Remove stream"
              >
                {removing === s ? "..." : "\u00D7"}
              </button>
            </li>
          ))}
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
