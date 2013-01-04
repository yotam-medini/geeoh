// Author:  Yotam Medini  yotam.medini@gmail.com 
// (GPL) 2012
//

(function () { // hide namespace

    function aget(a, key, defval) {
        var ret = defval;
	if (a instanceof Object) {
	    try {
		ret = a[key];
	    } catch(err) {
		ret = defval;
	    }
	}
	return ret;
    }

    jQuery.aget = aget;

    var tables_columns_clear_widths = function (tables) {
        for (var i in tables) {
            var tbl = tables[i];
            var tr = $(tbl).children("tr")[0];
            var cols = $(tr).children();
            $(cols).css("width", "");
        }
    }

    var tables_align_columns = function (tables) {
        tables_columns_clear_widths(tables);

        var th_td_s = $(tables).map(function (i, e) { 
            return $(e).children("tr").first().children("th, td");
        }).get();

        var any_column = true;
        var ci = 0;
        while (any_column) {
            any_column = false;
            var max_width = 0;
            for (var ti  = 0; ti < th_td_s.length; ti++) {
                var thd = th_td_s[ti].get();
                if (ci < thd.length) {
                    any_column = true;
                    var w = parseInt($(thd[ci]).css('width')
                        .replace('px', ''), 10);
                    if (max_width < w) { max_width = w; }
                }
            }
            for (var ti  = 0; ti < th_td_s.length; ti++) {
                var thd = th_td_s[ti].get();
                if (ci < thd.length) {
                    $(thd[ci]).css('width', max_width)
                }
            }
            ci++;
        }
    }

    jQuery.tables_align_columns = tables_align_columns;

})();
