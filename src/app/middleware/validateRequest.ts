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

			const result = zodSchema.safeParse(payload);

			if (!result.success) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues[0]?.message ?? "Invalid request payload",
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
