import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import {
	ICreateDepartmentPayload,
	IDepartmentQuery,
	IUpdateDepartmentPayload,
} from "./departments.interface";

const createDepartment = async (payload: ICreateDepartmentPayload) => {
	const name = payload.name.trim();

	if (!name) {
		throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
	}

	const existingDepartment = await prisma.department.findFirst({
		where: {
			name: {
				equals: name,
				mode: "insensitive",
			},
		},
	});

	if (existingDepartment) {
		throw new AppError(httpStatus.BAD_REQUEST, "Department already exists");
	}

	try {
		const newDepartment = await prisma.department.create({
			data: {
				name,
				description: payload.description?.trim() || null,
			},
		});

		return newDepartment;
	} catch (error) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Internal server error",
		);
	}
};

const getDepartments = async (query: IDepartmentQuery) => {
	const limit = query.limit ?? 10;
	const page = query.page ?? 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder = query.sortOrder ?? "desc";
	const where: Prisma.DepartmentWhereInput = query.searchTerm
		? {
				OR: [
					{ name: { contains: query.searchTerm, mode: "insensitive" } },
					{ description: { contains: query.searchTerm, mode: "insensitive" } },
				],
			}
		: {};

	const departments = await prisma.department.findMany({
		where,
		take: limit,
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
	});

	const totalCount = await prisma.department.count({
		where,
	});
	return {
		data: departments,
		meta: {
			page,
			limit,
			totalCount,
			totalPages: Math.ceil(totalCount / limit),
		},
	};
};

const getDepartmentById = async (id: string) => {
	const department = await prisma.department.findUnique({
		where: {
			id,
		},
	});

	if (!department) {
		throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	}

	return department;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
) => {
	const data: Prisma.DepartmentUpdateInput = {};

	if (payload.name !== undefined) {
		const name = payload.name.trim();
		if (!name) {
			throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
		}

		const existingDepartment = await prisma.department.findFirst({
			where: {
				id: { not: id },
				name: {
					equals: name,
					mode: "insensitive",
				},
			},
		});

		if (existingDepartment) {
			throw new AppError(httpStatus.BAD_REQUEST, "Department already exists");
		}

		data.name = name;
	}

	if (payload.description !== undefined) {
		data.description = payload.description.trim() || null;
	}

	try {
		const updatedDepartment = await prisma.department.update({
			where: { id },
			data,
		});

		return updatedDepartment;
	} catch (error) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Internal server error",
		);
	}
};

const deleteDepartment = async (id: string) => {
	try {
		const deletedDepartment = await prisma.department.delete({
			where: {
				id,
			},
		});

		return deletedDepartment;
	} catch (error) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Internal server error",
		);
	}
};

export const DepartmentsService = {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
