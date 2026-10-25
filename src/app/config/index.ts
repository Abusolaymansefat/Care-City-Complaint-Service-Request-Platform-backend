import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	bak_url: process.env.APP_URL,
	frontend_url: process.env.FRONTEND_URL,
	bcrypt_salt_rounds: Number.parseInt(
		process.env.BCRYPT_SALT_ROUNDS ?? "10",
		10,
	),

	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
	redis_username: process.env.REDIS_USERNAME!,
	redis_password: process.env.REDIS_PASSWORD!,
	redis_host: process.env.REDIS_HOST!,
	redis_port: process.env.REDIS_PORT!,
	smtp_user: process.env.SMTP_USER!,
	email_sender: process.env.EMAIL_SENDER!,
	smtp_password: process.env.SMTP_PASSWORD!,
	google_client_id: process.env.GOOGLE_CLIENT_ID!,
	cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET!,
	admin_name: process.env.ADMIN_NAME!,
	admin_email: process.env.ADMIN_EMAIL!,
	admin_password: process.env.ADMIN_PASSWORD!,
	technician_name: process.env.TECHNICIAN_NAME!,
	technician_email: process.env.TECHNICIAN_EMAIL!,
	technician_password: process.env.TECHNICIAN_PASSWORD!,
	department_officer_name: process.env.DEPARTMENT_OFFICER_NAME!,
	department_officer_email: process.env.DEPARTMENT_OFFICER_EMAIL!,
	department_officer_password: process.env.DEPARTMENT_OFFICER_PASSWORD!,
};
