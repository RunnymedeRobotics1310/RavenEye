import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/home-page.tsx"),
  route("sync", "./routes/sync-page.tsx"),
  route("login", "./routes/auth/login-page.tsx"),
  route("logout", "./routes/auth/logout-page.tsx"),
  route("admin/design-system", "./routes/admin/design-system-page.tsx"),
  route("admin/users", "./routes/admin/users/users-page.tsx"),
  route("admin/users/add", "./routes/admin/users/add-page.tsx"),
  route("admin/users/:id", "./routes/admin/users/edit-page.tsx"),
  route(
    "admin/strategy-areas",
    "./routes/admin/strategy-areas/strategy-areas-page.tsx",
  ),
  route(
    "admin/strategy-areas/add",
    "./routes/admin/strategy-areas/add-page.tsx",
  ),
  route(
    "admin/strategy-areas/:id",
    "./routes/admin/strategy-areas/edit-page.tsx",
  ),
  route(
    "admin/sequence-types",
    "./routes/admin/sequence-types/sequence-types-page.tsx",
  ),
  route(
    "admin/sequence-types/add",
    "./routes/admin/sequence-types/add-page.tsx",
  ),
  route(
    "admin/sequence-types/:id",
    "./routes/admin/sequence-types/edit-page.tsx",
  ),
  route(
    "admin/event-types",
    "./routes/admin/event-types/event-types-page.tsx",
  ),
  route(
    "admin/event-types/add",
    "./routes/admin/event-types/add-page.tsx",
  ),
  route(
    "admin/event-types/:eventtype",
    "./routes/admin/event-types/edit-page.tsx",
  ),
  route(
    "admin/config-sync",
    "./routes/admin/config-sync/config-sync-page.tsx",
  ),
  route("profile", "./routes/profile/profile-page.tsx"),
  route("report", "./routes/report/report-home-page.tsx"),
  route("report/schedule", "./routes/report/team-schedule-page.tsx"),
  route("report/summary", "./routes/report/summary-report-teams-page.tsx"),
  route(
    "report/summary/:teamId",
    "./routes/report/summary-report-page.tsx",
  ),
  route("report/drill", "./routes/report/drill-report-page.tsx"),
  route(
    "report/drill/shooter/:tournamentId",
    "./routes/report/shooter-drill-report-page.tsx",
  ),
  route(
    "report/drill/sessions/:sequenceTypeCode",
    "./routes/report/sequence-drill-sessions-page.tsx",
  ),
  route(
    "report/drill/:sequenceTypeCode/:tournamentId",
    "./routes/report/sequence-drill-report-page.tsx",
  ),
  route(
    "report/tournament/:sequenceTypeCode/teams",
    "./routes/report/sequence-tournament-teams-page.tsx",
  ),
  route(
    "report/tournament/:sequenceTypeCode/:teamId",
    "./routes/report/sequence-tournament-tournaments-page.tsx",
  ),
  route(
    "report/tournament/:sequenceTypeCode/:teamId/:tournamentId",
    "./routes/report/sequence-tournament-report-page.tsx",
  ),
  route("report/chrono", "./routes/report/chrono-report-tournaments-page.tsx"),
  route(
    "report/chrono/:tournamentId",
    "./routes/report/chrono-report-teams-page.tsx",
  ),
  route(
    "report/chrono/:tournamentId/:teamId",
    "./routes/report/chrono-report-page.tsx",
  ),
  route("report/mega", "./routes/report/mega-report-tournaments-page.tsx"),
  route(
    "report/mega/:tournamentId",
    "./routes/report/mega-report-teams-page.tsx",
  ),
  route(
    "report/mega/:tournamentId/:teamId",
    "./routes/report/mega-report-page.tsx",
  ),
  route(
    "report/drill/areas",
    "./routes/report/sequence-drill-areas-page.tsx",
  ),
  route(
    "report/drill/areas/:areaCode",
    "./routes/report/sequence-drill-sequences-page.tsx",
  ),
  route(
    "report/tournament/areas",
    "./routes/report/sequence-tournament-areas-page.tsx",
  ),
  route(
    "report/tournament/areas/:areaCode",
    "./routes/report/sequence-tournament-sequences-page.tsx",
  ),
  route("track", "./routes/track/track-home-page.tsx"),
] satisfies RouteConfig;
