import { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import type { IUpdateUserPayload, IUserQuery } from "./user.interface";

const userSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	status: true,
	emailVerified: true,
	needPasswordChange: true,
	imageUrl: true,
	departmentId: true,
	createdAt: true,
	updatedAt: true,
	department: {
		select: {
			id: true,
			name: true,
		},
	},
} satisfies Prisma.UserSelect;

const getUsers = async (query: IUserQuery) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	const where: Prisma.UserWhereInput = {
		isDeleted: false,
		...(query.role && { role: query.role }),
		...(query.status && { status: query.status }),
		...(query.searchTerm && {
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		}),
	};

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			skip,
			take: limit,
			orderBy: { createdAt: "desc" },
			select: userSelect,
		}),
		prisma.user.count({ where }),
	]);

	return {
		data: users,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const updateUser = async (
	id: string,
	adminId: string,
	payload: IUpdateUserPayload,
) =>
	prisma.$transaction(
		async (tx) => {
			const currentUser = await tx.user.findFirst({
				where: { id, isDeleted: false },
				select: {
					id: true,
					role: true,
					status: true,
					departmentId: true,
				},
			});

			if (!currentUser) {
				throw new AppError(httpStatus.NOT_FOUND, "User not found");
			}

			if (
				id === adminId &&
				(payload.role !== undefined ||
					payload.status !== undefined ||
					payload.departmentId !== undefined)
			) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Administrators cannot change their own account access",
				);
			}

			const nextRole = payload.role ?? currentUser.role;
			const nextStatus = payload.status ?? currentUser.status;
			const requiresDepartment =
				nextRole === Role.TECHNICIAN || nextRole === Role.DEPARTMENT_OFFICER;
			const nextDepartmentId =
				payload.departmentId !== undefined
					? payload.departmentId
					: currentUser.departmentId;

			if (
				currentUser.role === Role.ADMIN &&
				currentUser.status === UserStatus.ACTIVE &&
				(nextRole !== Role.ADMIN || nextStatus !== UserStatus.ACTIVE)
			) {
				const activeAdminCount = await tx.user.count({
					where: {
						role: Role.ADMIN,
						status: UserStatus.ACTIVE,
						isDeleted: false,
					},
				});
				if (activeAdminCount <= 1) {
					throw new AppError(
						httpStatus.CONFLICT,
						"The last active administrator cannot be demoted or blocked",
					);
				}
			}

			if (requiresDepartment && !nextDepartmentId) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"Technicians and department officers must be assigned to a department",
				);
			}

			if (
				requiresDepartment &&
				(payload.departmentId !== undefined || payload.role !== undefined)
			) {
				const department = await tx.department.findFirst({
					where: { id: nextDepartmentId ?? undefined, isActive: true },
					select: { id: true },
				});
				if (!department) {
					throw new AppError(
						httpStatus.BAD_REQUEST,
						"Select an active department",
					);
				}
			}

			const data: Prisma.UserUpdateInput = {};
			if (payload.role !== undefined) data.role = payload.role;
			if (payload.status !== undefined) data.status = payload.status;

			if (requiresDepartment) {
				if (payload.departmentId !== undefined || payload.role !== undefined) {
					if (!nextDepartmentId) {
						throw new AppError(
							httpStatus.BAD_REQUEST,
							"Technicians and department officers must be assigned to a department",
						);
					}
					data.department = { connect: { id: nextDepartmentId } };
				}
			} else if (
				payload.departmentId !== undefined ||
				payload.role !== undefined
			) {
				data.department = { disconnect: true };
			}

			return tx.user.update({
				where: { id },
				data,
				select: userSelect,
			});
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);

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
	getUsers,
	updateUser,
	uploadProfileImage,
};
