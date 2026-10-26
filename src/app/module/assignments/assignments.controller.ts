import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICreateAssignmentPayload,
	IUpdateAssignmentStatusPayload,
} from "./assignments.interface";
import { assignmentsService } from "./assignments.service";
import { assignmentQuerySchema } from "./assignments.validation";

const getAuthenticatedUser = (req: Request) => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "You must be logged in");
	}

	return req.user;
};

const getAssignmentId = (req: Request) => {
	const id = req.params.id;

	if (!id || Array.isArray(id)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid assignment ID");
	}

	return id;
};

const createAssignment = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const result = await assignmentsService.createAssignment(
		user.userId,
		req.body as ICreateAssignmentPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Assignment created successfully",
		data: result,
	});
});

const getAssignments = catchAsync(async (req: Request, res: Response) => {
	const user = getAuthenticatedUser(req);
	const queryResult = assignmentQuerySchema.safeParse(req.query);

	if (!queryResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			queryResult.error.issues[0]?.message ?? "Invalid query parameters",
		);
	}

	const result = await assignmentsService.getAssignments(
		user.userId,
		user.role,
		queryResult.data,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const updateAssignmentStatus = catchAsync(
	async (req: Request, res: Response) => {
		const user = getAuthenticatedUser(req);
		const result = await assignmentsService.updateAssignmentStatus(
			getAssignmentId(req),
			user.userId,
			user.role,
			req.body as IUpdateAssignmentStatusPayload,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Assignment status updated successfully",
			data: result,
		});
	},
);

export const AssignmentsController = {
	createAssignment,
	getAssignments,
	updateAssignmentStatus,
};
