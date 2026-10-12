"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscriptionController_js_1 = require("../controllers/subscriptionController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
router.post('/upgrade', subscriptionController_js_1.upgradeSubscription);
exports.default = router;
