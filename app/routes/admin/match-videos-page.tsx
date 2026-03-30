import { useEffect, useState } from "react";
import { useParams, NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  getTeamSchedulePublic,
  getMatchVideos,
  addMatchVideo,
  deleteMatchVideo,
} from "~/common/storage/rb.ts";
import { useRole } from "~/common/storage/rbauth.ts";
import type { RBTournament } from "~/types/RBTournament.ts";
import type { TeamScheduleMatch } from "~/types/TeamSchedule.ts";
import type { MatchVideo } from "~/types/MatchVideo.ts";
import Spinner from "~/common/Spinner.tsx";

function levelLabel(level: string): string {
  if (level === "Qualification") return "Q";
  if (level === "Playoff") return "E";
  if (level === "Practice") return "P";
  return level;
}

function MatchRow({
  match,
  tournamentId,
  videos,
  isAdmin,
  onChanged,
}: {
  match: TeamScheduleMatch;
  tournamentId: string;
  videos: MatchVideo[];
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [addLabel, setAddLabel] = useState("Full Field");
  const [addUrl, setAddUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const matchVideos = videos.filter(
    (v) => v.matchLevel === match.level && v.matchNumber === match.match,
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setSaving(true);
    await addMatchVideo(tournamentId, match.level, match.match, addLabel, addUrl.trim());
    setAddUrl("");
    setSaving(false);
    onChanged();
  };

  const handleDelete = async (id: number) => {
    await deleteMatchVideo(id);
    onChanged();
  };

  return (
    <tr>
      <td className="match-video-match-cell">
        {levelLabel(match.level)}{match.match}
      </td>
      <td>
        {matchVideos.length > 0 ? (
          <ul className="match-video-list">
            {matchVideos.map((v) => (
              <li key={v.id}>
                <span className="match-video-label">{v.label}:</span>{" "}
                <a href={v.videoUrl} target="_blank" rel="noopener noreferrer">
                  {v.videoUrl}
                </a>
                {isAdmin && (
                  <button
                    className="match-video-delete"
                    onClick={() => handleDelete(v.id)}
                    title="Delete"
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="match-video-none">No videos</span>
        )}
      </td>
      <td>
        <form onSubmit={handleAdd} className="match-video-add-form">
          <select value={addLabel} onChange={(e) => setAddLabel(e.target.value)}>
            <option>Full Field</option>
            <option>Standard</option>
            <option>Other</option>
          </select>
          <input
            type="url"
            placeholder="YouTube URL..."
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
          />
          <button type="submit" disabled={saving || !addUrl.trim()}>
            {saving ? "..." : "Add"}
          </button>
        </form>
      </td>
    </tr>
  );
}

function MatchVideoContent({ tournamentId }: { tournamentId: string }) {
  const { isAdmin, isSuperuser } = useRole();
  const [matches, setMatches] = useState<TeamScheduleMatch[]>([]);
  const [videos, setVideos] = useState<MatchVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const admin = isAdmin || isSuperuser;

  const loadData = () => {
    Promise.all([
      getTeamSchedulePublic(tournamentId).then((r) => setMatches(r.matches ?? [])),
      getMatchVideos(tournamentId).then(setVideos),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  if (loading) return <Spinner />;

  const sortedMatches = [...matches].sort((a, b) => {
    const levelOrder: Record<string, number> = { Practice: 0, Qualification: 1, Playoff: 2 };
    const la = levelOrder[a.level] ?? 9;
    const lb = levelOrder[b.level] ?? 9;
    return la !== lb ? la - lb : a.match - b.match;
  });

  return (
    <table className="match-video-table">
      <thead>
        <tr>
          <th>Match</th>
          <th>Videos</th>
          <th>Add</th>
        </tr>
      </thead>
      <tbody>
        {sortedMatches.map((m) => (
          <MatchRow
            key={`${m.level}-${m.match}`}
            match={m}
            tournamentId={tournamentId}
            videos={videos}
            isAdmin={admin}
            onChanged={loadData}
          />
        ))}
      </tbody>
    </table>
  );
}

function isCurrentWeek(tournaments: RBTournament[]): boolean {
  const now = Date.now();
  return tournaments.some((t) => {
    const start = new Date(t.startTime).getTime();
    const end = new Date(t.endTime).getTime();
    return start <= now && end >= now;
  });
}

function TournamentPicker() {
  const { list: tournaments, loading } = useTournamentList();

  if (loading) return <Spinner />;

  const currentYear = new Date().getFullYear();

  // Group by year descending
  const byYear = new Map<number, RBTournament[]>();
  for (const t of tournaments) {
    const list = byYear.get(t.season) ?? [];
    list.push(t);
    byYear.set(t.season, list);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <>
      <p>Select a tournament:</p>
      {years.length === 0 && <p>No tournaments found.</p>}
      {years.map((year) => {
        const yearTournaments = byYear.get(year)!;
        // Group by week
        const byWeek = new Map<number, RBTournament[]>();
        for (const t of yearTournaments) {
          const list = byWeek.get(t.weekNumber) ?? [];
          list.push(t);
          byWeek.set(t.weekNumber, list);
        }
        const weeks = [...byWeek.keys()].sort((a, b) => a - b);

        return (
          <details key={year} open={year === currentYear}>
            <summary><strong>{year}</strong></summary>
            {weeks.map((week) => {
              const weekTournaments = byWeek.get(week)!.sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
              );
              const weekOpen = year === currentYear && isCurrentWeek(weekTournaments);
              return (
                <details key={week} open={weekOpen} style={{ marginLeft: "1rem" }}>
                  <summary>Week {week}</summary>
                  <ul>
                    {weekTournaments.map((t) => (
                      <li key={t.id}>
                        <NavLink to={`/admin/match-videos/${t.id}`}>{t.name}</NavLink>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </details>
        );
      })}
    </>
  );
}

const MatchVideosPage = () => {
  const params = useParams<{ tournamentId?: string }>();

  return (
    <main>
      <div className="page-header">
        <h1>Match Videos</h1>
        <p>
          Manage YouTube video links for individual matches.
          {params.tournamentId && (
            <> <NavLink to="/admin/match-videos">&larr; Change tournament</NavLink></>
          )}
        </p>
      </div>
      <section className="card">
        <RequireLogin>
          {params.tournamentId ? (
            <MatchVideoContent tournamentId={params.tournamentId} />
          ) : (
            <TournamentPicker />
          )}
        </RequireLogin>
      </section>
    </main>
  );
};

export default MatchVideosPage;
