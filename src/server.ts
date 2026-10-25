import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { seedSystemUsers } from "./app/utils/seed";

const PORT = config.port;
const main = async () => {
	try {
		// Connect to the database
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await seedSystemUsers();

		// Login does not depend on Redis; only OTP-based flows require it.
		try {
			await redisClient.connect();
			console.log("Connected to Redis successfully.");
		} catch (error) {
			console.error(
				"Redis connection failed; the API will start, but Redis-dependent flows will be unavailable:",
				error,
			);
		}

		// Connect to Email
		await transporter.verify();
		console.log("Nodemailer connected successfully.");

		// Start the Express server
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
