import type { RBScheduleRecord } from "~/types/RBScheduleRecord.ts";

type MatchTeamPickerProps = {
  matches: RBScheduleRecord[];
  onSelectMatch?: (matchNumber: number, level: string) => void;
  onSelectTeam?: (
    matchNumber: number,
    teamNumber: number,
    alliance: "red" | "blue",
  ) => void;
};

const MatchTeamPicker = ({
  matches,
  onSelectMatch,
  onSelectTeam,
}: MatchTeamPickerProps) => {
  if (matches.length === 0) return null;

  const teamCell = (
    m: RBScheduleRecord,
    team: number,
    alliance: "red" | "blue",
  ) =>
    onSelectTeam ? (
      <button
        className={alliance === "red" ? "allianceRed" : "allianceBlue"}
        onClick={() => onSelectTeam(m.match, team, alliance)}
      >
        {team}
      </button>
    ) : (
      <span
        className={
          alliance === "red" ? "alliance-red-text" : "alliance-blue-text"
        }
      >
        {team}
      </span>
    );

  return (
    <table className="tools">
      <thead>
        <tr>
          <th>Match</th>
          <th colSpan={3} className="alliance-red-text">
            Red
          </th>
          <th colSpan={3} className="alliance-blue-text">
            Blue
          </th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.match}>
            <td>
              {onSelectMatch ? (
                <button onClick={() => onSelectMatch(m.match, m.level)}>
                  {m.match}
                </button>
              ) : (
                m.match
              )}
            </td>
            <td>{teamCell(m, m.red1, "red")}</td>
            <td>{teamCell(m, m.red2, "red")}</td>
            <td>{teamCell(m, m.red3, "red")}</td>
            <td>{teamCell(m, m.blue1, "blue")}</td>
            <td>{teamCell(m, m.blue2, "blue")}</td>
            <td>{teamCell(m, m.blue3, "blue")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MatchTeamPicker;
