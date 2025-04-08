import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Import routes
import testRoute from "./routes/test.route.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Use the routes
app.use("/api/v1/test", testRoute);

export default app;
