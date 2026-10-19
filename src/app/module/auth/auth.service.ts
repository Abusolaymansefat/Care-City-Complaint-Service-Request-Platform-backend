import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/appError";
import { jwtUtils } from "../../utils/jwt";
import type {
	ILoginPayload,
	IRegisterPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

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

	const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

	const expirationTime = 5 * 60;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	const otpKey = `register-otp:${email}`;
	const registerDataKey = `register-data:${email}`;

	const redisUserDataPayload = {
		name: name.trim(),
		email,
		password: hashedPassword,
	};

	// Store OTP in Redis for 5 minutes
	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	// Store temporary registration data in Redis
	await redisClient.set(registerDataKey, JSON.stringify(redisUserDataPayload), {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	const tempatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const html = await ejs.renderFile(tempatePath, {
		name,
		email,
		otp: otpValue,
		expirationTime: expirationTime / 60,
	});
	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Your Email Verification Code",
		html,
	});
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const otp = payload.otp.trim();
	const email = payload.email.trim().toLowerCase();

	const otpKey = `register-otp:${email}`;
	const registerDataKey = `register-data:${email}`;

	// Check temporary registration data first
	const redisUserData = await redisClient.get(registerDataKey);

	if (!redisUserData) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Registration data not found or expired",
		);
	}

	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"OTP expired. Please register again.",
		);
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	const userPayload = JSON.parse(redisUserData) as {
		name: string;
		email: string;
		password: string;
	};

	// Prevent duplicate registration
	const existingUser = await prisma.user.findUnique({
		where: { email },
	});

	if (existingUser) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	// Create verified CityCare user
	const createdUser = await prisma.user.create({
		data: {
			name: userPayload.name,
			email: userPayload.email,
			password: userPayload.password,
			authProvider: "CREDENTIAL",
			emailVerified: true,
			role: Role.CITIZEN,
			status: UserStatus.ACTIVE,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			emailVerified: true,
			imageUrl: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	// Delete temporary data after successful creation
	await redisClient.del([otpKey, registerDataKey]);

	// Send welcome email
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/user-welcome-email.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: createdUser.name,
		portalUrl: config.frontend_url,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: createdUser.email,
		subject: "Welcome to CityCare",
		html,
	});

	const jwtPayload = {
		userId: createdUser.id,
		name: createdUser.name,
		email: createdUser.email,
		role: createdUser.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user: createdUser,
		accessToken,
		refreshToken,
	};
};

const login = async (payload: ILoginPayload) => {
	const email = payload.email.trim().toLowerCase();
	const { password } = payload;

	if (typeof password !== "string" || password.length === 0) {
		throw new AppError(httpStatus.BAD_REQUEST, "Password is required");
	}

	// Find user by email
	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user || !user.password) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	// Check account status
	if (user.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been deleted");
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.FORBIDDEN, "Your account is not active");
	}

	// Verify email before login
	if (!user.emailVerified) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Please verify your email before logging in",
		);
	}

	// Compare password with hashed password
	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	// Generate access token
	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	// Generate refresh token
	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	// Remove password from response
	const { password: _password, ...userWithoutPassword } = user;

	return {
		user: userWithoutPassword,
		accessToken,
		refreshToken,
	};
};

const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			name: true,
			email: true,
			googleId: true,
			authProvider: true,
			emailVerified: true,
			role: true,
			status: true,
			needPasswordChange: true,
			imageUrl: true,
			isDeleted: true,
			departmentId: true,
			department: {
				select: {
					id: true,
					name: true,
				},
			},
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user || user.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status !== "ACTIVE") {
		throw new AppError(httpStatus.FORBIDDEN, "Your account is not active");
	}

	return user;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	if (!verifiedRefreshToken.data) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.FORBIDDEN, "User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async () => {};
const forgotPassword = async () => {};
const resetPassword = async () => {};

export const AuthService = {
	register,
	verifyEmail,
	login,
	getMe,
	refreshToken,
	googleLogin,
};
