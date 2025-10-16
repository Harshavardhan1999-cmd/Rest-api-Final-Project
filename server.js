require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const geolib = require("geolib");

const app = express();

// ✅ CORS setup
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ✅ Schema & Model
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  landmark: { type: String },
  zipCode: { type: String },
});

const Location = mongoose.model("Location", locationSchema);

// ✅ API ROUTES (these must come before static serving)
app.post("/api/add-location", async (req, res) => {
  try {
    const { name, latitude, longitude, landmark, zipCode } = req.body;
    const existingLocation = await Location.findOne({ name });
    if (existingLocation) {
      return res.status(400).json({ message: "⚠️ Location with this name already exists." });
    }
    const newLocation = new Location({ name, latitude, longitude, landmark, zipCode });
    await newLocation.save();
    res.status(201).json({ message: "✅ Location added successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
});

app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.status(200).json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
});

app.get("/api/search-location", async (req, res) => {
  try {
    const { name } = req.query;
    const location = await Location.findOne({ name });
    if (!location) {
      return res.status(404).json({ message: "⚠️ Location not found" });
    }
    res.status(200).json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
});

app.post("/api/distance", async (req, res) => {
  try {
    const { location1, location2 } = req.body;
    const loc1 = await Location.findOne({ name: location1.toLowerCase() });
    const loc2 = await Location.findOne({ name: location2.toLowerCase() });
    if (!loc1 || !loc2) {
      return res.status(404).json({ message: "⚠️ One or both locations not found" });
    }

    const distanceInMeters = geolib.getDistance(
      { latitude: loc1.latitude, longitude: loc1.longitude },
      { latitude: loc2.latitude, longitude: loc2.longitude }
    );
    const distanceInMiles = geolib.convertDistance(distanceInMeters, "mi");

    res.status(200).json({
      from: { name: loc1.name, landmark: loc1.landmark || "N/A", zipCode: loc1.zipCode || "N/A" },
      to: { name: loc2.name, landmark: loc2.landmark || "N/A", zipCode: loc2.zipCode || "N/A" },
      distance: `${distanceInMiles.toFixed(2)} miles`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
});

// ✅ Only after all APIs — serve the frontend
app.use(express.static(path.join(__dirname, "my-globe-app/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "my-globe-app/dist/index.html"));
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
