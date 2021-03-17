var mongoose =require('mongoose');


var blogSchema=new mongoose.Schema({
    body:String,
    title:String,
    image:{
        url: String,
        filename: String
    },
    authorname:String,
    authorid:String,
    date:{type:Date, default:Date.now},
    comments:[],
})


module.exports= mongoose.model("Blog",blogSchema);