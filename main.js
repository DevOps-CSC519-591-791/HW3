var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})

///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
// output example
// "GET /get", "GET" is the req.method, "/get" is the req.url
app.use(function(req, res, next) 
{
	console.log(req.method, req.url);

	// ... INSERT HERE.
	client.lpush("recentUrl", req.url);
	// Keep 5 recent urls
	client.ltrim("recentUrl", 0, 4);
	
	next(); // Passing the request to the next handler in the stack.
});

app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body) // form fields
   console.log(req.files) // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		console.log(img);
		});
	}
	//store images to Redis
   res.status(204).end()
}]);

app.get('/meow', function(req, res) {
	{
		if (err) throw err
		res.writeHead(200, {'content-type':'text/html'});
		items.forEach(function (imagedata) 
		{
   		res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
		});

	//pop up images
   	res.end();
	}
})

app.get('/', function(req, res) {
	res.send('hello world!');
})

app.get('/set', function(req, res){
	client.set("Zhewei", "Awesome");
	client.expire("Zhewei", 10);
	res.send("Key set.");
})

app.get('/set/:key', function(req, res){
	client.set("Zhewei", req.params.key);
	client.expire("Zhewei", 10);
	res.send("Key set."); //`Muat have res.send(), otherwise server will waiting response forever...`
})

app.get('/get', function(req, res){
	res.send(client.get("Zhewei", function(err,value){ console.log(value)}));
})

app.get('/recent', function(req, res){
	client.lrange("recentUrl", 0, -1, function(err, value){
		console.log(value);
		res.send(value);
	});
})

// HTTP SERVER
var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})

