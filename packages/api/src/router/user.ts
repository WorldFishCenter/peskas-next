import bcryptjs from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";

import type { TPermission } from "@repo/nosql/schema/auth";
import { BmuModel, GroupModel, UserModel } from "@repo/nosql/schema/auth";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const EXCLUDED_BMUS = ["Ngomeni"];

/**
 * We need to duplicate the validators here.
 * Since it will create a cyclic dependency in apps/isomorphic-i18n/src/validators/user.schema.ts
 */
export const UpsertUserSchema = z.object({
  _id: z
    .string()
    .refine((val) => {
      return mongoose.Types.ObjectId.isValid(val);
    })
    .optional(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.string().min(1),
  status: z.string().min(1),
  bmuNames: z.string().array(),
});

export const userRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    const users = await UserModel.find({}, { password: 0 })
      .populate([
        {
          path: "groups",
          populate: {
            path: "permission_id",
            model: "Permission",
            select: { name: true, domain: true },
          },
        },
        {
          path: "bmus",
          select: { BMU: true, group: true },
        },
      ])
      .lean();

    /**
     * Transform all ObjectId to string to avoid RSC warnings.
     */
    return users.map((user) => ({
      ...user,
      _id: user._id.toString(),
      groups: user.groups.map((group) => ({
        ...group,
        _id: group._id.toString(),
        ...(group.permission_id && {
          permission_id: {
            ...group.permission_id,
            _id: group.permission_id._id.toString(),
            domain: (group.permission_id as unknown as TPermission)?.domain.map(
              (dom) => ({
                ...dom,
                _id: dom._id.toString(),
              })
            ),
          },
        }),
      })),
      bmus: user.bmus.map((bmu) => ({
        ...bmu,
        _id: bmu._id.toString(),
      })),
    }));
  }),
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await UserModel.findById(input.id)
        .select({ password: 0 })
        .populate([
          {
            path: "groups",
            populate: {
              path: "permission_id",
              model: "Permission",
            },
          },
          {
            path: "bmus",
            select: { BMU: true, group: true },
          },
        ])
        .lean();

      return {
        ...user,
        role: user?.groups[0].name,
      };
    }),
  allBmus: publicProcedure.query(async () => {
    const bmus = await BmuModel.find({});
    return bmus.filter((bmu) => !EXCLUDED_BMUS.includes(bmu.BMU));
  }),
  upsert: protectedProcedure
    .input(UpsertUserSchema)
    .mutation(async ({ input }) => {
      const userGroup = await GroupModel.findOne({ name: input.role });
      const bmuGroups = await BmuModel.find({
        BMU: { $in: input.bmuNames },
      });
      const findOne = input._id ? { _id: input._id } : { email: input.email };
      const _user = await UserModel.findOneAndUpdate(
        findOne,
        {
          name: input.name,
          email: input.email,
          password: input.password
            ? await bcryptjs.hash(input.password, 12)
            : undefined,
          status: input.status,
          groups: [userGroup?._id],
          bmus: bmuGroups.map((bmu) => bmu._id),
        },
        { new: true, upsert: true }
      );
    }),
});
