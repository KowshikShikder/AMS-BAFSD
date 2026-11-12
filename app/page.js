import ApplicationForm from "@/components/ApplicationForm";
import Brand from "@/components/Brand";

export default function HomePage() {
  return (
    <div className="page">
      <header className="site-header">
        <div className="site-header__inner">
          <Brand />
          <nav className="nav-links">
            <a href="/">Apply</a>
            <a href="/track">Track Status</a>
            <a href="/admin/login">Staff Login</a>
          </nav>
        </div>
      </header>

      <main className="container container--narrow">
        <span className="eyebrow">New Application</span>
        <h1 className="page-title">Submit an application</h1>
        <p className="page-subtitle">
          Choose the type of application, fill in the details, and you&apos;ll get a Serial Number (also your tracking number)
          to follow its progress online.
        </p>
        <ApplicationForm />
      </main>
    </div>
  );
}
