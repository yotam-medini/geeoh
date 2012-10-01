(function () {
    "use strict";

    var user_signed = null;
    var user_signing = null;

    $(document).ready(function () {
        var dlg_signin = $("#dlg-signin");
        var dlg_signup = $("#dlg-signup");
        var dlg_reset = $("#dlg-reset");
        var dlg_uctl = $("#dlg-user-control");

        function update_status () {
            var tr = $("#tr-signin-status");
            tr.empty();
            $.debug_log("update_status: user_signed="+user_signed);
            if (user_signed) {
                tr.append($("<td>")
                    .append($('<button" title=' + 
                        '"User logged in.\nLogin/Update/Remove...">')
                        .button({label: user_signed})
                            .css({"color": "green",
                                "background-color": "#eee"})
                            .click(function () { dlg_uctl.dialog("open"); })
                        )
                    );
            } else {
                tr
                .append($("<td>")
                    .append($('<button title="signin">')
                        .button({ label: "Sign In" })
                            .click(function () {
                                $.debug_log("Signin");
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
            $.debug_log("signin_cb: data="+data);
            if (data.substr(0, 7) == "error: ") {
                $.error_message(data.substr(7));
                user_signed = null;
            } else {
                $.debug_log("signin SUCCESS");
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
                    $.debug_log("okdbg");
                    user_signing = $("#signin-name").val();
                    $.debug_log("okdbg: name="+user_signing);
                    var vpw = $("#signin-pw").val();
                    $.debug_log("okdbg: pw="+vpw);
                    $(this).dialog("close");
                    $.debug_log("okdbg: closed=");
                    $.post("signin.php", // "cgi-bin/signin.php",
                        {
                            "action": "signin",
                            "name": user_signing,
                            "pw": vpw
                        },
                        signin_cb);
                    $.debug_log("okdbg: after post");
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
                "OK": function () { 
		    var pw = $("#signup-pw").val();
		    var pw2 = $("#signup-pw2").val();
		    if (pw === pw2) {
                        $(this).dialog("close");
                        $.debug_log("signup: pw="+pw+".");
                        $.post("signin.php",
                            {
                                "action": "signup",
                                "name": $("#signup-name").val(),
                                "email": $("#signup-email").val(),
                                "pw": pw
                            },
                            function (data) {
                                $.debug_log("reset callback: data="+data);
                                if (data.substr(0, 7) == "error: ") {
                                    $.error_message(data.substr(7));
                                } else {
                                    $.debug_log("signin SUCCESS");
                                    $.info_message("Confirmation mail sent");
                                }
                                user_signed = null;
                                update_status();
                            });
		    } else {
                        $.error_message("Password verification failure");
                    }
		},
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
                    $.debug_log("dlg_reset: ok"); 
                    $(this).dialog("close");
                    var e_address = $("#reset-email").val();
		    $.debug_log("reset: e_address="+e_address);
                    $.post("signin.php", // "cgi-bin/signin.php",
                        {
                            "action": "reset",
                            "email": e_address
                        },
                        function (data) {
                            $.debug_log("reset callback: data="+
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

        dlg_uctl.dialog({
            autoOpen: false,
            title: "User Control ",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            buttons: {
                "OK": function () {
		    var pw = $("#uctl-pw").val();
		    var pw2 = $("#uctl-pw2").val();
		    if (pw === pw2) {
                        $(this).dialog("close");
                        $.debug_log("Change pw="+pw);
                        $.post("signin.php",
                            {
                                "action": "pwnew",
                                "name": user_signed,
                                "pw": pw
                            },
                            function (data) {
                                $.debug_log("reset callback: data="+data);
                                if (data.substr(0, 7) == "error: ") {
                                    $.error_message(data.substr(7));
                                } else {
                                    $.debug_log("signin SUCCESS");
                                    $.info_message("New password set");
                                }
                            });
		    } else {
                        $.error_message("Password verification failure");
                    }
		},
                "cancel": function () { $(this).dialog("close"); }
            }
        });

        $("#forgot").click(function () { 
            $(dlg_signin).dialog("close");
            $(dlg_reset).dialog("open");
        });

        $("#logout").click(function () {
            $.debug_log("Logout");
            $(dlg_uctl).dialog("close");
            $.post("signin.php",
                {
                    "action": "signout",
                },
                function (data) {
                    $.debug_log("signout cb: data="+data);
                    user_signed = null;
                    update_status();
                })
        });

        $("#uremove").click(function () {
            $.debug_log("User Remove ");
            $(dlg_uctl).dialog("close");
            $.confirm_message("Are you sure you want to remove account?" +
                 "<br>Note that your data may be erased as well",
                 function () {
                    $.post("signin.php",
                        {
                            "action": "remove",
                            name: user_signed
                        },
                        function (data) {
                            $.debug_log("uremove cb: data="+data);
                            user_signed = null;
                            update_status();
                        });
                 });
        });


        $("#debug-clear").click(function () { $("#debug").empty(); });
    });

})();
