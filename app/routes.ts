import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("login", "./routes/auth/login.tsx"),
  route("logout", "./routes/auth/logout.tsx"),
  route("users", "./routes/auth/users.tsx"),
  route("report", "./routes/report/report-home.tsx"),
  route("track", "./routes/track/track-home.tsx"),
] satisfies RouteConfig;
