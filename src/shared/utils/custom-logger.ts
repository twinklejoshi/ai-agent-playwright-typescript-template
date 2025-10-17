import fs from "fs";
import path from "path";
import { LogLevel } from "shared/types";

export class Logger {
	private static logFilePath = path.join(__dirname, "logs", "automation.log");

	private static log(level: LogLevel, message: string) {
		const timestamp = new Date().toLocaleString();
		const logMessage = `${timestamp} ${level}: ${message}`;
		console.log(logMessage);
		fs.mkdirSync(path.dirname(Logger.logFilePath), { recursive: true });
		fs.appendFileSync(Logger.logFilePath, logMessage + "\n");
	}

	public static info(message: any) {
		Logger.log("INFO", message);
	}

	public static warn(message: any) {
		Logger.log("WARN", message);
	}

	public static error(message: any) {
		Logger.log("ERROR", message);
	}

	public static debug(message: any) {
		Logger.log("DEBUG", message);
	}
}
