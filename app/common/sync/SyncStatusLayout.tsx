import type { SyncStatus } from "~/types/SyncStatus.ts";
import Sync from "~/common/icons/Sync.tsx";

type PropTypes = {
  children?: React.ReactNode;
  status: SyncStatus;
};
const SyncStatusLayout = (props: PropTypes) => {
  const { children, status } = props;
  const isToday = status.lastSync.toDateString() === new Date().toDateString();

  return (
    <section className="sync-status">
      <div className="sync-status-component">{status.component}</div>
      <div className="sync-status-completion">
        <Sync status={status} />
      </div>
      <div className={"sync-status-last-sync-long"}>
        {status.lastSync.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className={"sync-status-last-sync-ultra-short"}>
        {isToday
          ? status.lastSync.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })
          : status.lastSync.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
      </div>
      {status.error && (
        <div className="sync-status-error">{status.error.message}</div>
      )}
      {children}
    </section>
  );
};

export default SyncStatusLayout;
