import { useState } from "react";
import { recordComment } from "~/common/storage/track.ts";

function QuickCommentForm() {
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

  const Success = () => {
    return (
      <section>
        <h2>Quick Comment</h2>
        <p>Comment recorded successfully!</p>
        <button onClick={(e) => setSubmitted(false)}>Add Another</button>
      </section>
    );
  };

  const disabled = team === -1 || comment === "";

  if (submitted) {
    return <Success />;
  }

  return (
    <section>
      <h2>Quick Comment</h2>
      <p>
        todo: fixme: Raw, unformatted, non-accessible comment form (i.e.
        prototype).
      </p>
      <form>
        <div>
          Team:{" "}
          <input
            type="number"
            name="team"
            value={team}
            onChange={(e) => setTeam(e.target.value as unknown as number)}
          />
        </div>

        <div>
          Comment:
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <button disabled={disabled} onClick={handleSubmit}>
          Record Comment
        </button>
      </form>
    </section>
  );
}

export default QuickCommentForm;
