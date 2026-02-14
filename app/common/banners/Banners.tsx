import { getRoles } from "~/common/storage/rbauth.ts";
import ForgotPasswordBanner from "~/common/banners/ForgotPasswordBanner.tsx";

const Banners = () => {
  let isAdmin = false;
  try {
    const roles = getRoles();
    isAdmin =
      roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPERUSER");
  } catch {
    // Not logged in — no banners
  }

  return <>{isAdmin && <ForgotPasswordBanner />}</>;
};

export default Banners;
