const express=require('express');
const bodyp=require('body-parser');
const path=require('path');
const fs=require('fs');
const morgan=require('morgan');
const mongoose=require("mongoose");
const admin=require('./routes/admin.js');
const shop=require('./routes/shop.js');
const auth=require('./routes/auth');
const session=require('express-session');
const helmet=require('helmet');
const compression=require('compression');
const flash=require('connect-flash');
const csrf=require('csurf');
const multer=require('multer');
const User=require('./models/user');
const mongodbstore=require('connect-mongodb-session')(session);
const errorCon=require('./controller/error');
//const mongoConnect=require('./util/database').mongoConnect;
const moncon=`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-dfuqf.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`
const app=express();
const store= new mongodbstore({
  uri:moncon,
  collection:'sessions'
  });
  const acces=fs.createWriteStream(path.join(__dirname,'access.log'),{
    flags:'a'
  });
  app.use(helmet());
  app.use(compression());
  app.use(morgan('combined',{stream:acces}));
const protection= csrf();
const filestorage=multer.diskStorage({
  destination:(req,file,cb) =>{
    cb(null,'images');
  },
  filename:(req,file,cb) =>{
    cb(null,   file.originalname);
  }
});
const filefilter=(req,file,cb)=>{
  if(
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg'
  )
  {
    cb(null,true);
  }
  else{
    cb(null,false );
  }

}
app.set('view engine','ejs');
app.set('views','view');


app.use(bodyp.urlencoded({extended:false}));
app.use(multer({storage:filestorage,fileFilter:filefilter}).single('image'));
app.use(express.static(path.join(__dirname,'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
  secret:'my fuck',
  resave:false,
  saveUninitialized:false,
  store:store
}));
app.use(protection);
app.use(flash());
app.use((req,res,next)=>{
  res.locals.isAuthenticated=req.session.isLoggedIn;
  res.locals.csrfToken=req.csrfToken();
  next(); 
})
app.use((req,res,next)=>{
  //throw new Error('dummy');
       if(!req.session.user)
       {
       return  next();
       }
  User.findById(req.session.user._id).then(user=>{
    if(!user)
    {
      return next();
    }
    req.user=user;
    next();
}).catch(err=>{
  next( new Error(err));
});


});
app.use('/admin',admin);
app.use(shop);
app.use(auth);


//app.use(error.error);
//app.use((req,res,next)=>{
 //   res.status(404).sendFile(path.join(__dirname,'view','404.html'));
// //});
 app.get('/500',errorCon.get500);
app.use((error,req,res,next)=>{
    // res.redirect('/500')
    res.status(500).render('500',{doctitle:'not found',path:'/500',
    isAuthenticated:req.session.isLoggedIn
    });


});
console.log(process.env.NODE_ENV);
mongoose.connect(moncon).then(results=>{
  console.log('connect');
  console.log(process.env.PORT || 3000);

  app.listen(3000);
}).catch(err=>{
  console.log(err);
});