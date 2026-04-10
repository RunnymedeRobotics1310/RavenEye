import { useEffect, useState } from "react";
import { useParams, useNavigate, NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { useTournamentList } from "~/common/storage/dbhooks.ts";
import {
  getTeamSchedulePublic,
  getMatchVideos,
  addMatchVideo,
  deleteMatchVideo,
} from "~/common/storage/rb.ts";
import { useRole } from "~/common/storage/rbauth.ts";
import type { TeamScheduleMatch } from "~/types/TeamSchedule.ts";
import type { MatchVideo } from "~/types/MatchVideo.ts";
import Spinner from "~/common/Spinner.tsx";
import SharedTournamentPicker from "~/common/components/TournamentPicker.tsx";

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

function MatchVideoTournamentPicker() {
  const { list: tournaments, loading } = useTournamentList();
  const navigate = useNavigate();

  if (loading) return <Spinner />;

  return (
    <>
      <p>Select a tournament:</p>
      <SharedTournamentPicker
        tournaments={tournaments}
        groupBy="week"
        onSelectTournament={(t) => navigate(`/admin/match-videos/${t.id}`)}
        renderTournament={(t) => (
          <NavLink to={`/admin/match-videos/${t.id}`} className="btn-secondary">
            {t.name}
          </NavLink>
        )}
        emptyMessage="No tournaments found."
      />
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
            <MatchVideoTournamentPicker />
          )}
        </RequireLogin>
      </section>
    </main>
  );
};

export default MatchVideosPage;
