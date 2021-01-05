let DISPLAY_WIDTH = 1050;
let dividerWidths = [20,20,20,20,20];
let colors = ["#7b5a49", "#9a5a31", "#bf8e65", "#e4ac73", "#f2d2b0"];
let width = 40;
let height = 100;
let originalMat;
let formattedMat;
let hist;
let woodenMat;

let mousedown = false;
let nearestDivider = -1;
let lastPercentage = -1;
let lastTimestamp = + new Date();

let updateProgress = function () {
    for (let i = 0; i < dividerWidths.length; i++){
        width = dividerWidths[i];
        color = colors[i];
        $("#color-bar-" + i).css("background-color", color);
        $("#color-bar-" + i).css("width", width + "%");
    }
};

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

let getCompletePercentage = function(event) {
    let colorDistBar = $("#color-dist");
    let offsetX = colorDistBar.first().offset().left;
    let width = colorDistBar.width();
    let percentage = Math.round(((event.pageX-offsetX)/width)*100);
    return percentage;
};

let updateWidthHeight = function(){
    width = parseInt($("#pixelImageWidth").val());
    height = Math.round(originalMat.rows/originalMat.cols*width);
    $("#pixelImageHeight").val(height);
};

let showImageScaled = function(canvas, mat){
    let scaledMat = new cv.Mat();
    ratio = mat.rows/mat.cols;
    cv.resize(mat, scaledMat, new cv.Size(DISPLAY_WIDTH, Math.round(DISPLAY_WIDTH*ratio)), 0, 0, cv.INTER_NEAREST);
    cv.imshow(canvas, scaledMat);
    scaledMat.delete();
};

let generateHistogram = function(){
    let srcVec = new cv.MatVector();
    srcVec.push_back(formattedMat);
    hist = new cv.Mat();
    let mask = new cv.Mat();
    cv.calcHist(srcVec, [0], mask, hist, [256], [0, 255], false);
    let max = 0;
    for(let i = 0; i < 256; i++){
        let val = hist.data32F[i];
        if (val > max){
            max = val;
        }
    }
    let dst = new cv.Mat(100, 256, cv.CV_8UC4, new cv.Scalar(0,0,0,0));
    // draw histogram
    for (let i = 0; i < 256; i++) {
        let binVal = (hist.data32F[i] / max) * 100;
        let point1 = new cv.Point(i, 100);
        let point2 = new cv.Point(i+1, 100-binVal);
        cv.rectangle(dst, point1, point2, new cv.Scalar(52, 152, 219, 255), cv.FILLED);
    }
    showImageScaled("histogramCanvas", dst);
};

let formatOriginal = function(){
    updateWidthHeight();
    formattedMat = new cv.Mat();
    cv.cvtColor(originalMat, formattedMat, cv.COLOR_RGBA2GRAY);
    cv.resize(formattedMat, formattedMat, new cv.Size(width, height), cv.INTER_AREA);
    showImageScaled("formattedCanvas", formattedMat);
    generateHistogram();
};

let editPixel = function(x, y, r, g, b, src){
    let R = src.data[y * src.cols * src.channels() + x * src.channels()] = r;
    let G = src.data[y * src.cols * src.channels() + x * src.channels() + 1] = g;
    let B = src.data[y * src.cols * src.channels() + x * src.channels() + 2] = b;
};

let woodifyFormatted = function() {
    let currentTimestamp = + new Date();
    let diff = currentTimestamp - lastTimestamp
    if(diff > 1000){
        lastTimestamp = currentTimestamp;
        console.log(diff,currentTimestamp);
        woodenMat = new cv.Mat();
        cv.cvtColor(formattedMat, woodenMat, cv.COLOR_GRAY2RGB);
        let addedDividerWidths = [];
        let previous = 0;
        for (let i = 0; i < 5; i++){
            addedDividerWidths[i] = previous;
            previous += dividerWidths[i];
        }
        for (let x = 0; x < width; x++){
            for(let y = 0; y < height; y++){
                grayscaleValue = (formattedMat.data[y * formattedMat.cols + x]/256)*100;
                let index = -1;
                for (let i = 0; i < 5; i++){
                    if (grayscaleValue >= addedDividerWidths[i] && (i == 4 || grayscaleValue < addedDividerWidths[i+1])){
                        index = i;
                    }
                }
                let rgb = hexToRgb(colors[index]);
                editPixel(x, y, rgb.r, rgb.g, rgb.b, woodenMat);
            }
        }
        showImageScaled("woodenCanvas", woodenMat);
    }
};

$(document).mousemove(function (event) {
    if (mousedown){
        let completePercentage = getCompletePercentage(event);
        if (lastPercentage != completePercentage){
            let offsetDistance = 0;
            for(let i = 0; i < nearestDivider; i++){
                offsetDistance += dividerWidths[i];
            }
            let percentage = completePercentage - offsetDistance;
            if (percentage < 1){
                percentage = 1;
            }
            let oldPercentage = dividerWidths[nearestDivider];
            let percentageDelta = percentage - oldPercentage;
            if(percentageDelta >= dividerWidths[nearestDivider + 1]){
                percentageDelta =  dividerWidths[nearestDivider + 1]-1;
            }
            dividerWidths[nearestDivider] += percentageDelta;
            dividerWidths[nearestDivider + 1] -= percentageDelta;
            lastPercentage = completePercentage;
            updateProgress();
            woodifyFormatted();
        }
    }
});

$("#color-dist-row").mousedown(function (event) {
    let smallestDistance = 100;
    let addedDistance = 0;
    for (let i = 0; i < dividerWidths.length-1; i++){
        addedDistance += dividerWidths[i];
        let currentDistance = Math.abs(getCompletePercentage(event)-addedDistance);
        if (currentDistance < smallestDistance){
            smallestDistance = currentDistance;
            nearestDivider = i;
        }
    }
    updateProgress();
    mousedown = true;
});

$(document).mouseup(function () {
    mousedown = false;
});

$("#fileInput").change(function (e) {
    $("#image").attr("src", URL.createObjectURL(e.target.files[0]));
    $("#nav-link-formatted").removeClass("disabled");
    $("#nav-link-wooden").removeClass("disabled");
});

$("#pixelImageWidth").change(function () {
    if (originalMat != undefined){
        formatOriginal();
        woodifyFormatted();
    }
});

$("#image").load(function (e) {
    originalMat = cv.imread($("#image")[0]);
    formatOriginal();
    woodifyFormatted();
});


updateProgress();