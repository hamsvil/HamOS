import { Router, type IRouter } from "express";
import tasksRouter from "./tasks.js";
import logsRouter from "./logs.js";
import memoryRouter from "./memory.js";
import toolsRouter from "./tools.js";
import statusRouter from "./status.js";

const router: IRouter = Router();

router.use(tasksRouter);
router.use(logsRouter);
router.use(memoryRouter);
router.use(toolsRouter);
router.use(statusRouter);

export default router;
