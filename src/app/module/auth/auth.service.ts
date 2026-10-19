import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import { IRegisterPayload } from "./auth.interface";

const register = async (payload: IRegisterPayload) => {
	const { name, password } = payload;

	if (typeof password !== "string" || password.length === 0) {
		throw new AppError(httpStatus.BAD_REQUEST, "Password is required");
	}

	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist) {
		throw new AppError(
			httpStatus.CONFLICT,
			"user with this email already exist",
		);
	}
};

const verifyEmail = async () => {};

const login = async () => {};

const getMe = async () => {};

const refreshToken = async () => {};

const googleLogin = async () => {};

export const AuthService = {
	register,
	verifyEmail,
	login,
	getMe,
	refreshToken,
	googleLogin,
};
