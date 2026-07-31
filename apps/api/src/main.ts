import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false, // GraphQL Sandbox needs relaxed CSP; tighten once the web app is the only consumer.
    }),
  );
  app.use(cookieParser(process.env.SESSION_SECRET ?? "dev-secret-change-me"));

  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim());
  // Vite bumps to the next free port (5174, 5175, ...) whenever 5173 is already
  // taken by another dev server, so a single hardcoded origin breaks CORS on any
  // localhost port drift. Only relax the check outside production.
  const localhostAnyPort = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || (!isProduction && localhostAnyPort.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ABMS API listening on http://localhost:${port}/graphql`);
}

bootstrap();
