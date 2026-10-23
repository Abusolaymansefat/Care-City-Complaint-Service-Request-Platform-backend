export interface ICreateCategoryPayload {
	name: string;
	description?: string;
}

export interface IUpdateCategoryPayload {
	name?: string;
	description?: string;
}

export interface ICategoryQuery {
	searchTerm?: string;
	page?: number;
	limit?: number;
}
