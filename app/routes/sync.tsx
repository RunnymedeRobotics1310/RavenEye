import type { Route } from "~/routes/+types/sync";
import RavenBrainSyncConnection from "~/common/auth/RavenBrainSyncConnection.tsx";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sync | 1310 Raven Eye" },
    {
      name: "description",
      content: "Sync with the server",
    },
  ];
}
const SyncPage = () => {
  return (
    <RavenBrainSyncConnection loginMode={false}>
      sync options here
    </RavenBrainSyncConnection>
  );
};

export default SyncPage;
