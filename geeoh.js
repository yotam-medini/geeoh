(function(){
  "use strict";

var debug_win = undefined;

function debug_log0(message) {}

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

function xy_xy_dist2(p0, p1) {
    var dx = p1[0] - p0[0];
    var dy = p1[1] - p0[1];
    var d2 = dx*dx + dy*dy; 
    return d2;
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

    var warning = function(msg) {
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

    var xy_points_around = function(x, y, r) {
        var pts = []; 
        var f = label_shift_factors;
        for (i = 0; i < f.length; i++) {
            pts.push([x + f[i][0]*r, y + f[i][1]*r]);
        }
        // debug_log("xy_points_around: x="+x+", y="+y + ", r="+r + ",
        //    pts="+pts);
        return pts;
    }

    var rect_xys_clip = function(rect, xys) {
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
$("#fclear").click(function(event){
        event.preventDefault();
        $("#my-filesel").attr({ value: '' });;
});

    $("#toolbar").tabs({collapsible: true});


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
    $("#elements-toggle").click(function() { $("#elements").slideToggle(); });

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
        selected: false,
        name_set: function(s) { this.name = s; return this; },
        needs: function(element_name) { return false; },
        is_point: function() { return false; },
        is_segment: function() { return false; },
        is_circle: function() { return false; },
        is_curve: function() { return false; },
        distance_to: function(xy) { return Math.sqrt(this.distance2_to(xy)); },
        distance2_to: function(xy) { return 1.; },
        candidate_label_points: function(rect, delta) { return []; },
        best_label_point: function(elements, rect, delta) { // max-min
            // debug_log("BLP: e="+this.name);
            var candidates = this.candidate_label_points(rect, delta);
            // debug_log("pre-clip #="+candidates.length);
            candidates = rect_xys_clip(rect, candidates);
            // debug_log("after-clip #="+candidates.length);
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
            // debug_log("  BLP: best="+best);
            return best;
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
        toJSON: function() {
            return {
                'type': 'point',
                'name': this.name,
                'xy': this.xy
            };
        },
        str2: function() { 
           return "("+this.xy[0].toFixed(2) +
               ", " + this.xy[1].toFixed(2) + ")";
        },
        str3: function() { 
           return "("+this.xy[0].toFixed(3) +
               ", " + this.xy[1].toFixed(3) + ")";
        },
        draw: function(canvas, ctx) {
            if (this.valid) { canvas.point_draw(ctx, this); }
        },
        distance2_to: function(xy) { 
            var d2 = Number.MAX_VALUE;
            if (this.valid) {
                var dx = xy[0] - this.xy[0];
                var dy = xy[1] - this.xy[1];
                d2 = dx*dx + dy*dy;
            }
            return d2;
        },
        candidate_label_points: function(rect, delta) { 
            return xy_points_around(this.xy[0], this.xy[1], delta);
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
        is_curve: function() { return true; },
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
                [[1, 0, [0,0]], [[ 1,-1], [ 1, 1]], [[ 1, 0]] ],          // L
                [[1, 0, [0,1]], [[-1,-1], [-1, 1]], [[-1, 0]] ],          // R
                [[0, 1, [1,0]], [[ 0, 1]],          [[-1, 1], [ 1, 1]] ], // B
                [[0, 1, [1,1]], [[ 0,-1]],          [[-1,-1], [ 1,-1]] ], // T
            ];

            var vertical_like = (Math.abs(this.abc[0]) < Math.abs(this.abc[1]));

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
        pts: [null, null],
        points_set: function(pt0, pt1) {
            debug_log0("L2Ps set: p0="+pt0.str3() + ", pt1="+pt1.str3());
            this.pts = [pt0, pt1];
            return this.update();
        },
        // (y1-y0)x - (x1-x0)y + c = 0
        // c = (x1-x0)y-(y1-y0)x 
        //   = x1y0-x0y0-x0y1+x0y0 = x1y0 - x0y1
        //   = x1y1-x0y1-x1y1+x1y0 = x1y0 - x0y1
        update: function() {
            var p0 = this.pts[0], p1 = this.pts[1];
            // debug_log("L2Ps update: p0="+p0.str3() + ", p1="+p1.str3());
            var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
            this.abc_set(y1 - y0, x0 - x1, x1*y0 - x0*y1);
            return this;
        },
        needs: function(element_name) {
            var ret = element_name === this.pts[0].name ||
                 element_name === this.pts[1].name;
            debug_log("l2p: needs("+element_name+"), ret="+ret);
            return ret;
        },
        point_inside_segment: function(pt) {
            // Assuming pt is in the line, but not necessarily within segment
            var p0 = this.pts[0], p1 = this.pts[1];
            // debug_log("pt="+pt.str3()+", p0="+p0.str3()+", p1="+p1.str3());
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
        str: function() { 
            return "-(" + digits_sub(this.pts[0].name) + ", " + 
                digits_sub(this.pts[1].name) + ")-"; 
        },
        typename: function() { return 'line_2points'; },
        toJSON: function() {
            return {
                'type': this.typename(),
                'name': this.name,
                'pts': [this.pts[0].name, this.pts[1].name]
            };
        },
    });
    
    var line_segment = $.extend(true, {}, line_2points, {
        is_segment: function() { return true; },
        str: function() { 
            return "[" + digits_sub(this.pts[0].name) + ", " + 
                digits_sub(this.pts[1].name) + "]"; },
        draw: function(canvas, ctx) {
            canvas.segment_draw(ctx, this.pts[0], this.pts[1]);
        },
        candidate_label_points: function(rect, delta) {
            var mid = $.extend(true, {}, point)
                .xy_set(
                    (this.pts[0].xy[0] + this.pts[1].xy[0])/2,
                    (this.pts[0].xy[1] + this.pts[1].xy[1])/2);
            return mid.candidate_label_points(rect, delta);
        },
        distance2_to: function(xy) {
            // denom -- may be cached on update!
            var p0 = this.pts[0]; 
            var p1 = this.pts[1]; 
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
        typename: function() { return 'line_segment'; },
    });


    var point_2lines = $.extend(true, {}, point, {
        lines: [null, null],
        lines_set: function(l0, l1) {
            debug_log0("point_2lines.lines_set: l0="+l0.str3() + 
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
                    debug_log("p2l: Not-valid: l0="+l0.str3() + 
                        ", l1="+l1.str3());
                    this.xy = null;
                } else {
                    this.xy_set(xy[0], xy[1]);
                }
            } else {
                debug_log("p2l: update: l0||l1 not valid");
            }
        },
        needs: function(element_name) {
            return element_name === this.lines[0].name ||
                 element_name === this.lines[1].name;
        },
        str: function() {
            return "⨉(" + this.lines[0].name + ", " + this.lines[1].name + ")";
p        },
        toJSON: function() {
            return {
                'type': "point_2lines",
                'name': this.name,
                'lines': [this.lines[0].name, this.lines[1].name]
            };
        },
    });    

    var circle = $.extend(true, {}, element, {
        center: $.extend(true, {}, point).xy_set(0, 0),
        radius: 1,
        is_circle: function() { return true; },
        is_curve: function() { return true; },
        str: function() { 
           return "Circle(" + this.center.str() + ", r="+this.radius + ")";
        },
        draw: function(canvas, ctx) {
            canvas.circle_draw(ctx, this);
        },
        distance_to: function(xy) {
            return Math.abs(this.center.distance_to(xy) - this.radius);
        },
        candidate_label_points: function(rect, delta) { 
            return xy_points_around(this.center.xy[0], this.center.xy[1],
                this.radius + delta);
        },
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
        needs: function(element_name) {
            return element_name === this.center.name ||
                 element_name === this.pt0.name ||
                 element_name === this.pt1.name;
        },
        str: function() { 
           return "⊙(" + this.center.name + ", [" +
               this.pt0.name + ", " + this.pt1.name + "])";
        },
        toJSON: function() {
            return {
                'type': "circle",
                'name': this.name,
                'center': this.center.name,
                'segment': [this.pt0.name, this.pt1.name]
            };
        },
    });

    var point_circle_line = $.extend(true, {}, point, {
        circle: null,
        line: null,
        circle_line_set: function(c, l, other) {
            this.circle = c;
            this.line = l;
            this.other = other;
            this.update();
            return this;
        },
        update: function() {
            this.valid = false;
            if (this.circle.valid && this.line.valid) {
                // Shift X,Y to the circle center of.  xt = x-cx, yt = y-cy
                var cx = this.circle.center.xy[0];
                var cy = this.circle.center.xy[1];
                // ax + by + c = (a(xt+cx) + b(yt+cy) + c = 0.
                var a = this.line.abc[0];
                var b = this.line.abc[1];
                var c = this.line.abc[2] + a*cx + b*cy;
                var a2b2 = a*a + b*b;
                var denom = 1./a2b2;
                var R = this.circle.radius;
                var disc = a2b2*R*R - c*c;
                if (disc >= 0) {
                    this.valid = true;
                    var sqr = Math.sqrt(disc);
                    if (this.other) { sqr = -sqr; }
                    var xt = (-a*c + b*sqr)*denom; // +/-
                    var yt = (-b*c - a*sqr)*denom; // -/+
                    this.xy[0] = xt + cx;
                    this.xy[1] = yt + cy;
                    debug_log("X(C,L): abc="+this.line.abc +
                        ", a="+a.toFixed(2) + ", b="+b.toFixed(2) + ", c="+c +
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
        needs: function(element_name) {
            return element_name === this.circle.name ||
                 element_name === this.line.name;
        },
        str: function() {
            return "⨉(⊙" + this.circle.name + ", " + this.line.name + ")";
        },
        toJSON: function() {
            return {
                'type': "point_circle_line",
                'name': this.name,
                'cl': [this.circle.name, this.line.name],
                'other': this.other
            };
        },
    });    

    var point_2circles = $.extend(true, {}, point, {
        circles: [null, null],
        circle_circle_set: function(c0, c1, other) {
            debug_log("circle_circle_set");
            this.circles = [c0, c1];
            this.other = other;
            this.update();
            return this;
        },
        update: function() {
            debug_log("point_2circles::update");
            this.valid = false;
            var c0 = this.circles[0];
            var c1 = this.circles[1];
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
                     // First Consider coordinate system, centered at (c0x,c0y)
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
        needs: function(element_name) {
            return element_name === this.circles[0].name ||
                 element_name === this.circles[1].name;
        },
        str: function() {
            return "⨉(⊙" + this.circles[0].name + ", " +
                "⊙" + this.circles[1].name + ")";
        },
        toJSON: function() {
            return {
                'type': "point_2circles",
                'name': this.name,
                'circles': [this.circles[0].name, this.circles[1].name],
                'other': this.other
            };
        },
    });    

    var json_element_create = function(ejson) {
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
               .lines_set(lines[0], lines[1]);
        } else if (typename === "point_circle_line") {
            var cl = names_to_elements(ejson['cl']);
            e = $.extend(true, {}, point_circle_line)
                .name_set(name)
                .circle_line_set(cl[0], cl[1], ejson['other'])
        } else if (typename === "point_2circles") {
            var circles = names_to_elements(ejson['circles']);
            e = $.extend(true, {}, point_2circles)
                .name_set(name)
                .circle_circle_set(circles[0], circles[1], ejson['other'])
        }
        return e;
    };

    var elements = [];
    var name_to_element = function(name) {
        return elements.filter(function (e) { 
            return e.name == name; 
        })[0]; 
    }
    var names_to_elements = function(names) {
        return names.map(function (name) { 
            return elements.filter(function (e) { 
                return e.name == name; })[0]; 
            });
        };
    var selected_index = function() {
        var i = 0;
        while ((i < elements.length) && !elements[i].selected) {
            i++;
        }
        return i;
    };
    var elements_at_add = function(at, e) {
        var head = elements.slice(0, at);
        var tail = elements.slice(at);
        debug_log0("at="+at + ", |h|="+head.length + ", |t|="+tail.length
            + ", |e|="+elements.length);
        elements = $.merge($.merge(head, [e]), tail);
        // debug_log("After: |e|="+elements.length);
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
            // debug_log("|e|="+es_json.length);
            for (var i = 0; i < es_json.length; i++) {
                var e = json_element_create(es_json[i]);
                if (e !== null) {
                    elements.push(e);
                }
            }
            redraw();
        });
    $("#json-out").click(function () { 
            debug_log("json-out");
            var t = $("#json-text")[0];
            t.value = JSON.stringify(elements);
        });
    var enames = function() { 
        return elements.map(function(e) { return e.name; }) 
    };
    var element_edit = function(ei) {
        debug_log("element_edit ei="+ei);
    };
    var element_remove = function(ei) {
        debug_log("element_remove ei="+ei);
        var name = elements[ei].name;
        for (var i = ei + 1;  
            (i < elements.length) && !elements[i].needs(name); i++);
        if (i == elements.length) {
            elements = $.merge(elements.slice(0, ei), elements.slice(ei + 1));
            redraw();
        } else {
            warning("Element '" + elements[i].name + "' needs '" + name + "'");
        }
    };
    var element_up = function(ei) {
        if (ei > 0) {
            var upname = elements[ei - 1].name;
            if (elements[ei].needs(upname)) {
                warning("Element '" + elements[ei].name +
                    "' needs '" + upname + "'");
            } else {
                var head = elements.slice(0, ei - 1);
                var mid = [elements[ei], elements[ei - 1]];
                var tail = elements.slice(ei + 1);
                elements = $.merge($.merge($.merge([], head), mid), tail);
                etable.redraw();
            }
        }
    };
    var etable = function() {
        return {
            redraw: function() {
                var any_selected = false;
                var tbl = $("#elements");
                var tbl0 = tbl[0]
                // Remove rows, but the title 
                while (tbl[0].childNodes.length > 1) {
                    tbl0.removeChild(tbl0.lastChild);
                }
                for (var i = 0; i < elements.length + 1; i++) {
                    var e, classes = "element-row";
                    if (i < elements.length) {
                        e = elements[i];
                        any_selected = any_selected || e.selected;
                    } else {
                        e  = { 
                            'name': '_', 
                            'str': function() { return '_'; },
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
                                    .click(function(ei) { 
                                        return function() { element_edit(ei); }
                                    }(i))
                                )
                            .append($('<button>')
                                .html("Remove")
                                .button({
                                    text: false,
                                    icons: {
                                        primary: "ui-icon-trash"
                                    }})
                                    .click(function(ei) { 
                                        return function() { 
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
                                    .click(function(ei) { 
                                        return function() { element_up(ei); }
                                    }(i))
                                )
                        );
                    }
                    tbl.append(tr);
                }
                $(".element-row").click(function() {
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
                // debug_log("|elements|="+elements.length);
                var rect = [ [x0, x0 + dx], [y0, y0 + dy] ];
                for (var i = 0; i < elements.length; i++) {
                    var e = elements[i];
                    // debug_log("canvas.redraw: e["+i+"]=" + e);
                    e.draw(this, ctx);
                    var p = e.best_label_point(elements, rect, delta_label);
                    // ctx.font = "Italic 30px";
                    ctx.font = "italic 12pt sans-serif";
                    ctx.textAlign = "center";
                    ctx.strokeText(digits_sub(e.name), 
                this.x2canvas(p[0]), this.y2canvas(p[1]));
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
                // debug_log("line_draw: l="+l.str3());
                for (var i = 0; i < 4; i++) {
                    var lbdy = lines[i];
                    var pt = $.extend(true, {}, point_2lines)
                        .lines_set(l, lbdy);
                    if (pt.valid) {
                        // debug_log("pt="+pt.str3() + ", lbdy="+lbdy.str3());
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
            circle_draw: function(ctx, circ) {
                var p = circ.center;
                var cxy = [this.x2canvas(p.xy[0]), this.y2canvas(p.xy[1])];
                var rg = distance(circ.pt0, circ.pt1);
                var rc = this.g2canvas(rg);
                // debug_log("rg="+rg + ", rc="+rc);
                ctx.beginPath();
                ctx.arc(cxy[0], cxy[1], rc, 0., 2*Math.PI);
                ctx.stroke();
            },
            minmax_set: function() {
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
                // debug_log("x0="+x0 + ", y0="+y0 + ", dx="+dx + ", dy="+dy);
                this.point_lb = $.extend(true, {}, point).xy_set(x0, y0);
                this.point_rb = $.extend(true, {}, point).xy_set(x0 + dx, y0);
                this.point_lt = $.extend(true, {}, point).xy_set(x0, y0 + dy);
                this.point_rt =
                    $.extend(true, {}, point).xy_set(x0 + dx, y0 + dy);
                this.line_left = $.extend(true, {}, line_2points)
                    .points_set(this.point_lb, this.point_lt);
                // debug_log("line_left="+this.line_left.str3());
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
        pointer.text("("+xy[0].toFixed(2) + ", " + xy[1].toFixed(2)+")");
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

    var add_pt_tabs = $("#add-pt-tabs");
    add_pt_tabs.tabs();
    var dlg_point = $("#dlg-point");
    dlg_point.dialog({
        autoOpen: false,
        title: "Add Point",
        modal: true,
        buttons: {
            "OK": function() {
                var $this = this;
                var ok = true;
                var pt = null;
                var xy = [];
                var name = $("#pt-name-input").val().trim();
                var ok = /^[A-Z][0-9]*$/.test(name) && 
                    ($.inArray(name, enames()) < 0);
                $("#pt-name-error").css('display', ok ? 'none' : 'block');
                var tabi = add_pt_tabs.tabs("option", "selected");
                // debug_log("tabi="+tabi);
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
                    // debug_log("#curve01="+curve01.length + " :="+curve01);
                    if (curve01[0].is_circle()) {
                        if (curve01[1].is_circle()) {
                            pt = $.extend(true, {}, point_2circles)
                                .circle_circle_set(curve01[0], curve01[1], 
				    other);
                        } else {
                            pt = $.extend(true, {}, point_circle_line)
                                .circle_line_set(curve01[0], curve01[1], other);
                        }
                    } else {
                        if (curve01[1].is_circle()) {
                            pt = $.extend(true, {}, point_circle_line)
                                .circle_line_set(curve01[1], curve01[0], other);
                        } else {
                            pt = $.extend(true, {}, point_2lines)
                                .lines_set(curve01[0], curve01[1]);
                        }
                    }                    
                }
                if (ok) {
                    pt.name_set(name);
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
                var ok = /^[a-z][0-9]*$/.test(name) && 
                    ($.inArray(name, enames()) < 0);
                $("#line-name-error").css('display', ok ? 'none' : 'block');
                if (ok) {
                    var is_seg = dlg_line.data('segment');
                    // debug_log("segment?=" + is_seg);
                    var pt01 = [0, 1].map(function (n) {
                        var pt_name = $("#pt" + n + "-select").val();
                        return elements.filter(function (e) { 
                            return e.name == pt_name; })[0]; });
                    // debug_log("pt0="+pt01[0].str() + ", pt1="+pt01[1].str());
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
                    var sel_pfx = $.merge($.merge([], ["#center"]),
                        [0,1].map(function(n) { return "#circle-pt" + n; }));
                    // debug_log("sel_pfx="+sel_pfx);
                    var c_pt01 = sel_pfx.map(function (pfxn) { 
                        var pt_name = $(pfxn + "-select").val();
                        // debug_log("pt_name="+pt_name);
                        return elements.filter(function (e) { 
                            return e.name == pt_name; })[0]; });
                    debug_log0("c="+c_pt01[0] + 
                        ", pt0="+c_pt01[1].str() + ", pt1="+c_pt01[2].str());
                    var circ = $.extend(true, {}, circle_center_segment)
                        .name_set(name)
                        .center_segment_set(c_pt01[0], c_pt01[1], c_pt01[2]);
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
        var si = selected_index(); 
        var curve_elements = elements.slice(0, si).filter(
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
        dlg_point.data('cb', function(pt) { 
            elements_at_add(si, pt);
            redraw();
        });
        dlg_point.dialog("open");
    });

    var line_seg_modes = [false, true];
    for (var i = 0; i < 2; i++) {
        var is_seg_out = (i == 1);
        $(is_seg_out ? "#add-segment" : "#add-line").click(function(is_seg) {
            return function() {
                // debug_log("add-line: is_seg="+is_seg);
                var si = selected_index(); 
                var pt_elements = elements.slice(0, si).filter(
                    function (e) { return e.is_point(); });
                // debug_log("np="+pt_elements.length);
                if (pt_elements.length < 2) {
                    error("For line, 2 points must be defined");
                } else {
                    var pt_select = $(".pt-select").empty();
                    for (var i = 0; i < pt_elements.length; i++) {
                         var name = pt_elements[i].name;
                         pt_select
                             .append($("<option></option>")
                                 .attr("value", name)
                                 .text(name)); 
                    }
                    dlg_line.dialog("option", "title", 
                        "Add " + (is_seg ? "Segment" : "Line"));
                    dlg_line.data("segment", is_seg);
                    dlg_line.data('cb', function(ln) { 
                        elements_at_add(si, ln);
                        redraw();
                    });
                    dlg_line.dialog("open");
                }
            }
        }(is_seg_out));
    }

    $("#add-circle").click(function() {
        var si = selected_index(); 
        var pt_elements = elements.slice(0, si).filter(
            function (e) { return e.is_point(); });
        if (pt_elements.length < 2) {
            error("For circle, 2 points must be defined");
        } else {
            var pt_select = $(".pt-select").empty();
            for (var i = 0; i < pt_elements.length; i++) {
                 var name = pt_elements[i].name;
                 pt_select
                     .append($("<option></option>")
                         .attr("value", name)
                         .text(name)); 
            }
            dlg_circle.data('cb', function(circ) { 
                elements_at_add(si, circ);
                redraw();
            });
            dlg_circle.dialog("open");
        }
    });
    redraw();

});

})();
