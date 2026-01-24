import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/home-page.tsx"),
  route("sync", "./routes/sync-page.tsx"),
  route("login", "./routes/auth/login-page.tsx"),
  route("logout", "./routes/auth/logout-page.tsx"),
  route("admin", "./routes/admin/admin-page.tsx"),
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
  route("report", "./routes/report/report-home-page.tsx"),
  route("track", "./routes/track/track-home-page.tsx"),
] satisfies RouteConfig;
