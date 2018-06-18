exports.header = null;

exports.footer = {
  height: "1cm",

  contents: function(pageNum, numPages) {
    return "<div class=\"align-right\"><small>" + pageNum + " / " + numPages + "</small></div>"
  }
};
