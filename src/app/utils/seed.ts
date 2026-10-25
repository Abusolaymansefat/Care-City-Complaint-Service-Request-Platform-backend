import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./appError";

type BootstrapAccount = {
	name: string;
	email: string;
	password: string;
	role: Role;
};

const seedAccount = async ({
	name,
	email,
	password,
	role,
}: BootstrapAccount) => {
	if (!name || !email || !password) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			`Missing name, email, or password for the ${role} account configuration`,
		);
	}

	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { role: true, password: true },
	});

	if (existingUser) {
		if (existingUser.role !== role) {
			throw new AppError(
				httpStatus.CONFLICT,
				`Configured email for ${role} is already used by a ${existingUser.role} account`,
			);
		}

		if (
			!existingUser.password ||
			!(await bcrypt.compare(password, existingUser.password))
		) {
			const hashedPassword = await bcrypt.hash(
				password,
				config.bcrypt_salt_rounds,
			);

			await prisma.user.update({
				where: { email },
				data: { password: hashedPassword },
			});
			console.log(`${role} account password synchronized`);
			return;
		}

		console.log(`${role} account already exists with configured password`);
		return;
	}

	const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

	await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role,
			needPasswordChange: false,
			emailVerified: true,
		},
	});

	console.log(`${role} account created successfully`);
};

export const seedTestAdmin = async () =>
	seedAccount({
		name: config.admin_name,
		email: config.admin_email,
		password: config.admin_password,
		role: Role.ADMIN,
	});

export const seedTestTechnician = async () =>
	seedAccount({
		name: config.technician_name,
		email: config.technician_email,
		password: config.technician_password,
		role: Role.TECHNICIAN,
	});

export const seedTestDepartmentOfficer = async () =>
	seedAccount({
		name: config.department_officer_name,
		email: config.department_officer_email,
		password: config.department_officer_password,
		role: Role.DEPARTMENT_OFFICER,
	});

export const seedSystemUsers = async () => {
	await seedTestAdmin();
	await seedTestTechnician();
	await seedTestDepartmentOfficer();
};
