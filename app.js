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

MenuComponent.prototype.event_triggered = function(event){
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
Code.prototype.render = function(parentDomElement){
	sloth.Component.init(AppCode).then(function(obj){
		obj.attach(parentDomElement.querySelector("code"));
	});
}


function AppCode(){};
AppCode.templateUrl = "app.js"
AppCode.prototype.render = function(parentDomElement){
}

sloth.Component.register(AppCode);

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
	this.list_all = true;
}
Blog.templateUrl = "templates/blog.html";

Blog.prototype.render = function(parentDomElement){
	var self = this;
	var send_post_button = parentDomElement.querySelector(".send_new_post");
	var new_blog_button = parentDomElement.querySelector(".blog_new_post")

	function toggleMe(){
		if (self.list_all){
			console.log("Need to add a new blog post");
			parentDomElement.querySelector(".blog_entries").style.display = 'none';
			parentDomElement.querySelector(".new_post").style.display = '';
			new_blog_button.querySelector("i").innerHTML = "remove circle";
			send_post_button.style.display = '';
		}else{
			console.log("Showing all");
			parentDomElement.querySelector(".blog_entries").style.display = '';
			parentDomElement.querySelector(".new_post").style.display = 'none';
			new_blog_button.querySelector("i").innerHTML = "add circle";
			send_post_button.style.display = 'none'
		}
		self.list_all = !self.list_all;
	}
	new_blog_button.addEventListener("click", function(){
		toggleMe();
	});

	send_post_button.addEventListener("click", function(){
		var t = document.getElementById("post-title-id");
		var d = document.getElementById("post-description-id");
		self.blogService.addPost({
			title: t.value,
			description: d.value
		});
		t.value = "";
		d.value = "";
		toggleMe();
	})

	//Now let's had some posts from the service
	this.blogService.getPosts().then(function(posts){
		self.display_posts(self.blogService)
	});
}

Blog.prototype.event_triggered = function(event){
	//Todo we should actually look at what kind of event was sent..
	if (event.changes == "all")
		this.display_posts(event.service);
}

Blog.prototype.display_posts = function(service){
	/*
	* Now lets handle those post information
	*/
	var entries = this.__dom.querySelector(".blog_entries");
	while (entries.firstChild) {
	    entries.removeChild(entries.firstChild);
	}

	service.posts.forEach(function(post){
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

function BlogService(){this.posts = []; this.retrieved = false;};

BlogService.prototype.getPosts = function(){
	var self = this;
	var b = new Promise(function(resolve, reject){
		if (self.retrieved){
			resolve(self.posts);
		}else{

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
				resolve(json);
				self.posts = json;
				self.retrieved = true;
				self.notify({changes: "all"});
			})
			.catch(function(){reject()});
		}
	});
	return b;
}

BlogService.prototype.addPost = function(post){
	this.posts.push(post);
	this.notify({changes: "new", post: post});
}

sloth.Services.register(new BlogService());