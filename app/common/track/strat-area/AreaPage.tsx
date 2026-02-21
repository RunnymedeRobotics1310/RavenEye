import { useMemo } from "react";
import type { TrackScreenProps } from "~/routes/track/track-home-page";
import {
  useStrategyAreaList,
  useSequenceTypeList,
  useEventTypeList,
} from "~/common/storage/dbhooks.ts";
import Spinner from "~/common/Spinner.tsx";
import EventTypeControl from "~/common/track/event-type/EventTypeControl.tsx";

const AreaPage = ({ navigate, goBack, areaCode }: TrackScreenProps) => {
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

  // Collect event type codes that appear in any of this area's sequences
  const sequenceEventCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const seq of areaSequences) {
      for (const ev of seq.events || []) {
        codes.add(ev.eventtype.eventtype);
      }
    }
    return codes;
  }, [areaSequences]);

  // Standalone event types: in this area but NOT in any sequence
  const standaloneEvents = useMemo(
    () =>
      eventTypes.filter(
        (et) =>
          area &&
          et.strategyareaId === area.id &&
          !sequenceEventCodes.has(et.eventtype),
      ),
    [eventTypes, area, sequenceEventCodes],
  );

  if (areasLoading || seqLoading || etLoading) return <Spinner />;

  if (!area) {
    return (
      <main className="track">
        <button className="secondary" onClick={goBack}>Back</button>
        <p>Strategy area not found.</p>
      </main>
    );
  }

  return (
    <main className="track">
      <button className="secondary" onClick={goBack}>Back</button>
      <h2>Strategy Area: {area.name}</h2>
      {areaSequences.map((seq) => (
        <span key={seq.id}>
          <button onClick={() => navigate("seq:" + seq.code)}>
            {seq.name} (Sequence)
          </button>{" "}
        </span>
      ))}
      {standaloneEvents.length > 0 && (
        <>
          <h3>Stand-Alone Events</h3>
          {standaloneEvents.map((et) => (
            <span key={et.eventtype}>
              <EventTypeControl eventType={et} />{" "}
            </span>
          ))}
        </>
      )}
    </main>
  );
};

export default AreaPage;
