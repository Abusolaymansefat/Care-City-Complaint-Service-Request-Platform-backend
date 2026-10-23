import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import {
	ICategoryQuery,
	ICreateCategoryPayload,
	IUpdateCategoryPayload,
} from "./categories.interface";

const createCategory = async (payload: ICreateCategoryPayload) => {
	const department = await prisma.department.findUnique({
		where: { id: payload.departmentId },
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	const existingCategory = await prisma.category.findFirst({
		where: {
			name: {
				equals: payload.name.trim(),
				mode: "insensitive",
			},
			departmentId: payload.departmentId,
		},
	});

	if (existingCategory) {
		throw new AppError(httpStatus.BAD_REQUEST, "Category already exists");
	}

	return prisma.category.create({
		data: {
			name: payload.name.trim(),
			description: payload.description?.trim(),
			slaHours: payload.slaHours ?? 72,
			departmentId: payload.departmentId,
		},
		include: {
			department: true,
		},
	});
};

const getCategories = async (query: ICategoryQuery) => {
	const limit = query.limit ?? 10;
	const page = query.page ?? 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";

	const where: any = {};

	if (query.searchTerm) {
		where.name = {
			contains: query.searchTerm,
			mode: "insensitive",
		};
	}

	if (query.departmentId) {
		where.departmentId = query.departmentId;
	}

	if (query.isActive !== undefined) {
		where.isActive = query.isActive;
	}

	const [categories, total] = await Promise.all([
		prisma.category.findMany({
			where,
			skip,
			take: limit,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: {
				department: true,
			},
		}),
		prisma.category.count({ where }),
	]);

	return {
		data: categories,
		meta: {
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getCategoryById = async (id: string) => {
	const category = await prisma.category.findUnique({
		where: { id },
		include: {
			department: true,
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
	const currentCategory = await prisma.category.findUnique({
		where: { id },
	});

	if (!currentCategory) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	if (payload.departmentId) {
		const department = await prisma.department.findUnique({
			where: { id: payload.departmentId },
		});

		if (!department) {
			throw new AppError(httpStatus.NOT_FOUND, "Department not found");
		}
	}

	const nextName = payload.name?.trim() ?? currentCategory.name;
	const nextDepartmentId = payload.departmentId ?? currentCategory.departmentId;

	if (payload.name !== undefined || payload.departmentId !== undefined) {
		const duplicate = await prisma.category.findFirst({
			where: {
				name: {
					equals: nextName,
					mode: "insensitive",
				},
				departmentId: nextDepartmentId,
				NOT: { id },
			},
		});

		if (duplicate) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Category already exists in this department",
			);
		}
	}

	return prisma.category.update({
		where: { id },
		data: {
			...(payload.name !== undefined && {
				name: payload.name.trim(),
			}),
			...(payload.description !== undefined && {
				description: payload.description?.trim() ?? null,
			}),
			...(payload.slaHours !== undefined && {
				slaHours: payload.slaHours,
			}),
			...(payload.departmentId !== undefined && {
				departmentId: payload.departmentId,
			}),
			...(payload.isActive !== undefined && {
				isActive: payload.isActive,
			}),
		},
		include: {
			department: true,
		},
	});
};

const deleteCategory = async (id: string) => {
	const category = await prisma.category.findUnique({
		where: { id },
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	return prisma.category.update({
		where: { id },
		data: { isActive: false },
	});
};

export const categoriesService = {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
