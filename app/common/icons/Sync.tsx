import BaseIcon from "~/common/icons/BaseIcon.tsx";
import { useUnsynchronizedItemCount } from "~/common/storage/useUnsynchronizedItemCount.ts";

function Sync() {
  const syncCount = useUnsynchronizedItemCount();
  // todo: fixme: colors do not display
  let color;
  if (syncCount == -1) {
    color = "syncLoading";
  } else if (syncCount == 0) {
    color = "syncGreen";
  } else {
    color = "syncRed";
  }
  return (
    <BaseIcon>
      <svg
        className={color}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {syncCount == 0 ? (
          <title>Click Here to View Sync Screen - No Sync Required</title>
        ) : syncCount == -1 ? (
          <title>Click Here to Sync</title>
        ) : (
          <title>Click Here to Sync - Sync Required</title>
        )}
        <path d="M19.91,15.51H15.38a1,1,0,0,0,0,2h2.4A8,8,0,0,1,4,12a1,1,0,0,0-2,0,10,10,0,0,0,16.88,7.23V21a1,1,0,0,0,2,0V16.5A1,1,0,0,0,19.91,15.51ZM12,2A10,10,0,0,0,5.12,4.77V3a1,1,0,0,0-2,0V7.5a1,1,0,0,0,1,1h4.5a1,1,0,0,0,0-2H6.22A8,8,0,0,1,20,12a1,1,0,0,0,2,0A10,10,0,0,0,12,2Z" />
      </svg>
    </BaseIcon>
  );
}
export default Sync;
