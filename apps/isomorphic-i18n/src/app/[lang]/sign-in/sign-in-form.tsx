"use client";

import { useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { PiArrowRightBold } from "react-icons/pi";
import { Button, Checkbox, Input, Loader, Password, Text } from "rizzui";

import Alert from "@/app/_components/alert";
import HydrationSafeInput from "@/app/_components/hydration-safe-input";
import { bmusAtom, dropdownAtom } from "@/app/components/filter-selector";
import { routes } from "@/config/routes";
import { loginSchema, LoginType } from "@/validators/login.schema";
import { Form } from "@ui/form";

const initialValues: LoginType = {
  email: "test@test.com",
  password: "12345",
  rememberMe: true,
};

export default function SignInForm({ lang }: { lang?: string }) {
  //TODO: why we need to reset it here
  const [loading, setLoading] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [reset] = useState({});
  const router = useRouter();
  const setBmus = useSetAtom(bmusAtom);
  const setBmusDropdown = useSetAtom(dropdownAtom);

  const onSubmit: SubmitHandler<LoginType> = async (data) => {
    setLoading(true);
    setLoginErr("");
    const resp = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (resp?.ok) {
      // Get session data to track user roles
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      // Extract user role information
      const userGroups = sessionData?.user?.groups || [];
      const userRoles = userGroups.map((group: any) => group.name).join(', ') || 'no_role';
      const userPermissions = userGroups.flatMap((group: any) => 
        group.permission_id?.domain?.map((d: any) => d.resource) || []
      ).join(', ') || 'no_permissions';
      const userBmu = sessionData?.user?.userBmu?.BMU || 'no_bmu';
      const hasFisherId = sessionData?.user?.fisherId ? 'yes' : 'no';
      
      // Track successful login in Google Analytics with user role data
      if (typeof window !== 'undefined' && window.gtag) {
        // Set user ID and properties for all tracking
        window.gtag('config', 'G-8VBFKQ4E01', {
          user_id: sessionData?.user?.id,
          user_properties: {
            user_roles: userRoles,
            user_bmu: userBmu,
            user_permissions: userPermissions,
            has_fisher_id: hasFisherId
          },
          custom_map: {
            custom_dimension_1: 'user_roles',
            custom_dimension_2: 'user_bmu',
            custom_dimension_3: 'user_permissions'
          }
        });

        // Track login event with individual parameters
        window.gtag('event', 'login', {
          method: 'credentials',
          event_category: 'user_authentication',
          event_label: 'successful_login',
          user_id: sessionData?.user?.id || 'anonymous',
          user_roles: userRoles,
          user_permissions: userPermissions,
          user_bmu: userBmu,
          has_fisher_id: hasFisherId,
          user_groups_count: userGroups.length
        });

        // Track session start with user data
        window.gtag('event', 'session_start', {
          event_category: 'user_engagement',
          user_id: sessionData?.user?.id,
          user_roles: userRoles,
          user_permissions: userPermissions,
          user_bmu: userBmu,
          has_fisher_id: hasFisherId,
          user_groups_count: userGroups.length
        });
      }
      
      setBmus(RESET);
      setBmusDropdown(RESET);
      router.refresh();
    } else if (
      !resp?.ok &&
      resp?.error === "No password is set for this user."
    ) {
      // Track failed login attempt
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'login_failed', {
          method: 'credentials',
          event_category: 'user_authentication',
          event_label: 'no_password_set',
          error_type: 'no_password'
        });
      }
      
      setLoginErr(resp?.error);
    } else if (!resp?.ok && resp?.error) {
      // Track other login failures
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'login_failed', {
          method: 'credentials',
          event_category: 'user_authentication',
          event_label: 'authentication_failed',
          error_type: 'invalid_credentials'
        });
      }
      
      setLoginErr(resp?.error);
    }
    setLoading(false);
  };

  return (
    <>
      <Form<LoginType>
        validationSchema={loginSchema}
        resetValues={reset}
        onSubmit={onSubmit}
        useFormProps={{
          defaultValues: initialValues,
        }}
      >
        {({ register, formState: { errors } }) => (
          <div className="space-y-5">
            {loginErr && (
              <Alert color="danger" message={loginErr} className="mb-[16px]" />
            )}
            <HydrationSafeInput>
              <Input
                type="email"
                size="lg"
                label="Email"
                placeholder="Enter your email"
                className="[&>label>span]:font-medium"
                inputClassName="text-sm"
                {...register("email")}
                error={errors.email?.message}
              />
            </HydrationSafeInput>
            <HydrationSafeInput>
              <Password
                label="Password"
                placeholder="Enter your password"
                size="lg"
                className="[&>label>span]:font-medium"
                inputClassName="text-sm"
                {...register("password")}
                error={errors.password?.message}
              />
            </HydrationSafeInput>
            <div className="flex items-center justify-between pb-2">
              <Checkbox
                {...register("rememberMe")}
                label="Remember Me"
                className="[&>label>span]:font-medium"
              />
              <Link
                href={`/${lang}${routes.forgotPassword}`}
                className="h-auto p-0 text-sm font-semibold text-blue underline transition-colors hover:text-gray-900 hover:no-underline"
              >
                Forget Password?
              </Link>
            </div>
            <Button className="w-full" type="submit" size="lg">
              {loading ? (
                <Loader variant="spinner" color="current" />
              ) : (
                <Fragment>
                  <span>Sign in</span>{" "}
                  <PiArrowRightBold className="ms-2 mt-0.5 h-5 w-5" />
                </Fragment>
              )}
            </Button>
          </div>
        )}
      </Form>
      <Text className="mt-6 text-center leading-loose text-gray-500 lg:mt-8 lg:text-start">
        Don&apos;t have an account?{" "}
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
