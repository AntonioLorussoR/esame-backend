import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  uploader: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Material", materialSchema);
