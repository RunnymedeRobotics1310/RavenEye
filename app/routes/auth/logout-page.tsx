import { useEffect } from "react";
import { logout } from "~/common/storage/auth.ts";
import { useNavigate } from "react-router";
import ErrorMessage from "~/common/ErrorMessage.tsx";

const LogoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate("/");
  }, []);

  return (
    <main>
      <ErrorMessage title={"Logout"}>
        <p>
          You have logged out successfully, but you shouldn't actually be seeing
          this page. Please check with an administrator.
        </p>
      </ErrorMessage>
    </main>
  );
};
export default LogoutPage;
