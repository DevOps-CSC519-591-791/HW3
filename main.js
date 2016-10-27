var redis 	= require('redis');
var multer  = require('multer');
var express = require('express');
var fs      = require('fs');
var app 	= express();
var portNum	= 3000;
var serverSetLen = 0;
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {});

///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
// output example
// "GET /get", "GET" is the req.method, "/get" is the req.url
app.use(function(req, res, next) 
{
	console.log(req.method, req.url);

	// ... INSERT HERE.
	// redis key should be string
	client.lpush("recentUrl", req.url);
	// Keep 5 recent urls
	client.ltrim("recentUrl", 0, 4);
	
	next(); // Passing the request to the next handler in the stack.
});

app.get('/', function(req, res) {
	res.send('hello world!');
});

app.get('/set', function(req, res){
	client.set("Zhewei", "Awesome");
	client.expire("Zhewei", 10);
	res.send("Key set.");
});

app.get('/set/:key', function(req, res){
	client.set("Zhewei", req.params.key);
	client.expire("Zhewei", 10);
	//Must have res.send(), otherwise server will waiting response forever...
	res.send("Key set."); 
});

app.get('/get', function(req, res){
	res.send(client.get("Zhewei", function(err,value){ console.log(value)}));
});

app.get('/recent', function(req, res){
	client.lrange("recentUrl", 0, -1, function(err, value){
		console.log(value);
		res.send(value);
	});
});

// Multer is a node.js middleware for handling multipart/form-data,
// which is primarily used for uploading files.
app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body); // form fields
   console.log(req.files); // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		//store images to Redis
	  		client.lpush("imageStack", img);
	  		// Keep 3 recent images in stack
	  		client.ltrim("imageStack", 0, 2);
	  		console.log('Upload one image successfully!');
		});
	}
   res.status(204).end();
}]);

app.get('/meow', function(req, res) {
	client.lrange("imageStack", 0, -1, function(err, items){
		if (err) throw err
		res.writeHead(200, {'content-type':'text/html'});
		items.forEach(function (imagedata) 
		{
			res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
		});

		res.end();
	});
})

app.get('/listservers', function(req, res) {
	client.smembers("serverSet", function(err, servers){
		if (err) throw err
		res.writeHead(200, {'content-type':'text/html'});
		servers.forEach(function (serverDetail){
			res.write("<p>" + serverDetail + "</p>");
		});
		res.end();
	});
});

app.get('/spawn', function(req, res) {
	client.sadd("serverSet", 'http://0.0.0.0:' + portNum, function(err, value){
		// if certain port is not used, then creating a server listening this port
		if (err) throw err
		var tempLen = 0;
		client.scard("serverSet", function(err, value){
			if (err) throw err
		  	tempLen = value;
  			console.log("serverSetLen: " + serverSetLen);
  			console.log("tempLen: " + tempLen);
  			console.log("==============================");
  			// If new port can be added into serverSet, creating new server.
  			if(tempLen > serverSetLen){
				var server = app.listen(portNum, function() {
					var host = server.address().address
					var port = server.address().port
					serverSetLen = tempLen;
					client.sadd("serverSet", 'http://0.0.0.0:' + portNum);
					console.log('A new app listening at http://%s:%s', host, port)
				});
			} else {
				console.log("Port " + portNum + " has already been occupied.")
			}
		 });

		portNum += 1;
		res.end();
	});
});

app.get('/destroy', function(req, res) {
	client.spop("serverSet", function(err, port){
		// If more than one server in redis set, we can delete random one
		// Destroying all servers is undefined behavior.
		if (err) throw err
		client.scard("serverSet", function(err, value){
			if (err) throw err
		  	serverSetLen = value;
  			console.log("serverSetLen: " + serverSetLen);
		 });
		if(serverSetLen > 1){
			var server = app.listen(port);
			server.close(function(err, value){
				if (err) throw err
				console.log('A server is deleted successfully.');
			});
		} else {
			console.log('There is only one server left, you cannot delete it.');
		}
		res.send();
	})
})

// HTTP SERVER
var server = app.listen(3000, function() {
  var host = server.address().address
  var port = server.address().port
  client.sadd("serverSet", 'http://0.0.0.0:' + port);
  // asynchronously obtain length of the server list
  client.scard("serverSet", function(err, value){
	if (err) throw err
  	serverSetLen = value;
  	console.log("serverSetLen: " + serverSetLen);
  });

  console.log('Queues app listening at http://%s:%s', host, port)
})
// client.lpush("serverList", server);
// // same web routes with different ports.
// var server1 = app.listen(3001, function () {

//   var host = server1.address().address
//   var port = server1.address().port

//   console.log('Queues app listening at http://%s:%s', host, port)
// })
// client.lpush("serverList", server1);

