function wtfjs(){};

wtfjs.Services = function(){};
wtfjs.Services._services = {};
wtfjs.Services.register = function(service){
	wtfjs.Services._services[service.__proto__.constructor.name] = service;
	wtfjs.Component._load_them();
}
wtfjs.Services.get = function(service_name){
	return wtfjs.Services._services[service_name];
}

wtfjs.Component = function(){};
wtfjs.__components = {};
wtfjs.Component.__pending_components = {};
wtfjs.Component.register = function(objectClass, deps){
	var tmpObj = {classObject: objectClass, deps: deps, then: function(callback){
		this.callback = callback;
		if (this.singleton){
			//The attach has already been done.
			this.callback.bind(this.singleton)();
		}
	}, singleton: null};
	wtfjs.Component.__pending_components[objectClass.name] = tmpObj;
	wtfjs.Component._load_them();
	return tmpObj;
}
wtfjs.Component.domReady = function(){
	//Notify all the elements that dom is now ready
	for (var key in wtfjs.__components){
		var tmp = wtfjs.__components[key];
		if (tmp.__isloaded && !tmp.__attached && tmp.dom_id){
			tmp.__attach();
		}
		tmp.__attached = true;
	}
}

wtfjs.Component._load_them = function(){
	var keys = [];
	for(var key in wtfjs.Component.__pending_components){
		keys.push(key);
	}
	var newlyLoaded = false;
	keys.forEach(function(key){
		var tmpObj = wtfjs.Component.__pending_components[key];
		var objectClass = tmpObj.classObject;
		var args = [];
		if (undefined !== tmpObj.deps){
			var alldeploaded = true;
			for(var i=0; i < tmpObj.deps.length; i++){
				var lcomp = wtfjs.__components[tmpObj.deps[i]];
				var lservice = wtfjs.Services._services[tmpObj.deps[i]];
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
		//Put the component into loaded list

		var tmp = new objectClass(args);
		delete wtfjs.Component.__pending_components[key];
		wtfjs.__components[key] = tmp;
		tmp.__isloaded = false;
		tmp.__attached = false;
		tmp.__attach = function(){
			tmp.__dom = document.getElementById(this.dom_id);
			tmp.__display = function(){
				console.log("Attaching to dom");
				tmp.__dom.innerHTML = tmp.__template;
			}
			wtfjs.onDomReady(tmp.__dom, function(){
				if(tmp.__dom.innerHTML == tmp.__template){
					tmp.load();
				}
			});
			tmp.__display();
		}
		if (undefined !== tmp.dom_id){
			tmp.__dom = document.getElementById(this.dom_id);
			if (tmp.__dom){
				tmp.__attach();
				tmp.__attached = true;
			}
		}
		tmp.__load = function(){
			if (!this.__isloaded){
				var processStatus = function (response) {
	    			// status "0" to handle local files fetching (e.g. Cordova/Phonegap etc.)
	    			if (response.status === 200 || response.status === 0) {
	    			    return response.text()
	    			} else {
	    			    return new Error(response.statusText);
	    			}
				};

				fetch(tmp.template)
			    .then(processStatus)
			    // the following code added for example only
			    .then(function(raw_html){
			    	tmp.__template = raw_html;
			    	tmp.__isloaded = true;
			    	//Check that dom is ready before displaying
			    	if (tmp.__attached){
			    		if (tmp.dom_id){
			    			tmp.__attach();
			    		}
			    		tmp.__display();
			    	}
			    })
			    .catch();
			}else{
		    	//Check that dom is ready before displaying
		    	if (tmp.__attached){
		    		if (tmp.dom_id){
		    			tmp.__attach();
		    		}
		    		tmp.__display();
		    	}
			}

		}
		if (undefined !== tmp.dom_id && tmp.__attached){
			tmp.__display();
		}
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