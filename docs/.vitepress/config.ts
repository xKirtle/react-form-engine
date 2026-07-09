import { defineConfig } from "vitepress";

export default defineConfig({
  title: "react-form-engine",
  description:
    "Data-driven forms for React: schemas for vocabulary, code for logic.",
  // deployed at https://<user>.github.io/react-form-engine/
  base: "/react-form-engine/",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/quickstart" },
      // becomes /react-form-engine/demo/ once the Pages workflow ships both
      {
        text: "Live demo",
        link: "https://xkirtle.github.io/react-form-engine/demo/",
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Quickstart", link: "/guide/quickstart" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/xKirtle/react-form-engine" },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
    },
  },
});
