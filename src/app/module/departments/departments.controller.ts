import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DepartmentsService } from "./departments.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentsService.createDepartment(req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department created successfully",
		data: result,
	});
});

export const DepartmentsController = {
	createDepartment,
};
