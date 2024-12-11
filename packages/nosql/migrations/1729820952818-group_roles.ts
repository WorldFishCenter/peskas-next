import get from 'lodash/get'
import replace from 'lodash/replace'
import split from 'lodash/split'
import uniq from 'lodash/uniq'
import isEmpty from 'lodash/isEmpty'
import values from 'lodash/values'
import Bluebird from 'bluebird'

import getModels, { readCsv } from "./connect";

export async function up (): Promise<void> {
  const { BmuModel, GroupModel, UserModel } = await getModels();
  const filePath = './migrations/kenya_BMUs-20241202.csv';
  const data = await readCsv(filePath);
  const password = "$2a$10$KSPht5iRaWqfWrdwQGQeBeGs9/qk2v0XBjqvldWGP7bKYE8TWPmAu"
  
  await Bluebird.map(
    data,
    async (row) => {
      const bmu = await BmuModel.findOneAndUpdate(
        {
          BMU: get(row, 'Study sites (BMUs)'),
        },
        {
          BMU: get(row, 'Study sites (BMUs)'),
          group: get(row, 'County (Group)'),
          lat: get(row, 'Latitude'),
          lng: get(row, 'Latitude'),
          treatments: split(get(row, 'Treatment'), ','),
        },
        {
          new: true,
          upsert: true,
          projection: { _id: 0, __v: 0 },
        }
      )
    },
    { concurrency: 3 },
  )

  await Bluebird.map(
    data,
    async (row) => {
      const userGroups = await GroupModel.find()
      userGroups
        .filter(userGroup => userGroup.name !== 'Admin')
        .map(async (userGroup) => {
          const name = replace(replace(`test+${userGroup.name}+${get(row, 'Study sites (BMUs)')}`, / /g, "+"), /-/g, "+")
          const bmu = await BmuModel.findOne({BMU: get(row, 'Study sites (BMUs)')}).lean()
          await UserModel.findOneAndUpdate({
              email: `${name}@mountaindev.com`,
            },
            {
              name: name,
              email: `${name}@mountaindev.com`,
              password: password,
              bmus: [
                bmu?._id
              ],
              groups: [
                userGroup._id
              ]
            },
            {
              new: true,
              upsert: true,
              projection: { _id: 0, __v: 0 },
            }
          )
        })      
      
    },
    { concurrency: 3 },
  )

  const users = await UserModel.find()
    .populate({ 
      path: 'groups',
      model: 'Group',
      match: { name: { $in: [ 'WBCIA', 'AIA' ] } }
    })
    .lean()

  await Bluebird.map(
    users
      .filter(user => !isEmpty(user.groups)),
    async (user) => {
      const bmu = await BmuModel.findOne({_id: { $in: user.bmus }}).lean()
      const bmus = await BmuModel.find({group: bmu?.group}).select('_id')
        .lean()
      await UserModel.findOneAndUpdate({
          _id: user._id,
        },
        {
          bmus:bmus.map(bmu => bmu._id),
        },
      )
    },
    { concurrency: 3 },
  )    

  const allBmus = await BmuModel.find().lean()
  const adminUsers = await UserModel.find({email: { $in: ['anthony@mountaindev.com', 'declan@mountaindev.com'] }})
  adminUsers.map(async (adminUser) => {
    await UserModel.findOneAndUpdate({
        _id: adminUser._id,
      },
      {
        bmus: allBmus.map(bmu => bmu._id),
      },
    )
  })
}

export async function down (): Promise<void> {
  const { BmuModel, GroupModel, UserModel } = await getModels();
  const filePath = './migrations/kenya_BMUs-20241202.csv';
  const data = await readCsv(filePath);
  const userGroups = await GroupModel.find()

  data.map(async (row) => {
    userGroups
      .filter(userGroup => userGroup.name !== 'Admin')
      .map(async (userGroup) => {
        const name = replace(replace(`test+${userGroup.name}+${get(row, 'Study sites (BMUs)')}`, / /g, "+"), /-/g, "+")
        await UserModel.deleteOne({ email: `${name}@mountaindev.com` })
      })
  })
  await BmuModel.deleteMany();
}