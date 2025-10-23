import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  accessCode: { type: String, unique: true },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["Admin", "Member", "Creator"], default: "Member" },
    },
  ],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  chat: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  telegramCode: { type: String, default: null },
  telegramChatId: { type: String, default: null },
  telegramChatTitle: { type: String, default: null },
  telegramInviteLink: { type: String },
});

teamSchema.statics.generateAccessCode = function () {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

teamSchema.statics.generateTelegramCode = function () {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};


teamSchema.pre("save", function (next) {
  if (!this.telegramCode) {
    this.telegramCode = mongoose.model("Team").generateTelegramCode();
  }
  next();
});
export default mongoose.model("Team", teamSchema);
