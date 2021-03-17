var mongoose =require('mongoose');

var productSchema=new mongoose.Schema({
    title:String,
    category: String,
    image: String,
    cost:Number,
})

module.exports= mongoose.model("Product",productSchema);