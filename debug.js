(function () {
    "use strict";

    var debug_win;
    var debug_div;

    function debug_log0(message) {}

    function debug_log_dummy(message) {}

    function debug_log_real(message) {
        var html, entry;
        if (!debug_win) {
            debug_win = window.open("about:blank", "GeeOH-Debug",
                "width=300,height=300,scrollbars=1,resizable=1");
            html = "<html><head><title>GeeOH Debug</title></head><body>" +
	        '<input type=button id="debug-clear" value="Clear1">' +
                '<div id="debug">Hello1<br></div>' +
                "</body></html>";
            debug_win.document.open();
            debug_win.document.write(html);
            debug_win.document.close();
            debug_div = debug_win.document.getElementById("debug");
            var clear = debug_win.document.getElementById("debug-clear");
	    // $(clear).click(function () {
	    clear.onclick = function () { 
	         $(debug_div).empty(); 
                 debug_log_real("Cleared");                 
            };
        }
        if (debug_div) {
            //entry = document.createElement("div");
            //entry.appendChild(document.createTextNode(message));
            //c.appendChild(entry);
	    $(debug_div).append("<br>" + message).show();
        }
    }

    jQuery.debug_log = function (message) { DEBUG_LOG_CHOOSE(message) };
    jQuery.debug_log0 = function (message) { };

})();
