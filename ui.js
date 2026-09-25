let sols = Array();
let sclx = scly = 1
let calculating = false;
let selected_sol = -1;
let hovered_sol = -1;
let selected_sol_pubs = null;

const xmargin = 60;
const ymargin = 30;

let sol_pubs = document.getElementById("sol_pubs");

function setup() {
  frameRate(5);
  createCanvas(1000, 600);
  ellipseMode(RADIUS);
  textSize(30);
}

function draw() {
  hovered_sol = -1;
  background(240);
  stroke(0);
  fill(0);

  let t = 0;
  let dt = sqrt(sclx * sclx + scly * scly);
  if(sols.length > 0) {
    while(1) {
      let x1 = xmargin + t * sclx;
      let y1 = height - ymargin - t * scly;
      let x2 = xmargin + (t+15/dt) * sclx;
      let y2 = height - ymargin - (t+15/dt) * scly;
      if(x2 > width-xmargin || y2 < ymargin)
        break;

      line(x1,y1,x2,y2);

      t+=20/dt;
    }

    for(let i = 0; i<8; i++) {
      textSize(15);
      fill(0);
      let X = sols[0][1] * i / 7;
      let Y = sols[0][0] * i / 7;
      let x = xmargin + X * sclx;
      let y = height - ymargin - Y * scly;
      line(xmargin,y,xmargin-10,y);
      line(x,height-ymargin,x,height-ymargin+10);
      textAlign(CENTER,TOP);
      text(parseInt(X), x, height-ymargin+13);
      textAlign(RIGHT,CENTER);
      text(parseInt(Y), xmargin-12, y);
      textAlign(LEFT);
    }
  }

  line(xmargin, ymargin, xmargin, height-ymargin);
  line(xmargin, height-ymargin, width-xmargin, height-ymargin);

  let px = -1,py = -1;
  let min_dist = 10;
  for(let i = 0; i<sols.length; i++) {
    let sol = sols[i];
    let x = xmargin + sol[1] * sclx;
    let y = height - ymargin - sol[0] * scly;

   
    if(selected_sol != i) { 
      let _d = dist(x,y,mouseX,mouseY);
      if(_d < 10 && _d < min_dist) {
        min_dist = _d;
        hovered_sol = i;
      } 

      ellipse(x,y,5);
    }

    if(i > 0) {
      line(px,py,x,y);
    }

    px = x;
    py = y;
  }

  if(hovered_sol != -1) {
    sol = sols[hovered_sol];
    let x = xmargin + sol[1] * sclx;
    let y = height - ymargin - sol[0] * scly;
    fill(200);
    ellipse(x,y,10);
    fill(0);
    ellipse(x,y,5); 
  }
  if(selected_sol != -1) {
    sol = sols[selected_sol];
    let x = xmargin + sol[1] * sclx;
    let y = height - ymargin - sol[0] * scly;
    fill(150,150,255);
    ellipse(x,y,10);
    fill(0);
    ellipse(x,y,4); 
  }

  if(calculating) {
    let _str = "Optimizing";
    //for(let i = 0; i<(frameCount>>1) % 4; i++) 
    //  _str+="."; 
    text(_str, xmargin+10,30);
  }
  
}

function on_optimization_requested() {
  selected_sol_pubs = null;
  sol_pubs.innerHTML = "";
  sols = Array();
  calculating = true;
}

function on_solution_found(z,z1,y) {
  if(sols.length == 0) {
    sclx = (width - 2*xmargin) / z;
    scly = (height - 2*ymargin) / z1;
    selected_sol = 0
    present_sol(z1,z,y);
  }
  sols.push([z1,z,y]);
}

function on_optimization_end() {
  calculating = false;
}

function mouseClicked() {
  if(hovered_sol == -1) return;
  selected_sol = hovered_sol;
  let sol = sols[selected_sol];
  present_sol(sol[0], sol[1], sol[2]); 

}

function present_sol(z1,z,_pubs) { 
  selected_sol_pubs = _pubs;
  sol_pubs.innerHTML = "";
  let p = document.createElement("p");
  let ul = document.createElement("ul");
  for(let pub of _pubs) {
    let li = document.createElement("li");
    li.innerText = pub["name"];
    ul.appendChild(li);
  }
  p.innerHTML="Number of unrepeated pages of objective stories: <strong>" + z1 + "</strong>";
  p.innerHTML+="<br>Number of total pages: <strong>" + z + "</strong>";
  let maxZ = sols.length == 0 ? z1 : sols[0][0];
  p.innerHTML+="<br>Percentage of objective: <strong>" + parseInt(z1 / maxZ * 10000) / 100 + "%</strong>";
  p.innerHTML+="<br>Solution efficiency: <strong>" + parseInt(z1 / z * 10000) / 100 + "%</strong>";
  p.appendChild(ul);
  sol_pubs.appendChild(p);
  let btn = document.createElement("button");
  btn.innerText = "See in viewer";
  btn.setAttribute("onclick", "put_sols_in_viewer()");
  sol_pubs.appendChild(btn);  
}

function put_sols_in_viewer() {
  document.getElementById("pubs").selectedIndex = 0
  selected_pub = 0;
  document.getElementById("selected-pubs").innerText = "";
  selected_pubs.clear();
  on_selected_pubs_changed();

  for(let pub of selected_sol_pubs) {
    let ordered_index = get_ordered_index(pub);
    if(ordered_index == -1) continue;
    add_pub2viewer(ordered_index+1);
  } 
}

function get_ordered_index(pub) {
  for(let i = 0; i<pubs.length; i++) {
    if(pubs[i] == pub) return i;
  }
  return -1;
}
