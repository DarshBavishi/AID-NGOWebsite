var mongoose =require('mongoose');

var commentSchema=new mongoose.Schema({
    body:String,
    authorname:String,
    authorid:String,
    date:{type:Date, default:Date.now},
})

module.exports= mongoose.model("Comment",commentSchema);