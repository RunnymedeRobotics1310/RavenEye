import { useState } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  addTournamentWebcast,
  removeTournamentWebcast,
} from "~/common/storage/rb.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import Spinner from "~/common/Spinner.tsx";

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
              <a href={s} target="_blank" rel="noopener noreferrer">
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

function getCurrentWeek(tournaments: RBTournament[]): number | null {
  const now = Date.now();
  for (const t of tournaments) {
    const start = new Date(t.startTime).getTime();
    const end = new Date(t.endTime).getTime();
    if (start <= now && end >= now) return t.weekNumber;
  }
  // If nothing active, find the nearest upcoming week
  let closest: RBTournament | null = null;
  for (const t of tournaments) {
    const start = new Date(t.startTime).getTime();
    if (start > now && (!closest || start < new Date(closest.startTime).getTime())) {
      closest = t;
    }
  }
  return closest?.weekNumber ?? null;
}

function TournamentStreamsContent() {
  const { list: tournaments, loading } = useTournamentList();

  if (loading) return <Spinner />;

  const currentSeason = new Date().getFullYear();
  const seasonTournaments = tournaments.filter((t) => t.season === currentSeason);

  const currentWeek = getCurrentWeek(seasonTournaments);

  // Group by week
  const byWeek = new Map<number, RBTournament[]>();
  for (const t of seasonTournaments) {
    const week = t.weekNumber ?? 0;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(t);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  if (seasonTournaments.length === 0) {
    return (
      <p>No tournaments found for {currentSeason}. Sync tournament data first.</p>
    );
  }

  return (
    <>
      {weeks.map((week) => {
        const weekTournaments = byWeek.get(week)!.sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        return (
          <details
            key={week}
            className="admin-stream-week"
            open={week === currentWeek}
          >
            <summary>
              Week {week}
              <span className="admin-stream-week-count">
                {weekTournaments.length} tournament
                {weekTournaments.length !== 1 ? "s" : ""}
              </span>
            </summary>
            {weekTournaments.map((t) => (
              <TournamentRow key={t.id} tournament={t} />
            ))}
          </details>
        );
      })}
    </>
  );
}

const TournamentStreamsPage = () => {
  return (
    <main>
      <div className="page-header">
        <h1>Tournament Streams</h1>
        <p>Add custom livestream URLs for the pit kiosk display.</p>
      </div>
      <section className="card">
        <RequireLogin>
          <TournamentStreamsContent />
        </RequireLogin>
      </section>
    </main>
  );
};

export default TournamentStreamsPage;
