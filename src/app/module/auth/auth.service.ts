import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/appError";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginPayload,
	IRegisterPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";

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

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googlePayload: TokenPayload | undefined;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googlePayload = ticket.getPayload();
	} catch {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or expired Google ID token",
		);
	}

	if (!googlePayload) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Google ID token");
	}

	if (!googlePayload?.sub || !googlePayload.email) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Google account information is missing",
		);
	}

	if (!googlePayload.email_verified) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Google account is not verified",
		);
	}

	const email = googlePayload.email.toLowerCase();
	const googleId = googlePayload.sub;
	const name = googlePayload.name || email.split("@")[0] || email;

	let user = await prisma.user.findFirst({
		where: {
			email,
			googleId,
		},
	});

	if (!user) {
		const existingUser = await prisma.user.findFirst({
			where: {
				email,
			},
		});

		if (existingUser) {
			if (existingUser.isDeleted) {
				throw new AppError(httpStatus.FORBIDDEN, "Account is deleted");
			}

			if (existingUser.status !== UserStatus.ACTIVE) {
				throw new AppError(httpStatus.FORBIDDEN, "Account is inactive");
			}

			if (!existingUser.emailVerified) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"Please verify your email first",
				);
			}

			if (existingUser.googleId && existingUser.googleId !== googleId) {
				throw new AppError(
					httpStatus.CONFLICT,
					"This email is linked to another Google account",
				);
			}

			user = await prisma.user.update({
				where: {
					id: existingUser.id,
				},
				data: {
					googleId,
				},
			});
		} else {
			user = await prisma.user.create({
				data: {
					name,
					email,
					googleId,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					role: Role.CITIZEN,
					status: UserStatus.ACTIVE,
				},
			});
		}
	}

	if (user.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is deleted");
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is inactive");
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

	const { password: _password, ...safeUser } = user;

	return {
		accessToken,
		refreshToken,
		user: safeUser,
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.toLowerCase().trim();

	// 1. Find user
	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	// 2. Check account status
	if (user.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is deleted");
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is inactive");
	}

	if (!user.emailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "Email is not verified");
	}

	// 3. Google-only accounts cannot reset a password this way
	if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google login. Please sign in with Google.",
		);
	}

	// 4. Generate OTP
	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-otp:${email}`;
	const expirationTime = 5 * 60;

	// 5. Store OTP in Redis for 5 minutes
	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationTime,
		},
	});

	// 6. Render email template
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forgot-password.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		name: user.name,
		otp,
		expirationTime: expirationTime / 60,
	});

	// 7. Send OTP email
	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: "CityCare - Password Reset OTP",
		html,
	});

	return {
		message: "Password reset OTP sent successfully",
	};
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, otp, newPassword } = payload;
	const normalizedEmail = email.toLowerCase().trim();

	// 1. Find user
	const user = await prisma.user.findUnique({
		where: {
			email: normalizedEmail,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	// 2. Check account status
	if (user.isDeleted) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is deleted");
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.FORBIDDEN, "Account is inactive");
	}

	if (!user.emailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "Email is not verified");
	}

	// 3. Prevent password reset for Google-only accounts
	if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google login. Please sign in with Google.",
		);
	}

	// 4. Validate OTP
	const key = `forgot-password-otp:${normalizedEmail}`;
	const redisOtp = await redisClient.get(key);

	if (!redisOtp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"OTP expired. Please request a new OTP.",
		);
	}

	if (redisOtp !== otp.trim()) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	// 5. Hash the new password
	const hashedPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	// 6. Update password
	await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			password: hashedPassword,
			needPasswordChange: false,
		},
	});

	// 7. Delete OTP after successful password update
	await redisClient.del([key]);

	// 8. Render success email
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password-success.ejs",
	);

	const html = await ejs.renderFile(templatePath, {
		user: {
			name: user.name,
		},
		change_date: new Date().toLocaleString(),
		login_url: config.frontend_url ?? "#",
		support_url: config.frontend_url ?? "#",
	});

	// 9. Send confirmation email
	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: "CityCare - Password Changed Successfully",
		html,
	});

	return {
		message: "Password reset successfully",
	};
};

export const AuthService = {
	register,
	verifyEmail,
	login,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
