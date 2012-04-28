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

function xy_add(p0, p1) {
    return [p0[0] + p1[0], p0[1] + p1[1]];
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

    // solve 2x2 linear equations
    var solve_2linear = function(abc0, abc1) {
        var xy = null; // pessimistic
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
        if (Math.abs(det) > epsilon) {
            xy = [(b0*c1 - c0*b1)/det, (a1*c0 - a0*c1)/det];
        }
        return xy;
    };

    var element = {
        name: "",
        valid: true,
        name_set: function(s) { this.name = s; return this; },
        is_point: function() { return false; },
        is_segment: function() { return false; },
        distance_to: function(xy) { return Math.sqrt(this.distance2_to(xy)); },
        distance2_to: function(xy) { return 1.; },
        candidate_label_points: function(rect, delta) { return []; },
        best_label_point: function(elements, rect, delta) {
            debug_log("blp: rect="+rect + ", delta="+delta);
            for (var i = 0; i < elements.length; i++) {
                if (this == elements[i]) { debug_log("blp: me! i="+i); }
            }            
        }
    };

    var point = $.extend(true, {}, element, {
        xy: [1., 1.],
        is_point: function() { return true; },
        xy_set: function(x, y) {
            this.xy[0] = x;
            this.xy[1] = y;
            return this;
        },
        str: function() { return this.str2(); },
        str2: function() { 
           return "("+this.xy[0].toFixed(2) +
               ", " + this.xy[1].toFixed(2) + ")";
        },
        str3: function() { 
           return "("+this.xy[0].toFixed(3) +
               ", " + this.xy[1].toFixed(3) + ")";
        },
        draw: function(canvas, ctx) {
            canvas.point_draw(ctx, this);
        },
        distance2_to: function(xy) { 
            var dx = xy[0] - this.xy[0];
            var dy = xy[1] - this.xy[1];
            return dx*dx + dy*dy;
        },
        candidate_label_points: function(rect, delta) { 
            var candidates = []; 
            for (i = -1; i <= 1; i++) {
                var x = this.xy[0] + (i * delta);
                if ((rect[0][0] < x) && (x < rect[0][1])) {
                    for (j = -1; j <= 1; j++) {
                        if ((i != 0) || (j == 0)) {
                            var y = this.xy[1] + (j * delta);
                            if ((rect[1][0] < y) && (y < rect[1][1])) {
                                candidates.push([x, y]);
                            }
                        }
                    }
                }
            }
            return candidates;
        },
    });

    var distance2 = function(pt0, pt1) {
        var dx = pt1.xy[0] - pt0.xy[0];
        var dy = pt1.xy[1] - pt0.xy[1];
        return dx*dx + dy*dy;
    };

    var distance = function(pt0, pt1) {
        return Math.sqrt(distance2(pt0, pt1));
    };

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
        },
        distance2_to: function(xy) {
            var d = this.distance_to(xy);
            return d*d;
        },
        distance_to: function(xy) {
            var abc = this.abc;
            var v = abc[0]*xy[0] + abc[1]*xy[1] + abc[2];
            return Math.abs(v);
        },
        candidate_label_points: function(rect, delta) { 
            var candidates = []; 
            // We intersect this line with the 4 lines of the clipping rect.
            // For each, if the intersection is withing the rect's segment
            // we add appropriate candidates, avoiding this line.
            var boundary_candidates = {
                abc: [1., 0., 0.],
                shifts: [[0., 0.]],
                set: function(abc, shifts) {
                    this.abc = abc;
                    this.shifts = shifts;
                    return this;
                },
                get: function(labc) {
                    var c = []; // candidates
                    var xy = solve_2linear(this.abc, labc);
                    if (xy != null) {
                        if (Math.abs(labc[0]) < Math.abs(labc[1])) {
                            // 'vertical'-like line
                            // candidates.push([xy[0] + shifts[0][0])
                            ;
                        } else {
                            // 'horizontal'-like line
                        }
                        
                    }
                    return c;
                },
            }
            return candidates;
        },
    });

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
    
    var line_segment = $.extend(true, {}, line_2points, {
        is_segment: function() { return true; },
        str: function() { 
            return "[" + digits_sub(this.pts[0].name) + ", " + 
                digits_sub(this.pts[1].name) + "]"; },
        draw: function(canvas, ctx) {
            canvas.segment_draw(ctx, this.pts[0], this.pts[1]);
        }
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
                var xy = solve_2linear(l0.abc_get(), l1.abc_get());
                this.valid = (xy !== null);
                if (!this.valid) {
                    debug_log("p2l: !valid: det="+det + 
                        ", l0="+l0.str3() + ", l1="+l1.str3());
                    this.xy = null;
                } else {
                    this.xy_set(xy[0], xy[1]);
                }
            } else {
                debug_log("p2l: update: l0||l1 not valid");
            }
        }
    });    

    var circle = $.extend(true, {}, element, {
        center: $.extend(true, {}, point).xy_set(0, 0),
        radius: 1,
        str: function() { 
           return "Circle(" + this.center.str() + ", r="+this.radius + ")";
        },
        draw: function(canvas, ctx) {
            canvas.circle_draw(ctx, this);
        }
    });

    var circle_center_segment = $.extend(true, {}, circle, {
        center_segment_set: function(c, pt0, pt1) {
            this.center = c;
            this.pt0 = pt0;
            this.pt1 = pt1;
            return this.update();
        },
        update: function() {
            this.radius = distance(this.pt0, this.pt1);
            this.valid = (this.radius > epsilon);
            return this;
        },
        pt0: $.extend(true, {}, point).xy_set(0, 0),
        pt1: $.extend(true, {}, point).xy_set(1, 0),
        str: function() { 
           return "⊙(" + this.center.name + ", [" +
               this.pt0.name + ", " + this.pt1.name + "])";
        }
    });

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
        var dtag1, pt_rad, delta_label;
        return {
            redraw: function() {
                var ctx = c.getContext("2d");
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = "#d7d7d7";
                ctx.fillRect(0, 0, w, h);
                this.minmax_set();
                this.axis_draw(ctx);
                debug_log("|elements|="+elements.length);
                var rect = [ [x0, x0 + dx], [y0, y0 + dy] ];
                for (var i = 0; i < elements.length; i++) {
                    var e = elements[i];
                    debug_log("canvas.redraw: e["+i+"]=" + e);
                    e.draw(this, ctx);
                    e.best_label_point(elements, rect, delta_label);
                }
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
            circle_draw: function(ctx, circ) {
                var p = circ.center;
	        var cxy = [this.x2canvas(p.xy[0]), this.y2canvas(p.xy[1])];
                var rg = distance(circ.pt0, circ.pt1);
                var rc = this.g2canvas(rg);
                debug_log("rg="+rg + ", rc="+rc);
                ctx.beginPath();
                ctx.arc(cxy[0], cxy[1], rc, 0., 2*Math.PI);
                ctx.stroke();
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
                this.delta_label = this.canvas2g(
                    Math.max(8, Math.min(c.width, c.height)/0x80));
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
            g2canvas: function(d) { return (c.width * d) / dx; },
            canvas2g: function(p) { return (dx * p) / c.width; },
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

    var redraw = function() {
        canvas.redraw();
        etable.redraw();
    };

    canvas.redraw();
    ec.mousemove(function(e) {
        var relx = e.pageX, rely = e.pageY;
	var position = ec.position();
	var cx = e.pageX - position.left, cy = e.pageY - position.top;
	var xy = canvas.canvas2pt([cx, cy]);
	pointer.text("("+xy[0].toFixed(3) + ", " + xy[1].toFixed(3)+")");
	});

    var name_xy = ["pt-name", "line-name", "circle-name", "x", "y"];
    var sxy = ["x", "y"];

    for (var i = 0; i < name_xy.length; i++) {
        $("#" + name_xy[i] + "-error").css('display', 'none');
        $("#" + name_xy[i] + "-input").keypress(function (k) {
            return function() {
               $("#" + name_xy[k] + "-error").css('display', 'none'); 
            }}(i));
    }

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
                    var is_seg = dlg_line.data('segment');
                    debug_log("segment?=" + is_seg);
                    var pt01 = [0, 1].map(function (n) {
                        var pt_name = $("#pt" + n + "-select").val();
                        return elements.filter(function (e) { 
                            return e.name == pt_name; })[0]; });
                    debug_log("pt0="+pt01[0].str() + ", pt1="+pt01[1].str());
                    var ln = $.extend(true, {}, 
                        (is_seg ? line_segment : line_2points))
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

    var dlg_circle = $("#dlg-circle");
    dlg_circle.dialog({
        autoOpen: false,
	title: "Add Circle",
        width: 3*$(window).width()/5,
        height: 3*$(window).height()/5,
        modal: true,
        buttons: {
            "OK": function() {
                var name = $("#circle-name-input").val().trim();
                var ok = /^[A-Z][0-9]*$/.test(name) && 
                    ($.inArray(name, enames()) < 0);
                $("#circle-name-error").css('display', ok ? 'none' : 'block');
                if (ok) {
                    var sel_pfx = $.merge(["#center"],
                        [0,1].map(function(n) { return "#circle-pt" + n; }));
                    debug_log("sel_pfx="+sel_pfx);
                    var c_pt01 = sel_pfx.map(function (pfxn) { 
                        var pt_name = $(pfxn + "-select").val();
                        debug_log("pt_name="+pt_name);
                        return elements.filter(function (e) { 
                            return e.name == pt_name; })[0]; });
                    debug_log("c="+c_pt01[0] + 
                        ", pt0="+c_pt01[1].str() + ", pt1="+c_pt01[2].str());
                    var circ = $.extend(true, {}, circle_center_segment)
                        .name_set(name)
                        .center_segment_set(c_pt01[0], c_pt01[0], c_pt01[2]);
                    if (circ.valid) {
                        $(this).data('cb')(circ);
                        $(this).dialog("close"); 
                    } else {
                        error("Bad radius");
                    }
                }
            },
	    Cancel: function() { $(this).dialog("close"); }
	}
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

    var line_seg_modes = [false, true];
    for (var i = 0; i < 2; i++) {
        var is_seg_out = (i == 1);
        $(is_seg_out ? "#add-segment" : "#add-line").click(function(is_seg) {
            return function() {
                debug_log("add-line: is_seg="+is_seg);
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
                    dlg_line.dialog("option", "title", 
                        "Add " + (is_seg ? "Segment" : "Line"));
                    dlg_line.data("segment", is_seg);
                    dlg_line.data('cb', function(ln) { 
                        debug_log("pushing line:"+ln.str3());
                        elements.push(ln);
                        canvas.redraw();
                        etable.redraw();
                    });
                    dlg_line.dialog("open");
                }
            }
        }(is_seg_out));
    }

    $("#add-circle").click(function() {
        debug_log("add-circle");
        var pt_elements = elements.filter(
            function (e) { return e.is_point(); });
        debug_log("np="+pt_elements.length);
        if (pt_elements.length < 2) {
            error("For circle, 2 points must be defined");
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
            dlg_circle.data('cb', function(circ) { 
                debug_log("pushing circle:"+circ.str());
                elements.push(circ);
                canvas.redraw();
                etable.redraw();
            });
            dlg_circle.dialog("open");
        }
    });

});

})();
