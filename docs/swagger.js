// ./docs/swagger.js
import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv";
dotenv.config();

/**
 * Ưu tiên URL từ ENV:
 * - API_BASE_URL (ví dụ: https://swp391-be-production.up.railway.app)
 * - nếu không có, fallback về http://localhost:<BE_PORT|8081>
 */
const SERVER_URL =
  process.env.API_BASE_URL ||
  `http://localhost:${Number(process.env.BE_PORT) || 8081}`;

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "SWP391 2nd Electric Vehicle Platform",
      version: "1.0.0",
      description: "API docs for SWP391",
    },
    servers: [
      { url: SERVER_URL, description: "Current server" },
      // Thêm server prod cố định nếu muốn:
      // { url: "https://swp391-be-production.up.railway.app", description: "Production" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      // (Tuỳ chọn) đặt một vài schemas dùng chung
      schemas: {
        Message: {
          type: "object",
          properties: {
            message: { type: "string", example: "OK" },
          },
        },
      },
    },
    // Áp dụng Bearer cho mặc định tất cả API (endpoint public có thể override: `security: []`)
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Admin", description: "Admin manage everything" },
      { name: "Posts (Verify)", description: "Verify all post for staff" },
      { name: "Posts (Public Search)", description: "Find all post which are verified" },
      { name: "Auth", description: "Authorization and login" },
      { name: "Users", description: "API for users manage their profile" },
      { name: "Users ( Posts )", description: "API for user manage their posts" },
      { name: "Plan & Checkout", description: "API for user payment"},
      { name: "Admin manage Plan", description : "API for admin manage the plan"}
    ],
  },

  // Quét các file có @openapi JSDoc
  // Lưu ý: đường dẫn tính từ project root (process.cwd()).
  apis: [
    "./routes/**/*.js",
    "./controller/**/*.js",
    "./controllers/**/*.js",
    "./docs/**/*.js",     // nếu có file doc riêng (vd: admin.swagger.js)
    "./index.js",         // nếu bạn có doc trong file này
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
