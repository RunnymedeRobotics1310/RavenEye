import type { Route } from "~/routes/+types/sync";
import RequireLogin from "~/common/auth/RequireLogin.tsx";

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
    <RequireLogin>
      <section>
        <h1>Sync Central</h1>
        <p>Full list of sync services coming soon</p>
      </section>
    </RequireLogin>
  );
};

export default SyncPage;
