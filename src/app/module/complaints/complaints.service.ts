import httpStatus from "http-status";
import {
	ComplaintStatus,
	Prisma,
	Role,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import {
	IComplaintQuery,
	ICreateComplaintPayload,
	IUpdateComplaintPayload,
	IUpdateComplaintStatusPayload,
} from "./complaints.interface";

const complaintInclude = {
	category: {
		select: {
			id: true,
			name: true,
			slaHours: true,
		},
	},
	department: {
		select: {
			id: true,
			name: true,
		},
	},
	citizen: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	updates: {
		orderBy: {
			createdAt: "desc" as const,
		},
		include: {
			updater: {
				select: {
					id: true,
					name: true,
					role: true,
				},
			},
		},
	},
};

const createComplaint = async (
	citizenId: string,
	payload: ICreateComplaintPayload,
) => {
	const categorie = await prisma.category.findUnique({
		where: { id: payload.categoryId },
		include: { department: true },
	});

	if (!categorie) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	if (!categorie.department) {
		throw new AppError(httpStatus.BAD_REQUEST, "Category department not found");
	}

	if (!categorie.department.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Category department is not active",
		);
	}

	const slaDueAt = new Date(Date.now() + categorie.slaHours * 60 * 60 * 1000);

	return prisma.complaint.create({
		data: {
			title: payload.title.trim(),
			description: payload.description.trim(),
			address: payload.address.trim(),
			latitude: payload.latitude,
			longitude: payload.longitude,
			citizenId,
			categoryId: categorie.id,
			departmentId: categorie.departmentId,
			slaDueAt,
		},
		include: complaintInclude,
	});
};

const getMyComplaints = async (citizenId: string, query: IComplaintQuery) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";

	const where: Prisma.ComplaintWhereInput = {
		citizenId,
		categoryId: query.categoryId,
		departmentId: query.departmentId,
		status: query.status,
		priority: query.priority ?? undefined,
		...(query.searchTerm && {
			OR: [
				{ title: { contains: query.searchTerm, mode: "insensitive" } },
				{ description: { contains: query.searchTerm, mode: "insensitive" } },
				{ address: { contains: query.searchTerm, mode: "insensitive" } },
				{ trackingCode: { contains: query.searchTerm, mode: "insensitive" } },
			],
		}),
	};

	const [complaints, total] = await Promise.all([
		prisma.complaint.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: complaintInclude,
		}),
		prisma.complaint.count({ where }),
	]);

	return {
		data: complaints,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getComplaints = async (
	query: IComplaintQuery,
	role: Role,
	userId: string,
	departmentId?: string | null,
) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";
	const conditions: Prisma.ComplaintWhereInput[] = [];

	if (query.searchTerm) {
		conditions.push({
			OR: [
				{ title: { contains: query.searchTerm, mode: "insensitive" } },
				{ description: { contains: query.searchTerm, mode: "insensitive" } },
				{ address: { contains: query.searchTerm, mode: "insensitive" } },
				{ trackingCode: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	if (query.categoryId) conditions.push({ categoryId: query.categoryId });
	if (query.departmentId) {
		conditions.push({ departmentId: query.departmentId });
	}
	if (query.status) conditions.push({ status: query.status });
	if (query.priority) conditions.push({ priority: query.priority });

	if (role === Role.CITIZEN) {
		conditions.push({ citizenId: userId });
	} else if (role === Role.DEPARTMENT_OFFICER || role === Role.TECHNICIAN) {
		if (!departmentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Your account is not assigned to a department",
			);
		}
		conditions.push({ departmentId });
	}

	const where: Prisma.ComplaintWhereInput = { AND: conditions };

	const [complaints, total] = await Promise.all([
		prisma.complaint.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: complaintInclude,
		}),
		prisma.complaint.count({ where }),
	]);

	return {
		data: complaints,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getComplaintById = async (id: string, userId: string, role: Role) => {
	const complaint = await prisma.complaint.findUnique({
		where: { id },
		include: complaintInclude,
	});

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	const isAdmin = role === Role.ADMIN;
	const isCitizenOwner =
		role === Role.CITIZEN && complaint.citizenId === userId;
	const isDepartmentOfficer =
		role === Role.DEPARTMENT_OFFICER && complaint.departmentId === userId;

	if (!isAdmin && !isCitizenOwner && !isDepartmentOfficer) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this complaint",
		);
	}

	if (complaint.status === ComplaintStatus.CLOSED) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this complaint",
		);
	}

	return complaint;
};

const updateComplaint = async (
	id: string,
	citizenId: string,
	payload: IUpdateComplaintPayload,
) => {
	const complaint = await prisma.complaint.findUnique({
		where: { id },
	});

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	if (complaint.citizenId !== citizenId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to update this complaint",
		);
	}

	if (complaint.status !== ComplaintStatus.SUBMITTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Complaint status must be submitted",
		);
	}

	const data: Prisma.ComplaintUncheckedUpdateInput = {
		...(payload.title !== undefined && { title: payload.title.trim() }),
		...(payload.description !== undefined && {
			description: payload.description.trim(),
		}),
		...(payload.address !== undefined && { address: payload.address.trim() }),
		...(payload.latitude !== undefined && { latitude: payload.latitude }),
		...(payload.longitude !== undefined && { longitude: payload.longitude }),
	};

	if (payload.categoryId) {
		const category = await prisma.category.findUnique({
			where: { id: payload.categoryId },
			include: { department: true },
		});

		if (!category || !category.isActive || !category.department.isActive) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Category not found or is not active",
			);
		}

		data.categoryId = category.id;
		data.departmentId = category.departmentId;
		data.slaDueAt = new Date(Date.now() + category.slaHours * 60 * 60 * 1000);
	}

	return prisma.complaint.update({
		where: { id },
		data,
		include: complaintInclude,
	});
};

const updateComplaintStatus = async (
	id: string,
	updaterId: string,
	role: Role,
	payload: IUpdateComplaintStatusPayload,
) => {
	if (
		role !== Role.ADMIN &&
		role !== Role.DEPARTMENT_OFFICER &&
		role !== Role.TECHNICIAN
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to update this complaint",
		);
	}

	const complaint = await prisma.complaint.findUnique({
		where: { id },
	});

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	if (role !== Role.ADMIN) {
		const updater = await prisma.user.findUnique({
			where: { id: updaterId },
			select: { departmentId: true },
		});

		if (
			!updater?.departmentId ||
			complaint.departmentId !== updater.departmentId
		) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to update this complaint",
			);
		}
	}

	if (
		complaint.status === ComplaintStatus.CLOSED ||
		complaint.status === ComplaintStatus.CANCELLED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Complaint status cannot be changed",
		);
	}

	const isResolved = payload.status === ComplaintStatus.RESOLVED;

	return prisma.$transaction(async (tx) => {
		const updatedComplaint = await tx.complaint.update({
			where: { id },
			data: {
				status: payload.status,
				...(isResolved && { resolvedAt: new Date() }),
				...(payload.status === ComplaintStatus.REOPENED && {
					resolvedAt: null,
				}),
			},
			include: complaintInclude,
		});

		await tx.complaintUpdate.create({
			data: {
				complaintId: id,
				status: payload.status,
				comment: payload.comment,
				createdBy: updaterId,
			},
		});

		return updatedComplaint;
	});
};

export const complaintsService = {
	createComplaint,
	getMyComplaints,
	getComplaints,
	getComplaintById,
	updateComplaint,
	updateComplaintStatus,
};
