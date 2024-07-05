const express=require('express');
const cors=require('cors');
const User=require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('./models/Post')
const cookieParser = require('cookie-parser');
const { default: mongoose } = require('mongoose');
const app=express();
const multer = require('multer');
const uploadMiddleware = multer({dest : 'uploads'})
const fs = require('fs');
const { log } = require('console');
const PORT = process.env.PORT || 4000;

const salt = bcrypt.genSaltSync(10);
const secret = 'dfveet437g34bt5hb5t93ug34l434bt'

// app.use(cors({credentials:true}));
// var cors = require(cors());

// app.use(cors());
// app.options('*',cors());
// var allowCrossDomain = function(req,res,next) {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
//   res.header('Access-Control-Allow-Headers', 'Content-Type');
//   next();  
// }
// app.use(allowCrossDomain);

app.use(cors({
  origin: 'http://localhost:3000',  // Change this to your React app's URL
  credentials: true,  // Allow cookies to be sent
}));


app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname+'/uploads'))

mongoose.connect('mongodb+srv://jhamayank707:admin@cluster0.5bkiog7.mongodb.net/?retryWrites=true&w=majority')
.then(console.log('success'))
.catch((e)=>{
    console.log(e);
})

app.post('/register',async (req,res)=>{
    const {username,password}=req.body;
    try{
        const userDoc=await User.create({username,password:bcrypt.hashSync(password,salt)})
        res.json(userDoc)
    }
    catch(e){
        res.status(400).json(e);
    }
})

app.post('/login',async (req,res)=>{
    const {username,password}=req.body;
    try{
        const userDoc=await User.findOne({username})
        // console.log(userDoc);
        const passOk=bcrypt.compareSync(password,userDoc.password)
        // console.log(passOk);
        if(passOk){
          jwt.sign({username,id: userDoc._id},secret,{},(err,token)=>{
            if(err) throw err;
            // console.log('token---',token);
            // res.cookie('token',token).json({
            //     id:userDoc._id,
            //     username, 
            // });
            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'None',  // Use 'Strict' or 'None' depending on your setup
                secure: false     // Use true for HTTPS, false for HTTP (development)
            }).json({
                id: userDoc._id,
                username,
            });
            })
        }else{
            res.status(400).json('Wrong Credentials')
        }
        
    }
    catch(e){
        res.status(400).json(e);
    }
})

app.get('/profile',(req,res)=>{
    const {token} = req.cookies;
    if(token){
        jwt.verify(token,secret,{},(err,info)=>{
            if(err) throw err;
            // console.log(info);
            res.json(info);
        })
    }
    
})  

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    // res.json(newPath)
    fs.renameSync(path, newPath);
  
    const {token} = req.cookies;
    // console.log('check token---',token);
    if(token){
      jwt.verify(token, secret, {}, async (err,info) => {
        if (err) throw err;
        console.log(info);
        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
          title,
          summary,
          content,
          cover:newPath,
          author:info.id,
        });
        
        res.json(postDoc);
      });
    }
     else res.status(400).json('Couldnt create post');
  
  });

  app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
    let newPath = null;
    if (req.file) {
      const {originalname,path} = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = path+'.'+ext;
      fs.renameSync(path, newPath);
    }
    const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});

  app.get('/post',async (req,res)=>{
    //  console.log(Post.find().populate('author'));
    // console.log(Post.find().populate('author',['username']));
    res.json(await Post.find().populate('author',['username']).sort({createdAt: -1}).limit(20))
  })

  app.get('/post/:id', async (req, res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
  })
  

app.post('/logout',async (req,res)=>{
    res.cookie('token','').json('ok') 
})
  
app.listen(PORT,()=>{
    console.log("App is listening at port 4000")
}) 

