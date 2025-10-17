import * as dotenv from "dotenv";
import * as path from "path";

export const loadEnv = (env: string = "local") => {
	const envPath = path.resolve(__dirname, `../environments/${env}.env`);
	dotenv.config({ path: envPath });
};
