"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRouter = void 0;
const express_1 = require("express");
const group_controller_js_1 = require("../controllers/group.controller.js");
const auth_js_1 = require("../middleware/auth.js");
exports.groupRouter = (0, express_1.Router)();
exports.groupRouter.get('/', auth_js_1.optionalAuth, group_controller_js_1.groupController.list);
exports.groupRouter.get('/:id', auth_js_1.optionalAuth, group_controller_js_1.groupController.getById);
exports.groupRouter.post('/', auth_js_1.authenticate, group_controller_js_1.groupController.create);
exports.groupRouter.patch('/:id', auth_js_1.authenticate, group_controller_js_1.groupController.update);
exports.groupRouter.post('/:id/join', auth_js_1.authenticate, group_controller_js_1.groupController.join);
exports.groupRouter.post('/:id/leave', auth_js_1.authenticate, group_controller_js_1.groupController.leave);
exports.groupRouter.get('/:id/members', auth_js_1.optionalAuth, group_controller_js_1.groupController.getMembers);
//# sourceMappingURL=group.routes.js.map