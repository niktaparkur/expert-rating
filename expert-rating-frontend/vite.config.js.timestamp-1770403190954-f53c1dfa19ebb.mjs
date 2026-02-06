// vite.config.js
import { defineConfig, transformWithEsbuild } from "file:///D:/D_save/freelance/expert-rating/expert-rating-frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/D_save/freelance/expert-rating/expert-rating-frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import legacy from "file:///D:/D_save/freelance/expert-rating/expert-rating-frontend/node_modules/@vitejs/plugin-legacy/dist/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "file:///D:/D_save/freelance/expert-rating/expert-rating-frontend/node_modules/@storybook/addon-vitest/dist/vitest-plugin/index.mjs";
var __vite_injected_original_dirname = "D:\\D_save\\freelance\\expert-rating\\expert-rating-frontend";
var __vite_injected_original_import_meta_url = "file:///D:/D_save/freelance/expert-rating/expert-rating-frontend/vite.config.js";
var dirname = typeof __vite_injected_original_dirname !== "undefined" ? __vite_injected_original_dirname : path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
function handleModuleDirectivesPlugin() {
  return {
    name: "handle-module-directives-plugin",
    transform(code, id) {
      if (id.includes("@vkontakte/icons")) {
        code = code.replace(/"use-client";?/g, "");
      }
      return {
        code
      };
    }
  };
}
function threatJsFilesAsJsx() {
  return {
    name: "treat-js-files-as-jsx",
    async transform(code, id) {
      if (!id.match(/src\/.*\.js$/)) return null;
      return transformWithEsbuild(code, id, {
        loader: "jsx",
        jsx: "automatic"
      });
    }
  };
}
var vite_config_default = defineConfig({
  base: "./",
  plugins: [
    react(),
    threatJsFilesAsJsx(),
    handleModuleDirectivesPlugin(),
    legacy({
      targets: ["defaults", "not IE 11"]
    })
  ],
  server: {
    allowedHosts: "so.potokrechi.ru",
    hmr: {
      protocol: "wss",
      host: "so.potokrechi.ru",
      clientPort: 443
    }
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    },
    include: ["@storybook/addon-actions"]
  },
  build: {
    outDir: "build"
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook")
          })
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [
              {
                browser: "chromium"
              }
            ]
          },
          setupFiles: [".storybook/vitest.setup.js"]
        }
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook")
          })
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [
              {
                browser: "chromium"
              }
            ]
          },
          setupFiles: [".storybook/vitest.setup.js"]
        }
      }
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEX3NhdmVcXFxcZnJlZWxhbmNlXFxcXGV4cGVydC1yYXRpbmdcXFxcZXhwZXJ0LXJhdGluZy1mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcRF9zYXZlXFxcXGZyZWVsYW5jZVxcXFxleHBlcnQtcmF0aW5nXFxcXGV4cGVydC1yYXRpbmctZnJvbnRlbmRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0Rfc2F2ZS9mcmVlbGFuY2UvZXhwZXJ0LXJhdGluZy9leHBlcnQtcmF0aW5nLWZyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3QvY29uZmlnXCIgLz5cbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHJhbnNmb3JtV2l0aEVzYnVpbGQgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IGxlZ2FjeSBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tbGVnYWN5XCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcIm5vZGU6dXJsXCI7XG5pbXBvcnQgeyBzdG9yeWJvb2tUZXN0IH0gZnJvbSBcIkBzdG9yeWJvb2svYWRkb24tdml0ZXN0L3ZpdGVzdC1wbHVnaW5cIjtcbmNvbnN0IGRpcm5hbWUgPVxuICB0eXBlb2YgX19kaXJuYW1lICE9PSBcInVuZGVmaW5lZFwiXG4gICAgPyBfX2Rpcm5hbWVcbiAgICA6IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuXG4vLyBNb3JlIGluZm8gYXQ6IGh0dHBzOi8vc3Rvcnlib29rLmpzLm9yZy9kb2NzL25leHQvd3JpdGluZy10ZXN0cy9pbnRlZ3JhdGlvbnMvdml0ZXN0LWFkZG9uXG5mdW5jdGlvbiBoYW5kbGVNb2R1bGVEaXJlY3RpdmVzUGx1Z2luKCkge1xuICByZXR1cm4ge1xuICAgIG5hbWU6IFwiaGFuZGxlLW1vZHVsZS1kaXJlY3RpdmVzLXBsdWdpblwiLFxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiQHZrb250YWt0ZS9pY29uc1wiKSkge1xuICAgICAgICBjb2RlID0gY29kZS5yZXBsYWNlKC9cInVzZS1jbGllbnRcIjs/L2csIFwiXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29kZSxcbiAgICAgIH07XG4gICAgfSxcbiAgfTtcbn1cbmZ1bmN0aW9uIHRocmVhdEpzRmlsZXNBc0pzeCgpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBcInRyZWF0LWpzLWZpbGVzLWFzLWpzeFwiLFxuICAgIGFzeW5jIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgaWYgKCFpZC5tYXRjaCgvc3JjXFwvLipcXC5qcyQvKSkgcmV0dXJuIG51bGw7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtV2l0aEVzYnVpbGQoY29kZSwgaWQsIHtcbiAgICAgICAgbG9hZGVyOiBcImpzeFwiLFxuICAgICAgICBqc3g6IFwiYXV0b21hdGljXCIsXG4gICAgICB9KTtcbiAgICB9LFxuICB9O1xufVxuXG4vKipcbiAqIFNvbWUgY2h1bmtzIG1heSBiZSBsYXJnZS5cbiAqIFRoaXMgd2lsbCBub3QgYWZmZWN0IHRoZSBsb2FkaW5nIHNwZWVkIG9mIHRoZSBzaXRlLlxuICogV2UgY29sbGVjdCBzZXZlcmFsIHZlcnNpb25zIG9mIHNjcmlwdHMgdGhhdCBhcmUgYXBwbGllZCBkZXBlbmRpbmcgb24gdGhlIGJyb3dzZXIgdmVyc2lvbi5cbiAqIFRoaXMgaXMgZG9uZSBzbyB0aGF0IHlvdXIgY29kZSBydW5zIGVxdWFsbHkgd2VsbCBvbiB0aGUgc2l0ZSBhbmQgaW4gdGhlIG9kci5cbiAqIFRoZSBkZXRhaWxzIGFyZSBoZXJlOiBodHRwczovL2Rldi52ay5jb20vbWluaS1hcHBzL2RldmVsb3BtZW50L29uLWRlbWFuZC1yZXNvdXJjZXMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6IFwiLi9cIixcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgdGhyZWF0SnNGaWxlc0FzSnN4KCksXG4gICAgaGFuZGxlTW9kdWxlRGlyZWN0aXZlc1BsdWdpbigpLFxuICAgIGxlZ2FjeSh7XG4gICAgICB0YXJnZXRzOiBbXCJkZWZhdWx0c1wiLCBcIm5vdCBJRSAxMVwiXSxcbiAgICB9KSxcbiAgXSxcblxuICBzZXJ2ZXI6IHtcbiAgICBhbGxvd2VkSG9zdHM6IFwic28ucG90b2tyZWNoaS5ydVwiLFxuICAgIGhtcjoge1xuICAgICAgcHJvdG9jb2w6IFwid3NzXCIsXG4gICAgICBob3N0OiBcInNvLnBvdG9rcmVjaGkucnVcIixcbiAgICAgIGNsaWVudFBvcnQ6IDQ0MyxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBmb3JjZTogdHJ1ZSxcbiAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgbG9hZGVyOiB7XG4gICAgICAgIFwiLmpzXCI6IFwianN4XCIsXG4gICAgICB9LFxuICAgIH0sXG4gICAgaW5jbHVkZTogW1wiQHN0b3J5Ym9vay9hZGRvbi1hY3Rpb25zXCJdLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogXCJidWlsZFwiLFxuICB9LFxuICB0ZXN0OiB7XG4gICAgcHJvamVjdHM6IFtcbiAgICAgIHtcbiAgICAgICAgZXh0ZW5kczogdHJ1ZSxcbiAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgIC8vIFRoZSBwbHVnaW4gd2lsbCBydW4gdGVzdHMgZm9yIHRoZSBzdG9yaWVzIGRlZmluZWQgaW4geW91ciBTdG9yeWJvb2sgY29uZmlnXG4gICAgICAgICAgLy8gU2VlIG9wdGlvbnMgYXQ6IGh0dHBzOi8vc3Rvcnlib29rLmpzLm9yZy9kb2NzL25leHQvd3JpdGluZy10ZXN0cy9pbnRlZ3JhdGlvbnMvdml0ZXN0LWFkZG9uI3N0b3J5Ym9va3Rlc3RcbiAgICAgICAgICBzdG9yeWJvb2tUZXN0KHtcbiAgICAgICAgICAgIGNvbmZpZ0RpcjogcGF0aC5qb2luKGRpcm5hbWUsIFwiLnN0b3J5Ym9va1wiKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgIG5hbWU6IFwic3Rvcnlib29rXCIsXG4gICAgICAgICAgYnJvd3Nlcjoge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGhlYWRsZXNzOiB0cnVlLFxuICAgICAgICAgICAgcHJvdmlkZXI6IFwicGxheXdyaWdodFwiLFxuICAgICAgICAgICAgaW5zdGFuY2VzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBicm93c2VyOiBcImNocm9taXVtXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgc2V0dXBGaWxlczogW1wiLnN0b3J5Ym9vay92aXRlc3Quc2V0dXAuanNcIl0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBleHRlbmRzOiB0cnVlLFxuICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgLy8gVGhlIHBsdWdpbiB3aWxsIHJ1biB0ZXN0cyBmb3IgdGhlIHN0b3JpZXMgZGVmaW5lZCBpbiB5b3VyIFN0b3J5Ym9vayBjb25maWdcbiAgICAgICAgICAvLyBTZWUgb3B0aW9ucyBhdDogaHR0cHM6Ly9zdG9yeWJvb2suanMub3JnL2RvY3MvbmV4dC93cml0aW5nLXRlc3RzL2ludGVncmF0aW9ucy92aXRlc3QtYWRkb24jc3Rvcnlib29rdGVzdFxuICAgICAgICAgIHN0b3J5Ym9va1Rlc3Qoe1xuICAgICAgICAgICAgY29uZmlnRGlyOiBwYXRoLmpvaW4oZGlybmFtZSwgXCIuc3Rvcnlib29rXCIpLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgbmFtZTogXCJzdG9yeWJvb2tcIixcbiAgICAgICAgICBicm93c2VyOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgaGVhZGxlc3M6IHRydWUsXG4gICAgICAgICAgICBwcm92aWRlcjogXCJwbGF5d3JpZ2h0XCIsXG4gICAgICAgICAgICBpbnN0YW5jZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGJyb3dzZXI6IFwiY2hyb21pdW1cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzZXR1cEZpbGVzOiBbXCIuc3Rvcnlib29rL3ZpdGVzdC5zZXR1cC5qc1wiXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsY0FBYyw0QkFBNEI7QUFDbkQsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sWUFBWTtBQUNuQixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxxQkFBcUI7QUFOOUIsSUFBTSxtQ0FBbUM7QUFBd0wsSUFBTSwyQ0FBMkM7QUFPbFIsSUFBTSxVQUNKLE9BQU8scUNBQWMsY0FDakIsbUNBQ0EsS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUdqRCxTQUFTLCtCQUErQjtBQUN0QyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixVQUFVLE1BQU0sSUFBSTtBQUNsQixVQUFJLEdBQUcsU0FBUyxrQkFBa0IsR0FBRztBQUNuQyxlQUFPLEtBQUssUUFBUSxtQkFBbUIsRUFBRTtBQUFBLE1BQzNDO0FBQ0EsYUFBTztBQUFBLFFBQ0w7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUNBLFNBQVMscUJBQXFCO0FBQzVCLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE1BQU0sVUFBVSxNQUFNLElBQUk7QUFDeEIsVUFBSSxDQUFDLEdBQUcsTUFBTSxjQUFjLEVBQUcsUUFBTztBQUN0QyxhQUFPLHFCQUFxQixNQUFNLElBQUk7QUFBQSxRQUNwQyxRQUFRO0FBQUEsUUFDUixLQUFLO0FBQUEsTUFDUCxDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQVNBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLG1CQUFtQjtBQUFBLElBQ25CLDZCQUE2QjtBQUFBLElBQzdCLE9BQU87QUFBQSxNQUNMLFNBQVMsQ0FBQyxZQUFZLFdBQVc7QUFBQSxJQUNuQyxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sY0FBYztBQUFBLElBQ2QsS0FBSztBQUFBLE1BQ0gsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixPQUFPO0FBQUEsSUFDUCxnQkFBZ0I7QUFBQSxNQUNkLFFBQVE7QUFBQSxRQUNOLE9BQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLDBCQUEwQjtBQUFBLEVBQ3RDO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osVUFBVTtBQUFBLE1BQ1I7QUFBQSxRQUNFLFNBQVM7QUFBQSxRQUNULFNBQVM7QUFBQTtBQUFBO0FBQUEsVUFHUCxjQUFjO0FBQUEsWUFDWixXQUFXLEtBQUssS0FBSyxTQUFTLFlBQVk7QUFBQSxVQUM1QyxDQUFDO0FBQUEsUUFDSDtBQUFBLFFBQ0EsTUFBTTtBQUFBLFVBQ0osTUFBTTtBQUFBLFVBQ04sU0FBUztBQUFBLFlBQ1AsU0FBUztBQUFBLFlBQ1QsVUFBVTtBQUFBLFlBQ1YsVUFBVTtBQUFBLFlBQ1YsV0FBVztBQUFBLGNBQ1Q7QUFBQSxnQkFDRSxTQUFTO0FBQUEsY0FDWDtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsVUFDQSxZQUFZLENBQUMsNEJBQTRCO0FBQUEsUUFDM0M7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsU0FBUztBQUFBLFFBQ1QsU0FBUztBQUFBO0FBQUE7QUFBQSxVQUdQLGNBQWM7QUFBQSxZQUNaLFdBQVcsS0FBSyxLQUFLLFNBQVMsWUFBWTtBQUFBLFVBQzVDLENBQUM7QUFBQSxRQUNIO0FBQUEsUUFDQSxNQUFNO0FBQUEsVUFDSixNQUFNO0FBQUEsVUFDTixTQUFTO0FBQUEsWUFDUCxTQUFTO0FBQUEsWUFDVCxVQUFVO0FBQUEsWUFDVixVQUFVO0FBQUEsWUFDVixXQUFXO0FBQUEsY0FDVDtBQUFBLGdCQUNFLFNBQVM7QUFBQSxjQUNYO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxVQUNBLFlBQVksQ0FBQyw0QkFBNEI7QUFBQSxRQUMzQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
