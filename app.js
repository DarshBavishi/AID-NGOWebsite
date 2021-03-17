var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var cookieParser = require("cookie-parser");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var easynodemailer = require("easynodemailer");
var seedDB = require("./seeds");
require("dotenv").config();

const multer = require("multer");
const { storage } = require("./cloudinary");
const upload = multer({ storage });

// easynodemailer.sendEmail(email = "bavishidarsh2001@gmail.com" , subjectofEmail = "test", textToBeSentInEmail = "testetststst")

//-------------------MODELS-------------------------
var User = require("./models/user");
var Product = require("./models/product");
var Comment = require("./models/comment");
var Blog = require("./models/blog");
var Order = require("./models/order");

//----------------------OTHERS & AUTH ----------------------
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(cookieParser("secret"));
app.use(flash());
app.locals.moment = require("moment");
// seedDB();

app.use(
  require("express-session")({
    secret: "Shhhh Secret!",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});
//-------------MONGOOSE----------------------------
mongoose
  .connect("mongodb://localhost:27017/NGO", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB!"))
  .catch((error) => console.log(error.message));

//---------------------------------------------------------------------
//-----------------------------ROUTES ---------------------------------

//------------------------------NAVBAR---------------------------------------

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/donate", function (req, res) {
  res.render("donate");
});

app.get("/volunteer", function (req, res) {
  res.render("volunteer");
});

app.get("/events", function (req, res) {
  res.render("events");
});

app.get("/store", function (req, res) {
  Product.find({}, function (err, allProducts) {
    if (err) {
      console.log(err);
      return res.redirect("back");
    } else {
      res.render("store", { products: allProducts });
    }
  });
});

app.get("/causes&stories", function (req, res) {
  Blog.find({}, function (err, allposts) {
    if (err) {
      console.log(err);
    } else {
      res.render("causes&stories", { stories: allposts });
    }
  })
    .sort({ date: "desc" })
    .limit(6);
});

app.get("/aboutus",function(req,res){
  res.render("aboutus");
});

app.get('/profile',isLoggedIn,function(req,res){
  res.render('profile')
});




//------------------ VOLUNTEER AND DONATE --------------------------

app.post('/submitform/volunteer',isLoggedIn,function(req,res){
  res.render('submitV')
});

app.post('/submitform/donate',isLoggedIn,function(req,res){
  res.render('submitD')
});

//---------------------------- BLOGS----------------------------------

app.get("/addstory", isLoggedIn,function (req, res) {
  res.render("addstory");
});

app.post("/addstory/:id",isLoggedIn, upload.single("image"), function (req, res) {
  imag_e = {
    url: req.file.path,
    filename: req.file.filename,
  };
  var blog = new Blog({
    title: req.body.title,
    body: req.body.body,
    authorname: req.user.name,
    authorid: req.user._id,
    image: imag_e,
  });

  User.findById(req.params.id, function (err, founduser) {
    if (err) {
      req.flash("error", "Something went wrong!")
      res.redirect("back");
    } else {
      founduser.blogs.push(blog);
      founduser.save();
      console.log(founduser);
    }
  });
  Blog.create(blog, function (err, newblog) {
    if (err) {
      console.log(err);
    } else {
      console.log(newblog);
      req.flash('success','Added your story successfully!');
      return res.redirect("/causes&stories#stories");
    }
  });
});

app.get("/causes&stories/:storyid/readmore", function (req, res) {
  Blog.findById(req.params.storyid, function (err, foundBlog) {
    if (err) {
      console.log(err);
    } else {
      res.render("storydetails", { story: foundBlog });
    }
  });
});

app.post("/causes&stories/:storyid/readmore/comment", isLoggedIn,function (req, res) {
  var comment = new Comment({
    body: req.body.comment,
    authorname: req.user.name,
    authorid: req.user._id,
  });
  Blog.findById(req.params.storyid, function (err, foundBlog) {
    if (err) {
      console.log(err);
    } else {
      foundBlog.comments.push(comment);
      foundBlog.save();
    }
  });
  res.redirect("/causes&stories/" + req.params.storyid + "/readmore#story");
});

//------------------------------CART ---------------------------------------
app.get("/cart", isLoggedIn,function (req, res) {
  User.findById(req.user._id, function (err, founduser) {
    if (err) {
      console.log(err);
      return res.redirect("back");
    } else {
      cart = founduser.cart.products.sort(function (a, b) {
        var nameA = a.title.toUpperCase();
        var nameB = b.title.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      console.log(cart);
      res.render("cart", { products: cart,total : founduser.cart.total });
    }
  });
});

app.post("/cart/:id",isLoggedIn, function (req, res) {
  User.findById(req.user._id, function (err, founduser) {
    if (err) {
      console.log(err);
      return res.redirect("back");
    } else {
      Product.findById(req.params.id, function (err, foundProduct) {
        if (err) {
          console.log(err);
          return res.redirect("back");
        } else {
          if(founduser.cart.products.length == 0 ){
            founduser.cart.total = foundProduct.cost;
          } else {
            founduser.cart.total = founduser.cart.total + foundProduct.cost;            
          }
          founduser.cart.products.push(foundProduct);
          console.log(foundProduct.cost);
          console.log(founduser.cart.total);
          founduser.save();
          console.log(founduser);
          req.flash("success",foundProduct.title + " added to cart.")
          return res.redirect("/store#" + foundProduct.category);
        }
      });
    }
  });
});

app.delete("/cart/:id", isLoggedIn,function (req, res) {
  User.findById(req.user._id, function (err, founduser) {
    if (err) {
      console.log(err);
      return res.redirect("back");
    } else {
      Product.findById(req.params.id, function (err, foundProduct) {
        if (err) {
          console.log(err);
          return res.redirect("back");
        } else {
          var index = -1;
          console.log(foundProduct._id);
          for (var i = 0; i < founduser.cart.products.length; i++) {
            if (
              founduser.cart.products[i]._id.toString() == foundProduct._id.toString()
            ) {
              index = i;
            }
          }
          console.log(index);
          if (index !== -1) {
            founduser.cart.total = founduser.cart.total - founduser.cart.products[index].cost;
            founduser.cart.products.splice(index, 1);
          }
          founduser.save();
          console.log(founduser.cart);
          req.flash("success",foundProduct.title + " removed from cart.")
          return res.redirect("/cart");
        }
      });
    }
  });
});

app.get("/order",isLoggedIn,function(req,res){
      cart = req.user.cart.products.sort(function (a, b) {
        var nameA = a.title.toUpperCase();
        var nameB = b.title.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      res.render("order", { products: cart,total : req.user.cart.total });
});


app.post('/order',isLoggedIn,function(req,res){
 var new_order = new Order({
   items : req.user.cart.products,
   total : req.user.cart.total,
   user : {
     id : req.user._id,
     email : req.user.username,
     name : req.body.name,
     address : req.body.address,
   }
  });
  req.user.orders.push(new_order);
  req.user.cart.total = 0;
  req.user.cart.products = [];
  req.user.save();
  res.render("orderplaced",{order : new_order})
});

//-----------------------------AUTH--------------------------------------

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post(
  "/login",function(req,res,next) {
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/login", 
      failureFlash: true,
      succssFlash: true
    }, function(err, user) {
      if (err) {
          return next(err);
      }
      if (!user) {
          req.flash("error", "Password or Email does not match");
          return res.redirect('/login');
      }
      req.logIn(user, function(err) {
          if (err) {
              return next(err);
          }
          req.flash("success", "Welcome back " + user.name);
          return res.redirect('/');
          
      });
    })(req, res, next)
  }
);

app.post("/signup", function (req, res) {
  console.log(req.body);
  var newUser = new User({
    username: req.body.username,
    name: req.body.name,
    phone: req.body.phone,
  });
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      if(err.message == "A user with the given username is already registered") {
        req.flash("error", "A user with the given Email Id is already registered")
        return res.redirect("/signup");
      }else{
        req.flash("error", "A user with the given Phone No. is already registered")
        return res.redirect("/signup");

      }
    } else {
      passport.authenticate("local")(req, res, function () {
        req.flash("success", "Welcome to Aid " + user.name)
        res.redirect("/");
      });
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  req.flash("success", "Logged you out!");
  res.redirect("/");
});

//----------------------END OF ROUTES --------------------------------------

app.get("*", function (req, res) {
  res.render("404");
});



//===================== MIDDLEWARE =================//
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  else {
      req.flash("error", 'You need to be logged in to do that.');
      res.redirect('/login');
  }
};

//--------------------------------- RUN -----------------------------------
app.listen(process.env.PORT || 5000, process.env.IP, function (req, res) {
  console.log("rollin");
});
