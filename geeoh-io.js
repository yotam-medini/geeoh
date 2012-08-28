// Here I am.
(function () {
    "use strict";

    var cgi_url = "cgi-bin/geeoh-io.cgi";
    var user_data_current_path = "";

    function debug_log(message) {
        $("#debug").append("<br>" + message).show();
    }

    $(document).ready(function () {

        debug_log("Begin1");
        $("#debug-clear").click(function () {
            $("#debug").empty();
            debug_log("cleared");
        });

        function d2(n) {
            if (n < 10) { n = "0" + n; }
            return n;
        }

        function ymdhms(epoch) {
            var d = new Date(1000*epoch);
            var s = 
                d.getFullYear() + "/" + d2(d.getMonth() + 1) + "/" + 
                d2(d.getDate()) + 
                " " +
                d2(d.getHours()) + ":" + d2(d.getMinutes()) + ":" + 
                d2(d.getSeconds());
            return s;
        }

        var io = function () {
            var user_data_current_path = "";
            return {
                cgi_url: "cgi-bin/geeoh-io.cgi",
                tree_refresh_cb: function(data) {
                    var err = "", edata = "";
                    try { edata = JSON.parse(data); }
                    catch(ex) { err = ex; edata = null;}
                    debug_log("tree_refresh_cb: data="+data + ", edata="+edata);
                    var tbody = $("#tbody-data");
                    tbody.empty();
                    if (!err) {
                        var udcp = user_data_current_path;
                        if (udcp === "") { udcp = "/"; }
                        $("#th-path").empty().html(udcp);
                        var dlist = edata["dlist"];
                        for (var i = 0; i < dlist.length; i++) {
                            var e = dlist[i];
                            tbody.append($("<tr>")
                                .append($("<td>")
                                    .append($('<button title="Folder">')
                                        .button({
                                            text: false,
                                            icons: {
                                                primary: "ui-icon-folder-open"
                                            }}))
                                            .click(function (ve) {
                                                //debug_log("folder-open: "+e +
                                                //", ei="+ei);
                                                return function (ei) {
                                                   debug_log("folder-open: "+ve);
                                                };
                                            }(e)))
                                .append($("<td>")
                                    .text(e)));
                        }
                        var flist = edata["flist"];
                        for (var i = 0; i < flist.length; i++) {
                            var e = flist[i];
                            tbody.append($("<tr>")
                                .append($("<td>")
                                    .append($('<button title="Open">')
                                        .button({
                                            text: false,
                                            icons: {
                                                primary: "ui-icon-play"
                                            }})))
                                .append($("<td>")
                                    .text(e[0]))
                                .append($("<td>")
                                    .text(e[1]).css("text-align", "right"))
                                .append($("<td>")
                                    .text(ymdhms(e[2]))));
                        }
                    }
                },
                refresh: function () {
                    debug_log("tree-refresh: cgi="+this.cgi_url);
                    $.post(this.cgi_url,
                        {
                            "action": "refresh",
                            "path": user_data_current_path
                        },
                        this.tree_refresh_cb);
                },
            };
        }();

        debug_log("io.cgi="+io.cgi_url);
        $("#tree-refresh").click(function() { io.refresh(); });
    });

})();


