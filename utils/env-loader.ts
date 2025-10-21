import * as dotenv from "dotenv";
import * as path from "path";

export const loadEnv = (env: string = "example") => {
	const envPath = path.resolve(__dirname, `../environments/${env}.env`);
	dotenv.config({ path: envPath });
};
