

const Listing = require("../models/listing.js");
const initData = require("./data.js");

require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
}

main()
    .then(() => {
        console.log("Database connected successfully");
    })
    .catch((err) => {
        console.error("Error occurred while connecting to DB:", err);
    });



async function initialize(){

await Listing.deleteMany({});
await Listing.insertMany(initData.data);


await console.log("data was initialized");

}

initialize();