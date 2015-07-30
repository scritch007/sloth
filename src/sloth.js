function sloth(){};

/***
Super Observer
***/

sloth.onDomReady = function(object, callback){
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			callback();
		});
	});

	observer.observe(object, {
		attributes: true,
		childList: true,
		characterData: true
	});
}