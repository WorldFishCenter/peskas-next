import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import get from 'lodash/get';
import pick from 'lodash/pick';
import bcryptjs from "bcryptjs";

import getDb from "@repo/nosql";
import { UserModel } from "@repo/nosql/schema/auth";
import { loginSchema } from '@/validators/login.schema';
import { env } from '@/env.mjs';
import InvalidPayloadError from "@/app/shared/error/InvalidPayloadError";
import UserNotFoundError from "@/app/shared/error/UserNotFoundError";
import { MDMongooseAdapter } from "./mongoose-adapter";

export const authOptions: NextAuthOptions = {
  adapter: MDMongooseAdapter(),
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.maxAge = get(user, 'maxAge')
        token.groups = get(user, 'groups')
        token.bmus = get(user, 'bmus')
      }
      return token;
    },
    async session({ session, token }) {
      const expiry = get(token, 'maxAge')
        ? {
            maxAge: token.maxAge as number,
            expires: new Date(Date.now() + ((token.maxAge as number) * 1000)).toISOString(),
          }
        : {}

      return {
        ...session,
        ...expiry,
        user: {
          ...session.user,
          id: token.id as string | undefined,
          email: token.email,
          groups: token.groups,
          bmus: token.bmus,
        },
      };
    },
    async redirect({ baseUrl }) {
      return baseUrl
    },
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {},
      async authorize(credentials) {
        const rememberMe = get(credentials, 'rememberMe') === 'true'
        const parsedCredentials =
          loginSchema.safeParse({
            ...credentials,
            rememberMe
          })

        if (parsedCredentials.success) {          
          const { email, password } = parsedCredentials.data
          await getDb()
          const user = await UserModel.findOne({ email: email })
            .populate([
              { 
                path: 'groups',
                populate: {
                  path: 'permission_id',
                  model: 'Permission'
                } 
              },
              {
                path: 'bmus',
                select: { 'BMU': true, 'group': true },
              }
            ])
            .lean()
          if (!user) throw new UserNotFoundError()

          const passwordsMatch = !user.password
            ? false
            : await bcryptjs.compare(password, user.password);

          if (passwordsMatch) {
            /**
             * If remember me is enabled, maxAge is 1 month.
             * Otherwise 1 day only.
             */ 
            const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
            return {
              ...pick(user, ['id', 'email', 'groups', 'bmus']),
              maxAge
            }
          }
        }
        throw new InvalidPayloadError()
      },
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
};
