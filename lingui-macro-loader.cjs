const babel = require("@babel/core");

const MACRO_PATTERN = /@lingui\/(core|react)\/macro/;

module.exports = function linguiMacroLoader(source) {
  if (!MACRO_PATTERN.test(source)) {
    return source;
  }

  const callback = this.async();
  const filename = this.resourcePath;
  const isTSX = filename.endsWith(".tsx");

  babel.transform(
    source,
    {
      filename,
      plugins: ["@lingui/babel-plugin-lingui-macro"],
      presets: [
        ["@babel/preset-typescript", { isTSX, allExtensions: true }],
      ],
      sourceType: "module",
      sourceMaps: true,
    },
    (err, result) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, result.code, result.map);
    },
  );
};
