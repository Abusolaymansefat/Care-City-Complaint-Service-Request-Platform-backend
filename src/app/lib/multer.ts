import httpStatus from "http-status";
import multer from "multer";
import { AppError } from "../utils/appError";

const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });

const complaintMediaUpload = multer({
	storage,
	limits: {
		fileSize: 20 * 1024 * 1024,
		files: 7,
	},
	fileFilter: (_req, file, callback) => {
		if (
			![
				"image/jpeg",
				"image/png",
				"image/webp",
				"video/mp4",
				"video/webm",
				"video/quicktime",
			].includes(file.mimetype)
		) {
			callback(
				new AppError(
					httpStatus.BAD_REQUEST,
					"Complaint attachments must be JPEG, PNG, WebP, MP4, WebM, or QuickTime files",
				),
			);
			return;
		}

		callback(null, true);
	},
});

export const uploadComplaintMedia = complaintMediaUpload.array("media", 7);
