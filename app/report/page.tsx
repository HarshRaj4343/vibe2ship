import IssueReportForm from '@/components/IssueReportForm';

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-3xl font-medium text-ink">Report a civic issue</h1>
      <p className="mt-1 text-sm text-ink/55">
        Upload a photo and our AI agent will triage it for you.
      </p>
      <div className="mt-6">
        <IssueReportForm />
      </div>
    </div>
  );
}
