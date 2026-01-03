import { useEffect } from "react";
import { logout } from "~/common/storage/auth.ts";
import { useNavigate } from "react-router";

const LogoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate("/");
  }, []);

  return (
    <section>
      <h2></h2>
      <p>You have been logged out.</p>
    </section>
  );
};
export default LogoutPage;
