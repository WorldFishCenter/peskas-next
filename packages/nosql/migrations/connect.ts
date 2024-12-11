import fs from 'node:fs'
import mongoose from "mongoose";
import csv from 'csv-parser'

import {
  GroupModel,
  PermissionModel,
  UserModel,
} from "@repo/nosql/schema/auth";
import { BmuModel } from "@repo/nosql/schema/bmu";

const getModels = async () => {
  await mongoose.connect(
    process.env.MIGRATE_MONGO_URI ?? "mongodb://localhost/my-db",
  );
  return {
    mongoose,
    UserModel,
    PermissionModel,
    GroupModel,
    BmuModel,
  };
};

interface CsvRow {
  name: string;
  age: string;
  city: string;
}

export async function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const results: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: CsvRow) => {
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export default getModels;
