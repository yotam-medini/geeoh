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

var epsilon = 1./128.;
var epsilon2 = epsilon*epsilon;

$(document).ready(function () {
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

    var point = {
        xy: [1., 1.],
        valid: true
    };

    var line = {
        abc: [1., 0., 0.],  // Always (if valid): a^2 + b^2 = 1
        valid: true,
        ok: function() { return this.abc !== undefined; },
        point_distance: function(pt) {
           return Math.abs(this.abc[0]*pt[0] + this.abc[1]*pt[1] + this.abc[2]);
        },
        abc_get: function() { return this.abc; },
        abc_set: function(a, b, c) {
            var d2 = a*a + b*b;
            this.valid = (d2 > epsilon2);
            if (!this.valid) {
                this.abc = null;
            } else {
                var d = Math.sqrt(d2);
                this.abc[0] = a/d;  this.abc[1] = b/d;  this.abc[2] = c/d;
            }
        }
    };

    var circle = {
        center: $.extend({}, point),
        radius: 1.
    };

    //    {pts: [$.extend({}, point), $.extend({}, point)]}, line);
    var line_2points = $.extend({
        set: function(pt0, pt1) {
            this.pts = [pt0, pt1];
            this.update();
        },
        // (y1-y0)x - (x1-x0)y + c = 0
        // c = (x1-x0)y-(y1-y0)x 
        //   = x1y0-x0y0-x0y1+x0y0 = x1y0 - x0y1
        //   = x1y1-x0y1-x1y1+x1y0 = x1y0 - x0y1
        update: function() {
            var p0 = this.pts[0], p1 = this.pts[1];
            debug_log("L2Ps update: p0="+p0.xy);
            var x0 = p0.xy[0], y0 = p0.xy[1], x1 = p1.xy[0], y1 = p1.xy[1];
            this.abc_set(y0 - y1, x0 - x1, x1*y0 - x0*y1);
        }
    }, line);
    
    var point_2lines = $.extend({
        set: function(l0, l1) {
            this.lines = [l0, l1];
            this.update();
        },
        update: function() {
           this.valid = false;
           var l0 = this.lines[0], l1 = this.lines[1];
           if (l0.valid && l1.valid) {
               var abc0 = l0.abc_get();
               var abc1 = l1.abc_get();
               var a0 = abc0[0], b0 = abc0[1], c0 = abc0[2];
               var a1 = abc1[0], b1 = abc1[1], c1 = abc1[2];
               var da = a1 - a0;
               var db = b1 - b0;
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
                   this.xy = null;
               } else {
                   this.xy = [(b0*c1 - c0*b1)/det, (a1*c0 - a0*c1)/det];
               }
           }
        }
    }, point);    

    var p34 = $.extend({}, point);
    p34.xy = [3, 4];
    var p56 = $.extend({}, point);
    p56.xy = [5, 6];
    debug_log("p34="+p34.xy + ", p56="+p56.xy);

    var line345 = $.extend(true, {}, line);
    line345.abc_set(3, 4, 5);
    var line876 = $.extend(true, {}, line);
    line876.abc_set(8, 7, 6);
    debug_log("line345="+line345.abc_get() + ", line876="+line876.abc_get());

    var line3456 = $.extend({}, line_2points);
    line3456.set(p34, p56);
    debug_log("line3456="+line3456.abc_get());

    var canvas = function() {
        var rect_required = [[-2, 6], [-2, 6]]; // Xmin, Xmax, Ymin, Ymax
        var min_max = undefined;
        var x0, dx, y0, dy;
        var dtag1, pt_rad;
        return {
            redraw: function() {
                var ctx = c.getContext("2d");
                ctx.fillStyle = "#d7d7d7";
                ctx.fillRect(0, 0, w, h);
                this.minmax_set();
                this.axis_draw(ctx);
                this.pt_cdraw(ctx, [this.x2canvas(1), this.y2canvas(1)]);
                debug_log("AB0123 --> " + this.digits_sub("AB0123"));
                this.seg_draw(ctx, [3, 3], [4, 4]);
                this.seg_draw(ctx, [-4, -3], [8, 7]);
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
            pt_cdraw: function(ctx, pt) {
                ctx.beginPath();
                // ctx.moveTo(pt[0] + pt_rad, pt[1]);
                ctx.arc(pt[0], pt[1], pt_rad, 0., 2*Math.PI);
                ctx.closePath();
                ctx.fill();
            },
            seg_draw: function(ctx, a, b) {
                this.seg_cdraw(ctx, this.pt2canvas(a), this.pt2canvas(b));
            },
            seg_cdraw: function(ctx, a, b) {
                ctx.fillStyle = "#111";
                ctx.beginPath();
                ctx.moveTo(a[0], a[1]);
                ctx.lineTo(b[0], b[1]);
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
                pt_rad = Math.max(3, Math.min(c.width, c.height)/0x200);
                debug_log("x0="+x0 + ", y0="+y0 + ", dx="+dx + ", dy="+dy);
            },
            pt2canvas: function(pt) { 
                return [this.x2canvas(pt[0]), this.y2canvas(pt[1])];
            },
            x2canvas: function(x) { return (c.width * (x - x0)) / dx; },
            y2canvas: function(y) { return (c.height * (y0 + dy - y)) / dy; },
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
  if (false) {
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0d0";
    ctx.fillRect(w/2, h/2, w/6, h/6);

    ctx.fillStyle = "#111";
    ctx.strokeText("Hello", w/2, h/2);

    ctx.beginPath();
    ctx.moveTo(0, h/3);
    ctx.lineTo(w, h/3);
    ctx.stroke();
  }
});

})();
