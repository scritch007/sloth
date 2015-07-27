
sloth.Router = function(){
	this.__routes = {};
	this.__current_route = window.location.hash;
	this.__dom = document.getElementById("router_id");
	this.__default_route = null;
	var self = this;

	sloth.onDomReady(this.__dom,function(){
		var route = self.__routes[self.__current_route];
			if (undefined !== route[1].render){
				route[1].render(self.__dom);
				sloth.Component._global_renderer.forEach(function(cb){
					cb();
				});
		}
	});
	window.onhashchange = function(){
		self.__current_route = window.location.hash;
		self.update(window.location.hash);
	};
}

sloth.Router.prototype.start = function(){
	// This should be called by the init to start the router;

	if (window.location.hash && window.location.hash != ""){
		this.__current_route = window.location.hash;
	}else{

		window.location.hash = this.__default_route;
	}
}

sloth.Router.prototype.add_route = function(hashname, name, object, load_conditions){
	var self = this;
	if (object.default_route){
		if (null != this.__default_route){
			console.error("Default route already set to " + this.__default_route + " forcing to " + hashname);
		}
		this.__default_route = hashname;
	}
	sloth.Component.register(object)
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

sloth.Router.prototype.update = function(){
	var route = this.__routes[window.location.hash];
	if (undefined === route){
		//The actual Route could no yet loaded.
		return;
	}
	if (undefined !== route[2]){
		var res = route[2]();
		if (true !== res){
			window.location.hash = res;
			return this.update();
		}
	}
	route[1].__load();
}

sloth.Router.navigate = function(name){
	for (var key in __main_router.__routes){
		var route = __main_router.__routes[key];
		if (route[0] == name){
			window.location.hash = key;
			return;
		}
	}
}
var __main_router = null;

sloth.RouterConfig = function(routes){
	__main_router = new sloth.Router();
	routes.forEach(function(route){
		__main_router.add_route.apply(__main_router, route);
	});
	return __main_router;
}
