// require('dotenv').config({ path: './env' });  // Older syntax

import express from 'express';
import dotenv from 'dotenv';
import connectDB from "./db/index.js";
const app = express();

// Second approach ==> Modularity

// Recently introduced thing

dotenv.config({
  path: './env'
});

// For this to work ==> Modify package.json like this ==>     "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js"
// This means you environment variable will be loaded as soon as the application runs.
// This is working fine

connectDB();












/*

This code is also fine but kind of messed up, because everything you got here

import mongoose from "mongoose";
import { DB_NAME } from './constants';

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    app.on('error', (error) => {
      console.log('Error', error);
      throw error;
    })

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    })
  }
  catch (error) {
    console.log("Error", error);
    throw error;
  }
})()

*/
