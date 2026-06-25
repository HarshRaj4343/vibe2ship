import IssueReportForm from '@/components/IssueReportForm';

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Report a civic issue</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload a photo and our AI agent will triage it for you.
      </p>
      <div className="mt-6">
        <IssueReportForm />
      </div>
    </div>
  );
}
