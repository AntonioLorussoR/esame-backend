import multer from "multer";
import path from "path";

const storage = multer.memoryStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profilePics");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user.id}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadProfilePic = multer({ storage });

export default uploadProfilePic;
