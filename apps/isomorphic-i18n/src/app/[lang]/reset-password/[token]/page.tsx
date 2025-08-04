import AuthWrapperOne from '@/app/shared/auth-layout/auth-wrapper-one';
import ResetPasswordForm from './reset-password-form';

export default function ForgotPassword({
  params: { lang, token },
}: {
  params: { lang?: string, token: string };
}) {
  return (
    <AuthWrapperOne
      title={
        <>
          Reset your password.
        </>
      }
      lang={lang}
    >
      <ResetPasswordForm lang={lang} token={token}/>
    </AuthWrapperOne>
  );
}
