import type { Route } from "~/routes/+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "1310 Raven Eye" },
    {
      name: "description",
      content:
        "Runnymede Robotics Team 1310 Raven Eye - Strategy Web Application",
    },
  ];
}
const Home = () => {
  return <p>Hello world from home</p>;
};

export default Home;
