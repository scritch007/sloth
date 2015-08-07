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
