import Navbar from '@/components/Navbar'; import Breadcrumbs from '@/components/Breadcrumbs'; import Footer from '@/components/Footer';
const LICENSE = `MIT License

Copyright (c) 2025 Suraj Verma

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
export default function LicensePage() { return <div className='flex min-h-screen flex-col bg-slate-50'><Navbar/><Breadcrumbs/><main className='container mx-auto flex-grow px-4 py-8'><section className='mx-auto max-w-4xl rounded-xl bg-white p-6 shadow'><h1 className='text-3xl font-bold text-slate-900'>MIT License</h1><pre className='mt-6 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700'>{LICENSE}</pre></section></main><Footer/></div>; }
