import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import { TPermission, TGroup } from "@repo/nosql/schema/auth"
import { TBmu } from "@repo/nosql/schema/bmu"

type SerializedBmu = {
  _id: string;
  BMU: string;
  group: string;
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 * Need separate declaration in @acme/nextjs and @acme/auth
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user:
      | (DefaultSession["user"] & {
          groups: TGroup[];
          bmus: TBmu[];
          userBmu?: SerializedBmu;
          fisherId?: string;
        })
      | undefined;
  }
  interface JWT extends DefaultJWT {
    signinunixsecondsepoch: number;
    fisherId?: string;
  }
  interface User {
    maxAge: number;
    groups: TGroup[];
    bmus: TBmu[];
    userBmu?: SerializedBmu;
    fisherId?: string;
  }
}

