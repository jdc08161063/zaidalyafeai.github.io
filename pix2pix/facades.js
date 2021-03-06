/*
variables
*/
var model;
var canvas;
var classNames = [];
var canvas;
var coords = [];
var mousePressed = false;

/*
color pallette click events
*/
$(document).on("click","td", function(e){
    //get the color 
    const color = e.target.style.backgroundColor;
    //set the color 
    canvas.freeDrawingBrush.color = color;
});

/*
prepare the drawing canvas 
*/
function prepareCanvas() {
    canvas = window._canvas = new fabric.Canvas('canvas');
    canvas.backgroundColor = '#ffffff';
    canvas.isDrawingMode = 1;
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width = 1;
    canvas.renderAll();
    //setup listeners 
    canvas.observe('mouse:down', function(e) { mousedown(e); });
    canvas.observe('mouse:move', function(e) { mousemove(e); });
    canvas.observe('mouse:up', function(e) { mouseup(e); });

}

var started = false;
var x = 0;
var y = 0;

/* Mousedown */
function mousedown(e) {
    var mouse = canvas.getPointer(e.memo.e);
    started = true;
    x = mouse.x;
    y = mouse.y;

    var square = new fabric.Rect({ 
        width: 0, 
        height: 0, 
        left: x, 
        top: y, 
        fill: '#000'
    });

    canvas.add(square); 
    canvas.renderAll();
    canvas.setActiveObject(square); 

}


/* Mousemove */
function mousemove(e) {
    if(!started) {
        return false;
    }

    var mouse = canvas.getPointer(e.memo.e);

    var w = Math.abs(mouse.x - x),
    h = Math.abs(mouse.y - y);

    if (!w || !h) {
        return false;
    }

    var square = canvas.getActiveObject(); 
    square.set('width', w).set('height', h);
    canvas.renderAll(); 
}

/* Mouseup */
function mouseup(e) {
    if(started) {
        started = false;
    }

    var square = canvas.getActiveObject();

    canvas.add(square); 
    canvas.renderAll();
 } 

/*
get the current image data 
*/
function getImageData() {
    //get image data according to dpi 
    const dpi = window.devicePixelRatio    
    const x = (mbb.min.x ) * dpi 
    const y = (mbb.min.y ) * dpi
    const w = (mbb.max.x - mbb.min.x ) * dpi 
    const h = (mbb.max.y - mbb.min.y ) * dpi 
    const imgData = canvas.contextContainer.getImageData(x, y, w, h)
    return imgData
}

/*
get the prediction 
*/
function getFrame() {
    //get the image data from the canvas 
    const imgData = getImageData();

    //get the prediction 
    const gImg = model.predict(preprocess(imgData))

    //draw on canvas 
    const gCanvas = document.getElementById('gCanvas');
    const postImg = postprocess(gImg)
    tf.toPixels(postImg, gCanvas)
}

/*
preprocess the data
*/
function preprocess(imgData) {
    return tf.tidy(() => {
        //convert to a tensor 
        let tensor = tf.fromPixels(imgData).toFloat()
        //resize 
        let resized = tf.image.resizeBilinear(tensor, [256, 256])
                
        //normalize 
        const offset = tf.scalar(127.5);
        const normalized = resized.div(offset).sub(tf.scalar(1.0));

        //We add a dimension to get a batch shape 
        const batched = normalized.expandDims(0)
        
        return batched
    })
}

/*
post process 
*/
function postprocess(tensor){
     return tf.tidy(() => {
        //normalization factor  
        const scale = tf.scalar(0.5);
        
        //unnormalize and sqeeze 
        const squeezed = tensor.squeeze().mul(scale).add(scale)

        //resize to canvas size 
        let resized = tf.image.resizeBilinear(squeezed, [300, 300])
        return resized
    })
}

/*
load the model
*/
async function start() {
    //load the model 
    model = await tf.loadModel('shoes/model.json')
    
    //status 
    document.getElementById('status').innerHTML = 'Model Loaded';
    
    //warm up 
    model.predict(tf.zeros([1, 256, 256, 3]))
    
    //allow drawing on the canvas 
    allowDrawing()
}

/*
allow drawing on canvas
*/
function allowDrawing() {
    //allow draing 
    canvas.isDrawingMode = 1;
    
    //alow UI 
    $('button').prop('disabled', false);
    
    //setup slider 
    var slider = document.getElementById('myRange');
    slider.oninput = function() {
        canvas.freeDrawingBrush.width = this.value;
    };
}

/*
clear the canvas 
*/
function erase() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
}

//start the script 
 $(window).on('load', function(){
    prepareCanvas();
    start();
 });
