var myApp = null;
function init(){
	myApp = new App();
}

function App(){
	var self = this;
	sloth.RouterConfig([
		["#/home", "home", Home, requires_loggedin],
		["#/code", "code", Code, requires_loggedin],
		["#/blog", "blog", Blog, requires_loggedin, ["BlogService"]],
		["#/login", "login", Login]
	]).start();
	sloth.Component.register_render_callback(function(){
		console.log("global called");
		componentHandler.upgradeAllRegistered();
	})
	sloth.Component.domReady();
}

function MenuComponent(loginService){
	this.dom_id = "menu_id";
	this.loginService = loginService;
}
MenuComponent.templateUrl = "templates/menu.html";

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

function Home(){};
Home.templateUrl = "templates/home.html";
Home.default_route = true;
Home.prototype.render = function(parentDomElement){
	console.log("Loading home....");
}

function Code(){}
Code.templateUrl = "templates/code.html";

/*
* Login methods
*/
function Login(){};
Login.templateUrl = "templates/login.html";
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

/*
* Blog methods
*/
function Blog(blogService){
	this.blogService = blogService;
}
Blog.template = '<button class="blog_new_post mdl-button mdl-js-ripple-effect mdl-js-button mdl-button--fab mdl-color--accent" data-upgraded=",MaterialButton,MaterialRipple"><i class="material-icons mdl-color-text--white">add circle</i><span class="mdl-button__ripple-container"><span class="mdl-ripple is-animating" style="width: 160.391918985787px; height: 160.391918985787px; transform: translate(-50%, -50%) translate(28px, 39px);"></span></span></button>\
	<div class="blog_entries"></div>"';

Blog.prototype.render = function(parentDomElement){
	parentDomElement.querySelector(".blog_new_post").addEventListener("click", function(){
		console.log("Need to add a new blog post");
	});
	//Now let's had some posts from the service
	this.blogService.getPosts().then(function(posts){console.log("Got those posts")});
}

Blog.prototype.event_triggered = function(dep){
	/*
	* Now lets handle those post information
	*/
	var entries = this.__dom.querySelector(".blog_entries");
	dep.posts.forEach(function(post){
		sloth.Component.init(Post, post).then(function(obj){
			console.log("appending " + post);
			obj.attach(entries);
		});
	});
}

function Post(postInfo){this.postInfo = postInfo;};
Post.templateUrl = "templates/post.html"
Post.prototype.render = function(parentDomElement){
	parentDomElement.querySelector(".app_post_title").innerHTML = this.postInfo.title;
	parentDomElement.querySelector(".app_post_description").innerHTML = this.postInfo.title;
}

sloth.Component.register(Post);

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

function BlogService(){this.posts = [];};

BlogService.prototype.getPosts = function(){
	var self = this;
	var b = Promise.defer();
	var processStatus = function (response) {
		// status "0" to handle local files fetching (e.g. Cordova/Phonegap etc.)
		if (response.status === 200 || response.status === 0) {
			return response.json()
		} else {
			return new Error(response.statusText);
		}
	};

	fetch("posts.json")
	.then(processStatus)
	// the following code added for example only
	.then(function(json){
		b.resolve(json);
		self.posts = json;
		self.notify();
	})
	.catch(function(){b.reject()});
	return b.promise;
}

sloth.Services.register(new BlogService());