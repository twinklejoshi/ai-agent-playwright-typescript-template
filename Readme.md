# Playwright Typescript Template

This README provides step-by-step instructions for setting up, configuring, and running the project using Playwright and other development tools such as Prettier, ESLint, and TypeScript.

Playwright documentation: https://playwright.dev/docs/intro

## **Index**

1. [Pre-requisites](#pre-requisites)
2. [Setting Up the Project](#setting-up-the-project)
3. [Adding and Configuring Environments](#adding-and-configuring-environments)
4. [Project Folder Structure](#project-folder-structure)
5. [Running Tests](#running-tests)
6. [Recording and Playing with Playwright Test Generator](#recording-and-playing-with-playwright-test-generator)
7. [Playwright extension VS code](#playwright-extension-vs-code)
8. [Code Formatting with Prettier](#code-formatting-with-prettier)
9. [Linting with ESLint](#linting-with-eslint)
10. [TypeScript Configuration (`tsconfig.json`)](#typescript-configuration-tsconfigjson)

## Pre-requisites

Before you start, ensure the following:

1. **Install Visual Studio Code**
2. **Install Git**
3. **Install Node.js**
   - Download and install Node.js from [here](https://nodejs.org/en/download).

## Setting Up the Project

1. **Clone the repo**
  - Clone repository locally:
    ```bash
    git clone https://github.com/twinklejoshi/ai-agent-playwright-typescript-template.git
    ```

2. **Set up the project by installing dependencies**
  - Navigate to the project directory and run:
     ```bash
     npm run setup
     ```

## Adding and Configuring Environments

To keep sensitive data secure and easily configurable, we use environment file(s) to manage environment-specific variables such as API keys, URLs, or credentials. Ensure you create and configure this file before running the tests.

### This project supports multiple environments (e.g., local, dev, qa) for flexible configuration. Here’s how to add and configure them:

  **Steps to Add Environments**

  1. **Create Environment Files**:

      - Create `environments` folder in the project root.
      - Add environment-specific `.env` files to environments, such as:
        - `local.env`
        - `dev.env`
        - `qa.env`

  2. **Configure Environment Variables**:
      - Define the variables required by your project in each `.env` file.
      - Example content for `local.env`:
        ```env
        environment=local
        
        USERNAME=test_user
        PASSWORD=test_pass
        URL=https://local.company.com
        ```
      - Example content for `dev.env`:
        ```env
        environment=dev
        
        USERNAME=test_user
        PASSWORD=test_pass
        URL=https://dev.company.com
        ```
      - Example content for `qa.env`:
        ```env
        environment=qa
        
        USERNAME=test_user
        PASSWORD=test_pass
        URL=https://qa.company.com
        ```
      ```bash
        environments/
        ├── local.env          # Configuration for the local environment
        ├── dev.env            # Configuration for the development environment
        └── qa.env             # Configuration for the QA environment
      ```

  3. **Configuring Environments in `playwright.config.ts`**
      - The `playwright.config.ts` file is set up to load environment-specific configurations based on the `NODE_ENV` variable.

  4. `environments` folder currently has `example.env` file for the demo puposes

### How It Works:

- The environment is determined by the value of `NODE_ENV`.
- Based on the selected environment, the corresponding `.env` file is loaded, and its variables are made available in the runtime environment.
- If no environment is specified, the `local` environment is used by default.

### How to load environment variables in the project
- loadEnv(env: string): Loads environment variables from the corresponding .env file based on the provided environment (local by default).

### Details of Environment Files
1. Purpose: Environment files (`.env`) store environment-specific settings securely and allow you to switch between configurations easily.
2. Examples of Common Content in Environment Files:
    - **URLs**: Base URLs for services or APIs (`BASE_URL`).
    - **Keys**: API keys or secrets required for authentication (`API_KEY`).
    - **Timeouts**: Configuration for network request timeouts (`TIMEOUT`).
    - **Custom Variables**: Any other key-value pairs specific to the project requirements.
    - **Credentials**: Credentials required for login (`USER_NAME`, `USER_PWD`)
3. Environment variables can be accessed anywhere into the project through `process.env.{variable_name_as_per_env_file}`.

## Project Folder Structure

This section provides an overview of the `src` directory's structure, explains the **Page Object Model (POM)** design pattern, and outlines what each folder contains.

### **Folder Structure**

The `src` directory is organized as follows:

```bash
src
├── pages
│   │── ui             # Specific UI page objects that contains classes for UI components (e.g., LoginPage, DashboardPage)
│   │── api            # Specific API page objects that contains classes or modules for interacting with API endpoints
├── shared
│   ├── mock-data      # Shared test data
│   ├── types          # Shared types
│   ├── utils          # Shared helper functions, configurations, or utilities
├── tests
│   ├── ui # UI test scripts and fixtures for validating components and interactions
|   ├── e2e    # End-to-end test scripts and fixtures for validating user journeys across systems
│   ├── api  # API test scripts and fixtures for validating responses and workflows

```

### **Page Object Model (POM)**

The **Page Object Model (POM)** is utilized for organizing UI, API, and end-to-end test files. Each application page or endpoint is represented by a class or module, enabling a clean separation of concerns and improving maintainability.

#### **Core Components:**
1. **Pages**: Represents the application's UI pages or API endpoints. Contains all related elements and actions.
2. **Tests**: Contains test scripts to validate functionality by using methods from the `pages`.
3. **Utils**: Provides shared helpers, mock data, constants, and utilities.

### **Detailed Folder Descriptions**

#### **1. `shared` Folder**
- **Purpose**: Stores shared resources and logic that can be used across all projects.
- **Structure**:
  - **mock-data**: Contains test data which can be used to validate functionalities
    - Example:
      ```Typescript
      export const projectMockData: Project = {
          name: "New Project - Test 1",
          description: "New Project - Description",
          type: "Default",
          group: "new_group",
          coordinates: [],
      };
      ```
  - **types**: Contains types.
    - Example:
      ```Typescript
      export type Project = {
          name: string;
          description: string;
          type: string;
          group: string;
          coordinates: Coordinates[];
      };
      ```
  - **utils**: Provides custom logger, global helper functions or utility scripts, e.g., data formatting methods or mock generators or api utils.
    - custom-logger.ts file contains implementation of logger functionality that helps in recording steps taken to execute each tests.

#### **2. Pages**:
  - `ui`: Contains classes to model individual pages/components and includes methods to interact with page elements (e.g., clicking buttons, entering text, validating UI elements).
    - Example:
      ```Typescript
      class LoginPage {
          async enterUsername(username) { await page.locator('#username').fill(username); }
          async enterPassword(password) { await page.locator('#password').fill(password); }
          async clickLogin() { await page.locator('#loginBtn').click(); }
      }
      ```

  - `api`: Manages API endpoint interactions with reusable methods.
    - Example:
      ```Typescript
      class UserAPI {
          getUser(userId) { /* API call logic */ }
          createUser(data) { /* API call logic */ }
      }
      ```

#### **3. Tests**:
  - `ui`: Contains test scripts for UI components and interactions.
    - Example:
      ```Typescript
      test('login form validation', async () => {
          await loginPage.enterUsername('user');
          await loginPage.enterPassword('');
          await loginPage.clickLogin();
          expect(await loginPage.errorText).toBe('Password is required');
      });
      ```
  - `e2e`: Implements end-to-end testing scenarios to validate workflows.
    - Example:
      ```Typescript
      test('create project', async () => {
          await loginPage.login('user', 'password');
          await projectPage.createProject({ name: 'New Project', type: 'default' });
      });
      ```
  - `api`: Validates API responses, status codes, and workflows.
    - Example:
      ```Typescript
      test('should fetch user details', async () => {
          const user = await userApi.getUser(1);
          expect(user.name).toBe('John Doe');
      });
      ```

### **Details of `Pages` and `Tests`**

**What Pages Will Include:**

- **Web Elements**: Locators for UI elements or endpoints for APIs.
  - Example (for UI): `this.loginButton = page.locator('#loginBtn');`
- **Actions**: Methods for interacting with the elements (e.g., `clickLogin()`, `enterUsername()`).
- **Reusable Functions**: Methods for common tasks like navigation or API requests.

**What Tests Will Include:**

- **Scenario Definitions**: Scripts to validate specific functionalities or workflows.
  - Example: "Verify that the user can log in successfully."
- **Assertions**: Checks to validate expected outcomes.
  - Example: `expect(page.url()).toBe('https://example.com/dashboard');`
- **Setup and Teardown**: Initialization and cleanup code to prepare the test environment. This can be moved to fixtures folder. Fixtures encapsulates setup/teardown, are reusable beween test files and can help with grouping

## Running Tests

This section provides information about various test scripts defined in `package.json`.

### **Test Scripts**

**Here are the defined test commands and their purposes:**

| Command                 | Description                                                                                          |
|-------------------------|------------------------------------------------------------------------------------------------------|
| `npm run test`          | Runs all Playwright tests in headless mode.                                                         |
| `npm run test:local`    | Runs all Playwright tests using local environment variables in headless mode.                                                         |
| `npm run test:dev`    | Runs all Playwright tests using dev environment variables in headless mode.                                                         |
| `npm run test:headed`  | Runs all Playwright tests in headed mode.                                                         |
| `npm run test:custom`   | Launches an interactive prompt to customize and execute test runs based on environment, browser, test mode, test type, and test group. |
| `npm run test:ui`       | Opens the Playwright Test Runner UI for interactive test execution and debugging.                    |
| `npm run test:report:playwright`   | Opens the latest Playwright test execution HTML report.                                             |
| `npm run test:report:custom`   | Opens the latest test execution custom HTML report.                                             |
| `npm run test:debug`    | Runs Playwright tests in debug mode for step-by-step troubleshooting.                               |
| `npm run test:trace`    | Executes Playwright tests with tracing enabled for performance analysis and debugging.              |
---

**Interactive Test Execution: Custom Tests**

```bash
npm run test:custom
```

The `test:custom` command runs the `run-custom-tests.ts` script. The `run-custom-tests.ts` script is an interactive tool for flexible test execution. It allows you to select the environment, browser, test type, test group and test mode. Based on your choices, it dynamically constructs and runs the appropriate Playwright command, simplifying custom test runs without manual configuration changes.

**Usage Example**

To run the custom test flow:

1. Execute the script:
   ```bash
   npm run test:custom
   ```
2. Follow the prompts to select your environment, browser, test type, test group and test mode.
3. The script will execute the selected tests and display the output.

For more details on how the script works, refer to [Custom Test Script: `run-custom-tests.ts`](#custom-test-script-run-custom-testsmjs).




### **Custom Test Script: `run-custom-tests.ts`**

The `run-custom-tests.ts` script enables dynamic test execution through interactive prompts. It allows users to select the following options:

1. **Environment**:
   - Select an environment:
     - `Local`
     - `Dev`
     - `QA`

2. **Browser**:
   - Select the browser:
     - `Chromium`
     - `Firefox`
     - `WebKit`

3. **Test Type**:
   - Specify the type of tests:
     - `API`
     - `UI`
     - `E2E`

4. **Test Group**:
   - Filter tests by tag:
     - `Regression`
     - `Smoke`

5. **Test Mode**:
   - Filter tests by tag:
     - `Headless`
     - `UI`

**Sample Command Generated by Script**
If the user selects:

- Environment: `QA`
- Browser: `Chromium`
- Test Type: `UI`
- Test Group: `Regression`
- TestMode: ` Default => Headless`

The generated command will look like:

```bash
npx cross-env NODE_ENV=local playwright test --project=chromium .src/tests/ui --grep "@regression"
```

The script dynamically builds this command, ensuring flexible and efficient test execution.


## Recording and Playing with Playwright Test Generator

1. For test generator tutorial, refer [Test generator](https://playwright.dev/docs/codegen-intro).
2. For more test generation capabilities tutorial, refer [Codegen](https://playwright.dev/docs/codegen)

## Playwright extension VS code

The Playwright VS Code extension integrates Playwright's end-to-end testing capabilities directly into Visual Studio Code. It allows users to install Playwright, run tests with a single click, debug step-by-step, and view test results in the testing sidebar. The extension supports multiple browsers, configurations, and even GitHub Actions for CI/CD workflows. It also helps with generating tests, please refer [Playwright VS code](https://playwright.dev/docs/getting-started-vscode).

## Code Formatting with Prettier

Prettier is configured for consistent and readable code formatting across the project.

### Prettier Configuration:

- **`printWidth: 120`**: Wraps lines longer than 120 characters.
- **`tabWidth: 2`**: Sets indentation to 2 spaces.
- **`useTabs: true`**: Uses tabs for indentation.
- **`semi: true`**: Adds semicolons at the end of statements.
- **`trailingComma: "all"`**: Includes trailing commas where valid.
- **`bracketSpacing: true`**: Adds spaces between brackets in object literals.
- **`arrowParens: "always"`**: Requires parentheses for all arrow function parameters.

### How to set up Prettier in VS code:

1. Open Visual Studio Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for "Prettier - Code formatter" and click **Install**.

### Enable Format on Save:

1. Go to **Settings in VS code > Text Editor > Formatting**.
2. Check the **Format On Save** checkbox.

## Linting with ESLint

This section explains the ESLint configuration file (`eslint.config.mjs`) and how it integrates with TypeScript and Prettier to ensure consistent and maintainable code quality.


### **Purpose**
ESLint is a powerful static code analysis tool designed to detect potential errors, enforce coding standards, and maintain consistent formatting in JavaScript and TypeScript projects. By integrating custom and predefined rules, it ensures code quality, prevents bugs, and aligns with industry best practices. ESLint's flexibility allows for integration with tools like Prettier for code formatting while excluding unnecessary files to optimize performance. Overall, it simplifies collaboration within teams, enhances readability, and promotes maintainable and reliable codebases.

The `eslint.config.mjs` file is configured to lint TypeScript files while incorporating Prettier for code formatting. It provides:
- TypeScript-specific linting rules.
- Integration with Prettier for consistent formatting.
- Custom rules tailored for project requirements.
- Exclusion of unnecessary directories to optimize linting.


### **Configuration Breakdown**

**Targeted Files**
```Typescript
files: ["**/*.ts"]
```
Specifies that ESLint will target all TypeScript files (`.ts`) in the project.



**Ignored Directories**
```Typescript
ignores: [
    "node_modules/**",
    "test-results/**",
    "playwright-report/**",
    "./vs/**"
]
```
Defines directories that ESLint will ignore during linting:
- **`node_modules`**: Excludes dependencies.
- **`test-results`**: Avoids linting test result files.
- **`playwright-report`**: Excludes Playwright reports.
- **`./vs`**: Ignores specific IDE-related directories.



**Language Options**
```Typescript
languageOptions: {
    parser: tsparser,
    sourceType: "module",
    parserOptions: {
        project: "./tsconfig.json",
    },
}
```
Specifies settings for TypeScript files:
- **Parser**: `@typescript-eslint/parser` is used to process TypeScript syntax.
- **Source Type**: Indicates that ECMAScript modules (`module`) are being used.
- **Parser Options**: Points to `tsconfig.json` for TypeScript compilation settings, ensuring ESLint aligns with the TypeScript compiler.



**Plugins**
```Typescript
plugins: {
    "@typescript-eslint": tseslint,
    prettier: prettierPlugin,
}
```
- **`@typescript-eslint`**: Provides TypeScript-specific linting rules.
- **`prettier`**: Integrates Prettier with ESLint to enforce consistent formatting.



### **Rules**
```Typescript
rules: {
    ...tseslint.configs.recommended.rules,
    ...prettierConfig.rules,
    "@typescript-eslint/no-unused-vars": "warn",
    "no-console": "warn",
    semi: ["error", "always"],
    quotes: ["error", "double", { avoidEscape: true }],
    "prettier/prettier": "error",
}
```
Defines linting rules for TypeScript and Prettier:
1. **TypeScript Rules**:
   - Uses recommended rules from `@typescript-eslint`.
   - Warns about unused variables: `"@typescript-eslint/no-unused-vars": "warn"`.
2. **Custom Rules**:
   - Warns against `console.log` and similar statements: `"no-console": "warn"`.
   - Requires semicolons at the end of statements: `"semi": ["error", "always"]`.
   - Enforces double quotes for strings, avoiding escape sequences: `"quotes": ["error", "double", { avoidEscape: true }]`.
3. **Prettier Integration**:
   - Enforces Prettier formatting rules: `"prettier/prettier": "error"`.



### **Benefits of This Configuration**

1. **TypeScript Integration**:
   - Ensures TypeScript syntax and coding practices are followed.
   - Aligns linting settings with the TypeScript compiler through `tsconfig.json`.

2. **Prettier Integration**:
   - Automates formatting with Prettier while resolving conflicts between ESLint and Prettier rules.

3. **Customizable Rules**:
   - Allows flexibility to tailor linting and formatting based on project-specific requirements.

4. **Optimization**:
   - Excludes unnecessary files and directories to streamline linting.

For more details on ESLint configurations, check the [ESLint Documentation](https://eslint.org/docs/latest/).

## TypeScript Configuration (`tsconfig.json`)

The `tsconfig.json` file is a configuration file for the TypeScript compiler that specifies how the project should be compiled. Below is a detailed explanation of its settings:

### **Compiler Options**

**Target**

```json
"target": "es2016"
```

Specifies the version of Typescript to which TypeScript code will be compiled. `es2016` ensures compatibility with ES2016 features.

**Module**

```json
"module": "commonjs"
```

Defines the module system to use in the compiled Typescript. `commonjs` is commonly used in Node.js environments.

**Base URL**

```json
"baseUrl": "./"
```

Sets the base directory for module resolution. In this case, it is set to the project's root directory.

**Paths**

```json
"paths": {
    "*": ["./src/*"]
}
```

Defines module aliasing. It maps imports to the `src` directory, enabling easier imports without using relative paths.

**OutDir**

```json
"outDir": "./dist"
```

Specifies the directory where compiled Typescript files will be output, which in this case is the `dist` folder.

**ES Module Interop**

```json
"esModuleInterop": true
```

Enables interoperability between CommonJS and ES Modules, allowing default imports from CommonJS modules.

**Force Consistent Casing in File Names**

```json
"forceConsistentCasingInFileNames": true
```

Ensures that file names are treated case-sensitively, helping prevent issues on case-sensitive operating systems.

**No Implicit Any**

```json
"noImplicitAny": true
```

Requires all variables to have explicit types, improving type safety by disallowing the use of `any` as a default type.

**Strict**

```json
"strict": true
```

Enables all strict type-checking options, enhancing overall code reliability and reducing the risk of type errors.

### **Include and Exclude**

**Include**

```json
"include": ["src", "./eslint.config.mjs", "./playwright.config.ts"]
```

Specifies files and directories to include in the compilation process:

- `src`: Includes the `src` folder, where the main project code resides.
- `./eslint.config.mjs`: Includes the ESLint configuration file.
- `./playwright.config.ts`: Includes the Playwright configuration file.

**Exclude**

```json
"exclude": ["node_modules", "dist"]
```

Defines directories to exclude from compilation:

- `node_modules`: Excludes installed dependencies to avoid recompiling them.
- `dist`: Excludes the output directory to prevent re-compilation of already built files.



### **Purpose and Use Cases**

This configuration is designed for a Node.js-based TypeScript project with:

- Clean and structured paths for imports.
- Strict type checking for improved code quality.
- Compatibility with modern Typescript features (ES2016).
- Easy integration with tools like ESLint and Playwright.

By including `eslint.config.mjs` and `playwright.config.ts`, this configuration is tailored for projects that require robust linting and testing setups alongside TypeScript compilation.

For more details on TypeScript configurations, check the [TypeScript Documentation](https://www.typescriptlang.org/tsconfig)


