"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_js_1 = require("../controllers/analyticsController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
router.get('/summary', analyticsController_js_1.getAnalyticsSummary);
exports.default = router;
