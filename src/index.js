var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

const ROAD_WIDTH  = 10;
const CANVAS_HEIGHT = canvas.height;
const CANVAS_WIDTH = canvas.width;
const DEFAULT_FILL = 'red';
const CHANGE_FILL = 'green';

Number.prototype.between = function(a, b) {
    var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
    return this >= min && this <= max;
};

Array.prototype.last = function(){
    return this[this.length - 1];
};


// Log mouse position
canvas.addEventListener('mousemove', function(e) {
    document.getElementById("xCoord").innerHTML = e.offsetX;
    document.getElementById("yCoord").innerHTML = e.offsetY;
});

// Highlight intersection upon click
canvas.addEventListener('mousedown', function(e) {
    changeIntersectionColour(e);
});

var roads = [];
var intersections = new Map();
var intersectionPoints = [];


class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
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
            } else {
                ctx.fillStyle = DEFAULT_FILL;
                c.state = 0;
            }
            
        }
        // Draw circle
        ctx.fill(c.drawing);
    }
}

function createRandomizedRoads(numRoads) {
    let visited = new Set();
    for(var i = 0; i < numRoads; ++i) {
        let xPos1 =  Math.floor(Math.random() * (CANVAS_WIDTH + 1)),
            yPos1 = Math.floor(Math.random() * (CANVAS_HEIGHT + 1));
        let xPos2 =  Math.floor(Math.random() * (CANVAS_WIDTH + 1)),
            yPos2 = Math.floor(Math.random() * (CANVAS_HEIGHT + 1));

        while (visited.has([xPos1, yPos1, xPos2, yPos2].toString())) { 
            visited.add([xPos1, yPos1, xPos2, yPos2].toString());
            visited.add([xPos2, yPos2, xPos1, yPos1].toString()); 
            xPos1 =  Math.floor(Math.random() * (CANVAS_WIDTH + 1)),
            yPos1 = Math.floor(Math.random() * (CANVAS_HEIGHT + 1));
            xPos2 =  Math.floor(Math.random() * (CANVAS_WIDTH + 1)),
            yPos2 = Math.floor(Math.random() * (CANVAS_HEIGHT + 1));
        }
        
        let start, end;
        if(i > 0) {
            start = roads[i-1].end;
            let vec = new Vector(xPos2 - start.x, yPos2 - start.y);
            let angle_diff = vec.angleDiff(roads[i-1].toVector().reflect());
            while((angle_diff < (Math.PI / 4)) || (angle_diff > (14*Math.PI / 8)) ) { // Make angle between road i and i-1 at least 45 degrees, need to use dot product
                xPos2 =  Math.floor(Math.random() * (CANVAS_WIDTH + 1)),
                yPos2 = Math.floor(Math.random() * (CANVAS_HEIGHT + 1));
                vec = new Vector(xPos2 - start.x, yPos2 - start.y);
                angle_diff = vec.angleDiff(roads[i-1].toVector());
            }
            end = new Point(xPos2, yPos2);
        } else {
            start = new Point(xPos1, yPos1);
            end = new Point(xPos2, yPos2);
        }
        let road = new Road(start, end);
        road.draw();
        roads.push(road);
        //console.log("Road from: (" + xPos1.toString() + ", " + yPos1.toString() + ") to (" + xPos2.toString() + ", " + yPos2.toString() + ")");
    }
    // Close the loop
    let last_road = new Road(roads.last().end, roads[0].start); 
    last_road.draw();
    roads.push(last_road);
}

function getIntersection(road1, road2) {

    // If they intersect at the endpoints
    if(road1.start == road2.end) { return road1.start; }
    if(road1.end == road2.start) { return road2.start; }

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
    if (x_int.between(in1_1.x, in1_2.x) && y_int.between(in1_1.y, in1_2.y) && x_int.between(in2_1.x, in2_2.x) && y_int.between(in2_1.y, in2_2.y)){
        return new Point(x_int, y_int); 
    }
    return null;
}

function getAllIntersections(roads) { // Returns all road intersections in the grid
    for(let i = 0; i < roads.length - 1; ++i){
        for(let j = i+1; j < roads.length; ++j) {
            let int = getIntersection(roads[i], roads[j]);
            if(int != null) { 
                let circle = new Path2D();
                circle.arc(int.x, int.y, ROAD_WIDTH, 0, 2 * Math.PI);
                ctx.fillStyle = DEFAULT_FILL;
                ctx.fill(circle);
                intersections.set(int, {'drawing': circle, 'state': 0, 'roads': [i,j]}); 
            }
        }
    }
    return intersections;
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

createRandomizedRoads(10); // Will create n+1 roads due to the loop closure
getAllIntersections(roads);

// Sorting intersections to perform binary search lookup on mouse event to reduce runtime
intersections = new Map([...intersections].sort((a, b) => {
   return (a[0].x < b[0].x) ? -1 : 1
}));

// Get sorted intersection points in array
intersectionPoints = Array.from(intersections.keys());
