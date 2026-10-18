import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await AuthService.register();

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "verification email sent successfully",
		data: null,
	});
});

export const AuthController = {
	register,
};
