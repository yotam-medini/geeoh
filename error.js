(function () {
    "use strict";

    var dialog_message;
    var element_icon;
    var element_text_message;

    function debug_log(message) {
        $("#debug").append("<br>" + message).show();
    }

    debug_log("Begin1");

    function ew_message(message, stitle, ui_icon) {
        debug_log("ew_message: " + message);
	// $(element_icon).html("...icon... ");
	$(element_icon).removeClass().addClass("ui-icon " + ui_icon);
	$(element_text_message).html(message);
	$(dialog_message).dialog({
	    title: stitle,
	    resizable: false,
	    width: 3*$(window).width()/5,
	    height: 3*$(window).height()/5,
	    modal: true,
	    buttons: {
		"Ok" : function () {
		    $(this).dialog("close");
		}
	    }
	}).parent().addClass("ui-state-error");
	$(dialog_message).dialog("open");
    }

    jQuery.error_message = function (message) {
        debug_log("error_message: " + message);
        ew_message(message, "Error", "ui-icon-alert");
    }

    jQuery.warn_message = function (message) {
        debug_log("warn_message: " + message);
        ew_message(message, "Warning", "ui-icon-info");
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
	$("body").append(dialog_message);

    });

})();
