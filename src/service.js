/*
* Service methods
*/
sloth.Services = function(){};
sloth.Services._services = {};
sloth.Services.register = function(service){
	service.__listeners = [];
	service.notify = function(inObj){
		if (undefied == inObj){
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
