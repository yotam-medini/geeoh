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

})();
