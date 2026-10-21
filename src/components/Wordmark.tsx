export default function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`wordmark text-slate-950 dark:text-slate-100 ${className}`}>Tool<span className='text-sky-600 dark:text-sky-400'>Stack</span></span>;
}
