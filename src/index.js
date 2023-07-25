import { pseudoRandom } from './random/random.js';

var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

const ROAD_WIDTH = 25;
const NUM_ROADS  = 7;

// Put the speed to 1 to see how the car is moving, change it back to 15 whenever you need to 
const SPEED_FACTOR = 3;
const CANVAS_HEIGHT = canvas.height;
const CANVAS_WIDTH = canvas.width;
const CANVAS_OFFSET_WIDTH = canvas.width/20;
const CANVAS_OFFSET_HEIGHT = canvas.height/20;
const DEFAULT_FILL = 'red';
const CHANGE_FILL = 'green';
const MOVE_FILL = 'blue';

Number.prototype.between = function(a, b) {
    var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
    return (this > min && this < max) || (this.equals(max) || this.equals(min));
};

Number.prototype.betweenNonInclusive = function(a, b) {
    var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
    return this > min && this < max;
};

Number.prototype.toDeg = function() { 
    return this*180 / Math.PI;
};

Number.prototype.equals = function(other) {
    return Math.abs(this - other) < 0.0001;
};

Number.prototype.customRandom = function() { // Generates random integer between 0 and this
    return Math.floor(Math.random() * this);
};

Array.prototype.last = function(){
    return this[this.length - 1];
};

Array.prototype.custom_push = function(idx, elem) {
    this[idx] ? this[idx].push(elem) : this[idx] = [elem];
};

// Global vars
var roads = [];
var newRoads = [];
var graph = [];
var intersections = new Map();
var intersectionPoints = [];

var lastPosX;
var lastPosY;

var currentRoad;
var refHorizVector;
var rotateAngle;
var startNodeIndex = 0;
var endNodeIndex;

window.onload = function() {
    createRandomizedRoads(NUM_ROADS);
    getAllIntersections(roads);

    // Sorting intersections to perform binary search lookup on mouse event to reduce runtime
    intersections = new Map([...intersections].sort((a, b) => {
        return (a[0].x < b[0].x) ? -1 : 1
    }));

    // Get sorted intersection points in array
    intersectionPoints = Array.from(intersections.keys());

    createChildRoads();
    roads = newRoads;

    endNodeIndex = graph[startNodeIndex][0];

    currentRoad = new Road(intersectionPoints[startNodeIndex], intersectionPoints[endNodeIndex]);
    lastPosX = currentRoad.start.x;
    lastPosY = currentRoad.start.y;

    refHorizVector = new Vector(1, 0);
    rotateAngle = currentRoad.toVector().angleDiff(refHorizVector);

	setInterval(function()
	{
		draw();
	}, 1000/60);
};


function drawCar(ctx, img, x, y, angle, scale = 1) {
    if(currentRoad.toVector().ydist > 0 ) {
        angle *= -1;
    }
    let vec_new_position = new Vector(x - CANVAS_WIDTH / 2, y - CANVAS_HEIGHT / 2).rotate(angle);

    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(-angle);

    // Apply offset for car
    ctx.translate(-0.5*ROAD_WIDTH, -0.5*ROAD_WIDTH);
    
    ctx.drawImage(img, vec_new_position.xdist, vec_new_position.ydist, img.width * scale, img.height * scale);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const carOne = document.getElementById("carOne");

    drawCar(ctx, carOne, lastPosX, lastPosY, rotateAngle);

    roads.map(road => road.draw());
    intersectionPoints.map(point => {
        (intersections.get(point).state == 1) ? point.draw(CHANGE_FILL) : point.draw(DEFAULT_FILL);
    });

    if(!lastPosX.between(currentRoad.start.x, currentRoad.end.x) || !lastPosY.between(currentRoad.start.y, currentRoad.end.y)) {
        startNodeIndex = endNodeIndex;
        endNodeIndex = graph[startNodeIndex][(graph[startNodeIndex].length).customRandom()];
        currentRoad = new Road(intersectionPoints[startNodeIndex], intersectionPoints[endNodeIndex]);
        lastPosX = currentRoad.start.x;
        lastPosY = currentRoad.start.y;
        rotateAngle = currentRoad.toVector().angleDiff(refHorizVector);
    }

    let unit_vec = currentRoad.toVector().unitVector();

    let dx = unit_vec.xdist * SPEED_FACTOR;
    let dy = unit_vec.ydist * SPEED_FACTOR;

    // let circle = new Path2D();
    // circle.arc(lastPosX, lastPosY, ROAD_WIDTH, 0, 2 * Math.PI);
    // ctx.fillStyle = MOVE_FILL;
    // ctx.fill(circle);


    lastPosX += dx;
    lastPosY += dy;
}


// Log mouse position
canvas.addEventListener('mousemove', function(e) {
    document.getElementById("xCoord").innerHTML = e.offsetX;
    document.getElementById("yCoord").innerHTML = e.offsetY;
});

// Highlight intersection upon click
canvas.addEventListener('mousedown', function(e) {
    changeIntersectionColour(e);
});


class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  draw(colour) {
    let circle = new Path2D();
    circle.arc(this.x, this.y, ROAD_WIDTH, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill(circle);
    return circle;
  }

  equals(point) {
      return (Math.abs(point.x - this.x) < 0.001) && (Math.abs(point.y - this.y) < 0.001);
  }
}

class Vector {
    constructor(xdist, ydist) {
        this.xdist = xdist;
        this.ydist = ydist;
    }

    mag() {
        return Math.sqrt((this.xdist**2) + (this.ydist**2));
    }

    angleDiff(other) { // Other vector
        // Apply dot product formula
        return Math.acos((this.xdist*other.xdist + this.ydist*other.ydist) / (this.mag()*other.mag()));
    }

    reflect() {
        return new Vector(-this.xdist, -this.ydist);
    }

    unitVector() {
        return new Vector(this.xdist / this.mag(), this.ydist / this.mag());
    }

    rotate(angle) {
        return new Vector(this.xdist*Math.cos(angle) - this.ydist*Math.sin(angle), this.xdist*Math.sin(angle) + this.ydist*Math.cos(angle));
    }
}

class Road {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }

    toVector() {
        return new Vector(this.end.x - this.start.x, this.end.y - this.start.y);
    }

    slope() {
        return (this.end.y - this.start.y) / (this.end.x - this.start.x);
    }

    yint() {
        return this.start.y - (this.slope()*this.start.x);
    }

    draw() { // Creates a road between two intersections (nodes)
        let in1 = this.start;
        let in2 = this.end;
    
        // Create dotted line
        ctx.beginPath();
        ctx.setLineDash([10,10]);
        ctx.moveTo(in1.x, in1.y);
        ctx.lineTo(in2.x, in2.y);
        ctx.stroke();
    
        // Create road border, requires some math
        let deltaX = in2.x - in1.x;
        let deltaY = in2.y - in1.y;
    
        if(deltaX == 0) // Infinite slope, simple road border
        {
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(in1.x + ROAD_WIDTH, in1.y);
            ctx.lineTo(in2.x + ROAD_WIDTH, in2.y);
            ctx.stroke();
        
            ctx.beginPath();
            ctx.moveTo(in1.x - ROAD_WIDTH, in1.y);
            ctx.lineTo(in2.x - ROAD_WIDTH, in2.y);
            ctx.stroke();
            return;
        }
        let slope = deltaY/deltaX; 
        let angle = Math.atan(slope);
    
        let h = ROAD_WIDTH*Math.cos(angle);
        let w = ROAD_WIDTH*Math.sin(angle);
    
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(in1.x + w, in1.y - h);
        ctx.lineTo(in2.x + w, in2.y - h);
        ctx.stroke();
    
        ctx.beginPath();
        ctx.moveTo(in1.x - w, in1.y + h);
        ctx.lineTo(in2.x - w, in2.y + h);
        ctx.stroke();
    }
}

function changeIntersectionColour(e) {
    let c;
    let closest_points = getNearestPointsInRange(intersectionPoints, new Point(e.offsetX, e.offsetY), ROAD_WIDTH);
    let i = 0;
    while((c = intersections.get(closest_points[i])) && (i++ < closest_points.length)) {
        if (ctx.isPointInPath(c.drawing, e.offsetX, e.offsetY)) {
            if(c.state == 0) {
                ctx.fillStyle = CHANGE_FILL;
                c.state = 1;
                document.getElementById("intIndex").innerHTML = intersectionPoints.indexOf(closest_points[i-1]);
            } else {
                ctx.fillStyle = DEFAULT_FILL;
                c.state = 0;
                document.getElementById("intIndex").innerHTML = "";
            }  
        }
        // Draw circle
        ctx.fill(c.drawing);
    }
}

function createRandomizedRoads(numRoads) {
    let visited = new Set();
    for(var i = 0; i < numRoads - 1; ++i) {
        let xPos1 =  Math.floor(pseudoRandom() * (CANVAS_WIDTH - 2*CANVAS_OFFSET_WIDTH + 1) + CANVAS_OFFSET_WIDTH),
            yPos1 = Math.floor(pseudoRandom() * (CANVAS_HEIGHT - 2*CANVAS_OFFSET_HEIGHT + 1) + CANVAS_OFFSET_HEIGHT);
        let xPos2 =  Math.floor(pseudoRandom() * (CANVAS_WIDTH - 2*CANVAS_OFFSET_WIDTH + 1) + CANVAS_OFFSET_WIDTH),
            yPos2 = Math.floor(pseudoRandom() * (CANVAS_HEIGHT - 2*CANVAS_OFFSET_HEIGHT + 1) + CANVAS_OFFSET_HEIGHT);

        while (visited.has([xPos1, yPos1, xPos2, yPos2].toString())) { 
            visited.add([xPos1, yPos1, xPos2, yPos2].toString());
            visited.add([xPos2, yPos2, xPos1, yPos1].toString()); 
            xPos1 =  Math.floor(pseudoRandom() * (CANVAS_WIDTH - 2*CANVAS_OFFSET_WIDTH + 1) + CANVAS_OFFSET_WIDTH),
            yPos1 = Math.floor(pseudoRandom() * (CANVAS_HEIGHT - 2*CANVAS_OFFSET_HEIGHT + 1) + CANVAS_OFFSET_HEIGHT);
            xPos2 =  Math.floor(pseudoRandom() * (CANVAS_WIDTH - 2*CANVAS_OFFSET_WIDTH + 1) + CANVAS_OFFSET_WIDTH),
            yPos2 = Math.floor(pseudoRandom() * (CANVAS_HEIGHT - 2*CANVAS_OFFSET_HEIGHT + 1) + CANVAS_OFFSET_HEIGHT);
        }
        
        let start, end;
        if(i > 0) {
            start = roads[i-1].end;
            let vec = new Vector(xPos2 - start.x, yPos2 - start.y);
            let angle_diff = vec.angleDiff(roads[i-1].toVector().reflect()).toDeg();
            while(angle_diff < 45 || angle_diff > 315) { // Make angle between road i and i-1 at least 45 degrees, need to use dot product
                xPos2 = Math.floor(pseudoRandom() * (CANVAS_WIDTH - 2*CANVAS_OFFSET_WIDTH + 1) + CANVAS_OFFSET_WIDTH);
                yPos2 = Math.floor(pseudoRandom() * (CANVAS_HEIGHT - 2*CANVAS_OFFSET_HEIGHT + 1) + CANVAS_OFFSET_HEIGHT);
                vec = new Vector(xPos2 - start.x, yPos2 - start.y);
                angle_diff = vec.angleDiff(roads[i-1].toVector().reflect()).toDeg();
            }
            end = new Point(xPos2, yPos2);
        } else {
            start = new Point(xPos1, yPos1);
            end = new Point(xPos2, yPos2);
        }
        let road = new Road(start, end);
        roads.push(road);
        //console.log("Road from: (" + xPos1.toString() + ", " + yPos1.toString() + ") to (" + xPos2.toString() + ", " + yPos2.toString() + ")");
    }
    // Close the loop
    let last_road = new Road(roads.last().end, roads[0].start); 
    roads.push(last_road);
}

function getIntersection(road1, road2) {
    // If they intersect at the endpoints
    if(road1.start.equals(road2.end)) { return road1.start; }
    if(road1.end.equals(road2.start)) { return road1.end; }
    if(road1.start.equals(road2.start)) { return road1.start; }
    if(road1.end.equals(road2.end)) { return road1.end; }

    // Develop line equation for road 1, y = mx + b
    let in1_1 = road1.start;
    let in1_2 = road1.end;

    let m_1 = road1.slope();
    let b_1 = road1.yint();

    // Develop line equation for road 2, y = mx + b
    let in2_1 = road2.start;
    let in2_2 = road2.end;

    let m_2 = road2.slope();
    let b_2 = road2.yint();

    // Calculate x,y intersection, if slopes are parralel (x_int == inf), no intersection
    let x_int = (b_1 - b_2) / (m_2 - m_1);
    if(x_int == Infinity) return null;
    let y_int = m_1*x_int + b_1;

    // Check that intersection point is between start and end of road1 and road2 to confirm intersection exists
    if (x_int.between(in1_1.x, in1_2.x) && y_int.between(in1_1.y, in1_2.y) && x_int.between(in2_1.x, in2_2.x) && y_int.between(in2_1.y, in2_2.y)) {
        return new Point(x_int, y_int); 
    }
    return null;
}

function getAllIntersections(roads) { // Returns all road intersections in the grid
    for(let i = 0; i < roads.length - 1; ++i){
        for(let j = i+1; j < roads.length; ++j) {
            let int = getIntersection(roads[i], roads[j]);
            if(int != null) { 
                let drawing = int.draw(DEFAULT_FILL);
                intersections.set(int, {'drawing': drawing, 'state': 0}); 
            }
        }
    }
    return intersections;
}

function createChildRoads() {
    function getIntersectionsOnRoadIndices(road) {
        let start_x = road.start.x;
        let end_x = road.end.x;
        let start_y = road.start.y;
        let end_y = road.end.y;

        let i = 0;
        let j = intersectionPoints.length - 1;

        if(start_x > end_x) { let temp = end_x; end_x = start_x; start_x = temp; }
        while(intersectionPoints[i].x < start_x) { ++i; }
        while(intersectionPoints[j].x > end_x) { --j; }

        let indices = Array(j-i+1).fill().map((_, n) => n + i);

        let intersections_between_road_indices = indices.filter(index => intersectionPoints[index].y.between(start_y, end_y));
        let intersections_on_road_indices = intersections_between_road_indices.filter(index => {
            if(road.start.equals(intersectionPoints[index]) || road.end.equals(intersectionPoints[index])) return true;
            let temp_road = new Road(intersectionPoints[index], road.start); 
            return temp_road.slope().equals(road.slope()); 
        });
        return intersections_on_road_indices.sort(function(a,b) { return intersectionPoints[a].x - intersectionPoints[b].x; }); // Include road endpoints and sort based on x value
    }

    // Construct the adjacency list between intersections, serving as the graph representation of the network
    for(let i = 0; i < roads.length; ++i) {
        let local_intersection_indices = getIntersectionsOnRoadIndices(roads[i]);
        for(let i = 0; i < local_intersection_indices.length - 1; ++i) {
            newRoads.push(new Road(intersectionPoints[local_intersection_indices[i]], intersectionPoints[local_intersection_indices[i+1]])); 
            if(i > 0) {
                graph.custom_push(local_intersection_indices[i], local_intersection_indices[i-1]);
            }
            graph.custom_push(local_intersection_indices[i], local_intersection_indices[i+1]);
        }
        graph.custom_push(local_intersection_indices.last(), local_intersection_indices[local_intersection_indices.length - 2]);
    }
}

function getNearestPointsInRange(points, rpoint, range) {
    let i = 0;
    let j = points.length - 1;

    // Find start of range
    while(i <= j) {
        var mid = Math.floor((i+j) / 2 );
        if(rpoint.x - range < points[mid].x) {
            j = mid - 1;
        } else {
            i = mid + 1;
        }
    }

    let start = mid;
    i = start;
    j = points.length - 1;

    // Find end of range
    while(i <= j) {
        mid = Math.floor((i+j) / 2 );
        if(rpoint.x + range > points[mid].x) {
            i = mid + 1;
        } else {
            j = mid - 1;
        }
    }
    let end = mid;
    let output = [];

    // Filter y values in range iteratively
    for(let k = start; k <= end; ++k) {
        if((points[k].y >= rpoint.y - range) && (points[k].y <= rpoint.y + range)) {
            output.push(points[k]);
        }
    }
    return output;
}
