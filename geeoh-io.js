// Here I am.
(function () {
    "use strict";

    var cgi_url = "cgi-bin/geeoh-io.cgi";
    // var user_data_current_path = "";

    var io = {
        cgi_url: "cgi-bin/geeoh-io.cgi",
        id_table: "",
        error: function (msg) {
            $.debug_log(cb_name + ": err="+err);
        },
        cb_json_get: function(cb_name, data) {
            $.debug_log("cb_json_get: cb="+cb_name);
            var err = "", edata = "";
            try { edata = JSON.parse(data); }
            catch(ex) { err = ex; edata = null;}
            $.debug_log("data="+data + ", edata="+edata);
            if (err) {
               this.error(cb_name + ": err="+err);
            }
            return edata;
        },
        dir_get_consume: function (dlist, flist) { 
            $.debug_log("dir_get_consume: abstract");
        },
        dir_get_cb: function (vthis) { 
            return function (data) {
                $.debug_log("dir_get_cb=");
                var edata = vthis.cb_json_get("dir_get_cb", data);
                if (edata) {
                    vthis.dir_get_consume(edata["dlist"], edata["flist"]);
                }
            }
        },
        dir_get: function (subdir) {
            $.debug_log("dir_get-refresh: cgi="+this.cgi_url);
            $.post(this.cgi_url,
                {
                    "action": "refresh",
                    "path": subdir
                },
                this.dir_get_cb(this));
        },
        fput_done: function (vthis) { },
        fput_cb: function (vthis) { 
            return function (data) {
                vthis.cb_json_get("fput_cb", data);
                vthis.fput_done(vthis);
            }
        },
        fput: function (path, fn, text) {
            $.debug_log("fput: fn="+fn + ", text="+text);
            $.post(this.cgi_url,
                {
                    "action": "fput",
                    "path": path,
                    "fn": fn,
                    "text": text
                },
                this.fput_cb(this));
        },
        fget_consume: function (text) { },
        fget_cb: function (vthis) { 
            return function (data) {
                $.debug_log("fget_cb");
                var edata = vthis.cb_json_get("fget_cb", data);
                if (edata) {
                   var text = edata['text'];
                   $.debug_log("fget_cb: text="+text);
                   vthis.fget_consume(text);
                }
            }
        },
        fget: function (path, fn) {
            $.debug_log("fget: path="+this.curr_path + ", fn="+fn);
            $.post(this.cgi_url,
                {
                    "action": "fget",
                    "path": path,
                    "fn": fn,
                },
                this.fget_cb(this));
        },
        mkdir_done: function () { },
        mkdir_cb: function (vthis) {
            return function (data) {
                $.debug_log("mkdir_cb");
                var edata = vthis.cb_json_get("mkdir_cb", data);
                vthis.mkdir_done();
            }
        },
        mkdir: function (path, dn) {
            $.debug_log("mkdir: path="+this.curr_path + ", dn="+dn);
            $.post(this.cgi_url,
                {
                    "action": "mkdir",
                    "path": path,
                    "dn": dn,
                },
                this.mkdir_cb(this));
        },
        del_done: function (vthis) { },
        del_cb: function (vthis) {
            return function (data) {
                $.debug_log("del_cb");
                vthis.cb_json_get("del_cb", data);
                vthis.del_done(vthis);
            }
        },
        del: function (t, path, e) {
            $.debug_log("del: "+t+ " path="+path + ", e="+e);
            $.post(this.cgi_url,
                {
                    "action": "del",
                    "t": t,
                    "path": path,
                    "e": e,
                },
                this.del_cb(this));
        }
    };

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

    var ioui = $.extend(true, {}, io, {
        // The following id-s must be initialized by user
        id_table_tbody: "",
        id_dirget: "",
        id_filename: "",
        id_save: "",
        id_mkdir: "",
        id_json_text: "",

	// user: "guest", // logged in user
        curr_path: "", // user data
        cgi_url: "cgi-bin/geeoh-io.cgi",
        dir_get_consume: function (dlist, flist) {
	    var user = $.user_signed_get();
            $.debug_log("ioui.dir_get_consume, user="+user);
            var tbody = $("#"+this.id_table_tbody);
            tbody.empty();
            var udcp = this.curr_path;
            if (udcp === "") { udcp = "/"; }
            $("#th-path").empty().html(udcp);
            var vthis = this;
	    var mypath = (udcp == 'guest') || (udcp == user) ||
	        (udcp.substr(0, 5+1) == 'guest/') ||
	        (udcp.substr(0, user.length+1) == (user + '/'));
            for (var i = 0; i < dlist.length; i++) {
                var e = dlist[i];
		var clsdir = ((mypath || 
		    (udcp === '/') && ((e == 'guest') || (e == user)))
		    ? 'mydir' : 'herdir');
                tbody.append($("<tr>")
                    .append($("<td>")
                        .append($('<button title="Folder">')
                            .button({
                                text: false,
                                icons: {
                                    primary: "ui-icon-folder-open"
                                }}))
                                .click(function (ve) {
                                    return function (ei) {
                                       $.debug_log("folder-open: "+ve);
                                       vthis.cdir(ve);
                                    };
                                }(e)))
                    .append($("<td>")
                        .text(e).addClass(clsdir))
                    .append($("<td>")
                        .append($('<button title="Delete">')
                            .button({
                                text: false,
                                icons: {
                                    primary: "ui-icon-trash"
                                }}))
                                .click(function (ve) {
                                    return function (ei) {
                                       $.debug_log("delete: "+ve);
                                       vthis.ui_del("d", ve);
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
                                        $.debug_log("Play path=" +
                                            iot.curr_path + 
                                            ", fn="+ve[0]);
                                        iot.ui_fget(ve[0]);
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
                                       $.debug_log("delete: "+ve[0]);
                                       vthis.ui_del("f", ve[0]);
                                    };
                                }(e))));
            }
        },
        ui_dir_get: function () {
            this.dir_refresh();
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
            $.debug_log("subdir="+subdir + 
                ", udcp="+this.curr_path);
            $("#" + this.id_filename).val("");
            $("#" + this.id_json_text).val("");
            this.dir_refresh();
        },
        fput_done: function (vthis) { 
            vthis.dir_refresh();
        },
        ui_fput: function (fn, text) {
            this.fput(this.curr_path, fn, text);
        },
        fget_consume: function (text) { 
            $.debug_log("fget_consume");
            $("#" + this.id_json_text).val(text);
        },
        ui_fget: function (fn) {
            $.debug_log("ui_fget: fn="+fn);
            this.fget(this.curr_path, fn);
            $("#" + this.id_filename).val(fn);
        },
        mkdir_done: function (vthis) {
            vthis.dir_refresh();
        },
        ui_mkdir: function (dn) {
            $.debug_log("ui_mkdir: path="+this.curr_path + ", dn="+dn);
            this.mkdir(this.curr_path, dn);
        },
        del_done: function (vthis) {
            vthis.dir_refresh();
        },
        ui_del: function (t, e) {
            $.debug_log("ui_del: "+t+ " path="+this.curr_path + ", e="+e);
            this.del(t, this.curr_path, e);
        },
        dir_refresh: function () {
            this.dir_get(this.curr_path);
        },
        init: function (
            v_id_table_tbody,
            v_id_dirget,
            v_id_filename,
            v_id_save,
            v_id_mkdir,
            v_id_json_text) {

            this.id_table_tbody = v_id_table_tbody;
            this.id_dirget = v_id_dirget;
            this.id_filename = v_id_filename;
            this.id_save = v_id_save;
            this.id_mkdir = v_id_mkdir;
            this.id_json_text = v_id_json_text;

            $("#"+v_id_dirget).click(function() { ioui.ui_dir_get(); });
            $("#"+v_id_save).click(function() {
                ioui.ui_fput($("#" + v_id_filename).val(),
                    $("#" + v_id_json_text).val());
            });
            $("#" + v_id_mkdir).click(function() {
                ioui.ui_mkdir($("#" + v_id_filename).val());
            });
        }

    });

    $(document).ready(function () {

        $.debug_log("io.cgi="+ioui.cgi_url);
        ioui.init("tbody-data", "tree-refresh", 
            "filename", "save", "mkdir", "json-text");
	ioui.dir_refresh();
      if (false) {
        $("#tree-refresh").click(function() { ioui.ui_dir_get(); });
        $("#save").click(function() {
            ioui.ui_fput($("#filename").val(), $("#json-text").val());
        });
        $("#mkdir").click(function() {
            ioui.ui_mkdir($("#filename").val());
        });
      }
    });

})();


