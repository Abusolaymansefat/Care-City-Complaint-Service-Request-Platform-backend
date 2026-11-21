import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";
import { UserValidation } from "./user.validation";

const getUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.getUsers(
		UserValidation.userQuerySchema.parse(req.query),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getDepartmentOfficerId = (req: Request) => {
	const officerId = req.user?.userId;
	if (!officerId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}
	return officerId;
};

const getDepartmentTechnicians = catchAsync(
	async (req: Request, res: Response) => {
		const result = await UserService.getDepartmentTechnicians(
			getDepartmentOfficerId(req),
			UserValidation.departmentTechniciansQuerySchema.parse(req.query),
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department technicians retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getDepartmentTechnician = catchAsync(
	async (req: Request, res: Response) => {
		const { id } = UserValidation.userIdParamSchema.parse(req.params);
		const result = await UserService.getDepartmentTechnician(
			getDepartmentOfficerId(req),
			id,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department technician retrieved successfully",
			data: result,
		});
	},
);

const updateUser = catchAsync(async (req: Request, res: Response) => {
	const params = UserValidation.userIdParamSchema.parse(req.params);
	const adminId = req.user?.userId;
	if (!adminId) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	const result = await UserService.updateUser(params.id, adminId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User updated successfully",
		data: result,
	});
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No file uploaded");
	}

	const userId = req.user?.userId;

	const result = await UserService.uploadProfileImage(
		req.file?.buffer,
		userId!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User fetched successfully",
		data: result,
	});
});

export const UserController = {
	getUsers,
	getDepartmentTechnicians,
	getDepartmentTechnician,
	updateUser,
	uploadProfileImage,
};
