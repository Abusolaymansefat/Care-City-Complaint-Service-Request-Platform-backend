import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AssignmentsRoutes } from "./app/module/assignments/assignments.routes";
import { AuthRoutes } from "./app/module/auth/auth.routes";
import { CategoriesRoutes } from "./app/module/categories/categories.routes";
import { ComplaintsRoutes } from "./app/module/complaints/complaints.routes";
import { DepartmentsRoutes } from "./app/module/departments/departments.routes";
import { FeedbackRoutes } from "./app/module/feedback/feedback.routes";
import { UserRoutes } from "./app/module/user/user.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// Auth router
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/departments", DepartmentsRoutes);
app.use("/api/v1/categories", CategoriesRoutes);
app.use("/api/v1/complaints", ComplaintsRoutes);
app.use("/api/v1/assignments", AssignmentsRoutes);
app.use("/api/v1/feedback", FeedbackRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message:
			"Welcome to CityCare — City Complaint & Service Request Platform backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);
export default app;
