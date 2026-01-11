import express from "express";
import {
  getDashboardOverview,
  getTransactionHistory,
  getToolUsageHistory,
  getToolUsageStats,
  getCreditUsageSummary,
} from "../controllers/dashboardController.js";
import authUser from "../middlewares/auth.js";

const dashboardRouter = express.Router();

dashboardRouter.use(authUser);

dashboardRouter.get("/overview", getDashboardOverview);

dashboardRouter.get("/transactions", getTransactionHistory);

dashboardRouter.get("/tool-usage", getToolUsageHistory);

dashboardRouter.get("/tool-stats", getToolUsageStats);

dashboardRouter.get("/credit-summary", getCreditUsageSummary);

export default dashboardRouter;
