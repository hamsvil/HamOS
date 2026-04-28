import { Router, type IRouter } from "express";
import healthRouter from "./health";
import autopilotRouter from "./autopilot/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/autopilot", autopilotRouter);

export default router;
