import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv"
dotenv.config();

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "SWP391 2nd Electric Vehicle Platform ",
      version: "1.0.0",
      description: "API docs for SWP391",
    },
    servers: [{ url: "swp391-be-production.up.railway.app" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Quét các file có JSDoc để sinh schema
  apis: ["./routes/**/*.js", "./index.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
