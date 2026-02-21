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
      <main className="track">
        <section>
          <h2>Quick Comment</h2>
          <p>Comment recorded successfully!</p>
          <div className="form-actions">
            <button onClick={() => setSubmitted(false)}>Add Another</button>
            <button type="button" className="secondary" onClick={goBack}>
              Back to Track Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="track">
      <h2>Quick Comment</h2>
      <p>
        Record a quick comment about a team. Start by entering their team
        number.
      </p>
      <form>
        <div className="form-field">
          <label htmlFor="quick-comment-team">Team</label>
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
        </div>
        <div className="form-field">
          <label htmlFor="quick-comment-comment">Comment</label>
          <textarea
            id="quick-comment-comment"
            placeholder="What did you observe?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button disabled={disabled} onClick={handleSubmit}>
            Record Comment
          </button>
          <button type="button" className="secondary" onClick={goBack}>
            Back to Track Home
          </button>
        </div>
      </form>
    </main>
  );
}

export default QuickCommentForm;
