"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const placesController_js_1 = require("../controllers/placesController.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
router.get('/search', placesController_js_1.searchPlaces);
exports.default = router;
