"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catalogController_js_1 = require("../controllers/catalogController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
router.get('/search', catalogController_js_1.searchCatalog);
exports.default = router;
