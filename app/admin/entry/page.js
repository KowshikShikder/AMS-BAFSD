import ApplicationForm from "@/components/ApplicationForm";

export default function EntryPage() {
  return (
    <div className="container container--narrow" style={{ padding: 0 }}>
      <span className="eyebrow">New Entry</span>
      <h1 className="page-title">Submit an application</h1>
      <p className="page-subtitle">
        Entries you submit here are recorded under your account. You may set a Manual
        App Sl, or leave it blank to auto-generate.
      </p>
      <ApplicationForm isStaffEntry />
    </div>
  );
}
