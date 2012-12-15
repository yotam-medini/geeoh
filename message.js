(function () {
    "use strict";

    var dialog_message;
    var element_icon;
    var element_text_message;

    function debug_log(message) {
        $("#debug").append("<br>" + message).show();
    }

    debug_log("Begin1");

    function _message(message, stitle, ui_icon, confirm_cb) {
        debug_log("_message: " + message);
	// $(element_icon).html("...icon... ");
	$(element_icon).removeClass().addClass("ui-icon " + ui_icon);
	$(element_text_message).html(message);
	$(dialog_message).dialog({
	    title: stitle,
	    resizable: false,
	    width: 3*$(window).width()/5,
	    height: 3*$(window).height()/5,
	    modal: true,
	    buttons: function () {
	        if (confirm_cb) {
		    return {
			"Ok" : function () {
			    $(this).dialog("close");
			    confirm_cb(true);
			},
			"Cancel" : function () { $(this).dialog("close"); }
		    }
		} else {
		    return {
			"Ok" : function () { $(this).dialog("close"); }
		    }
		}
	    }()
	}).parent().addClass("ui-state-error");
	$(dialog_message).dialog("open");
    }

    jQuery.error_message = function (message) {
        debug_log("error_message: " + message);
        _message(message, "Error", "ui-icon-alert");
    }

    jQuery.warn_message = function (message) {
        debug_log("warn_message: " + message);
        _message(message, "Warning", "ui-icon-info");
    }

    jQuery.info_message = function (message) {
        debug_log("info_message: " + message);
        _message(message, "Info", "ui-icon-info");
    }

    jQuery.confirm_message = function (message, confirm_cb) {
        debug_log("warn_message: " + message);
        _message(message, "Confirm", "ui-icon-circle-check", confirm_cb);
    }

    $(document).ready(function () {
        $("#debug-clear").click(function () { $("#debug").empty(); });
	element_icon = $("<span>")
            .css("float", "left")
            .css("margin", "0 7px 20px 0");
	element_text_message = $("<span>");
	element_text_message.html("Text Message");
	// $("body").append($("<div>").html("After body"));
	dialog_message = $("<div>");
	dialog_message.append($("<p>")
	    .append(element_icon)
	    .append(element_text_message));
	dialog_message.dialog({autoOpen: false});
    });

})();
