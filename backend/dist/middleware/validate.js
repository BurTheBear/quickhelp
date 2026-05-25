"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
// Validate request body, query, or params with a Zod schema
const validate = (schema, source = 'body') => async (req, _res, next) => {
    try {
        const parsed = await schema.parseAsync(req[source]);
        req[source] = parsed;
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            next(err);
        }
        else {
            next(err);
        }
    }
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map