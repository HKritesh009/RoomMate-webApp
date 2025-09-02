const mongoose = require("mongoose");

const Listing = require("../models/listing.js");
const initData = require("./data.js");

async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/wander");
}

main().then(()=>{
    console.log("db connected succesfully");
})
.catch((err)=>{
    console.log("error while connecting");
})


async function initialize(){

await Listing.deleteMany({});
await Listing.insertMany(initData.data);


await console.log("data was initialized");

}

initialize();