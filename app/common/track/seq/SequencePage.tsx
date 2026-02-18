import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import EventTypeButton from "~/common/track/EventTypeButton.tsx";

const SequencePage = ({ goBack, sequenceCode }: TrackScreenProps) => {
  const { list: sequences, loading } = useSequenceTypeList();

  const sequence = useMemo(
    () => sequences.find((s) => s.code === sequenceCode),
    [sequences, sequenceCode],
  );

  if (loading) return <Spinner />;

  if (!sequence) {
    return (
      <main>
        <button className="secondary" onClick={goBack}>Back</button>
        <p>Sequence not found.</p>
      </main>
    );
  }

  return (
    <main>
      <button className="secondary" onClick={goBack}>Back</button>
      <h2>{sequence.name}</h2>
      {(sequence.events || []).map((ev) => (
        <span key={ev.id || ev.eventtype.eventtype}>
          <EventTypeButton eventType={ev.eventtype} />{" "}
        </span>
      ))}
    </main>
  );
};

export default SequencePage;
