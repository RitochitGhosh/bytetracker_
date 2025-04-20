const express = require("express");
require("dotenv").config();

const app = express();

const connectDB = require("./config/db");
const { requestLogger }= require("./middleware/requesLogger");
const userRouter = require("./routes/user-routes");

// Connect to database
connectDB().then(() => console.log("MongoDB connected..."));

// middlewares
app.use(express.json());
app.use(requestLogger("./log.txt"));

// Routes
app.use("/api/", userRouter);


app.listen(process.env.PORT || 8080, () => console.log(`Server listening on ${process.env.PORT}`));