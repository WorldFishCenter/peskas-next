'use client';

import Link from 'next/link';
import { useState, Fragment } from 'react';
import { signIn } from 'next-auth/react';
import { SubmitHandler } from 'react-hook-form';
import { PiArrowRightBold } from 'react-icons/pi';
import { Checkbox, Password, Button, Input, Text, Loader } from 'rizzui';
import { useRouter } from 'next/navigation'
import { useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils' 

import { Form } from '@ui/form';
import { routes } from '@/config/routes';
import { loginSchema, LoginSchema } from '@/validators/login.schema';
import Alert from '@/app/_components/alert';
import { bmusAtom, dropdownAtom } from "@/app/components/filter-selector";

const initialValues: LoginSchema = {
  email: 'anthony@mountaindev.com',
  password: '1234qwer',
  rememberMe: true,
};

export default function SignInForm() {
  //TODO: why we need to reset it here
  const [loading, setLoading] = useState(false)
  const [loginErr, setLoginErr] = useState('')
  const [reset] = useState({})
  const router = useRouter()
  const setBmus = useSetAtom(bmusAtom);
  const setBmusDropdown = useSetAtom(dropdownAtom);  

  const onSubmit: SubmitHandler<LoginSchema> = async (data) => {
    setLoading(true)
    setLoginErr('')
    const resp = await signIn('credentials', {
      ...data,
      redirect: false
    })

    if (resp?.ok) {
      setBmus(RESET)
      setBmusDropdown(RESET)
      router.refresh()
    } else if (!resp?.ok && resp?.error) {
      setLoginErr(resp?.error)
    }
    setLoading(false)
  };

  return (
    <>
      <Form<LoginSchema>
        validationSchema={loginSchema}
        resetValues={reset}
        onSubmit={onSubmit}
        useFormProps={{
          defaultValues: initialValues,
        }}
      >
        {({ register, formState: { errors } }) => (
          <div className="space-y-5">
            {loginErr && <Alert color="danger" message={loginErr} className="mb-[16px]" />}
            <Input
              type="email"
              size="lg"
              label="Email"
              placeholder="Enter your email"
              className="[&>label>span]:font-medium"
              inputClassName="text-sm"
              {...register('email')}
              error={errors.email?.message}
            />
            <Password
              label="Password"
              placeholder="Enter your password"
              size="lg"
              className="[&>label>span]:font-medium"
              inputClassName="text-sm"
              {...register('password')}
              error={errors.password?.message}
            />
            <div className="flex items-center justify-between pb-2">
              <Checkbox
                {...register('rememberMe')}
                label="Remember Me"
                className="[&>label>span]:font-medium"
              />
              <Link
                href={routes.auth.forgotPassword1}
                className="h-auto p-0 text-sm font-semibold text-blue underline transition-colors hover:text-gray-900 hover:no-underline"
              >
                Forget Password?
              </Link>
            </div>
            <Button className="w-full" type="submit" size="lg">
              {loading 
                ? <Loader variant="spinner" color="current"/> 
                : <Fragment><span>Sign in</span>{' '}<PiArrowRightBold className="ms-2 mt-0.5 h-5 w-5" /></Fragment>
              }
              
            </Button>
          </div>
        )}
      </Form>
      <Text className="mt-6 text-center leading-loose text-gray-500 lg:mt-8 lg:text-start">
        Don’t have an account?{' '}
        <Link
          href={routes.auth.signUp1}
          className="font-semibold text-gray-700 transition-colors hover:text-blue"
        >
          Sign Up
        </Link>
      </Text>
    </>
  );
}
