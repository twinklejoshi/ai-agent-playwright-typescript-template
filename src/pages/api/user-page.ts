import { APIRequestContext } from "@playwright/test";
import { Logger } from "shared/utils";

export class UserApi {
	private readonly url;
	constructor(private request: APIRequestContext) {
		this.url = process.env.API_BASE_URL;
	}

	async getUser(id: number) {
		try {
			const response = await this.request.get(`${this.url}/users/${id}`);
			Logger.info(`Received response for user with ID: ${id}`);
			return response;
		} catch (error) {
			const errorMessage = error instanceof Error ? error : new Error(String(error));
			Logger.error(`Error fetching user with ID: ${id} - ${errorMessage.message}`);
			throw errorMessage;
		}
	}
	async createUser(data: any) {
		try {
			const response = await this.request.post(`${this.url}/users`, { data });
			Logger.info("Created user successfully");
			return response;
		} catch (error) {
			const errorMessage = error instanceof Error ? error : new Error(String(error));
			Logger.error(`Error creating user - ${errorMessage.message}`);
			throw errorMessage;
		}
	}
}
