import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression() as express.RequestHandler);

const SENSITIVE_QS = /([?&])(token|key|password|apiKey|api_key|secret|authorization)=[^&]*/gi;
function redactUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(SENSITIVE_QS, "$1$2=[REDACTED]");
}

app.use(
  pinoHttp({
    logger,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["set-cookie"]',
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
        "req.body.fullKey",
        "req.body.key",
        "req.body.apiKey",
        "req.body.token",
      ],
      censor: "[REDACTED]",
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: redactUrl(req.url)?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const corsOriginEnv = process.env.CORS_ORIGINS?.trim();
const corsOrigins = corsOriginEnv && corsOriginEnv !== "*"
  ? corsOriginEnv.split(",").map((s) => s.trim()).filter(Boolean)
  : null;
app.use(
  cors({
    origin: corsOrigins ?? true,
    credentials: true,
  }),
);

app.use((req, res, next) => {
  const id = (req as any).id ?? req.headers["x-request-id"];
  if (id) res.setHeader("x-request-id", String(id));
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/healthz",
});
app.use(globalLimiter);

const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `u:${req.session?.userId ?? "anon"}|${ipKeyGenerator(req.ip ?? "")}`,
});
app.use("/api/validate", validateLimiter);

const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `u:${req.session?.userId ?? "anon"}|${ipKeyGenerator(req.ip ?? "")}`,
  skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
});
app.use("/api/keys", mutationLimiter);
app.use("/api/scheduled", mutationLimiter);
app.use("/api/webhooks", mutationLimiter);

app.use("/api", router);

export default app;
