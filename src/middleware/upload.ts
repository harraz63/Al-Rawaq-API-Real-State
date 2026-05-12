import multer from "multer";

const storage = multer.memoryStorage(); // علشان نرفع الصورة من الذاكرة
export const upload = multer({ storage });

