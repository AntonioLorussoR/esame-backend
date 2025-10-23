import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true, },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, },
  date: { type: Date, default: Date.now, }
}, { _id: true });

export default mongoose.model("Post", postSchema);
