import AuthWrapperOne from '@/app/shared/auth-layout/auth-wrapper-one';
import ForgetPasswordForm from './forgot-password-form';

export default function ForgotPassword({
  params: { lang },
}: {
  params: { lang?: string };
}) {
  return (
    <AuthWrapperOne
      title={
        <>
          Having trouble to sign in? <br className="hidden sm:inline-block" />{' '}
          Send reset link to your email.
        </>
      }
      lang={lang}
    >
      <ForgetPasswordForm lang={lang}/>
    </AuthWrapperOne>
  );
}
