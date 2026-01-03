import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/home-page.tsx"),
  route("sync", "./routes/sync-page.tsx"),
  route("login", "./routes/auth/login-page.tsx"),
  route("logout", "./routes/auth/logout-page.tsx"),
  route("users", "./routes/auth/users-page.tsx"),
  route("report", "./routes/report/report-home-page.tsx"),
  route("track", "./routes/track/track-home-page.tsx"),
] satisfies RouteConfig;
