import httpStatus from "http-status";
import {
	AssignmentStatus,
	ComplaintStatus,
	Role,
	UserStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import type {
	IAssignmentQuery,
	ICreateAssignmentPayload,
	IUpdateAssignmentStatusPayload,
} from "./assignments.interface";

const assignmentInclude = {
	complaint: {
		select: {
			id: true,
			trackingCode: true,
			title: true,
			status: true,
		},
	},
	assignedBy: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	technician: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
};

const createAssignment = async (
	assignedById: string,
	payload: ICreateAssignmentPayload,
) => {
	const [complaint, technician, assignedBy] = await Promise.all([
		prisma.complaint.findUnique({
			where: { id: payload.complaintId },
		}),
		prisma.user.findUnique({
			where: { id: payload.technicianId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
				isDeleted: true,
				departmentId: true,
			},
		}),
		prisma.user.findUnique({
			where: { id: assignedById },
			select: {
				id: true,
				role: true,
				status: true,
				isDeleted: true,
				departmentId: true,
			},
		}),
	]);

	if (!complaint) {
		throw new AppError(httpStatus.NOT_FOUND, "Complaint not found");
	}

	if (
		!technician ||
		technician.role !== Role.TECHNICIAN ||
		technician.status !== UserStatus.ACTIVE ||
		technician.isDeleted
	) {
		throw new AppError(httpStatus.BAD_REQUEST, "Active technician not found");
	}

	if (technician.departmentId !== complaint.departmentId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Technician must belong to the complaint department",
		);
	}

	if (
		!assignedBy ||
		assignedBy.status !== UserStatus.ACTIVE ||
		assignedBy.isDeleted
	) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Assignment creator not found");
	}

	if (
		assignedBy.role !== Role.ADMIN &&
		assignedBy.role !== Role.DEPARTMENT_OFFICER
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to assign this complaint",
		);
	}

	if (
		assignedBy.role === Role.DEPARTMENT_OFFICER &&
		assignedBy.departmentId !== complaint.departmentId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to assign complaints in this department",
		);
	}

	const assignableStatuses = new Set<ComplaintStatus>([
		ComplaintStatus.SUBMITTED,
		ComplaintStatus.UNDER_REVIEW,
		ComplaintStatus.ASSIGNED,
		ComplaintStatus.REOPENED,
	]);

	if (!assignableStatuses.has(complaint.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Complaint cannot be assigned in its current status",
		);
	}

	const activeAssignment = await prisma.assignment.findFirst({
		where: {
			complaintId: complaint.id,
			status: {
				in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
			},
		},
	});

	if (activeAssignment) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Complaint already has an active assignment",
		);
	}

	const notes = payload.notes?.trim() || null;

	return prisma.$transaction(async (tx) => {
		await tx.complaint.update({
			where: { id: complaint.id },
			data: { status: ComplaintStatus.ASSIGNED },
		});

		const assignment = await tx.assignment.create({
			data: {
				complaintId: complaint.id,
				technicianId: technician.id,
				assignedById: assignedBy.id,
				notes,
			},
			include: assignmentInclude,
		});

		await tx.complaintUpdate.create({
			data: {
				complaintId: complaint.id,
				status: ComplaintStatus.ASSIGNED,
				comment: notes,
				createdBy: assignedBy.id,
			},
		});

		return assignment;
	});
};

const getAssignments = async (
	userId: string,
	role: Role,
	query: IAssignmentQuery,
) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? 10;
	const skip = (page - 1) * limit;
	let where: {
		technicianId?: string;
		complaint?: {
			citizenId?: string;
			departmentId?: string;
		};
	} = {};

	if (role === Role.TECHNICIAN) {
		where = { technicianId: userId };
	} else if (role === Role.DEPARTMENT_OFFICER) {
		const officer = await prisma.user.findUnique({
			where: { id: userId },
			select: { departmentId: true },
		});

		if (!officer?.departmentId) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Your account is not assigned to a department",
			);
		}

		where = { complaint: { departmentId: officer.departmentId } };
	} else if (role === Role.CITIZEN) {
		where = { complaint: { citizenId: userId } };
	} else if (role !== Role.ADMIN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view assignments",
		);
	}

	const [assignments, total] = await Promise.all([
		prisma.assignment.findMany({
			where,
			skip,
			take: limit,
			orderBy: { assignedAt: "desc" },
			include: assignmentInclude,
		}),
		prisma.assignment.count({ where }),
	]);

	return {
		data: assignments,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const updateAssignmentStatus = async (
	id: string,
	userId: string,
	role: Role,
	payload: IUpdateAssignmentStatusPayload,
) => {
	const assignment = await prisma.assignment.findUnique({
		where: { id },
	});

	if (!assignment) {
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	}

	const isAdmin = role === Role.ADMIN;
	const isAssignedTechnician =
		role === Role.TECHNICIAN && assignment.technicianId === userId;

	if (!isAdmin && !isAssignedTechnician) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to update this assignment",
		);
	}

	const allowedTransitions: Partial<
		Record<AssignmentStatus, AssignmentStatus[]>
	> = {
		[AssignmentStatus.ASSIGNED]: [
			AssignmentStatus.IN_PROGRESS,
			AssignmentStatus.REJECTED,
		],
		[AssignmentStatus.IN_PROGRESS]: [
			AssignmentStatus.COMPLETED,
			AssignmentStatus.REJECTED,
		],
	};

	if (!allowedTransitions[assignment.status]?.includes(payload.status)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid status transition");
	}

	const complaintStatus =
		payload.status === AssignmentStatus.IN_PROGRESS
			? ComplaintStatus.IN_PROGRESS
			: payload.status === AssignmentStatus.COMPLETED
				? ComplaintStatus.RESOLVED
				: ComplaintStatus.UNDER_REVIEW;

	return prisma.$transaction(async (tx) => {
		await tx.complaint.update({
			where: { id: assignment.complaintId },
			data: {
				status: complaintStatus,
				...(complaintStatus === ComplaintStatus.RESOLVED && {
					resolvedAt: new Date(),
				}),
			},
		});

		const updatedAssignment = await tx.assignment.update({
			where: { id: assignment.id },
			data: {
				status: payload.status,
				...(payload.status === AssignmentStatus.IN_PROGRESS && {
					acceptedAt: new Date(),
				}),
				...(payload.status === AssignmentStatus.COMPLETED && {
					completedAt: new Date(),
				}),
				...(payload.notes !== undefined && {
					notes: payload.notes.trim() || null,
				}),
			},
			include: assignmentInclude,
		});

		await tx.complaintUpdate.create({
			data: {
				complaintId: assignment.complaintId,
				status: complaintStatus,
				comment: payload.notes?.trim() || null,
				createdBy: userId,
			},
		});

		return updatedAssignment;
	});
};

export const assignmentsService = {
	createAssignment,
	getAssignments,
	updateAssignmentStatus,
};
