"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setChecked(true);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (!checked) return null;

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <span className="brand__crest">SD</span>
            <div className="brand__text">
              <span className="brand__name">BAF Shaheen College Dhaka</span>
              <span className="brand__subtitle">Admin Console</span>
            </div>
          </div>
          <nav className="nav-links" style={{ alignItems: "center" }}>
            <a href="/admin/dashboard">Applications</a>
            <a href="/admin/entry">New Entry</a>
            {user && ["super_admin", "admin_principal", "admin_office"].includes(user.role) && (
              <a href="/admin/seats">Seats</a>
            )}
            <a href="/track">Public Tracking</a>
            {user && (
              <>
                <span className="text-muted" style={{ fontSize: 12.5 }}>
                  {user.name} · {user.role}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container" style={{ maxWidth: 1180 }}>
        {children}
      </main>
    </div>
  );
}
