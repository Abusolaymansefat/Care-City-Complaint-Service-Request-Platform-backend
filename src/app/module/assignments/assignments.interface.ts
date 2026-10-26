import type { AssignmentStatus } from "../../../generated/prisma/enums";

export interface ICreateAssignmentPayload {
	complaintId: string;
	technicianId: string;
	notes?: string;
}

export interface IUpdateAssignmentStatusPayload {
	status: AssignmentStatus;
	notes?: string;
}

export interface IAssignmentQuery {
	page?: number;
	limit?: number;
}
