import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nomeUtente: { type: String, required: true },
  cognomeUtente: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  address: { type: String },
  cap: { type: String },
  city: { type: String },
  profilePicture: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true },
});

export default mongoose.model("User", userSchema);