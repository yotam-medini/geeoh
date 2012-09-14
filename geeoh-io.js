// Here I am.
(function () {
    "use strict";

    var cgi_url = "cgi-bin/geeoh-io.cgi";
    // var user_data_current_path = "";

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

        var io = {
            curr_path: "", // user data
            cgi_url: "cgi-bin/geeoh-io.cgi",
            table_fill: function (dlist, flist) {
                var tbody = $("#tbody-data");
                tbody.empty();
                var udcp = this.curr_path;
                if (udcp === "") { udcp = "/"; }
                $("#th-path").empty().html(udcp);
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
                                           io.cdir(ve);
                                           //user_data_current_path = ve;
                                           //io.refresh();
                                        };
                                    }(e)))
                        .append($("<td>")
                            .text(e))
                        .append($("<td>")
                            .append($('<button title="Delete">')
                                .button({
                                    text: false,
                                    icons: {
                                        primary: "ui-icon-trash"
                                    }}))
                                    .click(function (ve) {
                                        return function (ei) {
                                           debug_log("delete: "+ve);
                                           io.del("d", ve);
                                        };
                                    }(e))));
                }
                for (var i = 0; i < flist.length; i++) {
                    var e = flist[i];
                    tbody.append($("<tr>")
                        .append($("<td>")
                            .append($('<button title="Open">')
                                .button({
                                    text: false,
                                    icons: {
                                        primary: "ui-icon-play"
                                    }}))
                                    .click(function (iot, ve) {
                                        return function (ei) { 
                                            debug_log("Play path=" +
                                                iot.curr_path + 
                                                ", fn="+ve[0]);
                                            iot.fget(ve[0]);
                                        };
                                    }(this, e)))
                        .append($("<td>")
                            .text(e[0]))
                        .append($("<td>")
                            .text(e[1]).css("text-align", "right"))
                        .append($("<td>")
                            .text(ymdhms(e[2])))
                        .append($("<td>")
                            .append($('<button title="Delete">')
                                .button({
                                    text: false,
                                    icons: {
                                        primary: "ui-icon-trash"
                                    }}))
                                    .click(function (ve) {
                                        return function (ei) {
                                           debug_log("delete: "+ve[0]);
                                           io.del("f", ve[0]);
                                        };
                                    }(e))));
                }
            },
            tree_refresh_cb: function (data) {
                var err = "", edata = "";
                try { edata = JSON.parse(data); }
                catch(ex) { err = ex; edata = null;}
                debug_log("tree_refresh_cb: data="+data + ", edata="+edata);
                if (!err) {
                    io.table_fill(edata["dlist"], edata["flist"]);
                }
            },
            refresh: function () {
                debug_log("tree-refresh: cgi="+this.cgi_url);
                $.post(this.cgi_url,
                    {
                        "action": "refresh",
                        "path": this.curr_path
                    },
                    this.tree_refresh_cb);
            },
            cdir: function (subdir) {
                if (this.curr_path === "") {
                    this.curr_path = subdir
                } else if (subdir === "..") { // Go up
                    var w = this.curr_path.lastIndexOf("/");
                    this.curr_path = 
                        this.curr_path.substring(0, w);
                } else {
                    this.curr_path += "/" + subdir;
                }
                debug_log("subdir="+subdir + 
                    ", udcp="+this.curr_path);
                this.refresh();
            },
            fput_cb: function (data) {
                debug_log("fput_cb");
                var err = "", edata = "";
                try { edata = JSON.parse(data); }
                catch(ex) { err = ex; edata = null;}
                debug_log("fput_cb: data="+data + ", edata="+edata);
                if (err) {
                   debug_log("fput_cb: err="+err);
                }
                io.refresh();
            },
            fput: function (fn, text) {
                debug_log("fput: fn="+fn + ", text="+text);
                $.post(this.cgi_url,
                    {
                        "action": "fput",
                        "path": this.curr_path,
                        "fn": fn,
                        "text": text
                    },
                    this.fput_cb);
            },
            fget_cb: function (data) {
                debug_log("fput_cb");
                var err = "", edata = "";
                try { edata = JSON.parse(data); }
                catch(ex) { err = ex; edata = null;}
                debug_log("fget_cb: data="+data + ", edata="+edata);
                if (err) {
                   debug_log("fget_cb: err="+err);
                } else {
                   var text = edata['text'];
                   debug_log("fget_cb: text="+text);
                   $("#json-text").val(text);
                }
                io.refresh();
            },
            fget: function (fn) {
                debug_log("fget: path="+this.curr_path + ", fn="+fn);
                $.post(this.cgi_url,
                    {
                        "action": "fget",
                        "path": this.curr_path,
                        "fn": fn,
                    },
                    this.fget_cb);
            },
            mkdir_cb: function (data) {
                debug_log("mkdir_cb");
                var err = "", edata = "";
                try { edata = JSON.parse(data); }
                catch(ex) { err = ex; edata = null;}
                debug_log("mkdir_cb: data="+data + ", edata="+edata);
                if (err) {
                   debug_log("mkdir_cb: err="+err);
                }
                io.refresh();
            },
            mkdir: function (dn) {
                debug_log("mkdir: path="+this.curr_path + ", dn="+dn);
                $.post(this.cgi_url,
                    {
                        "action": "mkdir",
                        "path": this.curr_path,
                        "dn": dn,
                    },
                    this.mkdir_cb);
            },
            del_cb: function (data) {
                debug_log("del_cb");
                var err = "", edata = "";
                try { edata = JSON.parse(data); }
                catch(ex) { err = ex; edata = null;}
                debug_log("del_cb: data="+data + ", edata="+edata);
                if (err) {
                   debug_log("del_cb: err="+err);
                }
                io.refresh();
            },
            del: function (t, e) {
                debug_log("del: "+t+ " path="+this.curr_path + ", e="+e);
                $.post(this.cgi_url,
                    {
                        "action": "del",
                        "t": t,
                        "path": this.curr_path,
                        "e": e,
                    },
                    this.del_cb);
            }
        };

        debug_log("io.cgi="+io.cgi_url);
        $("#tree-refresh").click(function() { io.refresh(); });
        $("#save").click(function() {
            io.fput($("#filename").val(), $("#json-text").val());
        });
        $("#mkdir").click(function() {
            io.mkdir($("#filename").val());
        });
    });

})();


