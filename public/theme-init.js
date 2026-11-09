// Runs before paint. Theme values: "light", "dark", or "system" (and a missing key).
// "system" follows the device. Text size is "large", or absent for the default.
// If a new setting must apply before first paint, set it here and list it in src/data/notices.ts.
(function () {
  try {
    var stored = localStorage.getItem("memento:theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#1b1915" : "#f4efe6");
    if (localStorage.getItem("memento:text") === "large") {
      document.documentElement.dataset.text = "large";
    }
  } catch (e) {}
})();
