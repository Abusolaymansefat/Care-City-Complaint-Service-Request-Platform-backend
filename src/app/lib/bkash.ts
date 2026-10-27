import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../utils/appError";
import { redisClient } from "./redis";

export const getBkashIdToken = async () => {
	try {
		const idTokenKey = "bkash:idToken";
		const refreshToken = "bkash:refreshToken";

		let bkashIdToken = await redisClient.get(idTokenKey);

		const bkashTokenTT1 = await redisClient.ttl(idTokenKey);
		const bkashRefreshToken = await redisClient.get(refreshToken);
		const bkashRefreshTokenTT1 = await redisClient.ttl(refreshToken);

		if (
			(bkashTokenTT1 <= 600 || !bkashIdToken) &&
			bkashRefreshToken &&
			bkashRefreshTokenTT1 >= 600
		) {
			const refreshTokenResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
						Date: new Date().toUTCString(),
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);

			const bkashRefreshTokenResult = await refreshTokenResponse.json();
			console.log(bkashRefreshTokenResult);

			bkashIdToken = bkashRefreshTokenResult.id_token as string;

			await redisClient.set(idTokenKey, bkashIdToken, {
				expiration: {
					type: "EX",
					value: 60 * 60,
				},
			});

			return bkashIdToken;
		}

		if (bkashTokenTT1 >= 600) {
			return bkashIdToken;
		}

		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
					Date: new Date().toUTCString(),
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		console.log("Token grant response status:", response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Token grant error:", errorText);
			throw new AppError(httpStatus.BAD_REQUEST, "Failed to get bKash token");
		}

		const result = await response.json();

		await redisClient.set(idTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 3600,
			},
		});
		// store id token and refresh token in redis
		await redisClient.set(refreshToken, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28,
			},
		});

		bkashIdToken = result.id_token;

		console.log(
			"Generated bKash ID Token:",
			bkashIdToken?.substring(0, 50) + "...",
		);

		return bkashIdToken;
	} catch {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Failed to get bkash id token",
		);
	}
};
