import { useState } from "react";
import { recordComment } from "~/common/storage/track.ts";
import type { TrackScreenProps } from "~/routes/track/track-home-page";

function QuickCommentForm({ goBack }: TrackScreenProps) {
  const [team, setTeam] = useState(-1);
  const [comment, setComment] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (comment !== "") {
      await recordComment(team, comment);
      setSubmitted(true);
      setTeam(-1);
      setComment("");
    }
  }

  const disabled = team === -1 || comment === "";

  if (submitted) {
    return (
      <main>
        <section>
          <h2>Quick Comment</h2>
          <p>Comment recorded successfully!</p>
          <button onClick={() => setSubmitted(false)}>Add Another</button>{" "}
          <button type="button" onClick={goBack}>
            Back to Track Home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main>
      <h2>Quick Comment</h2>
      <p>
        Record a quick comment about a team. Start by entering their team
        number.
      </p>
      <form>
        <p>
          <label htmlFor="quick-comment-team">Team</label>
          <br />
          <input
            id="quick-comment-team"
            type="number"
            name="team"
            placeholder="e.g. 1310"
            value={team === -1 ? "" : team}
            onChange={(e) =>
              setTeam(e.target.value === "" ? -1 : Number(e.target.value))
            }
          />
        </p>
        <p>
          <label htmlFor="quick-comment-comment">Comment</label>
          <br />
          <textarea
            id="quick-comment-comment"
            placeholder="What did you observe?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </p>
        <p>
          <button disabled={disabled} onClick={handleSubmit}>
            Record Comment
          </button>{" "}
          <button type="button" onClick={goBack}>
            Back to Track Home
          </button>
        </p>
      </form>
    </main>
  );
}

export default QuickCommentForm;
