// ==UserScript==
// @name        Pinterest Lite
// @namespace   https://github.com/lemonsqueeze/pinterest_lite
// @version     1.0
// @description Browse Pinterest without all the javascript bloat
// @include     http://www.pinterest.com/pin/*
// @include     https://www.pinterest.com/pin/*
// @copyright   2015, lemonsqueeze
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// ==/UserScript==


(function(){

if (window != window.top)   // in iframe
    return;

// layout_type: type of layout to use for images.
var layout_type = 'float';   // faster
//var layout_type = 'table';   
//var layout_type = 'tile';    

var page_type = "board";

if (is_prefix("/pin/", window.location.pathname))
    page_type = "pin";
if (is_prefix("/source/", window.location.pathname))
    page_type = "source";
if (is_prefix("/explore/", window.location.pathname) || 
    is_prefix("/search/", window.location.pathname))
    page_type = "search";

console.log('page type: ' + page_type);

var main_pin;  // Only exists for (some) pin pages

/********************************************************************************/

var board_url = window.location.pathname;
var xhr_req_data = null;

function make_feedresource_url(data, query_type)
{
    if (resource_type == 'RelatedPinFeedResource')
    {
	var o = data.options;
	data.options = {"pin":o.pin, "is_csr":null, "show_seo_canonical_pins":null, 
			"search_query":null, "bookmarks":o.bookmarks};	
    }

    var s = JSON.stringify(data);
    s = encodeURI(s);
    s = s.replace(/:/g, '%3A');
    s = s.replace(/,/g, '%2C');
    s = s.replace(/\//g, '%2F');
    s = s.replace(/=/g, '%3D');

    var url = ("https://www.pinterest.com/resource/" + query_type + "/get/" +
	       "?source_url=" + board_url.replace(/\//g, '%2F') +
	       "&data=" + s +
	       "&_=" + new Date().getTime());
    return url;
}

var resource_type = '';

function get_feedresource_url(o)
{
    if (!o) { // first time
	return make_feedresource_url(xhr_req_data, resource_type);    
    }
    
    var bookmark = o.resource.options.bookmarks[0];
    if (bookmark == "-end-")
	return null;
    xhr_req_data.options.bookmarks[0] = bookmark;
    return make_feedresource_url(xhr_req_data, resource_type);
}

function init_xhr_req_data()
{   
    var script = document.querySelector('script#jsInit');
    if (!script)
	script = document.querySelector('script#jsInit1');
    var m = null;
    var bookmark = "";
    
    if (page_type == 'board') {
	resource_type =             "BoardFeedResource";
	m = script.innerText.match(/"BoardFeedResource",(.*?"bookmarks"[^}]*})/);    
    }
    if (page_type == 'pin') {
	resource_type =             "RelatedPinFeedResource";
	bookmark = script.innerText.match(/"bookmarks": "([^"]*)"/)[1];

	var pin = window.location.pathname.match(/\/pin\/([0-9]+)/)[1];
	xhr_req_data = {
	    options: {
		pin: pin,
		is_csr: null,
		show_seo_canonical_pins: null,
		search_query: null,
		bookmarks: [ bookmark ]
	    },
	    context: {}
	};
    }	
    if (page_type == 'search') {
	resource_type =             "BaseSearchResource";
	m = script.innerText.match(/"BaseSearchResource",(.*?"bookmarks"[^}]*})/);

	try
	{ xhr_req_data = JSON.parse('{' + m[1] + '}');  }
	catch (err)
	{ xhr_req_data = JSON.parse('{' + m[1] );  }
	xhr_req_data.context = {};	
    }
    //if (!m)
    //  return;


    //try
    //{ xhr_req_data = JSON.parse('{' + m[1] + '}');  }
    //catch (err)
    //{ xhr_req_data = JSON.parse('{' + m[1] );  }
    //xhr_req_data.context = {};
    console.log("xhr_req_data init ok");
}

function get_xhr_url(o)
{
    if (!xhr_req_data)
	return null;
    if (page_type == 'board' ||
	page_type == 'pin'   ||
	page_type == 'search')
	return get_feedresource_url(o);
    return null;
}

/********************************************************************************/

var autoload = {};
var xhr_url = null;

function autoload_init(o)
{
    xhr_url = get_xhr_url(o);
    if (!xhr_url)
	return;    
    
    // TODO spinner ?
    watch_for_scroll();
    console.log("autoload_init ok");
}

function request_more_results()
{    
    console.log("getting more items ...");
    window.xhr_url = xhr_url;
//    console.log(xhr_url);
    getURL(xhr_url, process_autoload_results, autoload_error);
}

function remaining_scroll()
{
    var ret = (document.documentElement.scrollHeight - window.pageYOffset - window.innerHeight);
    return ret;
}

function watch_for_scroll()
{
    if (remaining_scroll() < window.innerHeight && !autoload.requestingMoreResults)
    {
        autoload.requestingMoreResults = true;  
        request_more_results();
    }
    else
	setTimeout(watch_for_scroll, 200);
}


function getURL(url, callback, error_callback)
{
    doXHR(xhr_url, callback, error_callback);
}

function doXHR(url, callback, error_callback)  // asynchronous
{
    var xhr = new window.XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.onreadystatechange = function()
    {
       if (this.readyState == 4)
       {
           if (this.status == 200 && this.responseText) // Error check for fetching the URL
               callback(this.responseText);
           else
           {
               opera.postError('XHR ERROR: ' + this.status + ' : ' + url);
               if (error_callback)
                   error_callback();
               return false;
           }
       }
    }    
    xhr.send();
}    


function new_item(item)
{

    var item_template =  [
'<div class="static" >',
'  <div data-test-pin="true" style="background:white;border-radius:6px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.22);display:inline-block;backface-visibility:hidden;font-size:11px;position:relative;width:236px;" >',
'    <div class="GrowthUnauthPinImage" style="position:relative;" >',
'      <a href="/pin/' + item.id + '/?from_navigate=true" style="border-radius:6px 6px 0 0; " target="_blank" title="" >',
'        <img src="' + item.images['236x'].url + '" style="border-radius:inherit; width:236px;" >',
'      </a>',
'    </div>',
'    <div style="border-top:1px solid rgb(231, 231, 231);border-radius:0 0 6px 6px;position:relative;" >',
'      <a href="' + item.board.url + '" style="line-height:15px;padding:10px;border-radius:inherit;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;display:block;" target="_blank" >',
'        <img class="PinCredit__image" src="' + item.board.image_thumbnail_url + '" style="position:relative;float:left;height:30px;width:30px;margin-right:5px;display:block;border-radius:50%;" >',
'        <h4 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#555;font-weight:bold;font-size:11px;" >' + "Owner" + '</h4>',
'        <p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#555;font-weight:normal;font-size:11px;margin:0px;" >' + item.board.name + '</p>',
'      </a>',
'    </div>',
'  </div>',
'</div>'
];

var old_stuff = [
'<div class="item " >', 
'  <div class="Module Pin summary" data-component-type="0" >',   // id="Pin-53"
'    <div class="pinWrapper">',
'      <div class="pinImageActionButtonWrapper">',
'        <div class="pinHolder">',
'          <a href="/pin/' + item.id + '/" class="pinImageWrapper" data-element-type="35" style="background: #26231e;" title="">',
'            <div class="fadeContainer">',
'              <div class="Image Module pinUiImage"  style="width: 236px">',   // id="Image-84"
'                <div class="heightContainer" >',
'                  <img src="' + item.images['236x'].url + '" class="pinImg fullBleed" alt="' + item.description + '">',
'                </div>',
'              </div>',
'            </div>',
'          </a>',
'        </div>',
'      </div>',
'      <div class="pinCredits">',
'        <div class="creditItem ">',
'          <div class="creditName">',
'            <h3>' + item.title + '</h3>',
'          </div>',
'          <div class="creditTitle">',
'                                                                                                   ' + item.domain,
'                                </div>',
'        </div>',
'      </div>',
'    </div>',
'  </div>',
'</div>'
    ];

    var s = item_template.join('\n');
    // console.log(s);
    var e = document.createElement('el');
    e.innerHTML = s;
    return e.firstChild;
}

function process_autoload_results(res)
{
    console.log("xhr worked !");
    
    var o = JSON.parse(res);
    //window.obj_response = o; //  debugging
    var fragment = document.createDocumentFragment();

    if (resource_type == "BaseSearchResource")
	for (var i in o.resource_response.data.results)
	{
            var item = o.resource_response.data.results[i];
            fragment.appendChild(new_item(item));
	}
    else
	for (var i in o.resource_response.data)
	{
	    var item = o.resource_response.data[i];
	    fragment.appendChild(new_item(item));
	}
    
    var container = document.querySelector(".static").parentNode;
    container.appendChild(fragment);

    document.body.columns_items = 0; // force
    layout();

    autoload.requestingMoreResults = false;
    autoload_init(o);
}

function autoload_error()
{
    console.log("autoload error");
}


/********************************************************************************/

function is_prefix(p, str)
{
    return (str.slice(0, p.length) == p);
}

function add_style(css)
{
    var heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
        var node = document.createElement("style");
        node.type = "text/css";
        node.innerHTML = css;
        heads[0].appendChild(node);
    }
}

function on_document_ready(f)
{
    function check_ready()
    {
        if (document.body)
            f();
        else
            setTimeout(check_ready, 50);
    }
    setTimeout(check_ready, 50);
}

function layout_items_tile(columns, container_selector)
{
    var containers = document.querySelectorAll(container_selector);
    for (var j = 0; j < containers.length; j++)
    {
	var container = containers[j];
	var items = container.querySelectorAll('div.item');
	if (!items.length)  // sanity check
	    continue;

	var clone = container.cloneNode(true);	// change cloned items to avoid reflows
	var clones = clone.querySelectorAll('div.item');

	var last_tops = [], top_col = 0;	// last_tops[top_col] = highest free spot at the bottom
	for (var k = 0; k < columns; k++)
	    last_tops[k] = 0;

	for (var i = 0; i < items.length; i++)
	{
	    var top = last_tops[top_col];
	    var left = top_col * (236 + 14);
	    // setting style.cssText supposedly faster than .style
	    clones[i].style.cssText += '; top: ' + top + 'px; left: ' + left + 'px; ';
	    // clones[i].style = '; top: ' + top + 'px; left: ' + left + 'px; ';
	    
	    last_tops[top_col] += items[i].offsetHeight + 14;	    
	    for (var k = 0; k < columns; k++)			// update top_col
		if (last_tops[k] < last_tops[top_col])
		    top_col = k;
	}

	container.parentNode.replaceChild(clone, container);
    }        
}

function layout_items_table(columns, container_selector)
{
    var containers = document.querySelectorAll(container_selector);
    for (var j = 0; j < containers.length; j++)
    {
	var container = containers[j];

	var clone = container.cloneNode(true);	// change cloned items to avoid reflows
	var clones = clone.querySelectorAll('div.item');
	if (!clones.length)  // sanity check
	    continue;

	var table = document.createElement('table');
	table.className = 'items_table_layout';
	var tr = document.createElement('tr');
	table.appendChild(tr);
	for (var i = 0; i < clones.length; i++)
	{
	    if (i && i % columns == 0)
	    {
		tr = document.createElement('tr');
		table.appendChild(tr);		
	    }
	    
	    var td = document.createElement('td');
	    td.appendChild(clones[i]);
	    tr.appendChild(td);
	}

	clone = container.cloneNode(false);  // without children this time
	clone.appendChild(table);
	container.parentNode.replaceChild(clone, container);
    }        
}

function remove_element(e)
{
    e.parentNode.removeChild(e);
}

function removeall(l)
{
    for (var i = l.length - 1; i >= 0; i--)
	l[i].parentNode.removeChild(l[i]);
}

function remove_elements_style(l)
{
    for (var i = l.length - 1; i >= 0; i--)
	l[i].style = "";
}

function layout_items_float(columns, container)
{
    var items = container.querySelectorAll('div.static');
    for (var i = 0; i < items.length; i++)
    {
	if (i && i % columns == 0)
	{
	    var div = document.createElement('div');
	    div.className = 'clearfloats';
	    container.insertBefore(div, items[i]);
	}
    }   
}

// Float related pins around main pin
function layout_items_float_pin(columns, container)
{
    var main_pin = document.querySelector(".static");
    var items = container.querySelectorAll('div.static');
    var k = 0;
    for (var i = 1; i < items.length; i++)
    {
	if (items[i].offsetTop + items[i].clientHeight > main_pin.clientHeight) // below main pin ?
	    if (k++ % columns == 0)
	{
	    var div = document.createElement('div');
	    div.className = 'clearfloats';
	    container.insertBefore(div, items[i]);
	}
    }
}

var layout_functions = { float: layout_items_float, 
			 table: layout_items_table,
			 tile:  layout_items_tile
		       };

function layout()
{
    var columns = Math.floor(window.innerWidth / (236 + 14));
    console.warn('columns: ' + columns);
    if (columns == document.body.columns_items)  // unchanged
	return;
    document.body.columns_items = columns;
    
    // remove previous clearfloat divs in case of resize
    if (layout_type == 'float')
	removeall(document.querySelectorAll('div.clearfloats'));

    var container = document.querySelector(".static").parentNode;

    if (page_type == 'pin')
	layout_items_float_pin(columns, container);
    else
	layout_functions[layout_type](columns, container);
}

function add_styles()
{
    if (layout_type == 'float' || layout_type == 'table')
    {
	add_style(".gridCentered .static,  .gridCentered .static:nth-child(-n+4)" + 
		  "       { float:left; position:static; visibility:visible; margin:7px 7px; }");
	add_style(".clearfloats  { clear: both; } ");
    }

    if (layout_type == 'table')
    {
	add_style(".items_table_layout td   { vertical-align:top; padding:7px; } ");
	add_style(".items_table_layout      { border-spacing:0px; } ");
    }

    //add_style(".Pin.summary .pinImg   { opacity: 1; } ");		// make board images visible
    //add_style(".creditImg.user img    { position: static; } ");		// fix user images
    // Get rid of evil manual image sizing
    add_style(".GrowthUnauthPinImage > a > img { position: static;  } ");
    // Truncate giant images ...
    add_style(".GrowthUnauthPinImage > a { display:inline-block; max-height: 450px; overflow: hidden; } ");
    return;
    
    if (page_type == 'pin')
    {
	add_style(".Board.boardPinsGrid .pinGridWrapper .item { opacity: 1; } "); // remove pin icons greyout

	// .mainPin style page
	add_style(".mainPin { float: left; }");
	add_style(".PinCommentsPage { display: none; }"); 
	add_style(".mainPin .Image > .heightContainer { max-height: inherit; }");

	// .activeItem style page
	add_style(".activeItem { float: left; }");
    }

    // FIXME keep in sync with layout() removeall()'s
    add_style(".pinMeta   { display:none; } ");	// remove pin descriptions
    add_style(".pinImageDim { display: none; }");  // remove image dimmer
    add_style(".repinSendButtonWrapper { display: none; }");  // remove image buttons
    add_style(".likeEditButtonWrapper { display: none; }");  // remove image buttons
    add_style(".Pin.summary .pinImageActionButtonWrapper a.pinNavLink { display: none; }");  // remove image buttons
    add_style(".pinDomain { display: none; }");  // remove pin domain div

    // one time stuff
    add_style(".NagNoScript.NagBase.Module { display: none; }");  // remove javascript needed banner
    add_style(".unAuthCookieBar { display: none; }");  // remove cookie notice
}

function remove_unwanted_stuff()
{
    // cursor:zoom-in;border-radius:6px 6px 0 0; display:block; padding:0px; font-weight:bold;
    // text-decoration:none; color:#717171; overflow:hidden; background:#504332; max-height:800px;
    remove_elements_style(document.querySelectorAll(".GrowthUnauthPinImage > a"));
    add_style(".GrowthUnauthPinImage > a    { border-radius:6px 6px 0 0; }");

    // -webkit-transition:opacity 0.04s linear;transition:opacity 0.04s linear;border-radius:inherit;
    // opacity:1; display:block; margin:0 auto;border:0px;width:100%;max-width:100%;vertical-align:middle;
    // position:relative;height:925.4901960784314px;
    remove_elements_style(document.querySelectorAll(".GrowthUnauthPinImage > a > img"));
    add_style(".GrowthUnauthPinImage > a > img   {  border-radius:inherit; width:236px; }");
    

    removeall(document.querySelectorAll(".GrowthUnauthPinImage + div"));
    removeall(document.querySelectorAll(".GrowthUnauthPinImage > button"));
    removeall(document.querySelectorAll(".GrowthUnauthPinImage__contentLink"));
    removeall(document.querySelectorAll(".GrowthUnauthPinImage__imageDim"));
    removeall(document.querySelectorAll(".GrowthUnauthPinImage > a > h4"));

    //removeall(document.querySelectorAll("script"));
    //removeall(document.querySelectorAll(".pinMeta"));
    //removeall(document.querySelectorAll(".pinMetaWrapper"));
    //removeall(document.querySelectorAll(".pinImageDim"));
    //removeall(document.querySelectorAll(".repinSendButtonWrapper"));
    //removeall(document.querySelectorAll(".likeEditButtonWrapper"));
    //removeall(document.querySelectorAll(".Pin.summary .pinImageActionButtonWrapper a.pinNavLink"));
    //removeall(document.querySelectorAll(".pinDomain"));

    //removeall(document.querySelectorAll(".bulkEditPinWrapper"));
    //removeall(document.querySelectorAll(".sharedContentPosting"));
    //removeall(document.querySelectorAll(".item meta"));
    //removeall(document.querySelectorAll(".PinCommentsPage"));

    // remove image titles tooltips
    var links = document.querySelectorAll('.GrowthUnauthPinImage > a');
    for (var i = 0; i < links.length; i++)
	links[i].title = "";
}

function fix_pin_layout()
{
    if (page_type != "pin")
	return;

    // Fix main pin style
    //   background:white;border-radius:6px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.22);
    //   display:inline-block;backface-visibility:hidden;font-size:11px;position:relative;width=236px;
    var main_pin = document.querySelector(".static > div");
    // just remove width=236px
    main_pin.style = ("background:white;border-radius:6px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.22);" +
		      "display:inline-block;backface-visibility:hidden;font-size:11px;position:relative;");
    document.querySelector(".static .GrowthUnauthPinImage a").style = "max-height:100%";
    document.querySelector(".static .GrowthUnauthPinImage a img").style = "width:100%";
    //   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#555;font-weight:bold;font-size:11px;
    document.querySelector(".static h4").style = "max-width:300px;" +
	"white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#555;font-weight:bold;font-size:11px;";


    // Remove cookie bar
    var bar = document.querySelector(".EuCookieBar__learnMore");
    if (bar)  remove_element(bar.parentNode);

    // Remove unauth bar
    var bar = document.querySelector(".UnauthHeader__headerContainer");
    if (bar)  remove_element(bar.parentNode);

    // Remove page header and interests
    var bar = document.querySelector(".gridCentered > h1");
    if (bar)  remove_element(bar.parentNode.parentNode);

    
    // Link to full size image in main pin
    var link = document.querySelector(".static:first-child .GrowthUnauthPinImage a");
    var img =  document.querySelector(".static:first-child .GrowthUnauthPinImage a img");
    //link.href = img.src.replace("/736x/", "/originals/");
    link.href = img.src.replace("/564x/", "/originals/");
}

function fix_user_images()
{
    // Get rid of evil manual image sizing
    var containers = document.querySelectorAll('.heightContainer');
    for (var i = 0; i < containers.length; i++)
	containers[i].style = "";

    var imgs = document.querySelectorAll('img[data-src]');
    for (var i = 0; i < imgs.length; i++)
    {
	imgs[i].src = imgs[i].getAttribute('data-src');
	imgs[i].removeAttribute('data-src');
    }
}

function main()
{
    console.log('in main()');

    main_pin = document.querySelector('.mainPin');
    document.removeEventListener('DOMContentLoaded', main, false);  // call only once, please
    init_xhr_req_data();
    remove_unwanted_stuff();
    fix_pin_layout();
    fix_user_images();
    window.onresize = layout;
    layout();
    if (layout_type == 'tile')
	add_style(".GridItems.variableHeightLayout > .item \
                      { visibility:visible; } ");
    
    autoload_init(null);
}

on_document_ready(add_styles);
document.addEventListener('DOMContentLoaded',  main, false);


}());
