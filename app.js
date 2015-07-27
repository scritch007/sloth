var myApp = null;
function init(){
	myApp = new App();
}

function App(){
	var self = this;
	sloth.RouterConfig([
		["#/home", "home", Home, requires_loggedin],
		["#/code", "code", Code, requires_loggedin],
		["#/login", "login", Login]
	]).start();
	sloth.Component.register_render_callback(function(){
		console.log("global called");
		componentHandler.upgradeAllRegistered();
	})
	sloth.Component.domReady();
}

function MenuComponent(deps){
	this.template = "menu.template";
	this.dom_id = "menu_id";
	this.loginService = deps[0];
}

MenuComponent.prototype.event_triggered = function(dep){
	this.refresh();
}

/*
* Load method is called when the template has been rendered
*/
MenuComponent.prototype.render = function(){
	var classname = "";
	if (this.loginService.isLoggedIn()){
		var tmp2 = this.__dom.querySelector("#menu-user-name");
		tmp2.innerHTML = this.loginService.getUserName();
		classname = ".app-not-logged-in";
	}else{
		classname = ".app-logged-in";
	}
	var node = this.__dom.querySelector(classname);
	node.remove();

	node = this.__dom.querySelector(".menu-user-logout");
	if (this.loginService.isLoggedIn()){
		node.addEventListener("click", function(){
			this.loginService.logout();
		}.bind(this));
	}else{
		node.remove();
	}

}

sloth.Component.register(MenuComponent, ["LoginService"])
.then(function(){
	this.__load();
});

function Home(){
	this.template = "home.template";

}
Home.default_route = true;
Home.prototype.render = function(parentDomElement){
	console.log("Loading home....");
}

function Code(){
	this.template = "code.template";
}


/*
* Login methods
*/
function Login(){
	this.template = "login.template";
}
Login.prototype.render = function(parentDomElement){
	parentDomElement.querySelector("button").addEventListener("click", function(){
		//Todo remove this when needed.
		sloth.Services.get(LoginService.name).updateLogin(parentDomElement.querySelector("#menu-login-id").value);
		LoginService.isLoggedIn = true;
		sloth.Router.navigate("home");
	});
}

function requires_loggedin(){
	return localStorage.getItem("jwt")==null?"#/login":true;
}

/***
LoginService definition
***/
function LoginService(){
	var self = this;
	//Because of the creation event for storage that isn't triggered, force the value to "" for th jwt
	var jwt = localStorage.jwt;
	window.addEventListener("storage", function(storageEvent){
		console.log(storageEvent);
		if (storageEvent.key === "jwt"){
			self.notify();
		}
	});
}
LoginService.name = "LoginService";
LoginService.prototype.isLoggedIn = function(){return null != localStorage.getItem("jwt")};
LoginService.prototype.getUserName = function(){return localStorage.getItem("jwt")};
LoginService.prototype.updateLogin = function(value){
	localStorage.setItem("jwt", value);
	this.notify();
}
LoginService.prototype.logout = function(){
	localStorage.removeItem("jwt");
	this.notify();
}

//Register the LoginService
sloth.Services.register(new LoginService());