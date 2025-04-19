const express = require("express");

const app = express();
const PORT = 8080;

const connectDB = require("./config/db");
const { requestLogger }= require("./middleware/requesLogger");
const userRouter = require("./routes/user-routes");

// Connect to database
connectDB("mongodb://127.0.0.1:27017/bytetracker_database").then(() => console.log("MongoDB connected..."));

// middlewares
app.use(express.json());
app.use(requestLogger("./log.txt"));

// Routes
app.use("/api/", userRouter);


app.listen(PORT, () => console.log(`Server listening on ${PORT}`));