import { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { categoriesService } from "./categories.service";
import { CategoriesValidation } from "./categories.validation";

const getCategoryId = (req: Request) => {
	const result = CategoriesValidation.categoryIdParamSchema.safeParse(
		req.params,
	);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid category ID",
		);
	}

	return result.data.id;
};

const createCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await categoriesService.createCategory(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Category created successfully",
		data: result,
	});
});

const getCategories = catchAsync(async (req: Request, res: Response) => {
	const queryResult = CategoriesValidation.categoryQuerySchema.safeParse(
		req.query,
	);

	if (!queryResult.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			queryResult.error.issues[0]?.message ?? "Invalid query parameters",
		);
	}

	const result = await categoriesService.getCategories(queryResult.data);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Categories retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
	const result = await categoriesService.getCategoryById(getCategoryId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category retrieved successfully",
		data: result,
	});
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await categoriesService.updateCategory(
		getCategoryId(req),
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category updated successfully",
		data: result,
	});
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await categoriesService.deleteCategory(getCategoryId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category deactivated successfully",
		data: result,
	});
});

export const CategoriesController = {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory,
};
