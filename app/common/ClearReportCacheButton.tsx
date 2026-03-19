import { useState } from "react";
import { clearReportCache } from "~/common/storage/rb.ts";

const ClearReportCacheButton = () => {
  const [status, setStatus] = useState<string | null>(null);

  const handleClear = async () => {
    setStatus(null);
    try {
      await clearReportCache();
      setStatus("Report cache cleared.");
    } catch (err: any) {
      setStatus(err.message || "Failed to clear cache");
    }
  };

  return (
    <div className="form-actions">
      <button type="button" onClick={handleClear}>
        Clear Report Cache
      </button>
      {status && <span>{status}</span>}
    </div>
  );
};

export default ClearReportCacheButton;
