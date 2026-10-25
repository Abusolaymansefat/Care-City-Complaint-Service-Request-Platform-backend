import httpStatus from "http-status";
import { Prisma, Role } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import {
	IComplaintQuery,
	ICreateComplaintPayload,
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

export const complaintsService = {
	createComplaint,
	getMyComplaints,
	getComplaints,
};
