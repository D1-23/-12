"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const exception_filter_1 = require("./common/filters/exception.filter");
const view_module_1 = require("./modules/view/view.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            // 平台 Module，提供平台能力
            fullstack_nestjs_core_1.PlatformModule.forRoot(),
            // ====== @route-section: business-modules START ======
            // Place all business modules here.Do NOT add fallback modules here.
            // ====== @route-section: business-modules END ======
            // ⚠️ @route-order: last
            // ViewModule is the fallback route module, must be registered last.
            view_module_1.ViewModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: exception_filter_1.GlobalExceptionFilter,
            },
        ],
    })
], AppModule);
