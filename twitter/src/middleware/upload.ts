import multer from "multer";
import path from "node:path";
import fs from "node:fs";


const uploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "posts"
);

if(!fs.existsSync(uploadDirectory)){
    fs.mkdirSync(uploadDirectory, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, files, cb) => {
        const extension = path.extname(files.originalname);

        const filename = `${Date.now()}-${Math.round(Math.random()* 1e9)}${extension}`;

        cb(null, filename);
    },

});


export const upload = multer({
    storage,
    limits: {fileSize: 50*1024*1024},

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",

            "video/mp4",
            "video/webm",
            "video/quicktime",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only images and videos are allowed"
                )
            );
        }

        cb(null, true);
    }
});