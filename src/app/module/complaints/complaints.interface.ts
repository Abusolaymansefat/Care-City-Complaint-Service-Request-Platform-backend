import { ComplaintStatus, Priority } from "../../../generated/prisma/enums";

export interface ICreateComplaintPayload {
	title: string;
	description: string;
	address: string;
	latitude?: number;
	longitude?: number;
	categoryId: string;
}

export interface IUpdateComplaintPayload {
	title?: string;
	description?: string;
	address?: string;
	latitude?: number | null;
	longitude?: number | null;
	categoryId?: string;
}

export interface IUpdateComplaintStatusPayload {
	status: ComplaintStatus;
	comment?: string;
}

export interface IComplaintQuery {
	searchTerm?: string;
	categoryId?: string;
	departmentId?: string;
	status?: ComplaintStatus;
	priority?: Priority | null;
	page?: number;
	limit?: number;

	sortBy?:
		| "title"
		| "trackingCode"
		| "status"
		| "priority"
		| "createdAt"
		| "updatedAt";
	sortOrder?: "asc" | "desc";
}
