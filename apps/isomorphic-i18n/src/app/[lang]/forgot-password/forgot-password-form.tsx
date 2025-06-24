'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { SubmitHandler } from 'react-hook-form';
import { Button, Input, Text, Loader } from 'rizzui';

import { useMedia } from '@hooks/use-media';
import { Form } from '@ui/form';
import { routes } from '@/config/routes';
import {
  GenerateResetPasswordTokenSchema,
  GenerateResetPasswordTokenType,
} from '@/validators/forget-password.schema';
import { api } from "@/trpc/react";
import Alert from "@/app/_components/alert";
import HydrationSafeInput from "@/app/_components/hydration-safe-input";

const initialValues = {
  email: '',
};

export default function ForgetPasswordForm({ lang }: { lang?: string }) {
  const isMedium = useMedia('(max-width: 1200px)', false);
  const [reset, setReset] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loginSucessMessage, setLoginSucessMessage] = useState("");
  const utils = api.useUtils();

  const generateResetPasswordToken = api.user.generateResetPasswordToken.useMutation({
    onSuccess: async () => {
      await utils.user.invalidate();
      setLoginSucessMessage("Please check your email.");
      setLoading(false);
    },
    onError: (err) => {
      setLoginErr(`${err.message}`)
      setLoading(false);
    },
  });

  const onSubmit: SubmitHandler<GenerateResetPasswordTokenType> = async (data) => {
    setLoading(true);
    setLoginErr("");
    setLoginSucessMessage("");
    await generateResetPasswordToken.mutate(data);
    setReset(initialValues);
  };

  return (
    <>
      <Form<GenerateResetPasswordTokenType>
        validationSchema={GenerateResetPasswordTokenSchema}
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
            <HydrationSafeInput>
              <Input
                type="email"
                size={isMedium ? 'lg' : 'xl'}
                label="Email"
                placeholder="Enter your email"
                className="[&>label>span]:font-medium"
                {...register('email')}
                error={errors.email?.message}
              />
            </HydrationSafeInput>
            <Button className="w-full" type="submit" size={isMedium ? 'lg' : 'xl'}>
              {loading ? (
                <Loader variant="spinner" color="current" />
              ) : (
                <span>Send</span>
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
