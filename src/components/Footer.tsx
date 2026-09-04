import Link from 'next/link';
export default function Footer() {
  const year = new Date().getFullYear();
  return <footer className='mt-16 border-t border-slate-200 bg-slate-950 p-8 text-center text-slate-300'><p className='text-sm'>&copy; {year} <a href='https://www.surajverma.in' target='_blank' rel='noopener noreferrer' className='font-medium text-white hover:underline'>Suraj Verma</a></p><p className='mt-2 text-sm text-slate-400'>Open source under the <Link href='/license' className='text-sky-300 hover:underline'>MIT License</Link> · <a href='https://github.com/SurajVerma/toolstack' target='_blank' rel='noopener noreferrer' className='text-sky-300 hover:underline'>GitHub</a></p></footer>;
}
