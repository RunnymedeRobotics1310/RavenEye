import type { Route } from "~/routes/+types/sync";

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
  return <p>coming soon</p>;
};

export default SyncPage;
