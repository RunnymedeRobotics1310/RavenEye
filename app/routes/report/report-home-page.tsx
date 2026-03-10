import { useState } from "react";

const ReportHomePage = () => {
  const [team, setTeam] = useState<number>(1310);
  const time = 7;
  const number = 10;
  const score = 4;

  return (
    <main className="track">
      <h1>Reports</h1>
      <input
        type="number"
        name="team"
        value={team}
        onChange={(e) => setTeam(e.target.value as unknown as number)}
      />
      <p>Choose team here</p>
      <button>Auto</button>
      <p>onClick pull up auto reports</p>
      <main>
        <h4>Auto Reports</h4>
        <h5>shooting: (table)</h5>
        <p>Average time shooting = {time}</p>
        <p>Max time = {time}</p>
        <p>Min time = {time}</p>
        <p>
          Number of times shot = {number} (if zero, grey out entire shooting
          section)
        </p>
        <p>Average fuel scored per shoot = {score}</p>
        <p>Average fuel missed per shoot = {score}</p>
        <h5>climbing: (table)</h5>
        <p>
          Number of times climbed = {number} (if zero, grey out entire climb
          section)
        </p>
        <p>Number of times failed</p>
        <p>Number of times succeeded</p>
        <p>Average time climbing (for succeeded) = {time}</p>
        <p>Success percentage of climb (succeeded/total climbs )</p>
        <h5>pickup: (table)</h5>
        <p>(if all 3 are 0, grey out section)</p>
        <p>Number of times picked up from outpost = {number}</p>
        <p>Number of times picked up from depot = {number}</p>
        <p>Number of times picked up from ballpit = {number}</p>
        <h6>link to open up a longer table with data from each match</h6>
        <h6>eg. match 1| shoot # | pickup # | climb none/fail/succeed </h6>
        <p></p>
      </main>
      <button>Scoring</button>
      <p>onClick pull up scoring reports</p>
      <main>
        <h4>Scoring Reports</h4>
        <h5>time scoring: (table)</h5>
        <p>Average time shooting = {time}</p>
        <p>Max time = {time}</p>
        <p>Min time = {time}</p>
        <p>Average fuel per second = total fuel/total shooting time</p>
        <p>Number of times shot = {number}</p>
        <p>Cycle time = time between ending one shoot and starting another</p>
        <h5>total scoring: (table)</h5>
        <p>Average fuel scored per shoot = {score}</p>
        <p>Average fuel missed per shoot = {score}</p>
        <p>Max fuel scored per shoot</p>
        <p>Min fuel scored per shoot</p>
        <p>Ratio of av scored fuel to av missed fuel</p>
        <p>Estimated total fuel scored = all estimated fuel scored + missed</p>
        <h6>link to open up a longer table with data from each match</h6>
        <h6>eg. match 1| shoot # | score # | miss # </h6>
        <p></p>
        <p></p>
      </main>
      <p></p>
      <button>Pickup</button>
      <p>onClick pull up pickup reports</p>
      <main>
        <h4>Pickup Reports</h4>
        <h5>time pickup: (table)</h5>
        <p>Average time picking up = {time}</p>
        <p>Max time = {time}</p>
        <p>Min time = {time}</p>
        <p>Average fuel per second = total fuel/total pickup time</p>
        <p>Number of times picked up = {number}</p>
        <h5>pickup numbers: (table)</h5>
        <p>Average fuel picked up per intake = {score}</p>
        <p>Estimated total fuel = all estimated fuel picked up</p>
        <p>Number of times picked up from ballpit</p>
        <p>Number of times picked up from alliance home</p>
        <p>Number of times picked up from outpost</p>
        <p>Number of times shot to home</p>

        <h6>link to open up a longer table with data from each match</h6>
        <h6>eg. match 1| pickup # | fuel per pickup # | shoot to home # </h6>
        <p></p>
      </main>
      <button>Endgame</button>
      <p>onClick pull up endgame reports</p>
      <main>
        <h4>Endgame Reports</h4>
        <h5>
          time climbing: (table) (if no climb data, grey out the whole climb
          section)
        </h5>
        <p>Average time climbing = {time}</p>
        <p>Max time = {time}</p>
        <p>Min time = {time}</p>
        <p>av time climbing to L1</p>
        <p>av time climbing to L2</p>
        <p>av time climbing to L3</p>
        <h5>Climb numbers: (table)</h5>
        <p>Number of times climbed successfully = {number}</p>
        <p>Number of times climb failed = {number}</p>
        <p>Climbed to L1 = {number}</p>
        <p>Climbed to L2 = {number}</p>
        <p>Climbed to L3 = {number}</p>
        <p>Ratio of climb successes fuel to climb fails</p>
        <h6>link to open up a longer table with data from each match</h6>
        <h6>
          eg. match 1| climb L1 # | climb L2 # | climb L3 # | climb fail #{" "}
        </h6>
      </main>
      <button>Defence</button>
      <p>onClick pull up defence reports</p>
      <main>
        <h4>Defence Reports</h4>
        <h5>
          time defence: (table) (if no climb data, grey out the whole climb
          section)
        </h5>
        <p>Average time playing = {time}</p>
        <p>Max time = {time}</p>
        <p>Min time = {time}</p>
        <p>Number of times played defence</p>
        <p>Total time playing defence in the match</p>
        <h5>Defence strats: (list)</h5>
        <p>List defence strat notes</p>
        <h6>link to open up a longer table with data from each match</h6>
        <h6>eg. match 1| defence time 1| defence time 2| defence strat</h6>
      </main>
      <button>Quick Comments</button>
      <p>
        onClick pull up a list of all quick comments for this team along with
        timestamps
      </p>
      <p></p>
      <p></p>
    </main>
  );
};
export default ReportHomePage;
