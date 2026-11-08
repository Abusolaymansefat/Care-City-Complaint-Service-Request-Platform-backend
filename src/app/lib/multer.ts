import httpStatus from "http-status";
import multer from "multer";
import { AppError } from "../utils/appError";

const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });

const complaintImagesUpload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024,
		files: 5,
	},
	fileFilter: (_req, file, callback) => {
		if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
			callback(
				new AppError(
					httpStatus.BAD_REQUEST,
					"Complaint images must be JPEG, PNG, or WebP files",
				),
			);
			return;
		}

		callback(null, true);
	},
});

export const uploadComplaintImages = complaintImagesUpload.array("images", 5);
