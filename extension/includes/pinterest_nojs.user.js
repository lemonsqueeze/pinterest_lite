// ==UserScript==
// @name pinterest_nojs
// @author lemonsqueeze https://github.com/lemonsqueeze/pinterest_lite
// @version 1.0
// @description Block javascript on pinterest (Opera only)
// @published 2015-07-19 11:00
// @include        http://www.pinterest.com/*
// @include        https://www.pinterest.com/*
// ==/UserScript==

(function(document, location) {
    
    function handle_noscript_tags()
    {
	for (var j = document.getElementsByTagName('noscript'); j[0];
	     j = document.getElementsByTagName('noscript')) 
	{
	    var nstag = document.createElement('wasnoscript');
	    nstag.innerHTML = j[0].innerText;	    
	    j[0].parentNode.replaceChild(nstag, j[0]);
	}
    }

    function beforeextscript_handler(e)
    {
	e.preventDefault();
    }

    // Handler for both inline *and* external scripts
    function beforescript_handler(e)
    {
	if (e.element.src) // external script
	    return;
	e.preventDefault();
    }    

    // block pinterest onload handlers
    function beforeonload_handler(ue)
    {
	var el = ue.event.srcElement;
	if (el && el.tagName.toLowerCase() == 'img')
	{
//	    console.warn('onload: img');
	    ue.preventDefault();
	}
    }

    // block inline scripts
    window.opera.addEventListener('BeforeScript',	  beforescript_handler, false);
    
    // block external scripts (won't even download)
    window.opera.addEventListener('BeforeExternalScript', beforeextscript_handler, false);

    // block pinterest onload handlers
    window.opera.addEventListener('BeforeEventListener.load', beforeonload_handler, false);
    
    // use this one if you want <noscript> tags interpreted as if javascript was disabled in opera.
    document.addEventListener('DOMContentLoaded',  handle_noscript_tags, false);

})(window.document, window.location);
