export interface ICreateFeedbackPayload {
	complaintId: string;
	rating: number;
	comment?: string;
}
