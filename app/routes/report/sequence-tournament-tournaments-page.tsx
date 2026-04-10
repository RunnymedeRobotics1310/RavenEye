import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getSequenceTournaments } from "~/common/storage/rb.ts";
import { useTournamentList, useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import TournamentPicker from "~/common/components/TournamentPicker.tsx";

const SequenceTournamentTournamentsPage = () => {
  const { sequenceTypeCode, teamId } = useParams<{
    sequenceTypeCode: string;
    teamId: string;
  }>();
  const { list: sequenceTypes } = useSequenceTypeList();
  const { list: allTournaments } = useTournamentList();
  const [tournamentIds, setTournamentIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sequenceType = sequenceTypes.find((st) => st.code === sequenceTypeCode);

  useEffect(() => {
    if (!teamId) return;
    getSequenceTournaments(Number(teamId))
      .then((data) => {
        setTournamentIds(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [teamId]);

  // Tournament IDs not found in local tournament list
  const unknownIds = tournamentIds
    ? tournamentIds.filter((id) => !allTournaments.some((t) => t.id === id))
    : [];

  return (
    <main>
      <div className="page-header">
        <h1>
          {sequenceType?.name ?? sequenceTypeCode} — Team {teamId} Tournaments
        </h1>
        <p>
          <NavLink to={`/report/tournament/${sequenceTypeCode}/teams`}>
            &larr; Back to Teams
          </NavLink>
        </p>
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {tournamentIds && tournamentIds.length === 0 && (
          <section className="card">
            <p>No tournaments with data found for this team.</p>
          </section>
        )}
        {tournamentIds && tournamentIds.length > 0 && (
          <TournamentPicker
            tournaments={allTournaments}
            filterToIds={tournamentIds}
            showTypeahead={false}
            groupBy="season"
            renderTournament={(t) => (
              <NavLink
                to={`/report/tournament/${sequenceTypeCode}/${teamId}/${t.id}`}
                className="btn-secondary"
              >
                {t.name}
              </NavLink>
            )}
            emptyMessage="No tournaments with data found for this team."
          />
        )}
        {unknownIds.length > 0 && (
          <section className="card">
            <h2>Other</h2>
            <ul className="nav-list">
              {unknownIds.map((tid) => (
                <li key={tid}>
                  <NavLink
                    to={`/report/tournament/${sequenceTypeCode}/${teamId}/${tid}`}
                    className="btn-secondary"
                  >
                    {tid}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </RequireLogin>
    </main>
  );
};

export default SequenceTournamentTournamentsPage;
