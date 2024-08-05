#!/usr/bin/env node

const { Command } = require("commander");
const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

const program = new Command();

program
  .version("1.0.0")
  .description(
    "CLI to scaffold an Express, TypeScript, MySQL, Sequelize project"
  );

program
  .command("init")
  .description("Initialize a new project")
  .action(() => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "projectName",
          message: "Enter the project name:",
          validate: (input) => (input ? true : "Project name is required"),
        },
        {
          type: "list",
          name: "packageManager",
          message: "Choose your package manager:",
          choices: ["npm", "pnpm"],
          default: "npm",
        },
      ])
      .then((answers) => {
        const { projectName, packageManager } = answers;
        const projectPath = path.join(process.cwd(), projectName);

        // Create project structure
        createProjectStructure(projectPath);

        // Initialize npm and install dependencies
        installDependencies(projectPath, packageManager);

        console.log(`Project ${projectName} initialized successfully.`);
        console.log(`cd ${projectName}`)
      });
  });

program.parse(process.argv);

function createProjectStructure(projectPath) {
  fs.ensureDirSync(projectPath);

  const dirs = [
    "src",
    "src/controllers",
    "src/models",
    "src/routes",
    "src/config",
    "src/middleware",
    "src/util",
    "src/__tests__",
  ];

  dirs.forEach((dir) => {
    fs.ensureDirSync(path.join(projectPath, dir));
  });

  // Create initial .ts files
  const files = {
    "src/index.ts": getIndexTsContent(),
    "src/config/database.ts": getDatabaseTsContent(),
    "src/controllers/user.controller.ts": getUserControllerContent(),
    "src/models/user.ts": getUserModelContent(),
    "src/routes/index.ts": getRoutesIndexTsContent(),
    "src/routes/user.router.ts": getUserRouterContent(),
    "src/util/util.ts": getUtilContent(),
    "tsconfig.json": getTsConfigContent(),
    ".env.development": getEnvContent(),
    ".gitignore": getGitIgnoreContent(),
    "nodemon.json": getNodemonContent(),
    "global.d.ts": getTypeDefinitionsContent(),
  };

  for (const [file, content] of Object.entries(files)) {
    fs.outputFileSync(path.join(projectPath, file), content);
  }
}

function installDependencies(projectPath, packageManager) {
  console.log("Initializing project and installing dependencies...");
  const initCommand = packageManager === "npm" ? "npm init -y" : "pnpm init";
  execSync(initCommand, { cwd: projectPath, stdio: "inherit" });

  const installCommand = packageManager === "npm" ? "npm install" : "pnpm add";
  const devInstallCommand =
    packageManager === "npm" ? "npm install --save-dev" : "pnpm add -D";

  execSync(
    `${installCommand} express mysql2 sequelize sequelize-typescript dotenv winston`,
    {
      cwd: projectPath,
      stdio: "inherit",
    }
  );
  execSync(
    `${devInstallCommand} typescript ts-node @types/express @types/node nodemon`,
    { cwd: projectPath, stdio: "inherit" }
  );

  // Read package.json
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = fs.readJsonSync(packageJsonPath);

  // Add scripts to package.json
  packageJson.scripts = {
    ...packageJson.scripts,
    build: "npx tsc",
    start: "node dist/index.js",
    dev: "NODE_ENV=development nodemon",
  };

  // Write updated package.json
  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });

  console.log("Dependencies installed and package.json updated successfully.");
}

function getIndexTsContent() {
  return `import dotenv from "dotenv";
dotenv.config({ path: \`.env.\${process.env.NODE_ENV}\` });
import express, { Application, Request, Response } from "express";
import { logger,normalizePort } from "./util/util";
import { DatabaseConnection } from "./config/database"; 
import router from './routes';

const PORT = normalizePort(process.env.PORT || '3000');
const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(router);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, world!');
});

try {
  const dbInstance = DatabaseConnection.getInstance();
  app.listen(PORT, () => {
    logger.info(\`Server is running at http://localhost:\${PORT}\`);
    dbInstance.connectDb();
  });
} catch (error) {
  if (error instanceof Error) {
    logger.error(\`Error occurred: \${error.message}\`);
  }
}

export { app };
`;
}

function getDatabaseTsContent() {
  return `import { Sequelize } from "sequelize";
import { logger } from "../util/util";

const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    dialect: "mysql",
    host: process.env.DATABASE_HOST,
    logging: (message) => {
      logger.info(message);
    }
  },
);

class DatabaseConnection {
  private static instance: DatabaseConnection;

  private constructor() {}

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new DatabaseConnection();
    return this.instance;
  }

  async connectDb() {
    try {
      await sequelize.authenticate();
      console.log("Connection has been established successfully.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }
  }
}


export { sequelize, DatabaseConnection };
`;
}

function getRoutesIndexTsContent() {
  return `import { Router } from "express";
import userRouter from "./user.router";
const router = Router();

router.use('/users', userRouter);

export default router;
`;
}

function getTsConfigContent() {
  return `{
    "compilerOptions": {
        "target": "ES6",
        "module": "commonjs",
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "strict": true,
        "noImplicitAny": true, 
        "strictPropertyInitialization": true,
        "noEmitOnError": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true, 
        "skipLibCheck": true,
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": [
      "src"
    ],
    "exclude": ["node_modules"],
    "files": ["global.d.ts"]
}
`;
}

function getEnvContent() {
  return `PORT=3000  
DATABASE_NAME=your_db_name
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST='127.0.0.1'
`;
}

function getGitIgnoreContent() {
  return `node_modules
dist  
.env.development
app.log
`;
}

function getNodemonContent() {
  return `{
    "watch": [
      "src",
      ".env"
    ],
    "ext": "js,ts,json",
    "ignore": [
      "src/logs/*",
      "src/**/*.{spec,test}.ts"
    ],
    "exec": "ts-node --transpile-only src/index.ts"
}
`;
}

function getUtilContent() {
  return `import { createLogger, transports, format } from "winston";

const customFormat = format.combine(
  format.timestamp({ format: "DD-MMM-YYYY HH:mm:ss" }),
  format.printf((info) => {
    return \`\${info.timestamp} [\${info.level.toUpperCase().padEnd(7)}]: \${info.message}\`;
  })
);

const logger = createLogger({
  format: customFormat,
  transports: [
    new transports.Console({ level: "silly" }),
    new transports.File({ filename: "app.log", level: "info" }),
  ],
});


// Normalize a port into a number, string, or false.
function normalizePort(val: string | number): number | string | false {
  const port = parseInt(val as string, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

export { logger, normalizePort };
`;
}

function getUserModelContent() {
  return `import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../config/database";

interface UserAttributes {
  user_id?: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  gender: string;
}

// Optional fields for User creation
interface UserCreationAttributes extends Optional<UserAttributes, 'user_id'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public user_id!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public age!: number;
  public gender!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    gender: {
      type: DataTypes.CHAR(2),
      allowNull: false,
    },
  },
  {
    timestamps: true,
    sequelize,
    modelName: "User",
    freezeTableName: true,
  }
);

export { User };
`;
}

function getUserControllerContent() {
  return `import { Request, RequestHandler, Response } from "express";
import { User } from "../models/user";
import { logger } from "../util/util";

const getAllUsers: RequestHandler = async (req: Request, res: Response) => {
  try {
    const users = await User.findAll({
      attributes: ["firstName", "lastName", "email", "age", "gender"],
    });

    if (!users) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({ users });
  } catch (error) {
    logger.error("Error in getting users", error); 
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default { getAllUsers };
`;
}

function getUserRouterContent() {
  return `import { Router } from "express";
import userController from "../controllers/user.controller"; 
const router = Router();

router.route("/").get(userController.getAllUsers);

export default router;
`;
}

function getTypeDefinitionsContent() {
  return `import { Request } from "express";

declare global {  
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_HOST: string;
      DATABASE_USER: string;
      DATABASE_PASSWORD: string;
      DATABASE_NAME: string;
    }
  }
}
  `;
}
