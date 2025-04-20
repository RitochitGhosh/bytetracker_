const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONNECTION_URL);
    } catch (err) {
        console.error("Faileds to connect with mongodb!");
        process.exit(1);
    }
}

module.exports = connectDB;