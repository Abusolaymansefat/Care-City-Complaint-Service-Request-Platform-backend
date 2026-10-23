import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import { ICreateDepartmentPayload } from "./departments.interface";

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

export const DepartmentsService = {
	createDepartment,
};
