import { type ReactNode, useState } from "react";

type TeamListProps = {
  teams: number[];
  renderTeam: (teamNumber: number) => ReactNode;
  showTypeahead?: boolean;
  emptyMessage?: string;
};

const TeamList = ({
  teams,
  renderTeam,
  showTypeahead = false,
  emptyMessage = "No teams found.",
}: TeamListProps) => {
  const [teamInput, setTeamInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = teamInput
    ? teams.filter((t) => String(t).includes(teamInput)).slice(0, 10)
    : [];

  if (teams.length === 0) return <p>{emptyMessage}</p>;

  return (
    <>
      {showTypeahead && (
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
              if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
          />
          {showSuggestions && teamInput && suggestions.length > 0 && (
            <ul className="typeahead-suggestions">
              {suggestions.map((team) => (
                <li key={team}>{renderTeam(team)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul className="nav-list">
        {teams.map((team) => (
          <li key={team}>{renderTeam(team)}</li>
        ))}
      </ul>
    </>
  );
};

export default TeamList;
