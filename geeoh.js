(function(){
  "use strict";

var debug_win = undefined;

function debug_log(message) {
    if (!debug_win)
    {
        debug_win = window.open("about:blank", "GeeOH-Debug",
            "width=300,height=300,scrollbars=1,resizable=1");
        var html = "<html><head><title>GeeOH Debug</title></head><body>" + 
            '<div id="debug">Hello1<br></div>' +
            "</body></html>";
        debug_win.document.open();
        debug_win.document.write(html);
        debug_win.document.close();
    }
    var c = debug_win.document.getElementById("debug");
    if (c)
    {
        var entry = document.createElement("div");
        entry.appendChild(document.createTextNode(message));
        c.appendChild(entry);
    }
}

    function el(tag, id) { 
        var e = document.createElement(tag);
	if (id) { e.id = id; }
	return e;
    }

var epsilon = 1./128.;
var epsilon2 = epsilon*epsilon;

$(document).ready(function () {

    var error = function(error_msg) {
        $("#errormsg").html(error_msg);
        $("#div-dialog-error").dialog({
            title: "Error",
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
        $("#div-dialog-error").dialog("open");
    };

    var digits_sub = function(s) {
        var ns = "";
        for (var i = 0; i < s.length; i++)
        {
            var c = s.charAt(i);
            var digit = "0123456789".indexOf(c);
            if (digit >= 0) {
                c = "₀₁₂₃₄₅₆₇₈₉".charAt(digit);
            }
            ns += c;
        }
        return ns;
    };

    debug_log("my geeoh ready begin");
    var w = $(window).width();
    var h = $(window).height();
    debug_log("w="+w + ", h="+h);
    // var c = document.getElementById("geeoh-canvas");
    var rnd = Math.round
    w = rnd(7*w/10);
    h = rnd(7*h/10);
    debug_log("For Canvas: w="+w + ", h="+h);
    var ec = $("#geeoh-canvas");
    var c = ec[0];
    // ec.width(w).height(h);
    c.width = w; c.height = h;

    var pointer = $("#pointer").draggable();
    $("#elements-box").draggable();

    var element = {
        name: "",
        valid: true,
        name_set: function(s) { this.name = s; return this; },
        is_point: function() { return false; }
    };

    var point = $.extend(true, {}, element, {
        xy: [1., 1.],
        is_point: function() { return true; },
        xy_set: function(x, y) {
            this.xy[0] = x;
            this.xy[1] = y;
            return this;
        },
        str: function() { return this.str3(); },
        str3: function() { 
           return "["+this.xy[0].toFixed(3) +
               ", " + this.xy[1].toFixed(3) + "]";
        },
        draw: function(canvas, ctx) {
            canvas.point_draw(ctx, this);
        }
    });

    var line = $.extend(true, {}, element, {
        abc: [1., 0., 0.],  // Always (if valid): a^2 + b^2 = 1
        ok: function() { return this.abc !== undefined; },
        point_distance: function(pt) {
           return Math.abs(this.abc[0]*pt[0] + this.abc[1]*pt[1] + this.abc[2]);
        },
        abc_get: function() { return this.abc; },
        abc_set: function(a, b, c) {
	    debug_log("abc_set: a="+a.toFixed(3) + ", b="+b.toFixed(3) +
	              ", c="+c.toFixed(3));
            var d2 = a*a + b*b;
            this.valid = (d2 > epsilon2);
            if (!this.valid) {
                debug_log("!valid: a="+a + ", b="+b);
                this.abc = null;
            } else {
                var d = Math.sqrt(d2);
                this.abc[0] = a/d;  this.abc[1] = b/d;  this.abc[2] = c/d;
            }
            return this;
        },
        str: function() { return this.str3(); },
        str3: function() { 
            return "["+this.abc[0].toFixed(3) + ", " + this.abc[1].toFixed(3) +
                ", " + this.abc[2].toFixed(3) + "]";
        },
        draw: function(canvas, ctx) {
            canvas.line_draw(ctx, this);
        }
    });

    var circle = $.extend(true, {}, element, {
        center: $.extend(true, {}, point),
        radius: 1.
    });

    //    {pts: [$.extend({}, point), $.extend({}, point)]}, line);
    var line_2points = $.extend(true, {}, line, {
        pts: [null, null],
        points_set: function(pt0, pt1) {
            debug_log("L2Ps set: p0="+pt0.str3() + ", pt1="+pt1.str3());
            this.pts = [pt0, pt1];
            return this.update();
        },
        // (y1-y0)x - (x1-x0)y + c = 0
        // c = (x1-x0)y-(y1-y0)x 
        //   = x1y0-x0y0-x0y1+x0y0 = x1y0 - x0y1
        //   = x1y1-x0y1-x1y1+x1y0 = x1y0 - x0y1
        update: function() {
            var p0 = this.pts[0], p1 = this.pts[1];
            debug_log("L2Ps update: p0="+p0.str3() + ", p1="+p1.str3());
            var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
            this.abc_set(y1 - y0, x0 - x1, x1*y0 - x0*y1);
            return this;
        },
        point_inside_segment: function(pt) {
            // Assuming pt is in the line, but not necessarily within segment
            var p0 = this.pts[0], p1 = this.pts[1];
	    debug_log("pt="+pt.str3()+", p0="+p0.str3()+", p1="+p1.str3());
            var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
            var dx = x1 - x0, dy = y1 - y0;
            var j = (Math.abs(dx) < Math.abs(dy) ? 1 : 0);
            var v = pt.xy[j];
            var low = p0.xy[j], high = p1.xy[j];
            if (low > high) { var t = low; low = high; high = t; }
            var inside = (low <= v) && (v <= high);
	    debug_log("j="+j +", v="+v.toFixed(3) + 
	        ", low="+low.toFixed(3) + ", high="+high.toFixed(3) +
		", inside="+inside);
            return inside;
        },
        str: function() { 
            return "-(" + digits_sub(this.pts[0].name) + ", " + 
                digits_sub(this.pts[1].name) + ")-"; }
    });
    
    var point_2lines = $.extend(true, {}, point, {
        lines: [null, null],
        lines_set: function(l0, l1) {
            debug_log("point_2lines.lines_set: l0="+l0.str3() + 
                ", l1="+l1.str3());
            this.lines = [l0, l1];
            this.update();
            return this;
        },
        update: function() {
            this.valid = false;
            var l0 = this.lines[0], l1 = this.lines[1];
            if (l0.valid && l1.valid) {
                var abc0 = l0.abc_get();
                var abc1 = l1.abc_get();
                var a0 = abc0[0], b0 = abc0[1], c0 = abc0[2];
                var a1 = abc1[0], b1 = abc1[1], c1 = abc1[2];
                // a0x + b0y + c0 = 0
                // a1x + b1y + c1 = 0
                //   a0b1x + b0b1y + c0b1 = 0
                //   a1b0x + b0b1y + b0c1 = 0
                //     x = (b0c1 - c0b1) / (a0b1 - a1b0)
                //   a0a1x + a1b0y + a1c0 = 0
                //   a0a1x + a0b1y + a0c1 = 0
                //     y = (a0c1 - a1c0) / (a1b0 - a0b1)
                var det = a0*b1 - a1*b0;
                this.valid = (Math.abs(det) > epsilon);
                if (!this.valid) {
                    debug_log("p2l: !valid: det="+det + 
                        ", l0="+l0.str3() + ", l1="+l1.str3());
                    this.xy = null;
                } else {
                    this.xy_set((b0*c1 - c0*b1)/det, (a1*c0 - a0*c1)/det);
                }
            } else {
                debug_log("p2l: update: l0||l1 not valid");
            }
        }
    });    

    var p34 = $.extend(true, {}, point).xy_set(3, 4);
    var p56 = $.extend(true, {}, point).xy_set(5, 6);
    debug_log("p34="+p34.str3() + ", p56="+p56.str3());

    var line345 = $.extend(true, {}, line).abc_set(3, 4, 5);
    var line876 = $.extend(true, {}, line);
    line876.abc_set(8, 7, 6);
    debug_log("line345="+line345.str3() + ", line876="+line876.str3());

    // var line3456 = $.extend({}, line_2points).set(p34, p56);
    var line3456 = $.extend(true, {}, line_2points)
    debug_log("line3456 [default]="+line3456.str3());
    line3456.points_set(p34, p56);
    debug_log("line3456="+line3456.str3());

    var elements = [];
    var enames = function() { 
        return elements.map(function(e) { return e.name; }) 
    };
    var etable = function() {
        return {
            redraw: function() {
                var tbl = $("#elements");
                var tbl0 = tbl[0]
                // Remove rows, but the title 
                while (tbl[0].childNodes.length > 1) {
                    tbl0.removeChild(tbl0.lastChild);
                }
                for (var i = 0; i < elements.length; i++) {
                    var e = elements[i];
                    tbl.append($('<tr>')
                        .append($('<td>')
                            .text(digits_sub(e.name)))
                        .append($('<td>')
                            .text(e.str())));
                }
            }
        }
    }();

    var canvas = function() {
        var rect_required = [[-2, 6], [-2, 6]]; // Xmin, Xmax, Ymin, Ymax
        var min_max = undefined;
        var x0, dx, y0, dy;
        var point_lb, point_rb, point_lt, point_rt;
        var line_left, line_right, line_bottom, line_top;
        var dtag1, pt_rad;
        return {
            redraw: function() {
                var ctx = c.getContext("2d");
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = "#d7d7d7";
                ctx.fillRect(0, 0, w, h);
                this.minmax_set();
                this.axis_draw(ctx);
               if (false) {
                this.pt_cdraw(ctx, [this.x2canvas(1), this.y2canvas(1)]);
                var abc = "ABC123abc456";
                debug_log(abc +" --> " + this.digits_sub(abc));
                this.seg_draw(ctx, [3, 3], [4, 4]);
                this.seg_draw(ctx, [-4, -3], [8, 7]);
		var pt00 = $.extend(true, {}, point).xy_set(0, 0);
		var pt11 = $.extend(true, {}, point).xy_set(1, 1);
		var lxy = $.extend(true, {}, line_2points)
		    .points_set(pt00, pt11);
		debug_log("lxy="+lxy.str3());
                this.line_draw(ctx, lxy);
               }
                debug_log("|elements|="+elements.length);
                for (var i = 0; i < elements.length; i++) {
                    debug_log("e["+i+"]=" + elements[i]);
                    elements[i].draw(this, ctx);
                }
                // this.line_draw(ctx, line3456);
            },
            axis_draw: function(ctx) {
                ctx.fillStyle = "#111";
                var cx0 = this.x2canvas(0), cy0 = this.y2canvas(0);
                var cx1 = this.x2canvas(1), cy1 = this.y2canvas(1);

                // X axis
                this.seg_cdraw(ctx, [0, cy0], [c.width, cy0]);
                this.seg_cdraw(ctx, [cx1, cy0 - dtag1], [cx1, cy0 + dtag1]);

                // Y axis
                this.seg_cdraw(ctx, [cx0, 0], [cx0, c.height]);
                this.seg_cdraw(ctx, [cx0 - dtag1, cy1], [cx0 + dtag1, cy1]);
            },
	    point_draw: function(ctx, p) {
	        var cxy = [this.x2canvas(p.xy[0]), this.y2canvas(p.xy[1])];
	        return this.pt_cdraw(ctx, cxy);
	    },
            pt_cdraw: function(ctx, pt) {
                ctx.beginPath();
                // ctx.moveTo(pt[0] + pt_rad, pt[1]);
                ctx.arc(pt[0], pt[1], pt_rad, 0., 2*Math.PI);
                ctx.closePath();
                ctx.fill();
		return this;
            },
            seg_draw: function(ctx, a, b) { // OBSOLETE!!
                this.seg_cdraw(ctx, this.pt2canvas(a), this.pt2canvas(b));
            },
            segment_draw: function(ctx, pt0, pt1) {
                this.seg_cdraw(ctx,
		    this.pt2canvas(pt0.xy), this.pt2canvas(pt1.xy));
            },
            seg_cdraw: function(ctx, a, b) {
                ctx.fillStyle = "#111";
                ctx.beginPath();
                ctx.moveTo(a[0], a[1]);
                ctx.lineTo(b[0], b[1]);
                ctx.stroke();
            },
            line_draw: function(ctx, l) {
                var bdy_pts = []; // boundary points
                var lines = [this.line_left, this.line_right, 
                    this.line_bottom, this.line_top];
                debug_log("line_draw: l="+l.str3());
                for (var i = 0; i < 4; i++) {
                    var lbdy = lines[i];
                    var pt = $.extend(true, {}, point_2lines)
                        .lines_set(l, lbdy);
                    if (pt.valid) {
                        debug_log("pt="+pt.str3() + ", lbdy="+lbdy.str3());
                        if (lbdy.point_inside_segment(pt)) {
                            bdy_pts.push(pt);
                        }
                    }
                }
                debug_log("|bdy_pts|="+bdy_pts.length);
		if (bdy_pts.length >= 2) {
		   this.segment_draw(ctx, bdy_pts[0], bdy_pts[1]);
		}
            },
            minmax_set: function() {
                debug_log("minmax_set called");
                var rr = rect_required; // abbreviation
                x0 = rr[0][0];
                y0 = rr[1][0];
                dx = rr[0][1] - rr[0][0];
                dy = rr[1][1] - rr[1][0];
                var dxh = dx * c.height, dyw = dy * c.width;
                if (dxh < dyw) {
                    var dnew = dyw/c.height;
                    x0 -= (dnew - dx)/2;
                    dx = dnew;
                } else {
                    dnew = dxh/c.width;
                    y0 -= (dnew - dy)/0;
                    dy = dnew;
                }
                dtag1 = Math.max(6, Math.min(c.width, c.height)/0x100);
                pt_rad = Math.max(3, Math.min(c.width, c.height)/0x200);
                debug_log("x0="+x0 + ", y0="+y0 + ", dx="+dx + ", dy="+dy);
                this.point_lb = $.extend(true, {}, point).xy_set(x0, y0);
                this.point_rb = $.extend(true, {}, point).xy_set(x0 + dx, y0);
                this.point_lt = $.extend(true, {}, point).xy_set(x0, y0 + dy);
                this.point_rt =
                    $.extend(true, {}, point).xy_set(x0 + dx, y0 + dy);
                this.line_left = $.extend(true, {}, line_2points)
                    .points_set(this.point_lb, this.point_lt);
                debug_log("line_left="+this.line_left.str3());
                this.line_right = $.extend(true, {}, line_2points)
                    .points_set(this.point_rb, this.point_rt);
                this.line_bottom = $.extend(true, {}, line_2points)
                    .points_set(this.point_lb, this.point_rb);
                this.line_top = $.extend(true, {}, line_2points)
                    .points_set(this.point_lt, this.point_rt);
            },
            pt2canvas: function(pt) { 
                return [this.x2canvas(pt[0]), this.y2canvas(pt[1])];
            },
            canvas2pt: function(cpt) { 
                return [this.canvas2x(cpt[0]), this.canvas2y(cpt[1])];
            },
            x2canvas: function(x) { return (c.width * (x - x0)) / dx; },
            y2canvas: function(y) { return (c.height * (y0 + dy - y)) / dy; },
            canvas2x: function(cx) { return x0 + (cx * dx)/c.width; },
            canvas2y: function(cy) { return y0 + dy - (cy * dy)/c.height; },
            digits_sub: function(s) {
                var ns = "";
                for (var i = 0; i < s.length; i++)
                {
                    var c = s.charAt(i);
                    var digit = "0123456789".indexOf(c);
                    if (digit >= 0) {
                        c = "₀₁₂₃₄₅₆₇₈₉".charAt(digit);
                    }
                    ns += c;
                }
                return ns;
            }
        };
    }();

    canvas.redraw();
    ec.mousemove(function(e) {
        var relx = e.pageX, rely = e.pageY;
	var position = ec.position();
	var cx = e.pageX - position.left, cy = e.pageY - position.top;
	var xy = canvas.canvas2pt([cx, cy]);
	pointer.text("("+xy[0].toFixed(3) + ", " + xy[1].toFixed(3)+")");
	});

    var create_editor = function() {
        debug_log("add");
	var editor = el("div", "popup-editor");
	var tbl = el("table");
	var tr = el("tr");
	var td = el("td");
	var tabs = el("td");
	var label_point = document.createElement("Point");
	tabs.appendChild(label_point);
	var label_line = document.createElement("Line");
	tabs.appendChild(label_line);
	$(tabs).tabs().tabs('option', 'selected', 0);
	td.appendChild(tabs);
	tr.appendChild(td);
	tbl.appendChild(tr);
	editor.appendChild(tbl);
        $("body").append(editor);


        $(editor).dialog({
            autoOpen: false,
            modal: true,
            buttons: {
                "OK": function() {
                    var $this = this;
                    // editor_ok($this);
                    $(this).dialog("close"); 
                },
                Cancel: function() { $(this).dialog("close"); }
            }

        });
	return editor;
    };

    var name_xy = ["pt-name", "x", "y"];
    var sxy = ["x", "y"];

    var dlg_point = $("#dlg-point");
    dlg_point.dialog({
        autoOpen: false,
	title: "Add Point",
        modal: true,
        buttons: {
            "OK": function() {
                var $this = this;
                var ok = true;
                var xy = [];
                var name = $("#pt-name-input").val().trim();
                var ok = /^[A-Z][0-9]*$/.test(name) && 
                    ($.inArray(name, enames()) < 0);
                $("#pt-name-error").css('display', ok ? 'none' : 'block');
		for (var i = 0; i < 2; i++) {
                    var s =  $("#" + sxy[i] + "-input").val().trim();
                    var sok = (s !== "") && !isNaN(s);
                    if (sok) { xy[i] = Number(s); }
                    $("#" + sxy[i] + "-error").css('display',
                        sok ? 'none' : 'block');
                    ok = ok && sok;
                }
                if (ok) {
                    var pt = $.extend(true, {}, point)
                        .name_set(name)
                        .xy_set(xy[0], xy[1]);
                    $(this).data('cb')(pt);
                    $(this).dialog("close"); 
                }
            },
	    Cancel: function() { $(this).dialog("close"); }
	}
    });

    var dlg_line = $("#dlg-line");
    dlg_line.dialog({
        autoOpen: false,
	title: "Add Line",
        width: $(window).width()/2,
        height: $(window).height()/2,
        modal: true,
        buttons: {
            "OK": function() {
                var $this = this;
                var ok = true;
                var xy = [];
                var name = $("#line-name-input").val().trim();
                var ok = /^[a-z][0-9]*$/.test(name);
                $("#line-name-error").css('display', ok ? 'none' : 'block');
                if (ok) {
                    var pt01 = [0, 1].map(function (n) {
                        var pt_name = $("#pt" + n + "-select").val();
                        return elements.filter(function (e) { 
                            return e.name == pt_name; })[0]; });
                    debug_log("pt0="+pt01[0].str() + ", pt1="+pt01[1].str());
                    var ln = $.extend(true, {}, line_2points)
                        .name_set(name)
                        .points_set(pt01[0], pt01[1]);
                    if (ln.valid) {
                        $(this).data('cb')(ln);
                        $(this).dialog("close"); 
                    }
                }
            },
	    Cancel: function() { $(this).dialog("close"); }
	}
    });

    for (var i = 0; i < 3; i++) {
        $("#" + name_xy[i] + "-error").css('display', 'none');
        $("#" + name_xy[i] + "-input").keypress(function (k) {
            return function() {
               $("#" + name_xy[k] + "-error").css('display', 'none'); 
            }}(i));
    }

    var add_editor = create_editor();
    debug_log("add_editor="+add_editor);

    $("#add").click(function() {
        debug_log("add");
	$(add_editor).dialog("open");
    });
    $("#add-point").click(function() {
        debug_log("add-point");
	dlg_point.data('cb', function(pt) { 
            debug_log("pushing pt:"+pt.str3());
            elements.push(pt);
            debug_log("e[0]="+elements[0]);
            canvas.redraw();
            etable.redraw();
        });
	dlg_point.dialog("open");
    });

    $("#add-line").click(function() {
        debug_log("add-line");
        var pt_elements = elements.filter(
            function (e) { return e.is_point(); });
        debug_log("np="+pt_elements.length);
        if (pt_elements.length < 2) {
            error("For line, 2 points must be defined");
        } else {
            var pt_select = $(".pt-select").empty();
            for (var i = 0; i < pt_elements.length; i++) {
                 var name = pt_elements[i].name;
                 debug_log("Adding option: "+name);
                 pt_select
                     .append($("<option></option>")
                         .attr("value", name)
                         .text(name)); 
            }
            dlg_line.data('cb', function(ln) { 
                debug_log("pushing line:"+ln.str3());
                elements.push(ln);
                canvas.redraw();
                etable.redraw();
            });
            dlg_line.dialog("open");
        }
    });
    $("#line-name-error").css('display', 'none');
    $("#line-name-input").keypress(function() { 
        $("#line-name-error").css('display', 'none');
    });

});

})();
