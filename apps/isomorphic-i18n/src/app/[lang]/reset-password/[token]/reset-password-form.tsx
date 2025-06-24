'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SubmitHandler } from 'react-hook-form';
import { Button, Text, Loader, Password } from 'rizzui';

import { useMedia } from '@hooks/use-media';
import { Form } from '@ui/form';
import { routes } from '@/config/routes';
import {
  ResetPasswordSchema,
  ResetPasswordType,
} from '@/validators/reset-password.schema';
import { api } from "@/trpc/react";
import Alert from "@/app/_components/alert";
import HydrationSafeInput from "@/app/_components/hydration-safe-input";
import { useTranslation } from "@/app/i18n/client";

export default function ResetPasswordForm({ lang, token }: { lang?: string, token: string }) {
  const isMedium = useMedia('(max-width: 1200px)', false);
  const [reset, setReset] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loginSucessMessage, setLoginSucessMessage] = useState("");
  const utils = api.useUtils();

  const { t } = useTranslation(lang!, 'form');

  const initialValues = {
    newPassword: '',
    confirmPassword: '',
    token
  };  

  const resetPassword = api.user.resetPassword.useMutation({
    onSuccess: async () => {
      await utils.user.invalidate();
      setLoginSucessMessage("Password reset successful.");
      setLoading(false);
    },
    onError: (err) => {
      setLoginErr(`${err.message}`)
      setLoading(false);
    },
  });

  const onSubmit: SubmitHandler<ResetPasswordType> = async (data) => {
    setLoading(true);
    setLoginErr("");
    setLoginSucessMessage("");
    await resetPassword.mutate(data);
    setReset(initialValues);
  };

  return (
    <>
      <Form<ResetPasswordType>
        validationSchema={ResetPasswordSchema}
        resetValues={reset}
        onSubmit={onSubmit}
        useFormProps={{
          defaultValues: initialValues,
        }}
      >
        {({ register, formState: { errors } }) => (
          <div className="space-y-6">
            {loginErr && (
              <Alert color="danger" message={loginErr} className="mb-[16px]" />
            )}
            {loginSucessMessage && (
              <Alert color="success" message={loginSucessMessage} className="mb-[16px]" />
            )}         
            <input
              type="hidden"
              {...register('token')}
            />
            <HydrationSafeInput>
              <Password
                label="New Password"
                placeholder="Enter your new password"
                size="xl"
                className="[&>label>span]:font-large"
                {...register("newPassword")}
                error={t(errors.newPassword?.message as string)}
              />
            </HydrationSafeInput>
            <HydrationSafeInput>
              <Password
                label="Confirm Password"
                placeholder="Confirm your password"
                size="xl"
                className="[&>label>span]:font-large"
                {...register("confirmPassword")}
                error={t(errors.confirmPassword?.message as string)}
              />
            </HydrationSafeInput>                             
            <Button className="w-full" type="submit" size={isMedium ? 'lg' : 'xl'}>
              {loading ? (
                <Loader variant="spinner" color="current" />
              ) : (
                <span>Reset Password</span>
              )}
            </Button>                           
          </div>
        )}
      </Form>
      <Text className="mt-6 text-center text-[15px] leading-loose text-gray-500 md:mt-7 lg:mt-9 lg:text-base">
        Don’t want to reset?{' '}
        <Link
          href={`/${lang}${routes.signIn}`}
          className="font-semibold text-gray-700 transition-colors hover:text-primary"
        >
          Sign In
        </Link>
      </Text>
    </>
  );
}
