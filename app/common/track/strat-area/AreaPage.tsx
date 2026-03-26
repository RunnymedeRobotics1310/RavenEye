import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  useStrategyAreaList,
  useSequenceTypeList,
  useEventTypeList,
} from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import EventTypeControl from "~/common/track/event-type/EventTypeControl.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import { useTrackNav } from "~/common/track/TrackNavContext.tsx";
import {recordEvent} from "~/common/storage/track.ts";
import type {SequenceType} from "~/types/SequenceType.ts";

const AreaPage = ({ areaCode }: TrackScreenProps) => {
  const { navigate } = useTrackNav();
  const { list: areas, loading: areasLoading } = useStrategyAreaList();
  const { list: sequences, loading: seqLoading } = useSequenceTypeList();
  const { list: eventTypes, loading: etLoading } = useEventTypeList();

  const area = useMemo(
    () => areas.find((a) => a.code === areaCode),
    [areas, areaCode],
  );

  const areaSequences = useMemo(
    () =>
      sequences.filter(
        (s) => area && s.strategyareaId === area.id && !s.disabled,
      ),
    [sequences, area],
  );

  // Collect event type codes that appear in any of this area's enabled sequences
  const sequenceEventCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const seq of areaSequences) {
      for (const ev of seq.events || []) {
        if (!ev.eventtype.disabled) {
          codes.add(ev.eventtype.eventtype);
        }
      }
    }
    return codes;
  }, [areaSequences]);

  // Standalone event types: in this area, not disabled, and NOT in any enabled sequence
  const standaloneEvents = useMemo(
    () =>
      eventTypes.filter(
        (et) =>
          area &&
          et.strategyareaId === area.id &&
          !et.disabled &&
          !sequenceEventCodes.has(et.eventtype),
      ),
    [eventTypes, area, sequenceEventCodes],
  );

  if (areasLoading || seqLoading || etLoading) return <Spinner />;

  if (!area) {
    console.log("Strategy area not found", areaCode)
    return (
      <main className="track">
        <TrackNav />
        <p>Strategy area not found.</p>
      </main>
    );
  }

  function startSequence(seq: SequenceType) {
    console.log("Starting sequence "+seq.name);
    const firstSeqEvent = seq.events && seq.events[0];
    if (firstSeqEvent) {
      const firstEvent = firstSeqEvent.eventtype;
      recordEvent(firstEvent.eventtype, 0, "")
      navigate("seq:" + seq.code)
    } else {
      console.log("Sequence "+seq.name+" has no events")
    }
  }

  return (
    <main className="track">
      <TrackNav />
      <h2>Strategy Area: {area.name}</h2>
      {areaSequences.map((seq) => (
        <span key={seq.id}>
          <button className="btn-sequence" onClick={() => startSequence(seq)}>
            {seq.name}
          </button>
          <p></p>
        </span>
      ))}
      {standaloneEvents.length > 0 && (
        <>
          <h3>Stand-Alone Events</h3>
          {standaloneEvents.map((et) => (
            <span key={et.eventtype}>
              <EventTypeControl eventType={et} sequenceStart={false} sequenceEnd={false} />
            </span>
          ))}
        </>
      )}
    </main>
  );
};

export default AreaPage;
