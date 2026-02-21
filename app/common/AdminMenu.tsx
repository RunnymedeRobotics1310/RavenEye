import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import Gear from "~/common/icons/Gear.tsx";
import { getRoles } from "~/common/storage/rbauth.ts";

const AdminMenu = () => {
  let isAdmin = false;
  let isSuperuser = false;
  try {
    const roles = getRoles();
    isAdmin =
      roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPERUSER");
    isSuperuser = roles.includes("ROLE_SUPERUSER");
  } catch {
    // not logged in
  }

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleLinkClick = () => {
    setOpen(false);
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-menu" ref={menuRef}>
      <button
        className="admin-menu-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Admin menu"
      >
        <Gear />
      </button>
      {open && (
        <nav className="admin-menu-dropdown" aria-label="Admin navigation">
          <ul>
            <li>
              <NavLink to="/admin/users" onClick={handleLinkClick}>
                Users
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/strategy-areas" onClick={handleLinkClick}>
                Strategy Areas
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/event-types" onClick={handleLinkClick}>
                Event Types
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/sequence-types" onClick={handleLinkClick}>
                Sequence Types
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/design-system" onClick={handleLinkClick}>
                Design System
              </NavLink>
            </li>
            {isSuperuser && (
              <li>
                <NavLink to="/admin/config-sync" onClick={handleLinkClick}>
                  Sync from Source
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default AdminMenu;
