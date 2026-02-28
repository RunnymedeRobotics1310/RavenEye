import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import { useSequenceTypeList } from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import EventTypeControl from "~/common/track/event-type/EventTypeControl.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";

const SequencePage = ({ navigate, goBack, sequenceCode }: TrackScreenProps) => {
  const { list: sequences, loading } = useSequenceTypeList();

  const sequence = useMemo(
    () => sequences.find((s) => s.code === sequenceCode),
    [sequences, sequenceCode],
  );

  if (loading) return <Spinner />;

  if (!sequence) {
    console.log("Sequence not found", sequenceCode)
    return (
      <main className="track">
        <TrackNav navigate={navigate} goBack={goBack} />
        <p>Sequence not found.</p>
      </main>
    );
  }

  return (
    <main className="track">
      <TrackNav navigate={navigate} goBack={goBack} />
      <h2>Sequence: {sequence.name}</h2>
      {(sequence.events || []).map((ev) => (
        <span key={ev.id || ev.eventtype.eventtype}>
          <EventTypeControl
              eventType={ev.eventtype}
              sequenceEnd={ev.endOfSequence}/>
        </span>
      ))}
    </main>
  );
};

export default SequencePage;
