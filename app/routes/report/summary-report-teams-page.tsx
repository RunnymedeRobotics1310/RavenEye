import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { getTeamSummaryTeams } from "~/common/storage/rb.ts";
import Spinner from "~/common/Spinner.tsx";
import { useNavigate } from "react-router";

const SummaryReportTeamsPage = () => {
  const [teams, setTeams] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamInput, setTeamInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const navigate = useNavigate();

  const suggestions = teams
    ? teams.filter((t) => String(t).includes(teamInput)).slice(0, 10)
    : [];

  useEffect(() => {
    getTeamSummaryTeams()
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleSelect = (team: number) => {
    setTeamInput(String(team));
    setShowSuggestions(false);
    navigate(`${team}`);
  };

  return (
    <main>
      <div className="page-header">
        <h1>Team Summary Report</h1>
        <p>
          <NavLink to="/report">&larr; Back to Reports</NavLink>
        </p>
      </div>
      <div className="typeahead">
        <input
          className="form-field"
          type="text"
          inputMode="numeric"
          placeholder="Find team by number..."
          value={teamInput}
          onChange={(e) => {
            setTeamInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length === 1) {
              handleSelect(suggestions[0]);
            }
          }}
        />
        {showSuggestions && teamInput && suggestions.length > 0 && (
          <ul className="typeahead-suggestions">
            {suggestions.map((team) => (
              <li key={team}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(team)}
                >
                  Team {team}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RequireLogin>
        {loading && <Spinner />}
        {error && <p className="banner banner-warning">{error}</p>}
        {teams && teams.length === 0 && <p>No teams have data recorded.</p>}
        {teams && teams.length > 0 && (
          <section className="card">
            <h2>Select a Team</h2>
            <ul className="nav-list">
              {teams.map((team) => (
                <li key={team}>
                  <NavLink
                    to={`/report/summary/${team}`}
                    className="btn-secondary"
                  >
                    Team {team}
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

export default SummaryReportTeamsPage;
