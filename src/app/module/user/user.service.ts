import { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
	const currentUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			imagePublicId: true,
			imageUrl: true,
			isDeleted: true,
			status: true,
		},
	});

	if (!currentUser || currentUser.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (currentUser.status !== UserStatus.ACTIVE) {
		throw new AppError(403, "Your account is not active");
	}

	const cloudinaryResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},
					(error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(new Error("No result returned from Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(buffer);
		},
	);

	try {
		const updatedUser = await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				imageUrl: cloudinaryResult.secure_url,
				imagePublicId: cloudinaryResult.public_id,
			},
			omit: {
				password: true,
			},
		});

		if (currentUser.imagePublicId) {
			await cloudinary.uploader.destroy(currentUser.imagePublicId);
		}

		return updatedUser;
	} catch (error) {
		// Remove the newly uploaded image if the database update fails.
		await cloudinary.uploader
			.destroy(cloudinaryResult.public_id)
			.catch(() => undefined);

		throw error;
	}
};

export const UserService = {
	uploadProfileImage,
};
