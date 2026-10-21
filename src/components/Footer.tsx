import Link from 'next/link';
import { PwaControls } from './PwaControls';

export default function Footer() {
  return <footer className='site-footer'>
    <div className='page-shell site-footer-inner'>
      <p>&copy; {new Date().getFullYear()} <a href='https://www.surajverma.in' target='_blank' rel='noopener noreferrer'>Suraj Verma</a></p>
      <PwaControls />
      <p>Open source · <Link href='/license'>MIT License</Link> · <a href='https://github.com/surajverma/toolstack' target='_blank' rel='noopener noreferrer'>GitHub</a></p>
    </div>
  </footer>;
}
