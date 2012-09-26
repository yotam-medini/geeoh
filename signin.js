(function () {
    "use strict";

    function debug_log(message) {
        $("#debug").append("<br>" + message).show();
    }

    debug_log("Begin1");

    var user_signed = null;
    var user_signing = null;

    $(document).ready(function () {
        var dlg_signin = $("#dlg-signin");
        var dlg_signup = $("#dlg-signup");
        var dlg_reset = $("#dlg-reset");
        function update_status () {
            var tr = $("#tr-signin-status");
            tr.empty();
            debug_log("update_status: user_signed="+user_signed);
            if (user_signed) {
                tr.append($("<td>")
                    .text(user_signed)
                          .css({"color": "green", "background-color": "#eee"})
                         )
                .append($("<td>")
                    .append($('<button" title="logout">')
                        .button({label: "Sign Out"})
                            .click(function () {
                                debug_log("Logout");
                                $.post("signin.php",
                                    {
                                        "action": "signout",
                                    },
                                    function (data) {
                                        debug_log("signout cb: data="+data);
                                        user_signed = null;
                                        update_status();
                                    })
                            })));
            } else {
                tr
                .append($("<td>")
                    .append($('<button title="signin">')
                        .button({ label: "Sign In" })
                            .click(function () {
                                debug_log("Signin");
                                dlg_signin.dialog("open");
                            })))
                .append($("<td>")
                    .append($('<button title="signup">')
                        .button({ label: "Sign Up" })
                            .click(function () {
                                dlg_signup.dialog("open");
                            })));
             }
        }
        update_status();

        function signin_cb(data) {
            debug_log("signin_cb: data="+data);
            if (data.substr(0, 7) == "error: ") {
                $.error_message(data.substr(7));
                user_signed = null;
            } else {
                debug_log("signin SUCCESS");
                user_signed = user_signing;
            }
            update_status();
        }

        dlg_signin.dialog({
            autoOpen: false,
            title: "Sign In",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            buttons: {
                "OK": function () {
                    debug_log("okdbg");
                    user_signing = $("#signin-name").val();
                    debug_log("okdbg: name="+user_signing);
                    var vpw = $("#signin-pw").val();
                    debug_log("okdbg: pw="+vpw);
                    $(this).dialog("close");
                    debug_log("okdbg: closed=");
                    $.post("signin.php", // "cgi-bin/signin.php",
                        {
                            "action": "signin",
                            "name": user_signing,
                            "pw": vpw
                        },
                        signin_cb);
                    debug_log("okdbg: after post");
                 },
                "Cancel": function () { $(this).dialog("close"); }
            }
        });

        dlg_signup.dialog({
            autoOpen: false,
            title: "Sign Up",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            buttons: {
                "OK": function () { debug_log("ok"); },
                "cancel": function () { $(this).dialog("close"); }
            }
        });

        dlg_reset.dialog({
            autoOpen: false,
            title: "Reset Password",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            buttons: {
                "OK": function () {
                    debug_log("dlg_reset: ok"); 
                    $(this).dialog("close");
                    var e_address = $("#reset-email").val();
		    debug_log("reset: e_address="+e_address);
                    $.post("signin.php", // "cgi-bin/signin.php",
                        {
                            "action": "reset",
                            "email": e_address
                        },
                        function (data) {
                            debug_log("reset callback: data="+
				      data.substr(0, 20));
                            if (data.substr(0, 7) == "error: ") {
                                $.error_message(data.substr(7));
                            } else {
                                $.warn_message("New optional password sent" + 
                                               "<br>to: " + e_address);
                            }
                        });
                },
                "cancel": function () { $(this).dialog("close"); }
            }
        });

        $("#forgot").click(function () { 
            $(dlg_signin).dialog("close");
            $(dlg_reset).dialog("open");
        });
        $("#debug-clear").click(function () { $("#debug").empty(); });
    });

})();
