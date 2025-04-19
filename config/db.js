const mongoose = require("mongoose");

const connectDB = async (url) => {
    try {
        await mongoose.connect(url);
    } catch (err) {
        console.error("Faileds to connect with mongodb!");
        process.exit(1);
    }
}

module.exports = connectDB;