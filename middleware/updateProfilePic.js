import multer from "multer";

// Salva temporaneamente il file in memoria per poterlo salvare su MongoDB
const storage = multer.memoryStorage();

const uploadProfilePic = multer({ storage });

export default uploadProfilePic;
