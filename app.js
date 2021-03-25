require("dotenv").config();
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var cookieParser = require("cookie-parser");
var LocalStrategy = require("passport-local");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var async = require("async");
var seedDB = require("./seeds");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
var ejs = require('ejs');
let pdf = require("html-pdf");
let path = require("path");

//-------------- STRIPE SETUP--------------------------------

const multer = require("multer");
const { storage } = require("./cloudinary");
const upload = multer({ storage });


//-------------------MODELS-------------------------
var User = require("./models/user");
var Product = require("./models/product");
var Comment = require("./models/comment");
var Blog = require("./models/blog");
var Order = require("./models/order");

//-------------------NODEMAILER-------------------------

const nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.email,
    pass: process.env.pwd
  }
  
});

function send(mailOptions){
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

//----------------------OTHERS & AUTH ----------------------
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
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
var db= process.env.MONGO_URL.toString();
mongoose
  .connect( db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
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
      console.log('-------------------------------------------');
      console.log(allposts);
      res.render("causes&stories", { stories: allposts });
    }
  }).sort({ date: "desc" })
});

app.get("/aboutus",function(req,res){
  res.render("aboutus");
});

app.get('/profile',isLoggedIn,function(req,res){
  Blog.find({authorid : req.user._id}, function (err, allposts) {
    if (err) {
      console.log(err);
    } else {
      res.render('profile', { stories: allposts })
    }
  })
    .sort({ date: "desc" })
});







//------------------ VOLUNTEER AND DONATE --------------------------

app.post('/submitform/volunteer',function(req,res){
  var email= req.body.email;
  var name= req.body.name;
  var phone= req.body.phone;
  console.log(name)
  console.log(email)
  var text=' We have recieved your volunteer application ! We are so happy to welcome new people to our community .We will be having a small seminar with you within a couple of days to let you know about how things work at AID and how you can contribute to it. We would also be very excited to know more about you and your interests so that we can give a job that suits you best. Untill then HAPPY CHARITY!';
  var mailOptions = {
    from: 'AID',
    to: email,
    subject: 'Application Recieved',
    html:`<h1>Hello ${name} ! </h1>
    <br> 
    <div>${text}</div>
    <div>You will recieve an email on ${email} as well as a call on +91 ${phone} for further communication.</div>
     <br> <small>Best Regards ,</small><b> AID.</b> `,
  };

  send(mailOptions)
  res.render('submitV')
});

app.post("/donate", async function(req,res){

  var DonateObj = {
    email : req.body.email,
    name : req.body.name,
    amount : req.body.amount
  }
  res.render('checkout', {amount : req.body.amount , donateObj : DonateObj });    
});

app.post("/pay" , async (req,res) => {
  const { paymentMethodId, items, currency } = req.body;

  const orderAmount = req.body.amount;

  try {
    // Create new PaymentIntent with a PaymentMethod ID from the client.
    const intent = await stripe.paymentIntents.create({
      amount: orderAmount,
      currency: currency,
      payment_method: paymentMethodId,
      error_on_requires_action: true,
      confirm: true
    });
    const amt = orderAmount/100 ;
    console.log("💰 Payment received! Rs. " + orderAmount/100);
    // The payment is complete and the money has been moved
    // You can add any post-payment code here (e.g. shipping, fulfillment, etc)
    ejs.renderFile(path.join(__dirname, './views/', "certificate.ejs"), {name : req.body.name, amount : orderAmount/100}, (err, data) => {
      if(err){
        console.log(err)
        res.send({error : err});
      }else{
      //   let options = {
      //     "header": {
      //         "height": "10mm"
      //     },
      //     "footer": {
      //         "height": "20mm",
      //     },
      // };
      let options = {
        "header": {
            "height": "20mm"
        },
        "footer": {
            "height": "20mm",
        },
        format: 'A2'
    };

        pdf.create(data, options).toFile("certificate.pdf", function (err, data) {
          if(err){
            console.log(err);
            res.send({error : err});
          }
          else{
            
            console.log('CERTIFICATE');
            var mailOptions = {
              from: 'AID',
              to: req.body.email,
              subject: 'Certificate for Donating to Aid',
              attachments:{ filename: "certificate.pdf", path:'./certificate.pdf' },
              html:`<h1>Hello ${req.body.name} ! </h1>
              <h2>Thank you for your generous Donation of Rs. ${amt} to Aid.</h2>
              <h4> Your smallest contribution could change someone's life ! </h4>
              <div> Stay assured, your money will be used for a good cause. </div>
              <div>We have sent you a Certificate as an attachement with this email as a token of appreciation from our side.</div>
            <br>
             <div>We hope you won't stop here and will further support the good causes of Humanity.</div>
              <div>Happy Charity ! </div> <div> Because even the smallest contribution matters. </div><br> <small>Best Regards ,</small><b> AID.</b> `,
          
            };
            send(mailOptions);
          }
      });
      }
     })

    // Send the client secret to the client to use in the demo
    res.send({ clientSecret: intent.client_secret });
  } catch (e) {
    // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
    // See https://stripe.com/docs/declines/codes for more
    if (e.code === "authentication_required") {
      res.send({
        error:
          "This card requires authentication in order to proceeded. Please use a different card."
      });
    } else {
      res.send({ error: e.message });
    }
  }

})

app.get('/submitform/donate',function(req,res){
  res.render('submitD',{name : req.query.name, email: req.query.email})
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
    }
  });
  Blog.create(blog, function (err, newblog) {
    if (err) {
      console.log(err);
    } else {
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
          founduser.save();
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
          if (index !== -1) {
            founduser.cart.total = founduser.cart.total - founduser.cart.products[index].cost;
            founduser.cart.products.splice(index, 1);
          }
          founduser.save();
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
        var nameB= b.title.toUpperCase();
        if (nameA < nameB) {
          return
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
  var total= req.user.cart.total;
  var products = req.user.cart.products;
  req.user.orders.push(new_order);
  req.user.cart.total = 0;
  req.user.cart.products = [];
  req.user.save()
  
  var d = new Date().toDateString();
  var id =req.user.orders[ req.user.orders.length-1]._id.toString().substring(0,8);
  
  ejs.renderFile(path.join(__dirname, './views/', "template.ejs"), {date:d,id: id,products: products,user:req.user,address: req.body.address }, (err, data) => {
    if (err) {
        console.log(err)
          res.send(err);
    } else {
        let options = {
            "header": {
                "height": "20mm"
            },
            "footer": {
                "height": "20mm",
            },
            format: 'A2'
        };
        pdf.create(data, options).toFile("invoice12.pdf", function (err, data) {
            if (err) {
              console.log(err)
            } else {
                console.log("File created successfully");
                var mailOptions = {
                  from: 'AID',
                  to: req.user.username,
                  subject: 'Order Placed Successfully',
                  attachments:{ filename: "invoice.pdf", path:'./invoice12.pdf' },
                  html:`<h1>Hello ${req.user.name} ! </h1>
                  <br> 
                  <div>Your order with order id ${id} has been placed amounting to Rs ${total}.We'll send a cofirmation when your order ships.</div>
                  <div>We have sent you the billing invoice of your order as an attachement with this email.</div>
                <br>
                <div> Shipping Address : ${req.body.address}</div>
                <br>
                 <div>You will recieve an email on ${req.user.username} as well as a call on +91 ${req.user.phone} for further necessary communication.</div>
                   <div> Thank you for shopping with AID </div> <small> Every penny matters </small><br> <small>Best Regards ,</small><b> AID.</b> `,
              
                };
              
                send(mailOptions)
            }
        });
    }
});
  res.redirect("/orderconfirmed")
});

app.get("/orderconfirmed",isLoggedIn,function(req,res){
  res.render("orderplaced")
});

app.get("/ordercard",isLoggedIn,function(req,res){
  cart = req.user.cart.products.sort(function (a, b) {
    var nameA = a.title.toUpperCase();
    var nameB= b.title.toUpperCase();
    if (nameA < nameB) {
      return
    }
    if (nameA > nameB) {
      return 1;
    }

    // names must be equal
    return 0;
  });
  res.render("ordercard", { products: cart,total : req.user.cart.total });
  });

app.post("/ordercard",isLoggedIn ,async function(req,res){
  var OrderObj = {
    name : req.body.name,
    address : req.body.address
  }
  res.render('checkoutcart',{orderObj : OrderObj});    
});   


app.post("/paycart",  async (req,res) => {
  if (req.isAuthenticated()) {
    console.log("logged")
    const { paymentMethodId, items, currency } = req.body;

    const orderAmount = req.user.cart.total * 100;
  
    try {

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
       var total= req.user.cart.total;
       var products = req.user.cart.products;
       req.user.orders.push(new_order);
       req.user.cart.total = 0;
       req.user.cart.products = [];
       req.user.save()       
       var d = new Date().toDateString();
       var id =req.user.orders[ req.user.orders.length-1]._id.toString().substring(0,8);

      // Create new PaymentIntent with a PaymentMethod ID from the client.
      const intent = await stripe.paymentIntents.create({
        amount: orderAmount,
        currency: currency,
        payment_method: paymentMethodId,
        error_on_requires_action: true,
        confirm: true
      });
  
      console.log("💰 Payment received! Rs. " + orderAmount/100);


       
       ejs.renderFile(path.join(__dirname, './views/', "template.ejs"), {date:d,id: id,products: products,user:req.user,address: req.body.address }, (err, data) => {
         if (err) {
             console.log(err)
               res.send(err);
         } else {
          let options = {
            "header": {
                "height": "20mm"
            },
            "footer": {
                "height": "20mm",
            },
            format: 'A2'
        };
          pdf.create(data, options).toFile("invoice12.pdf", function (err, data) {
                 if (err) {
                   console.log(err)
                 } else {
                     console.log("File created successfully");
                     var mailOptions = {
                       from: 'AID',
                       to: req.user.username,
                       subject: 'Order Placed Successfully',
                       attachments:{ filename: "invoice.pdf", path:'./invoice12.pdf' },
                       html:`<h1>Hello ${req.user.name} ! </h1>
                       <br> 
                       <div>Your order with order id ${id} has been placed amounting to Rs ${total}.We'll send a cofirmation when your order ships.</div>
                       <br>
                       <div> We have also received Rs ${total} from your Credit Card. </div>
                       <br>
                       <div>We have sent you the billing invoice of your order as an attatchement with this email.</div>
                     <br>
                     <div>Shipping Address : ${req.body.address}</div>
                     <br>
                      <div>You will recieve an email on ${req.user.username} as well as a call on +91 ${req.user.phone} for further necessary communication.</div>
                        <div> Thank you for shopping with AID </div> <small> Every penny matters </small><br> <small>Best Regards ,</small><b>AID.</b> `,
                   
                     };
                   
                     send(mailOptions)
                 }
             });
         }
       }); 

     
       res.send({ clientSecret: intent.client_secret });
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
      // See https://stripe.com/docs/declines/codes for more
      if (e.code === "authentication_required") {
        res.send({
          error:
            "This card requires authentication in order to proceeded. Please use a different card."
        });
      } else {
        res.send({ error: e.message });
      }
    }
  
}
else {
    console.log('NOTLOGGEDIN')
    res.send({error : "You need to be logged in first"});
}
})


//-----------------------------AUTH--------------------------------------

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/login",function(req,res,next) {
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