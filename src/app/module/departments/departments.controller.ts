import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DepartmentsService } from "./departments.service";
import { DepartmentsValidation } from "./departments.validation";

const getDepartmentId = (req: Request) => {
	const result = DepartmentsValidation.departmentIdParamSchema.safeParse(
		req.params,
	);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid department ID",
		);
	}

	return result.data.id;
};

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentsService.createDepartment(req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department created successfully",
		data: result,
	});
});

const getDepartments = catchAsync(async (req: Request, res: Response) => {
	const queryResult = DepartmentsValidation.departmentQuerySchema.safeParse(
		req.query,
	);

	if (!queryResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			queryResult.error.issues[0]?.message ?? "Invalid query parameters",
		);
	}

	const result = await DepartmentsService.getDepartments(queryResult.data);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Departments retrieved successfully",
		data: result.data,
		meta: {
			page: result.meta.page,
			limit: result.meta.limit,
			total: result.meta.totalCount,
			totalPages: result.meta.totalPages,
		},
	});
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentsService.getDepartmentById(
		getDepartmentId(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department retrieved successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentsService.updateDepartment(
		getDepartmentId(req),
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department updated successfully",
		data: result,
	});
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentsService.deleteDepartment(
		getDepartmentId(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department deleted successfully",
		data: result,
	});
});

export const DepartmentsController = {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	deleteDepartment,
};
