import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./landing.module.css";

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

const FONT_LINK_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";

/**
 * Marketing homepage, ported from the old standalone apps/web/public/landing.html
 * into a real route so nav to/from /login and /signup is client-side. Fonts,
 * page title, and smooth-scroll are applied only while this route is mounted
 * so they don't leak onto the rest of the app.
 */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "ABMS — Run your factory without spreadsheets";

    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = FONT_LINK_HREF;
    document.head.append(preconnect1, preconnect2, stylesheet);

    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";

    return () => {
      document.title = previousTitle;
      preconnect1.remove();
      preconnect2.remove();
      stylesheet.remove();
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header>
        <div className={cx(styles.wrap, styles.nav)}>
          <a href="#top" className={styles.logo}>
            <span className={styles["logo-mark"]}></span>ABMS
          </a>
          <nav className={cx(styles["nav-links"], menuOpen && styles["nav-links-open"])}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className={styles["nav-actions"]}>
            <Link to="/login" className={cx(styles.btn, styles["btn-ghost"])}>
              Log in
            </Link>
            <a href="#contact" className={cx(styles.btn, styles["btn-primary"])}>
              Book a demo
            </a>
            <button
              type="button"
              className={styles["nav-toggle"]}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className={styles.hero}>
          <div className={cx(styles.wrap, styles["hero-grid"])}>
            <div>
              <span className={styles.eyebrow}>ERP · CRM · HRMS — ONE SYSTEM</span>
              <h1>
                Run your factory floor without <em>spreadsheets.</em>
              </h1>
              <p className={styles.lead}>
                ABMS brings stock, orders, customers and payroll into one dashboard — built around how your shop floor
                actually works, not a generic template.
              </p>
              <div className={styles["hero-ctas"]}>
                <a href="#contact" className={cx(styles.btn, styles["btn-primary"], styles["btn-lg"])}>
                  Book a demo
                </a>
                <a href="#pricing" className={cx(styles.btn, styles["btn-ghost"], styles["btn-lg"])}>
                  See pricing
                </a>
              </div>
              <div className={styles["trust-line"]}>
                <span className={styles.dot}></span>Own it outright — no recurring license fee, ever.
              </div>
            </div>

            <div className={styles.mockup}>
              <div className={styles["mockup-bar"]}>
                <span className={styles.mdot}></span>
                <span className={styles.mdot}></span>
                <span className={styles.mdot}></span>
                <span className={styles.mtitle}>abms.app / dashboard</span>
              </div>
              <div className={styles["mockup-tabs"]}>
                <span className={cx(styles.tab, styles.active)}>Overview</span>
                <span className={styles.tab}>Inventory</span>
                <span className={styles.tab}>Customers</span>
                <span className={styles.tab}>Staff</span>
              </div>
              <div className={styles["mockup-body"]}>
                <div className={styles["mockup-stats"]}>
                  <div className={styles["stat-card"]}>
                    <div className={styles["s-label"]}>Stock value</div>
                    <div className={styles["s-value"]}>₹18.4L</div>
                    <div className={styles["s-delta"]}>▲ 3.2% this week</div>
                  </div>
                  <div className={styles["stat-card"]}>
                    <div className={styles["s-label"]}>Open orders</div>
                    <div className={styles["s-value"]}>37</div>
                    <div className={styles["s-delta"]}>▲ 6 new today</div>
                  </div>
                  <div className={styles["stat-card"]}>
                    <div className={styles["s-label"]}>On floor today</div>
                    <div className={styles["s-value"]}>22 / 26</div>
                    <div className={styles["s-delta"]}>▲ On target</div>
                  </div>
                </div>
                <div className={styles["mockup-list"]}>
                  <div className={styles["m-row"]}>
                    <div className={styles["m-name"]}>
                      <span className={styles["m-avatar"]}></span>PVC Granules — 25kg bags
                      <span className={styles["m-sub"]}>SKU 1042</span>
                    </div>
                    <span className={cx(styles.badge, styles["badge-ok"])}>In stock</span>
                  </div>
                  <div className={styles["m-row"]}>
                    <div className={styles["m-name"]}>
                      <span className={styles["m-avatar"]}></span>Suresh Textiles — Order #2291
                      <span className={styles["m-sub"]}>Due Fri</span>
                    </div>
                    <span className={cx(styles.badge, styles["badge-warn"])}>Pending</span>
                  </div>
                  <div className={styles["m-row"]}>
                    <div className={styles["m-name"]}>
                      <span className={styles["m-avatar"]}></span>Dye Batch — Cyan 40L
                      <span className={styles["m-sub"]}>SKU 3387</span>
                    </div>
                    <span className={cx(styles.badge, styles["badge-low"])}>Low stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <div className={styles["trust-strip"]}>
          <div className={styles.wrap}>
            <span className={styles["ts-label"]}>Built for</span>
            <div className={styles["ts-items"]}>
              <span>Textile mills</span>
              <span>Glass processing</span>
              <span>Food production</span>
              <span>Trading &amp; distribution</span>
              <span>Agro mills</span>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <section id="features">
          <div className={styles.wrap}>
            <div className={styles["section-head"]}>
              <span className={styles.eyebrow}>What&apos;s inside</span>
              <h2>Everything the floor and the office need</h2>
              <p>Six modules that share one database — no exporting spreadsheets between departments.</p>
            </div>
            <div className={styles["feat-grid"]}>
              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>01</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 11v10" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <h3>Inventory &amp; production</h3>
                <p>Track raw material, work-in-progress and finished stock without walking the warehouse.</p>
              </div>

              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>02</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16 9a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M15.5 14c2.2.3 4.5 2.2 4.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Customers &amp; orders</h3>
                <p>Every order, follow-up and quote against a customer, so nothing gets forgotten.</p>
              </div>

              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>03</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 13h4M7 16h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Staff &amp; payroll</h3>
                <p>Attendance, advances and salary runs calculated automatically each cycle.</p>
              </div>

              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>04</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <h3>One dashboard</h3>
                <p>Stock, sales, customers and staff in a single view instead of five disconnected files.</p>
              </div>

              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>05</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="2.5" width="12" height="19" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M11 18.2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>Mobile access</h3>
                <p>Check stock, approve orders or run reports from a phone, on or off the floor.</p>
              </div>

              <div className={styles["feat-card"]}>
                <span className={styles["feat-num"]}>06</span>
                <div className={styles["feat-icon"]}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2.5l7 3.2v5.4c0 4.8-3 8.9-7 10.4-4-1.5-7-5.6-7-10.4V5.7l7-3.2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M9.2 12l2 2 3.6-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3>Role-based access</h3>
                <p>Owners see everything; staff see only what their role needs. Set once, enforced everywhere.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className={styles.pricing}>
          <div className={styles.wrap}>
            <div className={styles["section-head"]}>
              <span className={styles.eyebrow}>Pricing</span>
              <h2>Stop renting your business software</h2>
              <p>
                Most platforms charge per user, every month, forever. ABMS is built once for your process and handed
                over — you own it.
              </p>
            </div>

            <div className={styles["price-grid"]}>
              <div className={cx(styles["price-card"], styles.saas)}>
                <div className={styles["p-tag"]}>Typical SaaS</div>
                <h3>Rent it, forever</h3>
                <div className={styles["p-figure"]}>₹800–₹2,500 / user / month, indefinitely</div>
                <ul className={styles["price-list"]}>
                  <li>
                    <span className={cx(styles.ic, styles["ic-x"])}>✕</span>Pay per user, every month, forever
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-x"])}>✕</span>Cost climbs as your team grows
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-x"])}>✕</span>Generic workflow you adapt to
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-x"])}>✕</span>Access stops the day you stop paying
                  </li>
                </ul>
              </div>

              <div className={cx(styles["price-card"], styles.featured)}>
                <div className={styles["p-tag"]}>ABMS</div>
                <h3>Pay once, own it</h3>
                <div className={styles["p-figure"]}>One-time cost, scoped to your operation</div>
                <ul className={styles["price-list"]}>
                  <li>
                    <span className={cx(styles.ic, styles["ic-check"])}>✓</span>One-time cost based on scope, not seats
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-check"])}>✓</span>No recurring license fee, ever
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-check"])}>✓</span>Built around your actual process
                  </li>
                  <li>
                    <span className={cx(styles.ic, styles["ic-check"])}>✓</span>You own the system permanently
                  </li>
                </ul>
              </div>
            </div>

            <p className={styles["price-note"]}>
              Exact pricing depends on scope and modules — <strong>we work it out on a call</strong>, not from a price
              list on this page.
            </p>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about">
          <div className={cx(styles.wrap, styles["about-grid"])}>
            <div>
              <div className={cx(styles["section-head"], styles.left)}>
                <span className={styles.eyebrow}>Why we built this</span>
                <h2>Built from what owners told us, not a feature checklist</h2>
              </div>
              <div className={styles["about-copy"]}>
                <p>
                  ABMS didn&apos;t start as a spec sheet. It started with the same handful of problems, repeated by
                  owner after owner: a customer follow-up that got forgotten, stock counts that only exist inside
                  someone&apos;s head, a payroll run that eats an entire Sunday every month.
                </p>
                <p>
                  So instead of building a generic ERP and asking manufacturers to bend their process to fit it, we
                  built the modules around the problems they actually described — and let the software follow.
                </p>
              </div>

              <ul className={styles["about-list"]}>
                <li>
                  <span className={styles["a-num"]}>1</span>
                  <div className={styles["a-text"]}>
                    <strong>Talk to us first</strong>
                    <span>We start with a call about how your floor actually runs, not a product demo.</span>
                  </div>
                </li>
                <li>
                  <span className={styles["a-num"]}>2</span>
                  <div className={styles["a-text"]}>
                    <strong>Start with one module</strong>
                    <span>Inventory, customers or payroll — whichever is hurting most right now.</span>
                  </div>
                </li>
                <li>
                  <span className={styles["a-num"]}>3</span>
                  <div className={styles["a-text"]}>
                    <strong>You own what we build</strong>
                    <span>No recurring fee after handover, no lock-in to keep using it.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className={styles["stat-panel"]}>
              <div className={styles["sp-item"]}>
                <div className={styles["sp-num"]}>3 modules</div>
                <div className={styles["sp-label"]}>
                  Working together from day one — inventory, customers and staff share one database.
                </div>
              </div>
              <div className={styles["sp-item"]}>
                <div className={styles["sp-num"]}>₹0</div>
                <div className={styles["sp-label"]}>Recurring fee after handover. What you pay for scope is what you pay, once.</div>
              </div>
              <div className={styles["sp-item"]}>
                <div className={styles["sp-num"]}>1 dashboard</div>
                <div className={styles["sp-label"]}>For owners and staff alike — role-based, so everyone sees only what they need.</div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact">
          <div className={cx(styles.wrap, styles["contact-grid"])}>
            <div className={styles["contact-info"]}>
              <div className={cx(styles["section-head"], styles.left)}>
                <span className={styles.eyebrow}>Get in touch</span>
                <h2>Tell us what&apos;s slowing you down</h2>
              </div>
              <p className={styles.lead}>
                One call is usually enough for us to tell you whether ABMS fits your operation — and roughly what it
                would cost.
              </p>

              <div className={styles["contact-items"]}>
                <div className={styles["contact-item"]}>
                  <span className={styles["ci-icon"]}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <div className={styles["ci-label"]}>Email</div>
                    <div className={styles["ci-value"]}>hello@abms.app</div>
                  </div>
                </div>
                <div className={styles["contact-item"]}>
                  <span className={styles["ci-icon"]}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4.5 3.5h3.2l1.4 4-2 1.4a11.5 11.5 0 005.5 5.5l1.4-2 4 1.4v3.2a1.5 1.5 0 01-1.6 1.5A16.5 16.5 0 013 5.1a1.5 1.5 0 011.5-1.6z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <div className={styles["ci-label"]}>Phone</div>
                    <div className={styles["ci-value"]}>+91 98765 43210</div>
                  </div>
                </div>
                <div className={styles["contact-item"]}>
                  <span className={styles["ci-icon"]}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21s7-6.1 7-11.5A7 7 0 105 9.5C5 14.9 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <div>
                    <div className={styles["ci-label"]}>Location</div>
                    <div className={styles["ci-value"]}>Coimbatore, Tamil Nadu</div>
                  </div>
                </div>
              </div>
            </div>

            <form className={styles["form-card"]} onSubmit={(e) => e.preventDefault()}>
              <div className={styles["form-row"]}>
                <div className={styles.field}>
                  <label htmlFor="f-name">Your name</label>
                  <input id="f-name" type="text" placeholder="Ramesh Kumar" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="f-business">Business name</label>
                  <input id="f-business" type="text" placeholder="Kumar Textiles" required />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="f-phone">Phone number</label>
                <input id="f-phone" type="tel" placeholder="+91 00000 00000" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="f-problem">What problem are you solving?</label>
                <textarea id="f-problem" placeholder="e.g. we lose track of stock between the warehouse and the shop floor"></textarea>
              </div>
              <button type="submit" className={cx(styles.btn, styles["btn-primary"], styles["btn-block"], styles["btn-lg"])}>
                Send message
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer>
        <div className={styles.wrap}>
          <span className={styles["footer-logo"]}>
            <span className={styles["logo-mark"]}></span>ABMS
          </span>
          <span className={styles["foot-line"]}>© 2026 ABMS. Built for the floor, not the boardroom.</span>
        </div>
      </footer>
    </div>
  );
}
