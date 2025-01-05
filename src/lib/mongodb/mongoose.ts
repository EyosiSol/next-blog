import mongoose from "mongoose";

let initialized = false;

const monoDbURI = process.env.MONGODB_URI!;

export const connect = async () => {
  mongoose.set("strictQuery", true);

  if (initialized) {
    console.log("Already Connected to MongoDb ");

    return;
  }

  try {
    await mongoose.connect(monoDbURI, {
      dbName: "next-blog",
    });
    console.log("Connected to Db");
    initialized = true;
  } catch (error) {
    console.log("Error Connecting to MongDB:", error);
  }
};
