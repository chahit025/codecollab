import mongoose from "mongoose";
import dotenv from "dotenv";  
dotenv.config();

function connect () {
  mongoose.connect(process.env.CONNECTION_STRING).then(() => {
    console.log("Connected to the database");
  }).catch((error) => {
    console.log("Error connecting to the database: ", error);
  });
}

export default connect;