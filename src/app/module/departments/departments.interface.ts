export interface ICreateDepartmentPayload {
	name: string;
	description?: string;
}

export interface IUpdateDepartmentPayload {
	name?: string;
	description?: string;
}

export interface IDepartmentParams {
	id: string;
}

export interface IDepartmentQuery {
	searchTerm?: string;
	page?: number;
	limit?: number;
}
