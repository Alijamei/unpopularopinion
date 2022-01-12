require('dotenv').config({ silent: process.env.NODE_ENV === 'production' })
const express = require('express')
var bodyParser = require('body-parser')
const mongoose = require('mongoose');
const session = require('express-session')
const MongoDbStore = require('connect-mongo');
const  ejs = require('ejs');
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app = express()

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.disable('etag');

app.enable('trust proxy'); 
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
//   store: new MongoDbStore({
//     mongoUrl: 'mongodb://localhost:27017/ulb'
// })
  
}))
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect( process.env.MONGOLAB_URI)
    .then(() => {
        console.log('Connected to Mongo!');
    })
    .catch((err) => {
        console.error('Error connecting to Mongo', err);
    });


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User',userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


 
passport.use(new GoogleStrategy({
    clientID:  process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/unpopularopinion",
    userProfileURL: "http://www.googleapis.com/oauth2/v3/userinfo",
  },
  function(accessToken, refreshToken, profile, cb) {
   
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/',function(req,res){
	 res.render('home')
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  );

app.get('/auth/google/unpopularopinion', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/unpopularopinion');
  });

app.get('/login',function(req,res){
	 res.render('login')
});
app.get('/register',function(req,res){
         
         res.render("register")
});
app.get('/logout',function(req,res){
           req.logout();
           res.redirect('/');

});

app.get('/unpopularopinion',function(req,res){
     User.find({'secret':{$ne: null}},function(err,foundusers){
          if (err) {
               console.log(err);
          }
          else{
             if (foundusers) {

                   res.render('unpopularopinion',{alltheuserssecrets:foundusers});
             }
          }
     });
});
app.get('/submit',function(req,res){
          if(req.isAuthenticated()){
               res.render("submit")
         }
         else{
                res.render("/login")
         }
});
app.post('/submit',function(req,res){
      const submittedsecret = req.body.secret;
      console.log(req.user.id);
      User.findById(req.user.id,function(err,finduser){
            if (err) {
               console.log(err)
            }
            else{
                if (finduser) {
                      console.log(finduser)
                      finduser.secret = submittedsecret;
                      console.log(submittedsecret)
                      finduser.save(function(){
                            res.redirect('/unpopularopinion')
                      })
                }
            }
      })
});
app.post('/register',function(req,res){
        User.register({username: req.body.username}, req.body.password, function(err,user) {
                if (err) { 
                             console.log(req.body.username)
                             console.log( req.body.password)
                             console.log('error in register')
                             res.redirect('/register');
                       }
                     else{
                      
                       passport.authenticate('local')(req, res,function() {
                        res.redirect('/unpopularopinion');
    
                        
                     });
      
              }
      
      });

  });
      

app.post('/login',function(req,res){
       const user = new User({
             username: req.body.username,
             password: req.body.password   
       })
        req.login(user, function(err) {
          if (err) {
              console.log(err); 
         }
           else{
                  passport.authenticate('local')(req, res,function() {
                        res.redirect('/unpopularopinion');
});
           }


 });     
});

const port = process.env.PORT || 3000;



app.listen(port , function(){
	console.log('3000');
});
