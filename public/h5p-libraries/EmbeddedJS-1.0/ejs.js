/* Minimal EJS-compatible templating: <% code %>, <%= expr %> (raw output). */
(function () {
  function compile(text) {
    var src = "var __o=[];with(__d){", re = /<%(=)?([\s\S]*?)%>/g, last = 0, m;
    while ((m = re.exec(text))) {
      src += "__o.push(" + JSON.stringify(text.slice(last, m.index)) + ");";
      src += m[1] ? "__o.push((" + m[2] + "));" : m[2] + "\n";
      last = re.lastIndex;
    }
    src += "__o.push(" + JSON.stringify(text.slice(last)) + ");}return __o.join('');";
    return new Function("__d", src);
  }
  window.EJS = function (opts) { this.fn = compile((opts && opts.text) || ""); };
  window.EJS.prototype.render = function (data) { return this.fn(data || {}); };
})();
