(function () {
  "use strict";

  var OPERATOR = {
    scope: "operator",
    match: />>=?|<<=?|->|--|\+\+|&&|\|\||[?:~]|<=>|[-+*%&|^!=<>]=?/
  };

  var TYPE = {
    scope: "title.class",
    match: /\b[A-Z][A-Za-z0-9_]*\b/
  };

  function isOpaque(mode) {
    var names = [].concat(mode.className || [], mode.scope || []);
    return names.some(function (name) {
      return /^(string|comment|number|meta|regexp)$/.test(name);
    });
  }

  function inject(mode, seen) {
    if (!mode || typeof mode !== "object" || seen.has(mode)) {
      return;
    }
    seen.add(mode);

    if (Array.isArray(mode.contains)) {
      if (!isOpaque(mode)) {
        mode.contains.push(OPERATOR, TYPE);
      }
      mode.contains.forEach(function (child) {
        if (child && typeof child === "object") {
          inject(child, seen);
        }
      });
    }

    if (Array.isArray(mode.variants)) {
      mode.variants.forEach(function (variant) {
        inject(variant, seen);
      });
    }
  }

  var def = hljs.getLanguage("cpp").rawDefinition();
  inject(def, new Set());
  def.contains.unshift(OPERATOR);
  hljs.registerLanguage("cpp", function () {
    return def;
  });

  hljs.highlightAll();
})();
