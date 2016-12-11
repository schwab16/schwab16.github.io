// ********************************************************************************************* // 
// Isaac Schwab
// schw1643@umn.edu
// ********************************************************************************************* //
// Variable Declarations
// ********************************************************************************************* //
// WebGL Variables
var canvas;
var gl;
var programId;
var program;
// ********************************************************************************************* //
var startupDraw = 1;
var startupView = 1;
// 2D Drawing Variables
var positions;
var moveMode = 0; // boolean if points are being moved
var pointX; // Currently selected point x position
var pointY; // Currently selected point y position
var colorLocation;
var highlightPoint = [];
var axisRotation = []; 
var dottedLinePoints = [];
var pointsArray = [];
var bezierM = mat4(-1,  3, -3, 1,
                3, -6,  3, 0,
               -3,  3,  0, 0,
                1,  0,  0, 0);

var subdivisions = 128.0;
var bezierPos = [];
var bezierPos2 = [];
// ********************************************************************************************* //
// 3D Viewing Variables
var pts_length;
var posSteps = [];
var angles = 32;
var steps = 64;
var continueRender = 1;
var dragMode = 0;
var clickX;
var clickY;
var changeLight = 0;
// ********************************************************************************************* //
// 3D variables for bulding the object and the attributes for the shaders
var numCurves = 2;

var normalInput = [];
var faceNormals = [];
var vertexNormals = [];
var texCoordsArray = [];
var vertices;
var texCoord = [
    vec2(0.0, 0.0),
    vec2(0.0, 0.5),
    vec2(0.5, 0.0),
    vec2(0.5, 0.5)
];

// ********************************************************************************************* //
// Light variables
// Defined as default as a shiny red material
var lightPosition;
var lightAmbient = vec4(0.2, 0.0, 0.0, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 0.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.0, 0.0, 1.0 );
var materialSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
var materialShininess = 100.0;

var ambientColor, diffuseColor, specularColor;

// Viewing matrices for the shaders
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

// The current view matrix
var viewMatrix;

// The current rotation matrix produced as the result of cumulative mouse drags.
// I chose to implement the effect of mouse dragging as "rotating the object."
// It would also be acceptable to implement it as "moving the camera."
var rotationMatrix;

// ********************************************************************************************* //
// On Load Function
// ********************************************************************************************* //
// Initializations for starup and setting up the gl variables
window.onload = function() {
   
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
     
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
    
    //inital point position for the 2D drawing mode
    positions = [
      3*canvas.width/4, 25,
      3*canvas.width/4, canvas.height/6,
      3*canvas.width/4, 2*canvas.height/6,
      3*canvas.width/4, canvas.height/2,
      3*canvas.width/4, 4*canvas.height/6,
      3*canvas.width/4, 5*canvas.height/6,
      3*canvas.width/4, canvas.height-25,
    ];

    //initialize the rotation axis points
    for(i = 0; i < 50; i= i+2)
    {
        axisRotation[i] = canvas.width/2;
        axisRotation[i+1] = (i+1)*canvas.height/50;
    }

    //Start the setup for the Draw Mode
    setupDraw(); 
};

// ********************************************************************************************* //
// 3D Viewing Section
// ********************************************************************************************* //
// Sets the screen up for endering the 3D view of the object
function setupView() {
    startupDraw = 1;
    continueRender = 1;
    // Find the canvas on the page
    canvas = document.getElementById("gl-canvas");
    
    // Initialize a WebGL context
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }
    
    // Remove draw event listeners from 2d drawing mode
    canvas.removeEventListener("mousedown", checkPoint, false);
    canvas.removeEventListener("mousemove", movePoint, false);
    canvas.removeEventListener("mouseup", endMove, false);

    // Setup HTML elements for the dropdown menu
    document.getElementById("demo").innerHTML = "View Mode";
    document.getElementById("viewMenu").style.display = "block";
    document.getElementById("drawMenu").style.display = "none";

    // Load default shaders that do not use texture
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
    gl.enable(gl.DEPTH_TEST);
    
    // Set up events for the HTML controls
    initControlEvents();

    // Setup mouse and keyboard input
    initWindowEvents();
    
    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);


    // Send light info to shader
    // Set default light position
    lightPosition = vec4(1.0, 1.0, 1.0, 1.0 );
    updateLights();

    draw();
}

// Handles most of the setup for the webgl attributes and the buffers
function draw() {
    // Builds the actual object based off the control points from the 2D drawing mode
    initDrawPoints(cntrlPnts);
    buildSurfaceOfRevolution(cntrlPnts);
    
        
    // Associate the shader for normals of the vertices
    var verticesNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.DYNAMIC_DRAW);

    var vNormal = gl.getAttribLocation(programId, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    console.log("push normals");


    // Associate the shader variable for position of the vertices
    var triangleBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBufferId );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);
    
    var vPosition = gl.getAttribLocation(programId, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    console.log("push vertices");

    
    // Associate the shader variable for the texture coordinates of the vertices
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( programId, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );
    console.log("push normals");


    // Initialize the view and rotation matrices
    findShaderVariables();
    viewMatrix = lookAt(vec3(0,2,3), vec3(0,0,0), vec3(0,1,0));
    rotationMatrix = mult(rotate(180, vec3(1,0,0)), mat4(1));
    
    updateModelView(mult(viewMatrix, rotationMatrix));

    updateProjection(perspective(getFOV(), 1, 0.01, 100));

    // Start continuous rendering
    render();
};


// Render the scene
function render() {
    if(continueRender)
    {
        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Draw the triangle strips
        var count = vertices.length;
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, count);
        requestAnimFrame(render);
    } 
}

// ********************************************************************************************* //
// Build Object position, normal and texture vertices
// ********************************************************************************************* //
var cntrlPnts = [];

function initDrawPoints(theCntrlPnts) {
    var numControlPoints = numCurves * 3 + 1;
    var len = positions.length;
    var j = 0;
    for(i = 0; i < len; i+=2)
    {
        // Gets the control points from the 2D drawing program
        var adjX = positions[i] - canvas.width/2;
        var adjY = positions[i+1] - canvas.height/2;
        var temp =  vec4(adjX/canvas.width, -1*adjY/canvas.height, 0.0, 1);
        theCntrlPnts[j] = temp;
        j++;
    }
}


function getTVector(vt)
{
    // Compute value of each basis function
    var mt = 1.0 - vt;
    return vec4(mt * mt * mt, 3 * vt * mt * mt, 3 * vt * vt * mt, vt * vt * vt);
}

function dotProduct(pnt1, pnt2, pnt3, pnt4, tVal)
{
    // Take dot product between each basis function value and the x, y, and z values
    // of the control points
    return vec3(pnt1[0]*tVal[0] + pnt2[0]*tVal[1] + pnt3[0]*tVal[2] + pnt4[0]*tVal[3],
                pnt1[1]*tVal[0] + pnt2[1]*tVal[1] + pnt3[1]*tVal[2] + pnt4[1]*tVal[3],
                pnt1[2]*tVal[0] + pnt2[2]*tVal[1] + pnt3[2]*tVal[2] + pnt4[2]*tVal[3]);
}

// Generate the position vertices
function buildSurfaceOfRevolution(controlPoints)
{
    console.log("build surface");
    var dt = 1.0 / steps;
    var da = 360.0 / (angles);
    
    vertices = [];
    
    var p = 0;
    for (var i = 0; i < numCurves; i++)
    {
        var bp1 = controlPoints[i * 3 + 0];
        var bp2 = controlPoints[i * 3 + 1];
        var bp3 = controlPoints[i * 3 + 2];
        var bp4 = controlPoints[i * 3 + 3];
        
        for (var t = 0; t < steps; t++) {
            var p1 = dotProduct(bp1, bp2, bp3, bp4, getTVector(t * dt));
            var p2 = dotProduct(bp1, bp2, bp3, bp4, getTVector((t + 1) * dt));
            
            var savedP = p;
            for (var a = 0; a < angles; a++) {
                vertices[p++] = vec3(Math.cos(a * da * Math.PI / 180.0) * p1[0], p1[1],
                                     Math.sin(a * da * Math.PI / 180.0) * p1[0]);
                
                vertices[p++] = vec3(Math.cos(a * da * Math.PI / 180.0) * p2[0], p2[1],
                                     Math.sin(a * da * Math.PI / 180.0) * p2[0]);
            }
            vertices[p++] = vertices[savedP];
            vertices[p++] = vertices[savedP + 1];
        }
    }
    generateNormals(vertices);
    generateTextureCoord(vertices);
}

// Generate the texture coordinates for the vertices
function generateTextureCoord(vertices) {
    texCoordsArray = [];
    var i;
    for(i = 0; i < vertices.length; i+=4) 
    {
        texCoordsArray[i] = texCoord[0];
        texCoordsArray[i+1] = texCoord[1];
        texCoordsArray[i+2] = texCoord[2];
        texCoordsArray[i+3] = texCoord[3];
    }
}

// Generate the normals for the vertices
function generateNormals(vertices) {
    vertexNormals = [];
    var p = 0;
    var t1, t2, t3, norm;
    for (var i = 0; i < numCurves; i++)
    {     
        for (var t = 0; t < steps; t++) {
            var savedP = p;
            for (var a = 0; a < angles; a++) {
                t1 = vertices[p];
                t2 = vertices[p+1];
                t3 = vertices[p+2];
                var v1 = subtract(t2, t1);
                var v2 = subtract(t3, t1);
                norm = normalize(cross(v1,v2));
                vertexNormals[p++] = norm;
                vertexNormals[p++] = norm;
            }
            vertexNormals[p++] = vertexNormals[savedP];
            vertexNormals[p++] = vertexNormals[savedP+1];
        }
    }
}


// ********************************************************************************************* //
// Helper Functions for Updating Shader Variables and Viewing Matrices
// ********************************************************************************************* //
// The locations of the required GLSL uniform variables.
var locations = {};

// Looks up the locations of uniform variables once.
function findShaderVariables() {
    locations.modelView = gl.getUniformLocation(programId, "modelViewMatrix");
    locations.projection = gl.getUniformLocation(programId, "projectionMatrix");
    locations.nomralLocation = gl.getUniformLocation( programId, "normalMatrix" );
}

// Pass an updated model-view matrix to the graphics card.
function updateModelView(modelView) {
    gl.uniformMatrix4fv(locations.modelView, false, flatten(modelView));
    gl.uniformMatrix4fv(locations.normalLocation, false, flatten(modelView));
}

// Pass an updated projection matrix to the graphics card.
function updateProjection(projection) {
    gl.uniformMatrix4fv(locations.projection, false, flatten(projection));
}


// ********************************************************************************************* //
// Lighting and Material Setup and Functions
// ********************************************************************************************* //
// Setup for the texture
function setTexture() {
    programId = initShaders(gl, "vertex-shader", "tex-fragment-shader");
    gl.useProgram(programId);
    var image = document.getElementById("tile-img");
    var texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, 
         gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    // gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
    //                   gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    
    gl.uniform1i(gl.getUniformLocation(programId, "texture"), 0);

    // Light parameters that look best for the choosen texture
    lightAmbient = vec4(0.2, 0.2, 0.0, 1.0 );
    lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    lightSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );

    materialAmbient = vec4( 0.35, 0.30, 0.25, 1.0 );
    materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    materialSpecular = vec4( 0.8, 0.8, 0.8, 1.0 );
    materialShininess = 100.0;

    // Texture looks best with these angle and step parameters
    angles = 16;
    steps = 8;

    // Send the new light info to the shader
    updateLights();
    draw();
}

// Sets the light parameters to values that appear like a yellow plastic
function setPlastic() {
    // Use the shader that does't render the texture
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
    angles = 32;
    steps = 64;
    lightAmbient = vec4(0.2, 0.2, 0.0, 1.0 );
    lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

    materialAmbient = vec4( 1.0, 1.0, 0.0, 1.0 );
    materialDiffuse = vec4( 1.0, 1.0, 0.0, 1.0 );
    materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
    materialShininess = 60.0;
    updateLights();
    draw();
}

// Sets the light parameters to values that appera like a brass metal
function setBrass() {
    // Use the shader that does't render the texture
    programId = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(programId);
    angles = 32;
    steps = 64;
    lightAmbient = vec4(0.3, 0.3, 0.0, 1.0 );
    lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

    materialAmbient = vec4( 0.68, 0.40, 0.0, 1.0 );
    materialDiffuse = vec4( 0.8, 0.6, 0.0, 1.0 );
    materialSpecular = vec4( 0.68, 0.4, 0.0, 1.0 );
    materialShininess = 40.0;
    updateLights();
    draw();
}

// Update the light attributes that are sent to the shader
function updateLights() {
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv( gl.getUniformLocation(programId, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(programId, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(programId, 
       "specularProduct"),flatten(specularProduct) );   
    gl.uniform4fv( gl.getUniformLocation(programId, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(programId, 
       "shininess"),materialShininess );
}


// ********************************************************************************************* //
// Screen Controls and Event Handling Functions
// ********************************************************************************************* //
// Binds "on-change" events for the controls on the web page
function initControlEvents() {    
    // Event handler for the FOV control
    document.getElementById("fov").onchange =
        function(e) {
            updateProjection(perspective(getFOV(), 1, 0.01, 100));
        };
}

// Function for querying the current field of view
function getFOV() {
    return parseFloat(document.getElementById("fov").value);
}

// Sets up keyboard and mouse events
function initWindowEvents() {

    // Affects how much the camera moves when the mouse is dragged.
    var sensitivity = 1;

    // Additional rotation caused by an active drag.
    var newRotationMatrix;
    
    // Whether or not the mouse button is currently being held down for a drag.
    var mousePressed = false;
    
    // The place where a mouse drag was started.
    var startX, startY;

    canvas.onmousedown = function(e) {
        // A mouse drag started.
        mousePressed = true;
        // Check if the shift key is being pressed when the mouse is being pushed down
        if(e.shiftKey) {
            changeLight = 1;        
        }
        // Remember where the mouse drag started.
        startX = e.clientX;
        startY = e.clientY;
    }

    canvas.onmousemove = function(e) {
        if (mousePressed) {
            // Handle a mouse drag by constructing an axis-angle rotation matrix
            var axis = vec3(e.clientY - startY, e.clientX - startX, 0.0);
            // Handles the amount to move the light when the user holds down shift
            var changeX = (e.clientX - startX)/100;
            var changeY = (e.clientY - startY)/100;
            var angle = length(axis) * sensitivity;
            if (angle > 0.0) {
                if(changeLight) // Check if shift was pressed when the mouse was clicked
                {
                    if(e.shiftKey) // Check if the shift key is still pressed
                    {
                        lightPosition = add(lightPosition,vec4(changeX, changeY, 0, 0));
                        // Bounds on the light movement. After +- 100 the difference is irrelavant
                        if(lightPosition[0] > 100)
                        {
                            lightPosition[0] = 100;
                        }
                        if(lightPosition[0] < -100)
                        {
                            lightPosition[0] = -100;
                        }
                        if(lightPosition[1] > 100)
                        {
                            lightPosition[1] = 100;
                        }
                        if(lightPosition[1] < -100)
                        {
                            lightPosition[1] = -100;
                        }
                        updateLights();
                        render();
                    }
                    
                }
                else // The shift key is not pressed so rotate the camera
                {
                    // Update the temporary rotation matrix
                    newRotationMatrix = mult(rotate(angle, axis), rotationMatrix);
                    // Update the model-view matrix.
                    updateModelView(mult(viewMatrix, newRotationMatrix));
                }
            }
        }
    }

    window.onmouseup = function(e) {
        // A mouse drag ended.
        mousePressed = false;
        if (newRotationMatrix) {
            // "Lock" the temporary rotation as the current rotation matrix.
            rotationMatrix = newRotationMatrix;
        }
        newRotationMatrix = null;
    }
    
    var speed = 0.1; // Affects how fast the camera pans and "zooms"
    window.onkeydown = function(e) {
        if (e.keyCode === 190) { // '>' key
            // "Zoom" in
            viewMatrix = mult(translate(0,0,speed), viewMatrix);
        }
        else if (e.keyCode === 188) { // '<' key
            // "Zoom" out
            viewMatrix = mult(translate(0,0,-speed), viewMatrix);
        }
        else if (e.keyCode === 37) { // Left key
            // Pan left
            viewMatrix = mult(translate(speed,0,0), viewMatrix);
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault(); 
        }
        else if (e.keyCode === 38) { // Up key
            // Pan up
            viewMatrix = mult(translate(0,-speed,0), viewMatrix);
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 39) { // Right key
            // Pan right
            viewMatrix = mult(translate(-speed,0,0), viewMatrix);
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 40) { // Down key
            // Pan down 
            viewMatrix = mult(translate(0,speed,0), viewMatrix);
            // Prevent the page from scrolling, which is the default behavior for the arrow keys
            e.preventDefault();
        }
        else if (e.keyCode === 87) { // move light up
            // Pan down 
            lightPosition = add(lightPosition,vec4(0, 0.5, 0, 0));
            updateLights();
            render();
        } 
        else if (e.keyCode === 83) { // move light down
            // Pan down 
            lightPosition = add(lightPosition,vec4(0, -0.5, 0, 0));
            updateLights();
            render();
        }
        else if (e.keyCode === 65) { // move light left
            // Pan down 
            lightPosition = add(lightPosition,vec4(0.5, 0, 0, 0));
            updateLights();
            render();
        }
        else if (e.keyCode === 68) { // move light right
            // Pan down 
            lightPosition = add(lightPosition,vec4(-0.5, 0, 0, 0));
            updateLights();
            render();
        }
        // Update the model-view matrix and render.
        updateModelView(mult(viewMatrix, rotationMatrix));
        continueRender = 1;
        render();
    }

    window.onkeyup = function(e) {
        if(e.keyCode === 16)
        {
            changeLight = 0;
        }
    }
}


// ********************************************************************************************* //
// 2D Draw Mode
// ********************************************************************************************* //
// Setup HTML elements, web gl parameters and event listners
function setupDraw() {
    // Stop the 3D view from rendering
    continueRender = 0;
    //Check to see if Draw setup has already been run
    if(startupDraw == 1)
    {
        // Check if View mode has been run, if it has then we remove View Mode's listeners
        if(startupView == 0)
        {

        }
        canvas.onmousemove = null;
        canvas.onmousedown = null;
        window.onmouseup = null;

        //setup click and drag listeners
        canvas.addEventListener("mousedown", checkPoint, false);
        canvas.addEventListener("mousemove", movePoint, false);
        canvas.addEventListener("mouseup", endMove, false);

        document.getElementById("demo").innerHTML = "Draw Mode";

        // This will enable the correct menu for draw mode
        document.getElementById("drawMenu").style.display = "block";
        document.getElementById("viewMenu").style.display = "none";
        gl.enable(gl.DEPTH_TEST);
    
        // Load shaders
        programId = initShaders(gl, "2d-vertex-shader", "2d-fragment-shader");
        
        // ######Create vertex buffer objects --- ADD CODE HERE #######
        var positionAttributeLocation = gl.getAttribLocation(programId, "a_position");
        var resolutionUniformLocation = gl.getUniformLocation(programId, "u_resolution");
        colorLocation = gl.getUniformLocation(programId, "u_color");
        
        //setup buffer for control points line and bezier curve
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        //tell atribute how to get data out of it, first turn the attribute on
        gl.enableVertexAttribArray(positionAttributeLocation);
        //specify how to pull the data out
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            positionAttributeLocation, size, type, normalize, stride, offset)


        gl.useProgram(programId);
        // set the resolution so we use pixels instead of default 0 to 1
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        // Ensure OpenGL viewport is resized to match canvas dimensions
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        gl.lineWidth(1);

        // Set screen clear color to R, G, B, alpha; where 0.0 is 0% and 1.0 is 100%
        gl.clearColor(0.8, 0.8, 0.8, 1.0);
        
        // Enable color; required for clearing the screen
        gl.clear(gl.COLOR_BUFFER_BIT);
        startupDraw = 0;
        drawMethod();
    }
    else {
        drawMethod();
    }
} // End of setupDraw()

// Handles drawing the 2D elements to the screen
function drawMethod() {
    startupView = 1;
    
    // gl draw parameters
    var count;
    var primitiveType;
    var offset = 0;

    // Clear out the position arrays that will be changed by generate functions
    bezierPos = [];
    bezierPos2 = [];
    bezier3dPos = [];
    bezier3dPos2 = [];
    ans = [];
    ans2 = [];
    
    // Clear out the viewport with solid black color
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //draws the dotted horizontal axis lines
    var primitiveType = gl.LINES;
    var count = axisRotation.length/2;
    gl.lineWidth(2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axisRotation), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, 0, 0, 0, 1);
    gl.drawArrays(primitiveType, offset, count);

    //If a point is being moved then draw the current highlighted point
    if(moveMode == 1)
    {
        count = 1;
        primitiveType = gl.POINTS;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(highlightPoint), gl.STATIC_DRAW);
        gl.uniform4f(colorLocation, 1, 0, 1, 1);
        gl.drawArrays(primitiveType, offset, count);
    }

    //draws the control points
    primitiveType = gl.POINTS;
    count = positions.length/2;
    gl.uniform4f(colorLocation, 0.47, 0.47, 0.47, 1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.drawArrays(primitiveType, offset, count);

    //draws the dotted lines
    generateDottedLine();
    gl.lineWidth(1);
    primitiveType = gl.LINES;
    count = dottedLinePoints.length/2;
    gl.uniform4f(colorLocation, 0, 0, 0, 1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dottedLinePoints), gl.STATIC_DRAW);
    gl.drawArrays(primitiveType, offset, count);

    //generate and draw the bezier curve everytime the control points are moved
    generateBezierCurve();
    gl.lineWidth(3);
    gl.uniform4f(colorLocation, 1, 0, 0, 1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bezierPos), gl.STATIC_DRAW);
    count = subdivisions+1;
    primitiveType = gl.LINE_STRIP;
    gl.drawArrays(primitiveType, offset, count);

    //draw the 2nd bezier curve that we just generated
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bezierPos2), gl.STATIC_DRAW);
    count = subdivisions+1;
    primitiveType = gl.LINE_STRIP;
    gl.drawArrays(primitiveType, offset, count);
} // End of drawMethod()


// ********************************************************************************************* //
// 2D Point Generation Functions
// ********************************************************************************************* //
//generates the position points for the bezier curves
function generateBezierCurve() {
    //create the position matrix, from the current position of the control points
    var controlP1 = mat4(positions[0],positions[2],positions[4],positions[6],
                    positions[1],positions[3],positions[5],positions[7],
                    1,1,1,1,
                    1,1,1,1);

    var controlP2 = mat4(positions[6],positions[8],positions[10],positions[12],
                    positions[7],positions[9],positions[11],positions[13],
                    1,1,1,1,
                    1,1,1,1);

    //use the math from class to generate the martix of points
    ans = mult(controlP1,bezierM);
    ans2 = mult(controlP2,bezierM);
    //push the line segments for the number of subdivisions
    for(t = 0; t <= 1; t+=(1/subdivisions))
    {
        //use the parametric equations to generate the correct point
        xt = ans[0][0]*Math.pow(t,3) + ans[0][1]*Math.pow(t,2) + ans[0][2]*t + ans[0][3];
        //Push x-coordinate for 2D drawing
        bezierPos.push(xt);
        yt = ans[1][0]*Math.pow(t,3) + ans[1][1]*Math.pow(t,2) + ans[1][2]*t + ans[1][3];
        //Push y-coordinate for 2D drawing
        bezierPos.push(yt);

        //Handle the 2nd bezier curve
        xt2 = ans2[0][0]*Math.pow(t,3) + ans2[0][1]*Math.pow(t,2) + ans2[0][2]*t + ans2[0][3];
        bezierPos2.push(xt2);
        yt2 = ans2[1][0]*Math.pow(t,3) + ans2[1][1]*Math.pow(t,2) + ans2[1][2]*t + ans2[1][3];
        bezierPos2.push(yt2);
    }
    //hard code in the last point to draw, otherwise the end point won't be connected.
    bezierPos.push(positions[6]);
    bezierPos.push(positions[7]);
    bezierPos2.push(positions[12]);
    bezierPos2.push(positions[13]);  
}

// This function handles creating the dotted lines between the control points
function generateDottedLine() {
    dottedLinePoints = [];
    for(i = 0; i < positions.length; i+=2)
    {
        // get array starting positions and declare variables for incrementing
        var xstart = positions[i];
        var ystart = positions[i+1];
        // ending positions
        var xend = positions[i+2];
        var yend = positions[i+3];
        // variables for steppping calculations
        var x_increment;
        var y_increment
        var x_dif = xend-xstart;
        var y_dif = yend-ystart;
        var stepping_limit = 20;
        dottedLinePoints.push(xstart);
        dottedLinePoints.push(ystart);

        // set stepping intervals by dividing distance by the number of steps needed
        x_increment = x_dif / stepping_limit;
        y_increment = y_dif / stepping_limit;
        // Loop through creating points between the start and end points
        for(j = 0; j <= stepping_limit; j++)
        {
            dottedLinePoints.push(xstart + (j * x_increment));
            dottedLinePoints.push(ystart + (j * y_increment));
        }
        // handle the endpoints
        dottedLinePoints.push(xend);
        dottedLinePoints.push(yend);
    }
}


// ********************************************************************************************* //
// 2D Drawing Event Listener Functions (Mouse Press and Drag Functions)
// ********************************************************************************************* //
// checks the position of the mouse click to see if it is a valid point, if it is then enable
// moveMode and also creates a highlight point to draw to the screen
function checkPoint() {
    // sets the x and y position of the cursor event relative to the canvas
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    // loop through the position array checking if the cursor postion is within 5 pixels of a point
    for(i = 0; i < positions.length; i+=2)
    {
        j = i+1;
        xpos = positions[i];
        ypos = positions[j];
        if((x <= xpos+5 && x >= xpos-5) && (y <= ypos+5 && y >= ypos-5))
        {
            // store the indexes for the x and y position that are now selected
            pointX = i;
            pointY = j;
            moveMode = 1; // enable moveMode
            highlightPoint = [positions[i], positions[j]];
            drawMethod();
        }
    }
}

// moves the current point to the current postion of the mouse
function movePoint(event) {
    if(moveMode == 1)
    {
        // sets the x and y position relative to the drawing canvas
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        // update the current points x and y positions to the new cursor coordinates
        positions[pointX] = x;
        positions[pointY] = y;
        highlightPoint = [positions[pointX], positions[pointY]];
        drawMethod();
    } 
}

//Mouse is realeased, set moveMode to false and redraw the screen
function endMove() {
    moveMode = 0;
    drawMethod();
}




// ********************************************************************************************* //
// Menu Elements and functions
// ********************************************************************************************* //

/* When the user clicks on the button, 
toggle between hiding and showing the dropdown content */
function openViewDropdown() {
    document.getElementById("viewDropdown").classList.toggle("show");
}
function openDrawDropdown() {
    document.getElementById("drawDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

// Setup a listener to get user input for the number of angles
function getAngles() {
    var newAngle = prompt("Enter the number of angles to sweep out the surface:", angles);
    console.log(typeof newAngle);
    newAngle = parseInt(newAngle);
    console.log(typeof newAngle);
    if (newAngle != null && newAngle >= 4) {
        angles = newAngle;
        draw();
    }
}

// Setup a listener to get user input for the number of steps
function getSteps() {
    var newSteps = prompt("Enter the number of steps to sweep out the surface:", steps);
    console.log(typeof newSteps);
    newSteps = parseInt(newSteps);
    console.log(typeof newSteps);
    if (newSteps != null && newSteps >= 4) {
        steps = newSteps;
        draw();
    }
}

// Reload the program
function quitMethod() {
    location.reload();
}

// ********************************************************************************************* //
// End of Program
// ********************************************************************************************* //