(function () {
    "use strict";

    var debug_win;

    function debug_log0(message) {}

    function debug_log_dummy(message) {}

    function debug_log_real(message) {
        var c, html, entry;
        if (!debug_win) {
            debug_win = window.open("about:blank", "GeeOH-Debug",
                "width=300,height=300,scrollbars=1,resizable=1");
            html = "<html><head><title>GeeOH Debug</title></head><body>" +
                '<div id="debug">Hello1<br></div>' +
                "</body></html>";
            debug_win.document.open();
            debug_win.document.write(html);
            debug_win.document.close();
        }
        c = debug_win.document.getElementById("debug");
        if (c) {
            entry = document.createElement("div");
            entry.appendChild(document.createTextNode(message));
            c.appendChild(entry);
        }
    }

    function debug_log(message) { DEBUG_LOG_CHOOSE(message) }

    function af(a, n) {
        var s = "", sep = "";
        for (var i = 0; i < a.length; i++) {
            s += sep + a[i].toFixed(n);
            sep = ", ";
        }
        return s;
    }

    function paf(a, n) {
        return "(" + af(a, n) + ")";
    }

    function bpaf(a, n) {
        return "[" + af(a, n) + "]";
    }

    function xy_add(p0, p1) {
        return [p0[0] + p1[0], p0[1] + p1[1]];
    }

    function xy_xy_dist2(p0, p1) {
        var dx = p1[0] - p0[0];
        var dy = p1[1] - p0[1];
        var d2 = dx*dx + dy*dy;
        return d2;
    }

    function xyxyxy_angle(x0, y0, x1, y1, x2, y2, epsilon) {
        // Angle of 3-points, (v0,v1,v2) considered as complex numbers:
        //   v_k = x_k + iy_k  // i = 0,1,2
        //
        //   Angle of:
        //
        //     (v2-v1) / (v0 - v1)
        //     = ((x2 - x1) + i(y2 - y1)) / ((x0 - x1) + i(y0 - y1))
        //     = ((x2 - x1) + i(y2 - y1)) * ((x0 - x1) - i(y0 - y1))
        //       / ((x0 - x1)^2+(y0 - y1)^2)
        //
        //   is the angle of
        //     ((x2 - x1) + i(y2 - y1)) * ((x0 - x1) - i(y0 - y1))
        //     =      (x2 - x1)*(x0 - x1) + (y2 - y1)*(y0 - y1)
        //       +i( -(x2 - x1)*(y0 - y1) + (x0 - x1)*(y2 - y1)  )
        var dx01 = x0 - x1, dy01 = y0 - y1;
        var dx21 = x2 - x1, dy21 = y2 - y1;
        var x = dx21 * dx01 + dy21 * dy01;
        var y = -dx21*dy01 +  dx01*dy21;
        debug_log("v0=("+x0+","+y0+") v1=("+x1+","+y1+
            ") v2=("+x2+","+y2+")");
        debug_log("dv01=("+dx01+","+dy01+") dv21=("+dx21+","+dy21+")");
        var ret = undefined;
        if (Math.abs(x) + Math.abs(y) > epsilon) {
            ret = Math.atan2(y, x); // in HTML5 y grows down
        }
        debug_log("xy=("+x+","+y+")"+", ret="+ret.toFixed(2));
        return ret;
    }

    function xy2str(xy) {
        return "["+xy[0].toFixed(2) + ", " + xy[1].toFixed(2) + "]";
    }

    $(document).ready(function () {

        // constants
        var epsilon = 1./128.;
        var epsilon2 = epsilon*epsilon;
        var sqrt2 = Math.sqrt(2.);
        var sqrt2d2 = sqrt2 / 2.;

        var label_shift_factors = [
            [1, 0],
            [sqrt2d2, sqrt2d2],
            [0, 1],
            [-sqrt2d2, sqrt2d2],
            [-1, 0],
            [-sqrt2d2, -sqrt2d2],
            [0, -1],
            [sqrt2d2, -sqrt2d2]
        ];

        var error = function (error_msg) {
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

        var warning = function (msg) {
            $("#warnmsg").html(msg);
            $("#div-dialog-warning").dialog({
                title: "Warning",
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
            $("#div-dialog-warning").dialog("open");
        };

        var array_iup = function(a, ei) {
            debug_log("array_iup #="+a.length + ", ei="+ei);
            if (ei > 0) {
                var head = a.slice(0, ei - 1);
                var mid = [a[ei], a[ei - 1]];
                var tail = a.slice(ei + 1);
                a = $.merge($.merge($.merge([], head), mid), tail);
            }
            return a;
        };

        var xy_points_around = function (x, y, r) {
            var pts = [];
            var f = label_shift_factors;
            for (i = 0; i < f.length; i++) {
                pts.push([x + f[i][0]*r, y + f[i][1]*r]);
            }
            // debug_log("xy_points_around: x="+x+", y="+y + ", r="+r + ",
            //    pts="+pts);
            return pts;
        }

        var rect_xys_clip = function (rect, xys) {
            // debug_log("rect_xys_clip: rect="+rect + ", xys="+xys);
            var cxys = [];
            for (i = 0; i < xys.length; i++) {
                var x = xys[i][0], y = xys[i][1];
                if ((rect[0][0] < x) && (x < rect[0][1]) &&
                    (rect[1][0] < y) && (y < rect[1][1])) {
                    cxys.push(xys[i]);
                }
            }
            return cxys;
        }

        var digits_sub = function (s) {
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
        $("#version").html("β yyymmdd-HHMMSS");
        $("#toolbar").tabs({collapsible: true});

        $("#check-axes").prop("checked", true);

        var w = $(window).width();
        var h = $(window).height();
        debug_log("w="+w + ", h="+h);
        // var c = document.getElementById("geeoh-canvas");
        var rnd = Math.round
        w = rnd(7*w/8);
        h = rnd(7*h/8);
        debug_log("For Canvas: w="+w + ", h="+h);
        var ec = $("#geeoh-canvas");
        var c = ec[0];
        // ec.width(w).height(h);
        c.width = w; c.height = h;

        var pointer = $("#pointer").draggable();
        $("#tool-box").draggable();
        $("#elements-box").draggable();
        $("#expressions-box").draggable();
        $("#elements-toggle").click(function () {
             $("#elements").slideToggle();
        });
        $("#expressions-toggle").click(function () {
             $("#expressions").slideToggle();
        });

        var dlg_point = $("#dlg-point");
        var add_pt_tabs = $("#add-pt-tabs");

        // solve 2x2 linear equations
        var solve_2linear = function (abc0, abc1) {
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

        var elements = [];

        var points_options_set = function (ei) {
            var pt_elements = elements.slice(0, ei).filter(
                function (e) { return e.is_point(); });
            var pt_select = $(".pt-select").empty();
            for (var i = 0; i < pt_elements.length; i++) {
                 var name = pt_elements[i].name;
                 pt_select
                     .append($("<option></option>")
                         .attr("value", name)
                         .text(name));
            }
            return pt_elements.length;
        };

        var curves_options_set = function (ei) {
            var curve_elements = elements.slice(0, ei).filter(
                function (e) { return e.is_curve(); });
            if (curve_elements.length < 2) {
                add_pt_tabs.tabs('select', 0);
                add_pt_tabs.tabs('disable', 1);
            } else {
                add_pt_tabs.tabs('enable', 1);
                var curve_select = $(".curve-select").empty();
                for (var i = 0; i < curve_elements.length; i++) {
                     var name = curve_elements[i].name;
                     curve_select
                         .append($("<option></option>")
                             .attr("value", name)
                             .text(name));
                }
            }
        };

        var element = {
            name: "",
            valid: true,
            depon: [], // List of elements, this depends on
            selected: false,
            flags: 0,
            edit: function (ei) { debug_log("Dummmy edit"); return false; },
            name_set: function (s) { this.name = s; return this; },
            update: function () { debug_log("Dummy update"); },
            needs: function (element_name) {
                var found = false;
                for (var i = 0; !found && i < this.depon.length; ++i) {
                   found = this.depon[i].name === element_name;
                }
                return found;
            },
            scalar: function () { return null; },
            is_point: function () { return false; },
            is_segment: function () { return false; },
            is_circle: function () { return false; },
            is_curve: function () { return false; },
            distance_to: function (xy) {
                return Math.sqrt(this.distance2_to(xy)); },
            distance2_to: function (xy) { return 1.; },
            candidate_label_points: function (rect, delta) { return []; },
            best_label_point: function (elements, rect, delta) { // max-min
                debug_log("BLP: e="+this.name);
                var candidates = this.candidate_label_points(rect, delta);
                debug_log("pre-clip #="+candidates.length);
                candidates = rect_xys_clip(rect, candidates);
                debug_log("after-clip #="+candidates.length);
                var best = null, best_distance2 = -1;
                for (var ci = 0; ci < candidates.length; ci++) {
                    var cpt = candidates[ci];
                    var d2_nearest = Number.MAX_VALUE;
                    for (var ei = 0; ei < elements.length; ei++) {
                        if (this != elements[ei]) { // ignore distance to myself
                            var d2 = elements[ei].distance2_to(cpt);
                            if (d2_nearest > d2) { d2_nearest = d2; }
                        }
                    }
                    // debug_log("  BLP: cpt="+xy2str(cpt) +
                    //    ", d2near="+d2_nearest.toFixed(2));
                    if (best_distance2 < d2_nearest) {
                        best_distance2 = d2_nearest;
                        best = cpt;
                    }
                }
                debug_log("  BLP: best="+
                   (best === null ? "null" : xy2str(best)));
                return best;
            }
        };

        var point = $.extend(true, {}, element, {
            xy: [1., 1.],
            is_point: function () { return true; },
            xy_set: function (x, y) {
                this.xy[0] = x;
                this.xy[1] = y;
                return this;
            },
            edit: function (ei) {
                debug_log("point.edit: ei="+ei);
                $("#pt-name-input").val(this.name);
                curves_options_set(ei);
                this.edit_init();
                dlg_point.data("edit_mode", true);
                dlg_point.data('cb', function (pt) {
                    elements_replace_update(ei, pt);
                });
                dlg_point.dialog("open");
            },
            edit_init: function () {
                add_pt_tabs.tabs("option", "selected", 0);
                for (var i = 0; i < 2; i++) {
                    $("#" + sxy[i] + "-input").val(this.xy[i]);
                }
            },
            str: function () { return "•" + paf(this.xy, 2); },
            toJSON: function () {
                return {
                    'type': 'point',
                    'name': this.name,
                    'xy': this.xy
                };
            },
            draw: function (canvas, ctx) {
                if (this.valid) { canvas.point_draw(ctx, this); }
            },
            distance2_to: function (xy) {
                var d2 = Number.MAX_VALUE;
                if (this.valid) {
                    var dx = xy[0] - this.xy[0];
                    var dy = xy[1] - this.xy[1];
                    d2 = dx*dx + dy*dy;
                }
                return d2;
            },
            candidate_label_points: function (rect, delta) {
                return xy_points_around(this.xy[0], this.xy[1], delta);
            },
        });

        var distance2 = function (pt0, pt1) {
            var dx = pt1.xy[0] - pt0.xy[0];
            var dy = pt1.xy[1] - pt0.xy[1];
            return dx*dx + dy*dy;
        };

        var distance = function (pt0, pt1) {
            return Math.sqrt(distance2(pt0, pt1));
        };

        var line = $.extend(true, {}, element, {
            abc: [1., 0., 0.],  // Always (if valid): a^2 + b^2 = 1
            ok: function () { return this.abc !== undefined; },
            point_distance: function (pt) {
               return Math.abs(this.abc[0]*pt[0] + this.abc[1]*pt[1] +
                   this.abc[2]);
            },
            abc_get: function () { return this.abc; },
            abc_set: function (a, b, c) {
                debug_log0("abc_set: a="+a.toFixed(3) + ", b="+b.toFixed(3) +
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
            is_curve: function () { return true; },
            str: function () { return baf(this.abc); },
            draw: function (canvas, ctx) {
                canvas.line_draw(ctx, this);
            },
            distance2_to: function (xy) {
                var d = this.distance_to(xy);
                return d*d;
            },
            distance_to: function (xy) {
                var abc = this.abc;
                var v = abc[0]*xy[0] + abc[1]*xy[1] + abc[2];
                return Math.abs(v);
            },
            candidate_label_points: function (rect, delta) {
                // rect == [[Xmin,Xmax], [Ymin,YMax]]
                var candidates = [];
                // We intersect this line with the 4 lines of the clipping rect.
                // For each, if the intersection is withing the rect's segment
                // we add appropriate candidates, avoiding this line.
                //
                //  left:     abc = [1, 0, -rect[0][0]]
                //    shift =
                //      line-vertical? = [[delta, 0]]
                //      line-horizontal? = [ [delta, -delta], [delta, delta] ]
                //
                //  right:    abc = [1, 0, -rect[0][1]]
                //    shift =
                //      line-vertical? = [[-delta, 0]]
                //      line-horizontal? = [ [-delta, -delta], [-delta, delta] ]
                //
                //  bottom:   abc = [0, 1, -rect[1][0]]
                //    shift =
                //      line-vertical? = [[-delta, delta], [delta, delta]]
                //      line-horizontal? = [[0, delta]]
                //
                //  top:      abc = [0, 1, -rect[1][1]]
                //    shift =
                //      line-vertical? = [-delta, -delta], [delta, -delta]]
                //      line-horizontal? = [[0, -delta]]
                //
                var lrbt = [
                //   abc            horizontal          vertical
                    [[1, 0, [0,0]], [[ 1,-1], [ 1, 1]], [[ 1, 0]] ],
                    [[1, 0, [0,1]], [[-1,-1], [-1, 1]], [[-1, 0]] ],
                    [[0, 1, [1,0]], [[ 0, 1]],          [[-1, 1], [ 1, 1]] ],
                    [[0, 1, [1,1]], [[ 0,-1]],          [[-1,-1], [ 1,-1]] ],
                ];

                var vertical_like =
                   (Math.abs(this.abc[0]) < Math.abs(this.abc[1]));

                for (var i = 0; i < 4; i++) {
                   var abchv = lrbt[i];
                   var f_abc = abchv[0];
                   var f_h = abchv[1];
                   var f_v = abchv[2];

                   var ij = f_abc[2]
                   var bdy_abc = [ f_abc[0], f_abc[1], -rect[ij[0]][ij[1]] ];
                   var xy = solve_2linear(this.abc, bdy_abc);
                   if (xy != null) {
                       var shifts = (vertical_like ? f_v : f_h);
                       for (var j = 0; j < shifts.length; j++) {
                           var fs = shifts[j];
                           var cxy = [xy[0] + fs[0]*delta, xy[1] + fs[1]*delta];
                           candidates.push(cxy);
                       }
                   }
                }
                return candidates;
            },
        });

        var line_2points = $.extend(true, {}, line, {
            depon: [null, null],
            points_set: function (pt0, pt1) {
                debug_log0("L2Ps set: p0="+pt0.str() + ", pt1="+pt1.str());
                this.depon = [pt0, pt1];
                return this.update();
            },
            // (y1-y0)x - (x1-x0)y + c = 0
            // c = (x1-x0)y-(y1-y0)x
            //   = x1y0-x0y0-x0y1+x0y0 = x1y0 - x0y1
            //   = x1y1-x0y1-x1y1+x1y0 = x1y0 - x0y1
            update: function () {
                debug_log0("line_2points.update");
                var p0 = this.depon[0], p1 = this.depon[1];
                // debug_log("L2Ps update: p0="+p0.str() + ", p1="+p1.str());
                var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
                this.abc_set(y1 - y0, x0 - x1, x1*y0 - x0*y1);
                return this;
            },
            edit: function (ei) {
                debug_log("line_2points.edit: ei="+ei);
                dlg_line.data("edit_mode", true);
                $("#line-name-input").val(this.name);
                points_options_set(ei);
                for (var i = 0; i < 2; i++) {
                    $("#pt" + i + "-select").val(this.depon[i].name)
                        .attr("selected", true);
                }
                dlg_line.data('cb', function (c) {
                    elements_replace_update(ei, c);
                });
                dlg_line.dialog("open");
            },
            point_inside_segment: function (pt) {
                // Assuming pt is in the line,
                // but not necessarily within segment
                var p0 = this.depon[0], p1 = this.depon[1];
                var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
                var dx = x1 - x0, dy = y1 - y0;
                var j = (Math.abs(dx) < Math.abs(dy) ? 1 : 0);
                var v = pt.xy[j];
                var low = p0.xy[j], high = p1.xy[j];
                if (low > high) { var t = low; low = high; high = t; }
                var inside = (low <= v) && (v <= high);
                debug_log0("j="+j +", v="+v.toFixed(3) +
                    ", low="+low.toFixed(3) + ", high="+high.toFixed(3) +
                    ", inside="+inside);
                return inside;
            },
            str: function () {
                return "⤎(" + digits_sub(this.depon[0].name) + ", " +
                    digits_sub(this.depon[1].name) + ")⤏";
            },
            typename: function () { return 'line_2points'; },
            toJSON: function () {
                return {
                    'type': this.typename(),
                    'name': this.name,
                    'pts': [this.depon[0].name, this.depon[1].name]
                };
            },
        });

        var line_segment = $.extend(true, {}, line_2points, {
            super_update: line_2points.update,
            length: 0.,
            update: function () {
                var i;
                var A = this.depon[0].xy, B = this.depon[1].xy;
                var dx = B[0] - A[0];
                var dy = B[1] - A[1];
                var d2 = dx*dx + dy*dy;
                this.length = Math.sqrt(d2);                
                // debug_log("line_segment.update 1");
                this.super_update();
                debug_log("line_segment.update 2, |expressions|="+
                    expressions.length);
                $.each(expressions, function (i, e) { e.dirty = true; });
                return this;
            },
            is_segment: function () { return true; },
            str: function () {
                return "[" + digits_sub(this.depon[0].name) + ", " +
                    digits_sub(this.depon[1].name) + "]"; },
            draw: function (canvas, ctx) {
                canvas.segment_draw(ctx, this.depon[0], this.depon[1]);
            },
            scalar: function () { 
                return this.length;
            },
            candidate_label_points: function (rect, delta) {
                var mid = $.extend(true, {}, point)
                    .xy_set(
                        (this.depon[0].xy[0] + this.depon[1].xy[0])/2,
                        (this.depon[0].xy[1] + this.depon[1].xy[1])/2);
                return mid.candidate_label_points(rect, delta);
            },
            distance2_to: function (xy) {
                // denom -- may be cached on update!
                var p0 = this.depon[0];
                var p1 = this.depon[1];
                var dpx = p1[0] - p0[0];
                var dpy = p1[1] - p0[1];
                var denom = dpx*dpx + dpy * dpy;
                var m = p0;
                var d2;
                if (denom > epsilon2) {
                    var t = ((p0[0] - xy[0])*dpx + (p0[1] - xy[1])*dpy) / denom;
                    if (t <= 0) {
                        m = p0;
                    } else if (t >= 1) {
                        m = p1;
                    } else {
                        m = [xy[0] + t*dpx, xy[1] + t*dpy];
                    }
                }
                d2 = xy_xy_dist2(xy, m);
                return d2;
            },
            typename: function () { return 'line_segment'; },
        });


        var point_2curves = $.extend(true, {}, point, {
            depon: [null, null],
            other: false,
            curves_set: function (l0, l1, other) {
                debug_log0("point_2curves.curves_set: l0="+l0.str() +
                    ", l1="+l1.str());
                this.depon = [l0, l1];
                this.other = false;
                this.update();
                return this;
            },
            edit_init: function () {
                add_pt_tabs.tabs("option", "selected", 1);
                for (var i = 0; i < 2; i++) {
                    $("#add-pt-curve" + i).val(this.depon[i].name)
                        .attr("selected", true);
                }
                $("#other").prop("checked", this.other);
            },
        });

        var point_2lines = $.extend(true, {}, point_2curves, {
            update: function () {
                this.valid = false;
                var l0 = this.depon[0], l1 = this.depon[1];
                if (l0.valid && l1.valid) {
                    var xy = solve_2linear(l0.abc_get(), l1.abc_get());
                    this.valid = (xy !== null);
                    if (!this.valid) {
                        debug_log("p2l: Not-valid: l0="+l0.str() +
                            ", l1="+l1.str());
                        this.xy = null;
                    } else {
                        this.xy_set(xy[0], xy[1]);
                    }
                } else {
                    debug_log("p2l: update: l0||l1 not valid");
                }
            },
            str: function () {
                return "⨉(" + digits_sub(this.depon[0].name) + ", " +
                    digits_sub(this.depon[1].name) + ")";
            },
            toJSON: function () {
                return {
                    'type': "point_2lines",
                    'name': this.name,
                    'lines': [this.depon[0].name, this.depon[1].name]
                };
            },
        });

        var circle = $.extend(true, {}, element, {
            center: $.extend(true, {}, point).xy_set(0, 0),
            radius: 1,
            is_circle: function () { return true; },
            is_curve: function () { return true; },
            str: function () {
               return "Circle(" + this.center.str() + ", r="+this.radius + ")";
            },
            draw: function (canvas, ctx) {
                canvas.circle_draw(ctx, this);
            },
            distance_to: function (xy) {
                return Math.abs(this.center.distance_to(xy) - this.radius);
            },
            candidate_label_points: function (rect, delta) {
                return xy_points_around(this.center.xy[0], this.center.xy[1],
                    this.radius + delta);
            },
        });

        var circle_center_segment = $.extend(true, {}, circle, {
            depon: [null, null, null],
            center_segment_set: function (c, pt0, pt1) {
                this.depon = [c, pt0, pt1];
                return this.update();
            },
            update: function () {
                this.center = this.depon[0];
                this.radius = distance(this.depon[1], this.depon[2]);
                this.valid = (this.radius > epsilon);
                return this;
            },
            edit: function (ei) {
                debug_log("circle_center_segment.edit: ei="+ei);
                $("#circle-name-input").val(this.name);
                points_options_set(ei);
                $("#center-select")
                    .val(this.depon[0].name).attr("selected", true);
                for (var i = 0; i < 2; i++) {
                    $("#circle-pt" + i + "-select").val(this.depon[i + 1].name)
                        .attr("selected", true);
                }
                dlg_circle.data("edit_mode", true);
                dlg_circle.data('cb', function (c) {
                    elements_replace_update(ei, c);
                });
                dlg_circle.dialog("open");
            },
            str: function () {
               return "⊙(" + digits_sub(this.depon[0].name) + ", [" +
                   digits_sub(this.depon[1].name) + ", " + 
                   digits_sub(this.depon[2].name) + "])";
            },
            toJSON: function () {
                return {
                    'type': "circle",
                    'name': this.name,
                    'center': this.depon[0].name,
                    'segment': [this.depon[1].name, this.depon[2].name]
                };
            },
        });

        var point_circle_line = $.extend(true, {}, point_2curves, {
            update: function () {
                this.valid = false;
                var circle = this.depon[0];
                var line = this.depon[1];
                if (circle.valid && line.valid) {
                    // Shift X,Y to the circle center of.  xt = x-cx, yt = y-cy
                    var cx = circle.center.xy[0];
                    var cy = circle.center.xy[1];
                    // ax + by + c = (a(xt+cx) + b(yt+cy) + c = 0.
                    var a = line.abc[0];
                    var b = line.abc[1];
                    var c = line.abc[2] + a*cx + b*cy;
                    var a2b2 = a*a + b*b;
                    var denom = 1./a2b2;
                    var R = circle.radius;
                    var disc = a2b2*R*R - c*c;
                    if (disc >= 0) {
                        this.valid = true;
                        var sqr = Math.sqrt(disc);
                        if (this.other) { sqr = -sqr; }
                        var xt = (-a*c + b*sqr)*denom; // +/-
                        var yt = (-b*c - a*sqr)*denom; // -/+
                        this.xy[0] = xt + cx;
                        this.xy[1] = yt + cy;
                        debug_log("X(C,L): abc="+line.abc +
                            ", a="+a.toFixed(2) + ", b="+b.toFixed(2) +
                            ", c="+c +
                            ", a2b2="+a2b2.toFixed(2) +
                            ", disc="+disc.toFixed(2) +
                            ", xt="+xt.toFixed(2) + ", yt="+yt.toFixed(2) +
                            ", xy=["+this.xy[0].toFixed(2) + ", " +
                            this.xy[1].toFixed(2) + "]");
                    }
                } else {
                    debug_log("pcl: update: c|l not valid");
                }
            },
            str: function () {
                return "⨉(⊙" + digits_sub(this.depon[0].name) + ", " +
                    digits_sub(this.depon[1].name) + ")";
            },
            toJSON: function () {
                return {
                    'type': "point_circle_line",
                    'name': this.name,
                    'cl': [this.depon[0].name, this.depon[1].name],
                    'other': this.other
                };
            },
        });

        var point_2circles = $.extend(true, {}, point_2curves, {
            update: function () {
                debug_log("point_2circles::update");
                this.valid = false;
                var c0 = this.depon[0];
                var c1 = this.depon[1];
                debug_log("point_2circles::update v0="+
                    c0.valid + ", v1="+c1.v1);
                if (c0.valid && c1.valid) {
                    var c0x = c0.center.xy[0];
                    var c0y = c0.center.xy[1];
                    var c1x = c1.center.xy[0];
                    var c1y = c1.center.xy[1];
                    var dx = c1x - c0x;
                    var dy = c1y - c0y;
                    var dist2 = dx*dx + dy*dy;
                    var dist = Math.sqrt(dist2);
                    var r0 = c0.radius;
                    var r1 = c1.radius;
                    debug_log("dist="+dist.toFixed(2) + ", r0="+r0.toFixed(2) +
                        ", r1="+r1.toFixed(2));
                    if ((dist <= r0 + r1) && (dist > Math.abs(r0 - r1))) {
                         this.valid = true;
                         // First Consider coordinate system,
                         //  centered at (c0x,c0y)
                         // and (c1x, c1y) lies on its positive 'X' ray.
                         // mid point of 2 intersection points
                         var xt = (dist*dist + r0*r0 - r1*r1)/(2*dist);
                         var yt2 = r0*r0 - xt*xt; // square of half distance
                         var yt = Math.sqrt(yt2);
                         if (this.other) { yt = -yt; }
                         // In original coordinate system
                         var dx = c1x - c0x;
                         var dy = c1y - c0y;
                         var q = xt/dist;
                         var xmid = c0x + q*dx;
                         var ymid = c0y + q*dy;
                         var q = yt/dist;
                         // Add the mid-point - a perpendicular yt segment.
                         this.xy[0] = xmid - q*dy;
                         this.xy[1] = ymid + q*dx;
                         debug_log("XCC: xt="+xt.toFixed(2) +
                            ", yt2="+yt2.toFixed(2) +
                            ", yt="+yt.toFixed(2) +
                            ", xy="+xy2str(this.xy));
                    }
                } else {
                    debug_log("pcl: update: c|c not valid");
                }
            },
            tabi: 1,
            str: function () {
                return "⨉(⊙" + digits_sub(this.depon[0].name) + ", " +
                    "⊙" + digits_sub(this.depon[1].name) + ")";
            },
            toJSON: function () {
                return {
                    'type': "point_2circles",
                    'name': this.name,
                    'circles': [this.depon[0].name, this.depon[1].name],
                    'other': this.other
                };
            },
        });

        var angle = $.extend(true, {}, element, {
            value: 0.,
            scalar: function () { return value; }
        });

        var angle_3pt = $.extend(true, {}, angle, {
            depon: [null, null, null],
            angle_begin: 0.,
            angle_end: 0.,
            label_pt_cs: [0., 0.],
            label_delta: 1.,
            points_set: function (p0, p1, p2) {
                this.depon = [p0, p1, p2];
                return this.update();
            },
            update: function () {
                // Angle of 3-points, (v0,v1,v2) considered as complex numbers:
                //   v_k = x_k + iy_k  // i = 0,1,2
                //
                //   Angle of:
                //
                //     (v2-v1) / (v0 - v1)
                //     = ((x2 - x1) + i(y2 - y1)) / ((x0 - x1) + i(y0 - y1))
                //     = ((x2 - x1) + i(y2 - y1)) * ((x0 - x1) - i(y0 - y1))
                //       / ((x0 - x1)^2+(y0 - y1)^2)
                //
                //   is the angle of
                //     ((x2 - x1) + i(y2 - y1)) * ((x0 - x1) - i(y0 - y1))
                //     =      (x2 - x1)*(x0 - x1) + (y2 - y1)*(y0 - y1)
                //       +i( -(x2 - x1)*(y0 - y1) + (x0 - x1)*(y2 - y1)  )
                var x0 = this.depon[0].xy[0], y0 = this.depon[0].xy[1];
                var x1 = this.depon[1].xy[0], y1 = this.depon[1].xy[1];
                var x2 = this.depon[2].xy[0], y2 = this.depon[2].xy[1];
                this.value = xyxyxy_angle(x0, y0, x1, y1, x2, y2, epsilon);
                if (this.value === undefined) {
                    this.valid = false;
                    this.value = 0;
                } else {
                    this.valid = true;
                    var angle_begin = xyxyxy_angle(x1 + 1, y1, x1, y1, x0, y0,
                        epsilon);
                    var angle_end = xyxyxy_angle(x1 + 1, y1, x1, y1, x2, y2,
                        epsilon);
                    this.angle_begin = angle_begin;
                    this.angle_end = angle_end;
                    if (angle_begin < 0) { angle_begin += 2*Math.PI; }
                    if (angle_end < 0) { angle_end += 2*Math.PI; }
                    var angle_mid = (angle_begin + angle_end)/2.;
                    if (angle_begin > angle_end) {
                        angle_mid += (angle_mid < Math.PI ? 1 : -1)*Math.PI;
                    }
                    this.label_pt_cs =
                        [Math.cos(angle_mid), Math.sin(angle_mid)];
                    debug_log("Ab="+this.angle_begin +
                        ", Am="+angle_mid.toFixed(2) +
                        ", Ae="+this.angle_end.toFixed(2) +
                        " c="+this.label_pt_cs[0].toFixed(2) +
                        " s="+this.label_pt_cs[1].toFixed(2));
                    var v = this.depon;
                    var dsq_01 = xy_xy_dist2(v[0].xy, v[1].xy);
                    var dsq_21 = xy_xy_dist2(v[2].xy, v[1].xy);
                    this.label_delta = Math.sqrt(Math.min(dsq_01, dsq_21))/6.;
                    debug_log("label_delta="+this.label_delta);
                    $.each(expressions, function (i, e) { e.dirty = true; });
                }
                debug_log("angle.update: valid="+this.valid +
                    ", value="+this.value.toFixed(2));
                return this;
            },
            str: function () {
                return "∡(" + digits_sub(this.depon[0].name) + "," +
                    digits_sub(this.depon[1].name) + "," +
                    digits_sub(this.depon[2].name) + ")";
            },
            toJSON: function () {
                return {
                   'type': 'angle',
                   'name': this.name,
                   'pts': [
                       this.depon[0].name,
                       this.depon[1].name,
                       this.depon[2].name]
                };
            },
            draw: function (canvas, ctx) {
                if (this.valid) {
                    var v1 = this.depon[1];
                    var x1 = v1.xy[0], y1 = v1.xy[1];
                    canvas.arc_draw(ctx, x1, y1,
                        this.angle_begin, this.angle_end);
                }
            },
            distance2_to: function (xy) {
                var d2 = Number.MAX_VALUE;
                if (this.valid) {
                    var v1 = this.depon[1];
                    var cs = this.label_pt_cs;
                    var dx = xy[0] - (v1.xy[0] + cs[0]*this.label_delta);
                    debug_log0("dx="+dx+", xy="+xy2str(xy)+", cs="+xy2str(cs)+
                        ", label_delta="+this.label_delta);
                    var dy = xy[1] - (v1.xy[1] + cs[0]*this.label_delta);
                    d2 = dx*dx + dy*dy;
                    debug_log("A.d2to: d2="+d2.toFixed(2));
                }
                return d2;
            },
            distance_to: function (xy) {
                var d = Number.MAX_VALUE;
                if (this.valid) {
                    var d2 = this.distance2_to(xy);
                    d = Math.sqrt(d2);
                }
                return d2;
            },
            candidate_label_points: function (rect, delta) {
                var v1 = this.depon[1];
                var cs = this.label_pt_cs;
                delta += this.label_delta;
                return [[v1.xy[0] + cs[0]*delta, v1.xy[1] + cs[1]*delta]];
            },
        });

        var json_element_create = function (ejson) {
            var e = null;
            var typename = ejson['type'];
            var name = ejson['name'];
            // debug_log("type="+typename + ", name="+name);
            if (typename === 'point') {
                var xy = ejson['xy'];
                e = $.extend(true, {}, point)
                    .name_set(name)
                    .xy_set(xy[0], xy[1]);
            } else if (typename === 'line_2points') {
                var pts = names_to_elements(ejson['pts']);
                e = $.extend(true, {}, line_2points)
                    .name_set(name)
                    .points_set(pts[0], pts[1]);
            } else if (typename === 'line_segment') {
                var pts = names_to_elements(ejson['pts']);
                e = $.extend(true, {}, line_segment)
                    .name_set(name)
                    .points_set(pts[0], pts[1]);
            } else if (typename === 'circle') {
                // debug_log('making circle');
                // debug_log("center="+ejson["center"]);
                // debug_log("segment="+ejson["segment"]);
                var c_seg_names = $.merge($.merge([],
                    [ejson['center']]), ejson['segment']);
                // debug_log("c_seg_names="+c_seg_names);
                var c_seg = names_to_elements(c_seg_names);
                // debug_log("c_seg_names="+c_seg_names + ", c_seg="+c_seg);
                e = $.extend(true, {}, circle_center_segment)
                    .name_set(name)
                    .center_segment_set(c_seg[0], c_seg[1], c_seg[2]);
            } else if (typename === "point_2lines") {
                var lines = names_to_elements(ejson['lines']);
                e = $.extend(true, {}, point_2lines)
                   .name_set(name)
                   .curves_set(lines[0], lines[1]);
            } else if (typename === "point_circle_line") {
                var cl = names_to_elements(ejson['cl']);
                e = $.extend(true, {}, point_circle_line)
                    .name_set(name)
                    .curves_set(cl[0], cl[1], ejson['other'])
            } else if (typename === "point_2circles") {
                var circles = names_to_elements(ejson['circles']);
                e = $.extend(true, {}, point_2circles)
                    .name_set(name)
                    .curves_set(circles[0], circles[1], ejson['other'])
            } else if (typename === "angle") {
                var pts = names_to_elements(ejson['pts']);
                e = $.extend(true, {}, angle_3pt)
                    .name_set(name)
                    .points_set(pts[0], pts[1], pts[2]);
            }
            return e;
        };

        var name_to_element = function (name) {
            return elements.filter(function (e) {
                return e.name == name;
            })[0];
        }
        var names_to_elements = function (names) {
            return names.map(function (name) {
                return elements.filter(function (e) {
                    return e.name == name; })[0];
                });
            };
        var selected_index = function () {
            var i = 0;
            while ((i < elements.length) && !elements[i].selected) {
                i++;
            }
            return i;
        };
        var elements_at_add = function (at, e) {
            var head = elements.slice(0, at);
            var tail = elements.slice(at);
            debug_log0("at="+at + ", |h|="+head.length + ", |t|="+tail.length
                + ", |e|="+elements.length);
            elements = $.merge($.merge(head, [e]), tail);
            // debug_log("After: |e|="+elements.length);
        };
        var elements_replace_update = function (ei, e) {
            var name = elements[ei].name;
            elements[ei] = e;
            e.update();
            for (; ei < elements.length; ei++) {
                var enext = elements[ei];
                for (var di = 0; di < enext.depon.length; di++) {
                    if (enext.depon[di].name === name) {
                        debug_log("eru: ei="+ei + ", di="+di);
                        enext.depon[di] = e;
                    }
                }
                debug_log("eru: ei="+ei +", e="+e.str() + ", ...update()");
                enext.update();
            }
            redraw();
        };

        $("#json-in").click(function () {
                // debug_log("json-in");
                var es_json;
                try {
                    es_json = JSON.parse($("#json-text")[0].value);
                } catch(ex) {
                    debug_log("ex="+ex);
                    es_json = [];
                }
                elements = [];
                var json_elements = es_json['elements'];
                // debug_log("|e|="+es_json.length);
                for (var i = 0; i < json_elements.length; i++) {
                    var e = json_element_create(json_elements[i]);
                    if (e !== null) {
                        elements.push(e);
                    }
                }
                expressions = [];
                var json_expressions = es_json['expressions'];
                for (var i = 0; i < json_expressions.length; i++) {
                    var e = $.extend(true, {}, expression)
                        .set(json_expressions[i]);
                    expressions.push(e);
                }
                redraw();
            });
        $("#json-out").click(function () {
                debug_log("json-out");
                var t = $("#json-text")[0];
                // t.value = JSON.stringify(elements);
                var d = {
                    'elements': elements,
                    'expressions': expressions,
                };
                t.value = JSON.stringify(d);
            });
        var enames = function () {
            return elements.map(function (e) { return e.name; })
        };
        var element_edit = function (ei) {
            debug_log("element_edit ei="+ei);
            var e = elements[ei];
            e.edit(ei);
        };
        var element_remove = function (ei) {
            debug_log("element_remove ei="+ei);
            var name = elements[ei].name;
            for (var i = ei + 1;
                (i < elements.length) && !elements[i].needs(name); i++);
            if (i == elements.length) {
                elements = $.merge(elements.slice(0, ei),
                    elements.slice(ei + 1));
                redraw();
            } else {
                warning("Element '" + elements[i].name +
                    "' needs '" + name + "'");
            }
        };
        var element_up = function (ei) {
            if (ei > 0) {
                var upname = elements[ei - 1].name;
                if (elements[ei].needs(upname)) {
                    warning("Element '" + elements[ei].name +
                        "' needs '" + upname + "'");
                } else {
                    elements = array_iup(elements, ei);
                    etable.redraw();
                }
            }
        };
        var etable = function () {
            return {
                redraw: function () {
                    var any_selected = false;
                    var tbody = $("#elements-tbody");
                    tbody.empty();
                    for (var i = 0; i < elements.length + 1; i++) {
                        var e, classes = "element-row", checkbox;
                        if (i < elements.length) {
                            e = elements[i];
                            any_selected = any_selected || e.selected;
                        } else {
                            e  = {
                                'name': '_',
                                'str': function () { return '_'; },
                                selected: !any_selected
                            };
                        }
                        var tr = $('<tr>');
                            tr
                            .attr("ei", i)
                            .addClass("element-row" +
                                (e.selected ? " element-selected" : ""))
                            .append($('<td>')
                                .text(digits_sub(e.name)))
                            .append($('<td>')
                                .text(e.str()));
                        if (i < elements.length) {
                            tr.append($('<td>')
                                .append($('<button>')
                                    .html("Edit")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-pencil"
                                        }})
                                        .click(function (ei) {
                                            return function () {
                                                element_edit(ei); }
                                        }(i))
                                    )
                                .append($('<button>')
                                    .html("Remove")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-trash"
                                        }})
                                        .click(function (ei) {
                                            return function () {
                                                element_remove(ei);
                                            }
                                        }(i))
                                    )
                                .append($('<button>')
                                    .html("Up")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-arrow-1-n"
                                        }})
                                        .click(function (ei) {
                                            return function () {
                                                element_up(ei); }
                                        }(i))
                                    )
                            );
                            debug_log("Adding checkbox flags="+e.flags);
                            // view flag overrides label flags
                            checkbox = $('<input type="checkbox">')
                                .prop("checked", (e.flags & 0x1) == 0)
                                .click(function (ei) {
                                    return function() {
                                        var flag = elements[ei].flags & 0x1;
                                        debug_log("ei="+ei+", f="+flag);
                                        if (flag == 0) {
                                            elements[ei].flags |= 0x3;
                                        } else {
                                            elements[ei].flags &= ~0x3;
                                        }
                                    }
                                }(i));
                            tr.append($("<td>").append(checkbox));
                            // label flag, leaves view flag alone
                            checkbox = $('<input type="checkbox">')
                                .prop("checked", (e.flags & 0x2) == 0)
                                .click(function (ei) {
                                    return function() {
                                        var flag = elements[ei].flags & 0x2;
                                        debug_log("ei="+ei+", f="+flag);
                                        if (flag == 0) {
                                            elements[ei].flags |= 0x2;
                                        } else {
                                            elements[ei].flags &= ~0x2;
                                        }
                                    }
                                }(i));
                            tr.append($("<td>").append(checkbox));
                        }
                        tbody.append(tr);
                    }
                    $(".element-row").click(function () {
                        var ei = $(this).attr("ei");
                        // debug_log("IN element-row clicked ei="+ei);
                        for (var i = 0; i < elements.length; i++) {
                            elements[i].selected = (i == ei);
                        }
                        etable.redraw();
                    });
                }
            }
        }();

        var canvas = function () {
            var rect_required = [[-2, 6], [-2, 6]]; // Xmin, Xmax, Ymin, Ymax
            var min_max = undefined;
            var x0, dx, y0, dy;
            var point_lb, point_rb, point_lt, point_rt;
            var line_left, line_right, line_bottom, line_top;
            var dtag1, pt_rad, angle_rad, delta_label;
            return {
                rect_get: function () { return rect_required; },
                rect_set: function (rectnew) {
                    rect_required = rectnew;
                    debug_log("rect_required="+rect_required);
                    this.redraw();
                },
                redraw: function () {
                    var ctx = c.getContext("2d");
                    ctx.clearRect(0, 0, w, h);
                    ctx.fillStyle = "#d7d7d7";
                    ctx.fillRect(0, 0, w, h);
                    this.minmax_set();
                    if ($("#check-axes").prop("checked")) {
                        this.axis_draw(ctx);
                    }
                    // debug_log("|elements|="+elements.length);
                    var rect = [ [x0, x0 + dx], [y0, y0 + dy] ];
                    for (var i = 0; i < elements.length; i++) {
                        var e = elements[i];
                        // debug_log("canvas.redraw: e["+i+"]=" + e);
                        if (e.valid) {
                            e.draw(this, ctx);
                            var p = e.best_label_point(
                                elements, rect, delta_label);
                            if (p !== null) {
                                // ctx.font = "Italic 30px";
                                ctx.font = "italic 12pt sans-serif";
                                ctx.textAlign = "center";
                                ctx.strokeText(digits_sub(e.name),
                                    this.x2canvas(p[0]), this.y2canvas(p[1]));
                            }
                        }
                    }
                },
                axis_draw: function (ctx) {
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
                point_draw: function (ctx, p) {
                    var cxy = [this.x2canvas(p.xy[0]), this.y2canvas(p.xy[1])];
                    return this.pt_cdraw(ctx, cxy);
                },
                pt_cdraw: function (ctx, pt) {
                    ctx.beginPath();
                    // ctx.moveTo(pt[0] + pt_rad, pt[1]);
                    ctx.arc(pt[0], pt[1], pt_rad, 0., 2*Math.PI);
                    ctx.closePath();
                    ctx.fill();
                    return this;
                },
                seg_draw: function (ctx, a, b) { // OBSOLETE!!
                    this.seg_cdraw(ctx, this.pt2canvas(a), this.pt2canvas(b));
                },
                segment_draw: function (ctx, pt0, pt1) {
                    this.seg_cdraw(ctx,
                        this.pt2canvas(pt0.xy), this.pt2canvas(pt1.xy));
                },
                seg_cdraw: function (ctx, a, b) {
                    ctx.fillStyle = "#111";
                    ctx.beginPath();
                    ctx.moveTo(a[0], a[1]);
                    ctx.lineTo(b[0], b[1]);
                    ctx.stroke();
                },
                line_draw: function (ctx, l) {
                    var bdy_pts = []; // boundary points
                    var lines = [this.line_left, this.line_right,
                        this.line_bottom, this.line_top];
                    for (var i = 0; i < 4; i++) {
                        var lbdy = lines[i];
                        var pt = $.extend(true, {}, point_2lines)
                            .curves_set(l, lbdy);
                        if (pt.valid) {
                            if (lbdy.point_inside_segment(pt)) {
                                bdy_pts.push(pt);
                            }
                        }
                    }
                    // debug_log("|bdy_pts|="+bdy_pts.length);
                    if (bdy_pts.length >= 2) {
                       this.segment_draw(ctx, bdy_pts[0], bdy_pts[1]);
                    }
                },
                circle_draw: function (ctx, circ) {
                    var p = circ.center;
                    var cxy = [this.x2canvas(p.xy[0]), this.y2canvas(p.xy[1])];
                    var rg = circ.radius;
                    var rc = this.g2canvas(rg);
                    // debug_log("rg="+rg + ", rc="+rc);
                    ctx.beginPath();
                    ctx.arc(cxy[0], cxy[1], rc, 0., 2*Math.PI);
                    ctx.stroke();
                },
                arc_draw: function (ctx, x, y, angle_begin, angle_end) {
                    debug_log("arc_draw: Ab="+angle_begin.toFixed(2)+
                        ", Ae="+angle_end.toFixed(2));
                    // in HTML5 angles grow down and clockwise.
                    ctx.beginPath();
                    ctx.arc(this.x2canvas(x), this.y2canvas(y),
                        angle_rad, -angle_begin, -angle_end, true);
                    ctx.stroke();
                },
                minmax_set: function () {
                    // debug_log("minmax_set called");
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
                    delta_label = this.canvas2g(
                        Math.max(16, Math.min(c.width, c.height)/0x40));
                    pt_rad = Math.max(3, Math.min(c.width, c.height)/0x200);
                    angle_rad = Math.max(12, Math.min(c.width, c.height)/0x100);
                    this.point_lb = $.extend(true, {}, point).xy_set(x0, y0);
                    this.point_rb = $.extend(true, {}, point)
                        .xy_set(x0 + dx, y0);
                    this.point_lt = $.extend(true, {}, point)
                        .xy_set(x0, y0 + dy);
                    this.point_rt =
                        $.extend(true, {}, point).xy_set(x0 + dx, y0 + dy);
                    this.line_left = $.extend(true, {}, line_2points)
                        .points_set(this.point_lb, this.point_lt);
                    this.line_right = $.extend(true, {}, line_2points)
                        .points_set(this.point_rb, this.point_rt);
                    this.line_bottom = $.extend(true, {}, line_2points)
                        .points_set(this.point_lb, this.point_rb);
                    this.line_top = $.extend(true, {}, line_2points)
                        .points_set(this.point_lt, this.point_rt);
                },
                pt2canvas: function (pt) {
                    return [this.x2canvas(pt[0]), this.y2canvas(pt[1])];
                },
                canvas2pt: function (cpt) {
                    return [this.canvas2x(cpt[0]), this.canvas2y(cpt[1])];
                },
                g2canvas: function (d) { return (c.width * d) / dx; },
                canvas2g: function (p) { return (dx * p) / c.width; },
                x2canvas: function (x) { return (c.width * (x - x0)) / dx; },
                y2canvas: function (y) {
                    return (c.height * (y0 + dy - y)) / dy; },
                canvas2x: function (cx) { return x0 + (cx * dx)/c.width; },
                canvas2y: function (cy) {
                    return y0 + dy - (cy * dy)/c.height; },
                digits_sub: function (s) {
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

        $("#check-axes").click(function () { canvas.redraw(); });

        canvas.redraw();
        ec.mousemove(function (e) {
            var relx = e.pageX, rely = e.pageY;
            var position = ec.position();
            var cx = e.pageX - position.left, cy = e.pageY - position.top;
            var xy = canvas.canvas2pt([cx, cy]);
            pointer.text("("+xy[0].toFixed(2) + ", " + xy[1].toFixed(2)+")");
            });

        var name_xy = ["pt-name", "line-name", "circle-name", "x", "y"];
        var sxy = ["x", "y"];

        for (var i = 0; i < name_xy.length; i++) {
            $("#" + name_xy[i] + "-error").css('display', 'none');
            $("#" + name_xy[i] + "-input").keypress(function (k) {
                return function () {
                   $("#" + name_xy[k] + "-error").css('display', 'none');
                }}(i));
        }

        add_pt_tabs.tabs();
        dlg_point.dialog({
            autoOpen: false,
            title: "Add Point",
            modal: true,
            open: function (event, ui) {
                debug_log("dlg_point.open cb");
                var edit_mode = dlg_point.data("edit_mode");
                if (edit_mode) {
                    $("#pt-name-input").attr('disabled', true);
                } else {
                    $("#pt-name-input").removeAttr('disabled');
                }
                var t = (edit_mode ? "Edit" : "Add") + " Point";
                dlg_point.dialog("option", "title", t);
            },
            buttons: {
                "OK": function () {
                    var $this = this;
                    var ok = true;
                    var pt = null;
                    var xy = [];
                    var edit_mode = dlg_point.data("edit_mode");
                    var name = $("#pt-name-input").val().trim();
                    var ok = edit_mode ||
                        (/^[A-Z][0-9]*$/.test(name) &&
                        ($.inArray(name, enames()) < 0));
                    $("#pt-name-error").css('display', ok ? 'none' : 'block');
                    var tabi = add_pt_tabs.tabs("option", "selected");
                    debug_log("dlg_point/ok: tabi="+tabi);
                    if (tabi == 0) { // absolute
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
                                .xy_set(xy[0], xy[1]);
                        }
                    } else { // tabi == 1 ==> intersection
                        var other = $("#other").is(':checked');
                        debug_log("other="+other);
                        var curve01 = [0, 1].map(function (n) {
                            var cname = $("#add-pt-curve" + n).val();
                            // debug_log("n="+n + ", cname="+cname);
                            return elements.filter(function (e) {
                                return e.name == cname; })[0]; });
                        if (curve01[0].is_circle()) {
                            if (curve01[1].is_circle()) {
                                pt = $.extend(true, {}, point_2circles)
                                    .curves_set(curve01[0], curve01[1],
                                        other);
                            } else {
                                pt = $.extend(true, {}, point_circle_line)
                                    .curves_set(curve01[0], curve01[1], other);
                            }
                        } else {
                            if (curve01[1].is_circle()) {
                                pt = $.extend(true, {}, point_circle_line)
                                    .curves_set(curve01[1], curve01[0], other);
                            } else {
                                pt = $.extend(true, {}, point_2lines)
                                    .curves_set(curve01[0], curve01[1]);
                            }
                        }
                    }
                    debug_log("dlg_point: ok="+ok);
                    if (ok) {
                        pt.name_set(name);
                        $(this).data('cb')(pt);
                        $(this).dialog("close");
                    }
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        var dlg_line = $("#dlg-line");
        dlg_line.dialog({
            autoOpen: false,
            title: "Add Line",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            open: function (event, ui) {
                debug_log("dlg_point.open cb");
                var edit_mode = dlg_line.data("edit_mode");
                var is_seg = dlg_line.data('segment');
                var lni = $("#line-name-input");
                if (edit_mode) {
                    lni.attr('disabled', true);
                } else {
                    lni.removeAttr('disabled');
                }
                var t = (edit_mode ? "Edit" : "Add") +
                    (is_seg ? " Segment" : " Line");
                dlg_line.dialog("option", "title", t);
            },
            buttons: {
                "OK": function () {
                    var $this = this;
                    var ok = true;
                    var xy = [];
                    var edit_mode = dlg_line.data("edit_mode");
                    var name = $("#line-name-input").val().trim();
                    var ok = edit_mode ||
                        (/^[a-z][0-9]*$/.test(name) &&
                        ($.inArray(name, enames()) < 0));
                    $("#line-name-error").css('display', ok ? 'none' : 'block');
                    if (ok) {
                        var is_seg = dlg_line.data('segment');
                        // debug_log("segment?=" + is_seg);
                        var pt01 = [0, 1].map(function (n) {
                            var pt_name = $("#pt" + n + "-select").val();
                            return elements.filter(function (e) {
                                return e.name == pt_name; })[0]; });
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
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        var dlg_circle = $("#dlg-circle");
        dlg_circle.dialog({
            autoOpen: false,
            title: "Add Circle",
            width: 3*$(window).width()/5,
            height: 3*$(window).height()/5,
            modal: true,
            open: function (event, ui) {
                debug_log("dlg_point.open cb");
                var edit_mode = dlg_circle.data("edit_mode");
                if (edit_mode) {
                    $("#circle-name-input").attr('disabled', true);
                } else {
                    $("#circle-name-input").removeAttr('disabled');
                }
                var t = (edit_mode ? "Edit" : "Add") + " Circle";
                dlg_circle.dialog("option", "title", t);
            },
            buttons: {
                "OK": function () {
                    var edit_mode = dlg_circle.data("edit_mode");
                    var name = $("#circle-name-input").val().trim();
                    var ok = edit_mode ||
                        (/^[A-Z][0-9]*$/.test(name) &&
                        ($.inArray(name, enames()) < 0));
                    $("#circle-name-error")
                        .css('display', ok ? 'none' : 'block');
                    if (ok) {
                        var sel_pfx = $.merge($.merge([], ["#center"]),
                            [0,1].map(function (n) {
                                 return "#circle-pt" + n; }));
                        // debug_log("sel_pfx="+sel_pfx);
                        var c_pt01 = sel_pfx.map(function (pfxn) {
                            var pt_name = $(pfxn + "-select").val();
                            // debug_log("pt_name="+pt_name);
                            return elements.filter(function (e) {
                                return e.name == pt_name; })[0]; });
                        debug_log0("c="+c_pt01[0] +
                            ", pt0="+c_pt01[1].str() +
                            ", pt1="+c_pt01[2].str());
                        var circ = $.extend(true, {}, circle_center_segment)
                            .name_set(name)
                            .center_segment_set(c_pt01[0], c_pt01[1],
                                c_pt01[2]);
                        if (circ.valid) {
                            $(this).data('cb')(circ);
                            $(this).dialog("close");
                        } else {
                            error("Bad radius");
                        }
                    }
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        var dlg_angle = $("#dlg-angle");
        $(".keypad-popup").css("z-index", 9999);
        $("#angle-name-input").keypad({
            "layout": [
               // see: http://en.wikipedia.org/wiki/Keyboard_layout#Greek
               //      http://unifont.org/keycurry/KeyCurryIPA.html
               "0123456789" + $.keypad.BACK,
               "ςερτυθιοπ" + $.keypad.CLEAR,
               "ασδφγηξκλ",
               "ζχψωβνμ" + $.keypad.CLOSE
            ]
        });
        dlg_angle.dialog({
            autoOpen: false,
            title: "Add Angle",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            open: function (event, ui) {
                debug_log("dlg_angle.open cb");
                var edit_mode = dlg_angle.data("edit_mode");
                var lni = $("#angle-name-input");
                if (edit_mode) {
                    lni.attr('disabled', true);
                } else {
                    lni.removeAttr('disabled');
                }
                var t = (edit_mode ? "Edit" : "Add") + " Angle";
                dlg_angle.dialog("option", "title", t);
            },
            buttons: {
                "OK": function () {
                    var $this = this;
                    var ok = true;
                    var xy = [];
                    var edit_mode = dlg_angle.data("edit_mode");
                    var name = $("#angle-name-input").val().trim();
                    var ok = edit_mode ||
                        (/^[α-ψ][0-9]*$/.test(name) &&
                        ($.inArray(name, enames()) < 0));
                    debug_log("angle-name-error: ok="+ok);
                    $("#angle-name-error")
                        .css('display', ok ? 'none' : 'block');
                    if (ok) {
                        var pts = [0, 1, 2].map(function (n) {
                            var pt_name = $("#angle-pt" + n + "-select").val();
                            return elements.filter(function (e) {
                                return e.name == pt_name; })[0]; });
                        var a = $.extend(true, {}, angle_3pt)
                            .name_set(name)
                            .points_set(pts[0], pts[1], pts[2]);
                        if (a.valid) {
                            $(this).data('cb')(a);
                            $(this).dialog("close");
                        }
                    }
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        debug_log("dlg-expression: #"+$("#dlg-expression")[0]);
        var dlg_expression = $("#dlg-expression");
        $(".keypad-popup").css("z-index", 99999);
        $("#expression-input").keypad({
            keypadOnly: false,
            "layout": [
               "ςερτυθιοπ" + $.keypad.CLEAR,
               "ασδφγηξκλ",
               "ζχψωβνμ" + $.keypad.CLOSE
            ]
        });
        dlg_expression.dialog({
            autoOpen: false,
            title: "Add Expression",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            open: function (event, ui) {
                debug_log("dlg_expression.open cb");
                var edit_mode = dlg_expression.data("edit_mode");
                var t = (edit_mode ? "Edit" : "Add") + " Expression";
                dlg_expression.dialog("option", "title", t);
            },
            buttons: {
                "OK": function () {
                    var e = $.extend(true, {}, expression)
                        .set($("#expression-input").val());
                    dlg_expression.data("cb")(e);
                    $(this).dialog("close");
                    extable.redraw();
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        var dlg_limits = $("#dlg-limits");
        dlg_limits.dialog({
            autoOpen: false,
            title: "Set Limits Angle",
            width: $(window).width()/2,
            height: $(window).height()/2,
            modal: true,
            open: function (event, ui) {
                var i, j, xymm;
                var rect = canvas.rect_get();
                debug_log("dlg-limits.open cb");
                for (i = 0; i < 2; i++) {
                    for (j = 0; j < 2; j++) {
                       xymm = "xy".substr(i, 1) + ["min", "max"][j];
                       $("#" + xymm).val(rect[i][j]);
                       $("#" + xymm + "-error").css("display", "none");
                    }
                }
            },
            buttons: {
                "OK": function () {
                    var i, j, xymm, s, v, err, allok = true;
                    var rectnew = [[null, null], [null, null]];
                    for (i = 0; i < 2; i++) {
                        for (j = 0; j < 2; j++) {
                           xymm = "xy".substr(i, 1) + ["min", "max"][j];
                           s = $("#" + xymm).val();
                           debug_log("i="+i+", j="+j+", s="+s);
                           err = isNaN(s);
                           if (!err) {
                              rectnew[i][j] = v = Number(s);
                              err = !(j === 0 ? v <= -1. : v >= 1.);
                              if (err) { allok = false; }
                           }
                           $("#" + xymm + "-error")
                               .css("display", err ? "block" : "none");
                        }
                    }
                    debug_log("allok="+allok);
                    if (allok) {
                        canvas.rect_set(rectnew);
                        $(this).dialog("close");
                    }
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });

        $("#b-limits").click(function () { 
            debug_log("b-limits");
            dlg_limits.dialog("open"); 
        });

        $(".add").click(function () {
            debug_log("element_edit: re-enable input name=");
            $(".element-name").removeAttr('disabled');
        });
        $("#add-point").click(function () {
            var si = selected_index();
            curves_options_set(si);
            dlg_point.data("edit_mode", false);
            dlg_point.data('cb', function (pt) {
                elements_at_add(si, pt);
                redraw();
            });
            dlg_point.dialog("open");
        });

        var line_seg_modes = [false, true];
        for (var i = 0; i < 2; i++) {
            var is_seg_out = (i == 1);
            $(is_seg_out ? "#add-segment" : "#add-line")
                .click(function (is_seg) {
                    return function () {
                        // debug_log("add-line: is_seg="+is_seg);
                        var si = selected_index();
                        var n_pts = points_options_set(si);
                        if (n_pts < 2) {
                            error("For line, 2 points must be defined");
                        } else {
                            dlg_line.data("segment", is_seg);
                            dlg_line.data("edit", false);
                            dlg_line.data('cb', function (ln) {
                                elements_at_add(si, ln);
                                redraw();
                            });
                            dlg_line.dialog("open");
                        }
                    }
                }(is_seg_out));
        }

        $("#add-circle").click(function () {
            var si = selected_index();
            var n_pts = points_options_set(si);
            if (n_pts < 2) {
                error("For circle, 2 points must be defined");
            } else {
                dlg_circle.data('edit_mode', false);
                dlg_circle.data('cb', function (circ) {
                    elements_at_add(si, circ);
                    redraw();
                });
                dlg_circle.dialog("open");
            }
        });

        $("#add-angle").click(function () {
            var si = selected_index();
            var n_pts = points_options_set(si);
            if (n_pts < 3) {
                error("For circle, 3 points must be defined");
            } else {
                dlg_angle.data('edit_mode', false);
                dlg_angle.data('cb', function (a) {
                    elements_at_add(si, a);
                    redraw();
                });
                dlg_angle.dialog("open");
            }
        });

        $("#add-expression").click(function () {
            dlg_expression.data("edit_mode", false);
            dlg_expression.data("cb", function (e) {
                expressions.push(e);
            });
            dlg_expression.dialog("open");
        });

        $(".name-error").css("display", "none");

        var expression = {
            user_text: "0",
            valid: true,
            js_text: "0",
            value: 0,
            dirty: false,
            set: function (text) {
                this.user_text = text;
                debug_log("expression.set: user_text="+this.user_text);
                this.dirty = true;
                return this;
            },
            evaluate: function (elements) {
               var ei, e, v;
               if (this.dirty) {
                   var mathfuns = /(cos|sin|tan|acos|asin|atan|sqrt)/g;
                   var jst = this.user_text;
                   this.dirty = false;
                   debug_log("expression.set: jst="+jst);
                   jst = jst.replace(mathfuns, "Math.$1");
                   debug_log("after Math.: jst="+jst);
                   for (ei = 0; ei < elements.length; ei++) {
                       e = elements[ei];
                       v = e.scalar();
                       if (v !== null) { 
                           jst = this.name2value(jst, e.name, v); 
                       }
                   }
                   this.js_text = jst;
                   try {
                       this.value = eval(jst);
                   } catch(err) {
                       this.value = err;
                   }
               }
            },
            name2value: function (jst, s, v) {
                var sre = "\\b(" + s + ")\\b";
                var re = new RegExp(sre, "g");
                debug_log("name2value: jst="+jst + ", s="+s + ", v="+v);
                jst = jst.replace(re, v);
                debug_log("name2value: return jst="+jst);
                return jst;
            },
            toJSON: function () {
                return this.user_text;
            }
        };

        var expressions = [];
        var expression_edit = function (ei) {
            debug_log("expression_edit ei="+ei);
            var e = expressions[ei];
            // dlg_expression.
            dlg_expression.data("edit_mode", true);
            $("#expression-input").val(e.user_text)
            dlg_expression.data("cb", function (e) {
                expressions[ei] = e;
            });
            dlg_expression.dialog("open");
        };
        var extable = function () {
            return {
                redraw: function () {
                    debug_log("extable.redraw");
                    var any_selected = false;
                    var tbody = $("#expressions-tbody");
                    var i, e;
                    tbody.empty();
                    for (var i = 0; i < expressions.length; i++) {
                        var e = expressions[i];
                        debug_log("i="+i+", e="+e);
                        e.evaluate(elements);
                        debug_log("user_text="+e.user_text + ", js="+e.js_text);
                        var ujs = $("<table>")
                            .append($("<tr>")
                                .append($("<td>")
                                    .text(e.user_text)))
                            .append($("<tr>")
                                .append($("<td>")
                                    .text(e.js_text)));
                        tbody.append($("<tr>")
                            .append($("<td>")
                                .append(ujs))
                            .append($("<td>")
                                .text(e.value))
                                .append($('<button>')
                                    .html("Edit")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-pencil"
                                        }})
                                        .click(function (ei) {
                                            return function () {
                                                expression_edit(ei); }
                                        }(i))
                                    )
                                .append($('<button>')
                                    .html("Remove")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-trash"
                                        }})
                                        .click(function (ei) {
                                            debug_log("exp-remove out");
                                            return function () {
                                                debug_log("exp-remove in #="
                                                  + expressions.length + 
                                                  "ei="+ei);
                                                expressions = $.merge(
                                                    expressions.slice(0, ei),
                                                    expressions.slice(ei + 1));
                                                debug_log("> #="
                                                    + expressions.length);
                                                extable.redraw();
                                            }
                                        }(i))
                                    )
                                .append($('<button>')
                                    .html("Up")
                                    .button({
                                        text: false,
                                        icons: {
                                            primary: "ui-icon-arrow-1-n"
                                        }})
                                        .click(function (ei) {
                                            return function () {
                                                expressions = array_iup(
                                                    expressions, ei);
                                                extable.redraw();
                                            }
                                        }(i))
                                    )
                            );
                    }
                }
            }
        }();

        var redraw = function () {
            canvas.redraw();
            etable.redraw();
            extable.redraw();
        };
        redraw();


    });

})();