import config from "./app/config";
import { prisma } from "./app/lib/prisma";

const PORT = config.port;
const main = async () => {
      try {
            // Connect to the database
		await prisma.$connect();
		console.log("Connected to the database successfully.");
            
      } catch (error) {
            console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
      }
}

main();