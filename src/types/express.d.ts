import type { IRequestUser } from "../app/module/auth/auth.interface";

declare global {
	namespace Express {
		interface Request {
			user?: IRequestUser;
		}
	}
}

export {};
