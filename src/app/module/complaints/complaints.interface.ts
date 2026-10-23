export interface ICreateComplaintPayload {
	title: string;
	description: string;
	categoryId: string;
	address: string;
	latitude?: number;
	longitude?: number;
}

export interface IUpdateComplaintPayload {
	title?: string;
	description?: string;
	categoryId?: string;
	address?: string;
}

export interface IUpdateComplaintStatusPayload {
	status: string;
	resolutionNote?: string;
}

export interface IComplaintQuery {
	searchTerm?: string;
	categoryId?: string;
	status?: string;
	page?: number;
	limit?: number;
}
