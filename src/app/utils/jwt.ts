import type { JwtPayload, SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

export type TokenVerificationResult =
	| { success: true; data: string | JwtPayload }
	| { success: false; error: string };

const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: SignOptions,
) => {
	const token = jwt.sign(payload, secret, {
		expiresIn,
	} as SignOptions);

	return token;
};

const verifyToken = (
	token: string,
	secret: string,
): TokenVerificationResult => {
	try {
		const verifiedToken = jwt.verify(token, secret);
		return {
			success: true,
			data: verifiedToken,
		};
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown token verification error";
		console.log("Token verification failed:", error);
		return {
			success: false,
			error: message,
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
