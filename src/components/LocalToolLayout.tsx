import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumbs';
import ToolPage from './ToolPage';

export default function LocalToolLayout({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className='flex min-h-screen flex-col bg-slate-50'><Navbar /><Breadcrumbs /><ToolPage title={title} description={description}>{children}</ToolPage><Footer /></div>;
}
