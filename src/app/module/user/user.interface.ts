import type { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IUserQuery {
	searchTerm?: string;
	role?: Role;
	status?: UserStatus;
	page?: number;
	limit?: number;
}

export interface IUpdateUserPayload {
	role?: Role;
	status?: UserStatus;
	departmentId?: string | null;
}
