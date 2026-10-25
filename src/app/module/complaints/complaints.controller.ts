import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
	IComplaintQuery,
	ICreateComplaintPayload,
	IUpdateComplaintPayload,
	IUpdateComplaintStatusPayload,
} from "./complaints.interface";
import { complaintsService } from "./complaints.service";

const getAuthenticatedUser = (req: Request) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	return req.user;
};

const getComplaintId = (req: Request) => {
	const id = req.params.id;
	if (!id || Array.isArray(id)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid complaint ID");
	}

	return id;
};

const createComplaint = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await complaintsService.createComplaint(
		user.userId,
		req.body as ICreateComplaintPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Complaint created successfully",
		data: result,
	});
});

const getMyComplaints = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await complaintsService.getMyComplaints(
		user.userId,
		req.query as unknown as IComplaintQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Complaints retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getComplaints = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await complaintsService.getComplaints(
		req.query as unknown as IComplaintQuery,
		user.role,
		user.userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Complaints retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getComplaintById = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await complaintsService.getComplaintById(
		getComplaintId(req),
		user.userId,
		user.role,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Complaint retrieved successfully",
		data: result,
	});
});

const updateComplaint = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await complaintsService.updateComplaint(
		getComplaintId(req),
		user.userId,
		req.body as IUpdateComplaintPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Complaint updated successfully",
		data: result,
	});
});

const updateComplaintStatus = catchAsync(
	async (req: Request, res: Response) => {
		const user = getAuthenticatedUser(req);
		const result = await complaintsService.updateComplaintStatus(
			getComplaintId(req),
			user.userId,
			user.role,
			req.body as IUpdateComplaintStatusPayload,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Complaint status updated successfully",
			data: result,
		});
	},
);

export const ComplaintsController = {
	createComplaint,
	getMyComplaints,
	getComplaints,
	getComplaintById,
	updateComplaint,
	updateComplaintStatus,
};
