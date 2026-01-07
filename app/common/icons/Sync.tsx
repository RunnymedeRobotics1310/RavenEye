import BaseIcon from "~/common/icons/BaseIcon.tsx";
import type { SyncStatus } from "~/types/SyncStatus.ts";

type PropTypes = {
  status: SyncStatus;
};
function Sync(props: PropTypes) {
  const { status } = props;
  let color;
  let title;

  if (status.loading) {
    color = "syncLoading";
    title = "Loading Sync Status";
  } else if (status.error) {
    color = "syncError";
    title = "A Sync Error has Occurred";
  } else if (status.inProgress) {
    color = "syncHappening";
    title = "Sync In Progress (" + status.remaining + " Items to Sync";
  } else if (status.remaining > 0) {
    color = "syncToDo";
    title = "" + status.remaining + " Items to Sync";
  } else if (status.isComplete) {
    color = "syncComplete";
    title = "No Sync Required";
  }

  return (
    <BaseIcon>
      <svg
        className={color}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{title}</title>
        <path d="M19.91,15.51H15.38a1,1,0,0,0,0,2h2.4A8,8,0,0,1,4,12a1,1,0,0,0-2,0,10,10,0,0,0,16.88,7.23V21a1,1,0,0,0,2,0V16.5A1,1,0,0,0,19.91,15.51ZM12,2A10,10,0,0,0,5.12,4.77V3a1,1,0,0,0-2,0V7.5a1,1,0,0,0,1,1h4.5a1,1,0,0,0,0-2H6.22A8,8,0,0,1,20,12a1,1,0,0,0,2,0A10,10,0,0,0,12,2Z" />
      </svg>
    </BaseIcon>
  );
}
export default Sync;
