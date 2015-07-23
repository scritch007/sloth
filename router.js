
wtfjs.Router = function(){
	this.__routes = {};
	this.__current_route = window.location.hash;
	this.__dom = document.getElementById("router_id");
	var self = this;

	wtfjs.onDomReady(this.__dom,function(){
		var route = self.__routes[self.__current_route];
    		if (undefined !== route[1].load){
    			route[1].load(self.__dom);
		}
	});
	window.onhashchange = function(){
		self.__current_route = window.location.hash;
		self.update(window.location.hash);
	};
}

wtfjs.Router.prototype.start = function(){
	// This should be called by the init to start the router;

	if (window.location.hash){
		this.__current_route = window.location.hash;
	}else{

	}
}

wtfjs.Router.prototype.add_route = function(hashname, name, object, load_conditions){
	var self = this;
	wtfjs.Component.register(object)
	.then(function(){
		this.__display = function(){
			self.__dom.innerHTML = this.__template;
		}
		self.__routes[hashname] = [name, this, load_conditions];
		if (null == self.__current_route){
			self.__current_route = hashname;
		}
		if (hashname == self.__current_route){
			self.update();
		}
	});
}

wtfjs.Router.prototype.update = function(){
	var route = this.__routes[window.location.hash];
	if (undefined !== route[2]){
		var res = route[2]();
		if (true !== res){
			window.location.hash = res;
			return this.update();
		}
	}
	route[1].__load();
}

wtfjs.Router.navigate = function(name){
	for (var key in __main_router.__routes){
		var route = __main_router.__routes[key];
		if (route[0] == name){
			window.location.hash = key;
			return;
		}
	}
}
var __main_router = null;

wtfjs.RouterConfig = function(routes){
	__main_router = new wtfjs.Router();
	routes.forEach(function(route){
		__main_router.add_route.apply(__main_router, route);
	});
	return __main_router;
}

/***
Super Observer
***/

wtfjs.onDomReady = function(object, callback){
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