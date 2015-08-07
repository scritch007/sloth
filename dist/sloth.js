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
/*
* Component methods
*/
sloth.Component = function(){};

sloth.__components = {};
sloth.Component.__pending_components = {};
sloth.Component._global_renderer = [];

sloth.Component.register_render_callback = function(cb){
	sloth.Component._global_renderer.push(cb);
}

/*
* Method that will register all the components.
*/
sloth.Component.register = function(objectClass, deps){
	objectClass._comp_loading = false;
	objectClass.__loadlist = [];
	var tmpObj = {classObject: objectClass, deps: deps, then: function(callback){
		this.callback = callback;
		if (this.singleton){
			//The attach has already been done.
			this.callback.bind(this.singleton)();
		}
	}, singleton: null};
	sloth.Component.__pending_components[objectClass.name] = tmpObj;
	sloth.Component._load_them();
	return tmpObj;
}

/*
* Call all the components now that all the DOM elements were loaded
*/
sloth.Component.domReady = function(){
	//Notify all the elements that dom is now ready
	for (var key in sloth.__components){
		var tmp = sloth.__components[key];
		if (tmp.__isloaded && !tmp.__attached && tmp.dom_id){
			tmp.__attach();
		}
		tmp.__attached = true;
	}
}

/*
* Will set all the information for this component object
*/
sloth.Component.init = function(Cls){
	var tmp = new (Function.prototype.bind.apply(Cls, arguments));
	tmp.attach = function(parent){
		var shell = undefined === Cls.shell?"div":Cls.shell;
		var object = document.createElement(shell);
		object.id = (Date.now().toString()+Math.random().toString()).substr(8, 16)
		tmp.dom_id = object.id;
		tmp.__torender = true;
		object.innerHTML = tmp.template();
		sloth.onDomReady(parent, function(){
			if(tmp.__torender){
				console.log(tmp.constructor.name + " render");
				if (undefined !== tmp.render)
					tmp.render(object);
				sloth.Component._global_renderer.forEach(function(cb){
					cb();
				});
				tmp.__torender = false;
			}
		});
		parent.appendChild(object);
		return object;
	}
	var a = Promise.defer();
	tmp.loaded = function(){
		a.resolve(tmp);
	}
	sloth.Component.__init(tmp);
	tmp.__load();
	return a.promise;
}


sloth.Component.__init = function(tmp){
	tmp.__attached = false;
	tmp.__torender = false;
	tmp.templateUrl = function(){
		return tmp.__proto__.constructor.templateUrl;
	}
	tmp.template = function(){
		return tmp.__proto__.constructor.template;
	}
	tmp.__isloaded = tmp.template()?true:false;

	tmp.__display = function(){
		console.log("Attaching to dom");
		tmp.__torender = true;
		tmp.__dom.innerHTML = tmp.template();
	}
	tmp.__attach = function(display){
		tmp.__dom = document.getElementById(this.dom_id);

		sloth.onDomReady(tmp.__dom, function(){
			if(tmp.__torender){
				console.log(tmp.constructor.name + " render");
				if (undefined !== tmp.render)
					tmp.render(tmp.__dom);
				sloth.Component._global_renderer.forEach(function(cb){
					cb();
				});
				tmp.__torender = false;
			}
		});
		if (undefined == display || display)
			tmp.__display();
	}

	// Check if this is a component stuck to a dom_id
	if (undefined !== tmp.dom_id){
		tmp.__dom = document.getElementById(this.dom_id);
		if (tmp.__dom){
			tmp.__attach();
			tmp.__attached = true;
		}
	}
	tmp.__loaded = function(){
		/*
		* For Widget components the loaded method should be overwritten.
		*/
		if (undefined === tmp.loaded){
			if (tmp.__attached){
				if (tmp.dom_id){
					tmp.__attach(false);
				}
				tmp.__display();
			}
		}else{
			tmp.loaded();
		}
	}
	tmp.__load = function(){
		if (tmp.__proto__.constructor._comp_loading){
			tmp.__proto__.constructor.__loadlist.push(tmp);
			return;
		}
		if (!this.__isloaded){
			tmp.__proto__.constructor._comp_loading = true;
			var processStatus = function (response) {
				// status "0" to handle local files fetching (e.g. Cordova/Phonegap etc.)
				if (response.status === 200 || response.status === 0) {
					return response.text()
				} else {
					return new Error(response.statusText);
				}
			};

			fetch(tmp.templateUrl())
			.then(processStatus)
			// the following code added for example only
			.then(function(raw_html){
				tmp.__proto__.constructor.template = raw_html;
				tmp.__isloaded = true;
				//Check that dom is ready before displaying
				tmp.__loaded();
				tmp.__proto__.constructor._comp_loading = false;
				tmp.__proto__.constructor.__loadlist.forEach(function(tmp2){
					tmp2.__loaded();
				});
			})
			.catch();
		}else{
			//Check that dom is ready before displaying
			tmp.__loaded();
		}

	}
	if (undefined !== tmp.dom_id && tmp.__attached){
		tmp.__display();
	}
	tmp.refresh = function(){
		if (this.__attached){
			if (tmp.dom_id){
				tmp.__attach(false);
			}
			tmp.__display();
		}
	}
}
/*
* Instantiate the components that have their deps loaded
*/
sloth.Component._load_them = function(){
	var keys = [];
	for(var key in sloth.Component.__pending_components){
		keys.push(key);
	}
	var newlyLoaded = false;
	keys.forEach(function(key){
		var tmpObj = sloth.Component.__pending_components[key];
		var objectClass = tmpObj.classObject;
		var args = [null];
		if (undefined !== tmpObj.deps){
			var alldeploaded = true;
			for(var i=0; i < tmpObj.deps.length; i++){
				var lcomp = sloth.__components[tmpObj.deps[i]];
				var lservice = sloth.Services._services[tmpObj.deps[i]];
				if (undefined == lcomp &&
					undefined == lservice){
					alldeploaded = false;
					break;
				}
				if (undefined != lcomp){
					args.push(lcomp);
				}
				if (undefined != lservice){
					args.push(lservice);
				}
			}
			if (!alldeploaded){
				return;
			}
		}
		// Instantiate the component
		var tmp = new (Function.prototype.bind.apply(objectClass, args));
		args.forEach(function(instance){
			if (null == instance) return;
			if (instance.constructor.name in sloth.Services._services){
				instance.__listeners.push(tmp);
			}
		})
		// Remove it from the list.
		delete sloth.Component.__pending_components[key];
		sloth.__components[key] = tmp;
		sloth.Component.__init(tmp);
		if (undefined !== tmpObj.callback){
			tmpObj.callback.bind(tmp)();
		}
		tmpObj.singleton = tmp;
		newlyLoaded = true;
	});
	if (newlyLoaded){
		this._load_them();
	}
}

/*
* Service methods
*/
sloth.Services = function(){};
sloth.Services._services = {};
sloth.Services.register = function(service){
	service.__listeners = [];
	service.notify = function(inObj){
		if (undefined == inObj){
			inObj = {};
		}
		inObj.service = service
		this.__listeners.forEach(function(cb){
			if (undefined === cb.event_triggered){
				console.error(cb.constructor.name + " doesn't implement the event_triggered callback");
			}else{
				cb.event_triggered(inObj);
			}
		});
	}
	sloth.Services._services[service.__proto__.constructor.name] = service;
	sloth.Component._load_them();
}

sloth.Services.get = function(service_name){
	return sloth.Services._services[service_name];
}


sloth.Router = function(){
	this.__routes = {};
	this.__current_route = window.location.hash;
	this.__dom = document.getElementById("router_id");
	this.__default_route = null;
	var self = this;

	sloth.onDomReady(this.__dom,function(){
		var route = self.__routes[self.__current_route];
		if (route[1].__torender){
			if (undefined !== route[1].render ){
				route[1].render(self.__dom);
				sloth.Component._global_renderer.forEach(function(cb){
					cb();
				});
			}
			route[1].__torender = false;
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

sloth.Router.prototype.add_route = function(hashname, name, object, load_conditions, deps){
	var self = this;
	if (object.default_route){
		if (null != this.__default_route){
			console.error("Default route already set to " + this.__default_route + " forcing to " + hashname);
		}
		this.__default_route = hashname;
	}
	sloth.Component.register(object, deps)
	.then(function(){
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
	var route = this.__routes[this.__current_route];
	//Clean previous component dom_id
	route[1].dom_id = null;
	route = this.__routes[window.location.hash];
	route[1].dom_id = this.__dom.id;
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
