import {AuthFrame,ResetPasswordForm} from '@/components/auth-card';
export default function ResetPassword({searchParams}:{searchParams:{token?:string}}){return <AuthFrame title="Reset Password" subtitle="Buat password baru yang aman untuk akun Anda."><ResetPasswordForm token={searchParams.token||''}/></AuthFrame>}
