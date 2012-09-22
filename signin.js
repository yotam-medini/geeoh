(function () {
    "use strict";

    function debug_log(message) {
        $("#debug").append("<br>" + message).show();
    }

    debug_log("Begin1");

    var user_signed = null;

    $(document).ready(function () {
        var dlg_signin = $("#dlg-signin");
        var dlg_signup = $("#dlg-signup");
        function update_status () {
            var tr = $("#tr-signin-status");
            tr.empty();
            if (user_signed) {
                tr.append($("<td>")
                    .text(user_signed))
                .append($("<td>")
                    .append($('<button" title="logout">')
                        .button({label: "Sign Out"})
                            .click(function () {
                                debug_log("Logout");
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
                    var vname = $("#signin-name").val();
                    debug_log("okdbg: name="+vname);
                    var vpw = $("#signin-pw").val();
                    debug_log("okdbg: pw="+vpw);
                    $(this).dialog("close");
                    debug_log("okdbg: closed=");
                    $.post("signin.php", // "cgi-bin/signin.php",
                        {
                            "action": "signin",
                            "name": vname,
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

        $("#debug-clear").click(function () { $("#debug").empty(); });
    });

})();
