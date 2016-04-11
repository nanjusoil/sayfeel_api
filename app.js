var express = require('express');
var ExpressBrute = require('express-brute');
var graph =require('fbgraph');
var bodyParser = require('body-parser');
var app = express();
var async=require ('async');
var mongoose = require('mongoose').connect("mongodb://localhost/test");
var passport = require('passport');
var facebookStrategy = require('passport-facebook').Strategy;
var session = require('express-session');
var url = require('url');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var store = new ExpressBrute.MemoryStore(); // stores state locally, don't use this in production
var bruteforce = new ExpressBrute(store);
app.set('view engine', 'ejs');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies
    app.use(session({
            secret : "assfk",
            saveUninitialized: true,
            resave: true,
            cookie:{_expires : 6000000}, // time im ms
        }
    ));

    graph.setAccessToken("EAALmAiLQ8h4BALki4LAEOwjTsmlkzB21BhGNKEZCr2vx488SOdpODgBdZAFtEztqOvWHUQXFbhBPziCKpvcYoPZAKK9oQ0tq23KfVeyqQpHD7TmwxOQ7AD6x83i69qXFFvpMDCPr2EhJgU7KMUeuUHiMMch1S3mjiHLVwFDmwZDZD");

// define routes

app.use(passport.initialize());
app.use(passport.session());


    var chatUser = new mongoose.Schema({
        profileID : String,
        fullName : String,
        profilePic: String
    });
    
    var poster = new mongoose.Schema({
        profileID : String,
        content : String
    });

    var userModel = mongoose.model('chatUsers', chatUser);
    var posterModel = mongoose.model('poster', poster);
   
    passport.serializeUser(function(user, done){
       done(null, user.id);
    });

    passport.deserializeUser(function(id, done){

        userModel.findById(id, function(err, user){
            done(err, user);
        });
    });

    passport.use(new facebookStrategy({

        clientID : "815846801863198",
        clientSecret:"5a566677dd75b8612a8d0b80ff0ef3f1" ,
        callbackURL: "http://sayfeel.tw/login/callback",
        profileFields: ['id', 'displayName', 'photos']

    },function(accessToken, refreshToken, profile, done){console.log(accessToken);

            //check the user exists in MongoDB
            // if not, create user in db and return the profile
            //if exists, simply return user profile

            userModel.findOne({'profileID':profile.id}, function(err, result){
                if(result){
                    done(null, result);
                }else{
                    var newChatUser = new userModel({
                        profileID : profile.id,
                        fullName : profile.displayName,
                        profilePic: profile.photos[0].value || ''
                    });
                    newChatUser.save(function(err){
                        done(null, newChatUser);
                    });
                }
            });
        }
    ));
    
app.get('/login',passport.authenticate('facebook'));
app.get('/login/callback', function(req, res ,next){passport.authenticate('facebook', {
        successReturnToOrRedirect: '/hello',
        failureRedirect: '/'
    })(req, res, next);
    });

app.get('/permalink.php',ensureLoggedIn('/login'), function(req, res){
	var post_url=req.query.id+"_"+req.query.story_fbid+"/comments";
	//console.log(post_url);
//	graph.post(post_url,message,function(err , res){console.log(res);});
res.render("hello",{id:req.query.id , story_fbid:req.query.story_fbid , post_url :post_url });
});

app.get('/story.php',ensureLoggedIn('/login') ,function(req, res){
	var post_url=req.query.id+"_"+req.query.story_fbid+"/comments";
	//console.log(post_url);
//	graph.post(post_url,message,function(err , res){console.log(res);});
res.render("hello",{id:req.query.id , story_fbid:req.query.story_fbid , post_url :post_url });
});

app.get('/:page_name/posts/:story_fbid',ensureLoggedIn('/login'), function(req, res){
async.waterfall([
function(callback)
  {
    graph.get(req.params.page_name , function(err ,res)
    {
    callback(null,res.id);
    });
  },
function(result , callback)
  {
      console.log(result);
      post_url=result+"_"+req.params.story_fbid+"/comments";
      res.render("hello",{id:result , story_fbid : req.params.story_fbid , post_url :post_url });
      callback(null, 'done');
  }
])
 });


    function securePages(req, res, next){
        if(req.isAuthenticated()){
            next();
        }else{
            res.redirect('/login');
        }
    }
app.post('/dopost', function(req, res){
	var message ={message:req.body.message};
graph.post(req.body.post_url,message,function(err , res){
console.log(res + err);
});
                    var newposter = new posterModel({
                        profileID : req.user.profileID,
                        content : req.body.message
                    });
                    newposter.save(function(err){
                    });

res.writeHead(302, {
  'Location': 'https://facebook.com/'+req.body.id+'/posts'+'/'+req.body.story_fbid
  //add other headers here...
});
res.end();
})

app.post('/api/:page_name/posts/:story_fbid', function(req, res){
	var message ={message:req.body.message};
 var post_url;
 async.waterfall([
function(callback)
  {
    graph.get(req.params.page_name , function(err ,res)
    {
    callback(null,res.id);
    });
  },
function(result , callback)
  {
      console.log(result);
      post_url=result+"_"+req.params.story_fbid+"/comments";
      callback(null, result);
  },
  function(result , callback)
  {
    graph.post(post_url,message,function(err , res){
    });
                    var newposter = new posterModel({
                        profileID : req.profileID,
                        content : req.body.message
                    });
                    newposter.save(function(err){
                    });
   callback(null, 'done');
  }
])
})

app.post('/api/story.php', function(req, res){
	var message ={message:req.body.message};
 	var post_url=req.query.id+"_"+req.query.story_fbid+"/comments";
  console.log( req.body.profileID + req.body.message );
graph.post(post_url,message,function(err , res){
});
                    var newposter = new posterModel({
                        profileID : req.body.profileID,
                        content : req.body.message
                    });
                    newposter.save(function(err){
                    });
})

app.post('/api/permalink.php', function(req, res){
	var message ={message:req.body.message};
 	var post_url=req.query.id+"_"+req.query.story_fbid+"/comments";
graph.post(post_url,message,function(err , res){
});
                    var newposter = new posterModel({
                        profileID : req.profileID,
                        content : req.body.message
                    });
                    newposter.save(function(err){
                    });
})

app.post('/' , function(req,res){
res.send("hello");
});

app.listen(80, function () {
    console.log('ready on port 80');
})