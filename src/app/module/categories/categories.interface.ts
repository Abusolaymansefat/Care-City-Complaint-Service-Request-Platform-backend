export interface ICreateCategoryPayload {
	name: string;
	description?: string;
	slaHours?: number;
	departmentId: string;
}

export interface IUpdateCategoryPayload {
	name?: string;
	description?: string | null;
	slaHours?: number;
	departmentId?: string;
	isActive?: boolean;
}

export interface ICategoryQuery {
	searchTerm?: string;
	departmentId?: string;
	isActive?: boolean;
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
