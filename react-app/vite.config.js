var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
var repoName = (_a = process.env.GITHUB_REPOSITORY) === null || _a === void 0 ? void 0 : _a.split("/")[1];
var isPagesBuild = process.env.GITHUB_ACTIONS === "true";
export default defineConfig({
    plugins: [react()],
    base: isPagesBuild && repoName ? "/".concat(repoName, "/") : "/",
});
