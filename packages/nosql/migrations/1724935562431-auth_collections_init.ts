import find from "lodash/find";
import mongoose from "mongoose";

import getModels from "./connect";

export async function up(): Promise<void> {
  const { UserModel, PermissionModel, GroupModel } = await getModels();

  const id1 = new mongoose.Types.ObjectId();
  const user1 = await UserModel.create({
    _id: id1,
    id: id1.toString(),
    name: "tontest",
    email: "anthony@mountaindev.com",
    password: "$2a$10$KSPht5iRaWqfWrdwQGQeBeGs9/qk2v0XBjqvldWGP7bKYE8TWPmAu",
  });

  const user2 = await UserModel.findOne({ email: "tonpascual@gmail.com" });
  const id3 = new mongoose.Types.ObjectId();
  const _user3 = await UserModel.create({
    _id: id3,
    id: id3,
    name: "declan",
    email: "declan@mountaindev.com",
    password: "$2a$12$JTZ/EFwL9wikzJD5ggFpy.9GEDC6CWE43VxVxyDxednGiWHfGYS/C",
  });

  const groups = await GroupModel.insertMany([
    { name: "Admin" },
    { name: "Control" },
    { name: "IIA" },
    { name: "CIA" },
    { name: "WBCIA" },
    { name: "AIA" },
  ]);

  const permissions = await PermissionModel.insertMany([
    {
      name: "Admin Permission",
      domain: [
        {
          country: "",
          resource: "catch",
          actions: ['create', 'read', 'update', 'delete'],
        },
        {
          country: "",
          resource: "gear",
          actions: ['create', 'read', 'update', 'delete'],
        },
        {
          country: "",
          resource: "map",
          actions: ['create', 'read', 'update', 'delete'],
        },       
        {
          country: "",
          resource: "stats",
          actions: ['create', 'read', 'update', 'delete'],
        },                
      ],
    },
    {
      name: "Control Permission",
      domain: [],
    },
    {
      name: "IIA",
      domain: [
        {
          country: "",
          resource: "catch",
          actions: ['read'],
        },
        {
          country: "",
          resource: "gear",
          actions: ['read'],
        },
        {
          country: "",
          resource: "map",
          actions: ['read'],
        },       
        {
          country: "",
          resource: "stats",
          actions: ['read'],
        },    
      ],
    },
    {
      name: "CIA Permission",
      domain: [
        {
          country: "",
          resource: "catch",
          actions: ['read'],
        },
        {
          country: "",
          resource: "gear",
          actions: ['read'],
        },
        {
          country: "",
          resource: "map",
          actions: ['read'],
        },       
        {
          country: "",
          resource: "stats",
          actions: ['read'],
        }, 
      ],
    },
    {
      name: "WBCIA Permission",
      domain: [
        {
          country: "",
          resource: "catch",
          actions: ['read'],
        },
        {
          country: "",
          resource: "gear",
          actions: ['read'],
        },
        {
          country: "",
          resource: "map",
          actions: ['read'],
        },       
        {
          country: "",
          resource: "stats",
          actions: ['read'],
        }, 
      ],
    },
    {
      name: "AIA Permission",
      domain: [
        {
          country: "",
          resource: "catch",
          actions: ['read'],
        },
        {
          country: "",
          resource: "gear",
          actions: ['read'],
        },
        {
          country: "",
          resource: "map",
          actions: ['read'],
        },       
        {
          country: "",
          resource: "stats",
          actions: ['read'],
        }, 
      ],
    },
  ]);

  const adminPerm = find(permissions, { name: "Admin Permission" });
  const controlPerm = find(permissions, { name: "Control  Permission" });
  const iiaPerm = find(permissions, { name: "IIA Permission" });
  const ciaPerm = find(permissions, { name: "CIA Permission" });
  const wbciaPerm = find(permissions, { name: "WBCIA Permission" });
  const aiaPerm = find(permissions, { name: "AIA Permission" });

  const adminGroup = find(groups, { name: "Admin" });
  const controlGroup = find(groups, { name: "Control" });
  const iiaGroup = find(groups, { name: "IIA" });
  const ciaGroup = find(groups, { name: "CIA" });
  const wbciaGroup = find(groups, { name: "WBCIA" });
  const aiaGroup = find(groups, { name: "AIA" });

  await UserModel.findByIdAndUpdate(user1._id, {
    groups: [controlGroup?._id, iiaGroup?._id],
  });
  await UserModel.findByIdAndUpdate(user2?._id, { groups: [adminGroup?._id] });

  await GroupModel.findByIdAndUpdate(adminGroup?._id, {
    permission_id: adminPerm?._id,
  });
  await GroupModel.findByIdAndUpdate(controlGroup?._id, {
    permission_id: controlPerm?._id,
  });
  await GroupModel.findByIdAndUpdate(iiaGroup?._id, {
    permission_id: iiaPerm?._id,
  });
  await GroupModel.findByIdAndUpdate(ciaGroup?._id, {
    permission_id: ciaPerm?._id,
  });
  await GroupModel.findByIdAndUpdate(wbciaGroup?._id, {
    permission_id: wbciaPerm?._id,
  });
  await GroupModel.findByIdAndUpdate(aiaGroup?._id, {
    permission_id: aiaPerm?._id,
  });

  await PermissionModel.findByIdAndUpdate(adminPerm?._id, {
    group_id: adminGroup?._id,
  });
  await PermissionModel.findByIdAndUpdate(controlPerm?._id, {
    group_id: controlGroup?._id,
  });
  await PermissionModel.findByIdAndUpdate(iiaPerm?._id, {
    group_id: iiaGroup?._id,
  });
  await PermissionModel.findByIdAndUpdate(ciaPerm?._id, {
    group_id: ciaGroup?._id,
  });
  await PermissionModel.findByIdAndUpdate(wbciaPerm?._id, {
    group_id: wbciaGroup?._id,
  });
  await PermissionModel.findByIdAndUpdate(aiaPerm?._id, {
    group_id: aiaGroup?._id,
  });
}

export async function down(): Promise<void> {
  const { UserModel, PermissionModel, GroupModel } = await getModels();
  await UserModel.deleteMany();
  await PermissionModel.deleteMany();
  await GroupModel.deleteMany();
}
