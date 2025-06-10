import mongoose, { Schema, Types } from "mongoose";
import type { TBmu } from "./bmu"

export { BmuModel } from "./bmu"

export type TUser = {
  _id: Types.ObjectId;
  id: string;
  name: string;
  email: string;
  password?: string;
  emailVerified: Date;
  image: string;
  roleId: Types.ObjectId;
  groups: TGroup[];
  bmus: TBmu[];
  userBmu?: TBmu;
  fisherId?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type TAccount = {
  userId: Types.ObjectId;
  type: string;
  provider: string;
  providerAccountId: string;
  expires_at: Date;
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export type TSession = {
  sessionToken: string;
  userId: Types.ObjectId;
  expires: Date;
};

export type TVerificationToken = {
  identifier: string;
  expires: Date;
  token: string;
};

export type TGroup = {
  _id: Types.ObjectId;
  name: string;
  permission_id: Types.ObjectId;
};

export const PERMISSION_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
] as const;

export type TAction = (typeof PERMISSION_ACTIONS)[number];

export type TPermission = {
  _id: Types.ObjectId;
  name: string;
  domain: {
    _id: Types.ObjectId;
    country: string;
    resource: string;
    actions: TAction[];
  }[];
  group_id: Types.ObjectId;
};

/**
 * Schemas
 */
const userSchema = new Schema<TUser>({
  id: String,
  name: String,
  email: String,
  password: { type: String, required: false },
  emailVerified: Date,
  image: String,
  groups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
  bmus: [{ type: Schema.Types.ObjectId, ref: "Bmu" }],
  userBmu: { type: Schema.Types.ObjectId, ref: "Bmu", required: false },
  fisherId: { type: String, required: false },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});

const accountSchema = new Schema<TAccount>({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  type: String,
  provider: String,
  providerAccountId: String,
  access_token: String,
  expires_at: Date,
  expires_in: Number,
  refresh_token: String,
  scope: String,
});

const sessionSchema = new Schema<TSession>({
  sessionToken: String,
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  expires: Date,
});

const verificationTokenSchema = new Schema<TVerificationToken>(
  {
    identifier: String,
    expires: Date,
    token: String,
  },
  {
    collection: "verification_tokens",
  },
);

const groupSchema = new Schema<TGroup>({
  name: String,
  permission_id: { type: Schema.Types.ObjectId, ref: "Permission" },  
});

const permissionSchema = new Schema<TPermission>({
  name: String,
  domain: [
    {
      country: String,
      resource: String,
      actions: [{ type: String, enum: PERMISSION_ACTIONS }],
    },
  ],
  group_id: { type: Schema.Types.ObjectId, ref: "Group" },
});

/**
 * Models
 */
export const AccountModel =
  (mongoose.models.Account as mongoose.Model<TAccount>) ??
  mongoose.model<TAccount>("Account", accountSchema);

export const SessionModel =
  (mongoose.models.Session as mongoose.Model<TSession>) ??
  mongoose.model<TSession>("Session", sessionSchema);

export const UserModel =
  (mongoose.models.User as mongoose.Model<TUser>) ??
  mongoose.model<TUser>("User", userSchema);

export const VerificationTokenModel =
  (mongoose.models.VerificationToken as mongoose.Model<TVerificationToken>) ??
  mongoose.model<TVerificationToken>(
    "VerificationToken",
    verificationTokenSchema,
  );

export const PermissionModel =
  (mongoose.models.Permission as mongoose.Model<TPermission>) ??
  mongoose.model<TPermission>("Permission", permissionSchema);

export const GroupModel =
  (mongoose.models.Group as mongoose.Model<TGroup>) ??
  mongoose.model<TGroup>("Group", groupSchema);
