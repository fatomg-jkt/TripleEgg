import {Suspense} from 'react';import {LoginForm} from '@/components/login-form';
export default function Login(){return <main className="flex min-h-screen items-center justify-center bg-[#071321] p-5"><Suspense><LoginForm/></Suspense></main>}
