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
	updateUser,
	uploadProfileImage,
};
