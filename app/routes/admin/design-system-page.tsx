import { useState, useEffect } from "react";
import RequireLogin from "~/common/auth/RequireLogin.tsx";
import { NavLink } from "react-router";

const colorVars = [
  {
    label: "Background",
    vars: [
      { name: "--color-bg-primary", desc: "Primary BG" },
      { name: "--color-bg-secondary", desc: "Secondary BG" },
      { name: "--color-bg-tertiary", desc: "Tertiary BG" },
      { name: "--color-bg-header", desc: "Header BG" },
    ],
  },
  {
    label: "Text",
    vars: [
      { name: "--color-text-primary", desc: "Primary" },
      { name: "--color-text-secondary", desc: "Secondary" },
      { name: "--color-text-tertiary", desc: "Tertiary" },
      { name: "--color-text-inverse", desc: "Inverse" },
      { name: "--color-text-link", desc: "Link" },
      { name: "--color-text-link-hover", desc: "Link Hover" },
    ],
  },
  {
    label: "Accent",
    vars: [
      { name: "--color-accent", desc: "Accent" },
      { name: "--color-accent-hover", desc: "Accent Hover" },
      { name: "--color-accent-active", desc: "Accent Active" },
      { name: "--color-accent-light", desc: "Accent Light" },
    ],
  },
  {
    label: "Buttons",
    vars: [
      { name: "--color-btn-primary-bg", desc: "Primary BG" },
      { name: "--color-btn-primary-text", desc: "Primary Text" },
      { name: "--color-btn-primary-hover", desc: "Primary Hover" },
      { name: "--color-btn-primary-active", desc: "Primary Active" },
      { name: "--color-btn-secondary-text", desc: "Secondary Text" },
      { name: "--color-btn-secondary-border", desc: "Secondary Border" },
      { name: "--color-btn-secondary-hover-bg", desc: "Secondary Hover BG" },
    ],
  },
  {
    label: "Borders & Inputs",
    vars: [
      { name: "--color-border", desc: "Border" },
      { name: "--color-border-accent", desc: "Border Accent" },
      { name: "--color-border-focus", desc: "Border Focus" },
      { name: "--color-input-bg", desc: "Input BG" },
      { name: "--color-input-border", desc: "Input Border" },
    ],
  },
  {
    label: "Table",
    vars: [
      { name: "--color-table-header-bg", desc: "Header BG" },
      { name: "--color-table-header-text", desc: "Header Text" },
      { name: "--color-table-stripe", desc: "Stripe" },
      { name: "--color-table-hover", desc: "Hover" },
    ],
  },
  {
    label: "Status",
    vars: [
      { name: "--color-success", desc: "Success" },
      { name: "--color-error", desc: "Error" },
      { name: "--color-warning", desc: "Warning" },
      { name: "--color-info", desc: "Info" },
      { name: "--color-event-tracked", desc: "Event Tracked" },
      { name: "--color-event-error", desc: "Event Error" },
    ],
  },
  {
    label: "Alliance",
    vars: [
      { name: "--alliance-red", desc: "Red" },
      { name: "--alliance-blue", desc: "Blue" },
      { name: "--alliance-red-bg", desc: "Red BG" },
      { name: "--alliance-blue-bg", desc: "Blue BG" },
    ],
  },
];

const spacingVars = [
  { name: "--space-xs", label: "xs (0.25rem)" },
  { name: "--space-sm", label: "sm (0.5rem)" },
  { name: "--space-base", label: "base (1rem)" },
  { name: "--space-lg", label: "lg (1.5rem)" },
  { name: "--space-xl", label: "xl (2rem)" },
  { name: "--space-2xl", label: "2xl (3rem)" },
];

const EventTypeDemo = ({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) => {
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(timer);
  }, [flash]);

  const handleClick = () => {
    setCount((c) => c + 1);
    setFlash(true);
  };

  return (
    <div className="event-type-button">
      <button
        type="button"
        className={flash ? "event-tracked" : undefined}
        onClick={handleClick}
      >
        {label}
      </button>
      <span className="event-count">{count}</span>
      {children}
    </div>
  );
};

const DesignSystemPage = () => {
  return (
    <main>
      <h1>Design System</h1>
      <p>
        Visual reference for all UI components and styles. Toggle your OS dark
        mode to verify both themes.
      </p>

      <RequireLogin>
        {/* ==================== TYPOGRAPHY ==================== */}
        <section>
          <h2>Typography</h2>
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
          <h4>Heading 4</h4>
          <p>
            Body text — The quick brown fox jumps over the lazy dog. This is a{" "}
            <a href="#typography">sample link</a> inside paragraph text.
          </p>
        </section>

        {/* ==================== BUTTONS ==================== */}
        <section>
          <h2>Buttons</h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <button type="button">Primary</button>
            <button type="button" className="secondary">
              Secondary
            </button>
            <button type="button" disabled>
              Disabled
            </button>
            <NavLink to="#" className="btn">
              .btn NavLink
            </NavLink>
            <NavLink to="#" className="btn-secondary">
              .btn-secondary
            </NavLink>
            <button type="button" className="camoButton">
              Camo Button
            </button>
          </div>
        </section>

        {/* ==================== EVENT TYPE BUTTONS ==================== */}
        <section>
          <h2>Event Type Buttons</h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
            <EventTypeDemo label="Score" />
            <EventTypeDemo label="Climb" />
            <EventTypeDemo label="With Qty">
              <input
                type="number"
                className="event-type-quantity"
                defaultValue={5}
              />
            </EventTypeDemo>
            <EventTypeDemo label="With Note">
              <input
                type="text"
                className="event-type-note"
                placeholder="note"
              />
            </EventTypeDemo>
            <div className="event-type-button">
              <button type="button" className="event-error">
                Error
              </button>
            </div>
          </div>
        </section>

        {/* ==================== FORM FIELDS ==================== */}
        <section>
          <h2>Form Fields</h2>
          <div className="form-field">
            <label htmlFor="ds-text">Text Input</label>
            <input id="ds-text" type="text" placeholder="Placeholder text" />
          </div>
          <div className="form-field">
            <label htmlFor="ds-password">Password</label>
            <input id="ds-password" type="password" defaultValue="secret" />
          </div>
          <div className="form-field">
            <label htmlFor="ds-number">Number</label>
            <input id="ds-number" type="number" defaultValue={42} />
          </div>
          <div className="form-field">
            <label htmlFor="ds-textarea">Textarea</label>
            <textarea
              id="ds-textarea"
              rows={3}
              defaultValue="Multi-line text area content"
            />
          </div>
          <div className="form-field">
            <label htmlFor="ds-select">Select Dropdown</label>
            <select id="ds-select" defaultValue="b">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
              <option value="c">Option C</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="ds-readonly">Read-only Input</label>
            <input
              id="ds-readonly"
              type="text"
              readOnly
              value="Cannot edit this"
            />
          </div>
        </section>

        {/* ==================== CHECKBOXES & RADIOS ==================== */}
        <section>
          <h2>Checkboxes &amp; Radios</h2>

          <h3>Checkbox in .form-field (label wrapping input)</h3>
          <div className="form-field">
            <label>
              <input type="checkbox" defaultChecked /> Enabled
            </label>
          </div>
          <div className="form-field">
            <label>
              <input type="checkbox" /> Forgot Password (require reset)
            </label>
          </div>

          <h3>Role-style fieldset group</h3>
          <fieldset>
            <legend>Roles:</legend>
            {["SUPERUSER", "ADMIN", "EXPERTSCOUT", "DATASCOUT", "MEMBER"].map(
              (role) => (
                <div className="form-field" key={role}>
                  <label>
                    <input type="checkbox" defaultChecked={role === "MEMBER"} />{" "}
                    {role}
                  </label>
                </div>
              ),
            )}
          </fieldset>
        </section>

        {/* ==================== TABLES ==================== */}
        <section>
          <h2>Tables</h2>
          <section className="usersAdmin">
            <table>
              <thead>
                <tr>
                  <th>Login</th>
                  <th>Display Name</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>jsmith</td>
                  <td>Jane Smith</td>
                  <td>ADMIN, MEMBER</td>
                  <td>
                    <NavLink to="#" className="btn">
                      Edit
                    </NavLink>
                  </td>
                </tr>
                <tr>
                  <td>bwilson</td>
                  <td>Bob Wilson</td>
                  <td>DATASCOUT</td>
                  <td>
                    <NavLink to="#" className="btn">
                      Edit
                    </NavLink>
                  </td>
                </tr>
                <tr className="forgot-password-row">
                  <td>cjones</td>
                  <td>Carol Jones</td>
                  <td>MEMBER</td>
                  <td>
                    <NavLink to="#" className="btn">
                      Edit
                    </NavLink>
                  </td>
                </tr>
                <tr className="disabled-item">
                  <td>disabled_user</td>
                  <td>Disabled User</td>
                  <td>MEMBER</td>
                  <td>
                    <NavLink to="#" className="btn">
                      Edit
                    </NavLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </section>

        {/* ==================== BANNERS ==================== */}
        <section>
          <h2>Banners</h2>
          <div className="banner banner-warning">
            Warning banner — something important happened.{" "}
            <a href="#">Action link</a>
          </div>
        </section>

        {/* ==================== NAVIGATION ==================== */}
        <section>
          <h2>Navigation</h2>
          <ul className="nav-list">
            <li>
              <NavLink to="#">Nav Item One</NavLink>
            </li>
            <li>
              <NavLink to="#">Nav Item Two</NavLink>
            </li>
            <li>
              <NavLink to="#">Nav Item Three</NavLink>
            </li>
          </ul>
        </section>

        {/* ==================== STATUS INDICATORS ==================== */}
        <section>
          <h2>Status Indicators</h2>

          <h3>Spinner</h3>
          <div className="spinner" />

          <h3>Error Message</h3>
          <p className="errorMessage">Something went wrong!</p>

          <h3>Sync Status Colors</h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {[
              { cls: "syncLoading", label: "Loading" },
              { cls: "syncError", label: "Error" },
              { cls: "syncHappening", label: "Happening" },
              { cls: "syncToDo", label: "To Do" },
              { cls: "syncComplete", label: "Complete" },
            ].map(({ cls, label }) => (
              <div key={cls} style={{ textAlign: "center" }}>
                <div
                  className={cls}
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "var(--border-radius)",
                    backgroundColor: "currentColor",
                    margin: "0 auto 0.25rem",
                  }}
                />
                <small className={cls}>{label}</small>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== COLORS ==================== */}
        <section>
          <h2>Colors</h2>
          {colorVars.map((group) => (
            <div key={group.label}>
              <h3>{group.label}</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {group.vars.map((v) => (
                  <div key={v.name} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "3rem",
                        backgroundColor: `var(${v.name})`,
                        borderRadius: "var(--border-radius)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <small
                      style={{ fontSize: "0.7rem", wordBreak: "break-all" }}
                    >
                      {v.desc}
                      <br />
                      <code>{v.name}</code>
                    </small>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ==================== SPACING ==================== */}
        <section>
          <h2>Spacing</h2>
          {spacingVars.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.5rem",
              }}
            >
              <code style={{ width: "10rem", fontSize: "0.8rem" }}>
                {s.label}
              </code>
              <div
                style={{
                  width: `var(${s.name})`,
                  height: "1.5rem",
                  backgroundColor: "var(--color-accent)",
                  borderRadius: "var(--border-radius)",
                }}
              />
            </div>
          ))}
        </section>
      </RequireLogin>
    </main>
  );
};

export default DesignSystemPage;
