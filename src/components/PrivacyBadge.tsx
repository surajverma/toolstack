export default function PrivacyBadge() {
  return (
    <div className='inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800'>
      <span aria-hidden='true'>🔒</span>
      <span>Processed locally</span>
      <span aria-hidden='true'>•</span>
      <span>No upload</span>
      <span aria-hidden='true'>•</span>
      <span>No tracking</span>
    </div>
  );
}
