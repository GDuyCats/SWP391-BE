// ./docs/swagger.js
import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express"; // ✅ import bình thường, không dùng await
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ưu tiên URL từ ENV:
 * - API_BASE_URL (ví dụ: https://swp391-be-production.up.railway.app)
 * - nếu không có, fallback về http://localhost:<BE_PORT|8081>
 */
const SERVER_URL =
  process.env.API_BASE_URL ||
  `http://localhost:${Number(process.env.BE_PORT) || 8081}`;

// ✅ Dùng đường dẫn tuyệt đối để swagger-jsdoc quét
const apisGlobs = [
  path.join(process.cwd(), "routes/**/*.js"),
  path.join(process.cwd(), "controller/**/*.js"),
  path.join(process.cwd(), "controllers/**/*.js"),
  path.join(process.cwd(), "docs/**/*.js"),
  path.join(process.cwd(), "docs/**/*.yaml"), // 👈 load components.yaml
];

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "SWP391 2nd Electric Vehicle Platform",
      version: "1.0.0",
      description: "API docs for SWP391",
    },
    servers: [{ url: SERVER_URL, description: "Current server" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      // giữ Message; các schema còn lại sẽ merge từ docs/components.yaml
      schemas: {
        Message: {
          type: "object",
          properties: { message: { type: "string", example: "OK" } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Admin", description: "Admin manage everything" },
      { name: "Posts (Verify)", description: "Verify all post for staff" },
      { name: "Posts (Public Search)", description: "Find all post which are verified" },
      { name: "Auth", description: "Authorization and login" },
      { name: "Users", description: "API for users manage their profile" },
      { name: "Users ( Posts )", description: "API for user manage their posts" },
      { name: "Plan & Checkout", description: "API for user payment" },
      { name: "Admin manage Plan", description: "API for admin manage the plan" },
    ],
  },
  apis: apisGlobs,
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec)); // tiện debug
}
