import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import z from "zod";
import { AppError } from "../utils/appError";
import { catchAsync } from "../utils/catchAsync";

type RequestPart = "body" | "params" | "query";

export const validateRequest = (
	zodSchema: z.ZodObject,
	requestPart: RequestPart = "body",
) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		try {
			const payload =
				requestPart === "body"
					? (req.body ?? {})
					: requestPart === "params"
						? req.params
						: req.query;

			if (
				requestPart === "body" &&
				typeof payload === "object" &&
				payload !== null &&
				Object.keys(payload).length === 0
			) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"Request body is empty. Send a JSON body with Content-Type: application/json",
				);
			}

			const result = zodSchema.safeParse(payload);

			if (!result.success) {
				const issue = result.error.issues[0];
				const field = issue?.path.join(".");
				throw new AppError(
					httpStatus.BAD_REQUEST,
					issue
						? `${field ? `${field}: ` : ""}${issue.message}`
						: "Invalid request payload",
				);
			}

			if (requestPart === "body") {
				req.body = result.data;
			}

			next();
		} catch (error) {
			next(error);
		}
	});
};
