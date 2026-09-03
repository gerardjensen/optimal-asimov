const exclude_novels = true;

let pubs;
let titles;
const selected_pubs = new Set();
let selected_pub = 0;
let title_multiplicity = new Map();
const objectives = Array(3);

function spinal_case(str) {
  return str.replace(/^[\W_]+|[\W_]+$|([\W_]+)/g, function ($0, $1) {
              return $1 ? "-" : "";
         }).replace(/([a-z])(?=[A-Z])/g, '$1-').toLowerCase();
}

function construct_div(obj,depth)
{
  if(Number.isInteger(obj)) {
    let link = document.createElement("a");  
    link.setAttribute("href", "https://www.isfdb.org/cgi-bin/title.cgi?"+obj);
    link.setAttribute("target", "_blank");
    let div = document.createElement("div");
    div.setAttribute("id", "t-" + obj);
    div.setAttribute("class", "card");
    let title = titles.find(a => a["isfdb_id"] == obj);
    let span = document.createElement("span");
    span.innerText = title["title"];
    span.setAttribute("class", "tooltiptext");
    div.appendChild(span);
    link.appendChild(div);
    return link;
  }

  let separator = document.createElement("div");
  separator.setAttribute("class", "separator");
  let title = document.createElement(depth > 2 ? "p" : "h" + (depth+1));
  title.innerText = obj["name"];
  separator.appendChild(title);

  let container = document.createElement("div");
  container.setAttribute("class", "container");
  container.setAttribute("id", spinal_case(obj["name"]));

  let content = obj["content"];

  let cd_cont = document.createElement("div");
  cd_cont.setAttribute("class", "card-container");
  cd_cont.setAttribute("id", container.getAttribute("id") + "-cd-cont");

  for(let i = 0; i < content.length; i++) {
    let elm = construct_div(content[i], depth + 1);
    if(elm.getAttribute("class") == "separator")
      container.appendChild(elm);
    else 
      cd_cont.appendChild(elm);
  }
  container.appendChild(cd_cont);
  separator.appendChild(container);

  return separator;
}

async function mk_content(result) {
  const cont_div = document.getElementById("content");
  for(let i = 0; i<result.length; i++) {
    cont_div.appendChild(construct_div(result[i], 1))
  }
}

function append_stories(titles) {
  for(let i = 0; i<titles.length; i++) {
    let title = titles[i];
    let id = title["isfdb_id"];
    let is_novel = title["type"] == "NOVEL";
    let elm = document.getElementById("t-" + id);
    let sf_container = document.getElementById("science-fiction-cd-cont");

    if(elm) {
      let class_type = is_novel ? "novel" : "short-fiction";
      if(!title["collected"])
        class_type = class_type + " uncollected";
      elm.setAttribute("class", elm.getAttribute("class") + " " + class_type);
    } else {
      let link = document.createElement("a");  
      link.setAttribute("href", "https://www.isfdb.org/cgi-bin/title.cgi?"+id);
      link.setAttribute("target", "_blank");
      let div = document.createElement("div");
      div.setAttribute("id", "t-" + id);
      let span = document.createElement("span");
      span.innerText = title["title"];
      span.setAttribute("class", "tooltiptext");
      div.appendChild(span);
      if(is_novel)
        div.setAttribute("class", "card novel");
      else
        div.setAttribute("class", "card short-fiction");

      if(!title["collected"])
        div.setAttribute("class", div.getAttribute("class") + " uncollected");

      link.appendChild(div);
      sf_container.appendChild(link);
    }
  }
}

async function fetch_json(path) { 
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error(error.message);
  }
  return null;
}

function append_pubs(pubs) {
  let selector = document.getElementById("pubs");
  for (let i = 0; i<pubs.length; i++) {
    let pub = pubs[i];
    let item = document.createElement("option");
    item.innerText = pub["name"];
    item.setAttribute("value", pub["pub_id"]);
    selector.appendChild(item);
  }
}

(async() => {
  titles = await fetch_json("titles.json");
  pubs = await fetch_json("pubs.json");
  pubs = pubs.sort((a, b) => a["name"].localeCompare(b["name"]));

  await mk_content(await fetch_json("relations.json"));
  append_stories(titles);
  append_pubs(pubs);

  add_pubs2selectors();

  make_objectives();

  Module._init_solver();
})()

function on_pub_select(a,b) { 
  selected_pub = a;

  on_selected_pubs_changed();

  if(a == 0) 
    return;
 
  let _titles = pubs[a-1]["titles"];
  for(let i = 0; i<_titles.length; i++) { 
      document.getElementById("t-" + _titles[i]).setAttribute("style", "background-color: #0A0");
  }
}

function add_pub_viewer() {
  let pub = null;
  if(selected_pub == 0) 
    return;
  
  pub = pubs[selected_pub - 1];

  let is_new = !selected_pubs.has(selected_pub);

  selected_pubs.add(selected_pub);

  on_selected_pubs_changed();
  
  if(!is_new) return;

  let selected_pubs_container = document.getElementById("selected-pubs");
  let link = document.createElement("a");
  let div = document.createElement("div");
  let cross = document.createElement("span");
  let label = document.createElement("p");
  link.setAttribute("href", "https://www.isfdb.org/cgi-bin/pl.cgi?"+pub["pub_id"]);
  link.setAttribute("target", "_blank");
  link.innerText = pub["name"];
  cross.innerHTML = "&#x2715;";
  cross.setAttribute("class", "close");

  cross.addEventListener("click", (() => {
    const pub_id = selected_pub;
    return () => del_pub(pub_id);
  })());

  label.appendChild(link);
  div.setAttribute("class", "pub-item");
  div.setAttribute("id", "p-" + selected_pub);
  div.appendChild(cross);
  div.appendChild(label);
  selected_pubs_container.appendChild(div);
}

function del_pub(id) {
  let pub_div = document.getElementById("p-" + id);
  let sel_div = document.getElementById("selected-pubs");
  sel_div.removeChild(pub_div);
  selected_pubs.delete(id);
  on_selected_pubs_changed();
}

function on_selected_pubs_changed() {

  for(let i = 0; i<titles.length; i++) 
    document.getElementById("t-" + titles[i]["isfdb_id"]).removeAttribute("style");

  title_multiplicity.clear();

  for(let index of selected_pubs) {
    let _titles = pubs[index-1]["titles"];
    for(let i = 0; i<_titles.length; i++) {
        if(!title_multiplicity.has(_titles[i])) {
          title_multiplicity.set(_titles[i], 1);
        } else {
          title_multiplicity.set(_titles[i], title_multiplicity.get(_titles[i]) + 1);
        }
        document.getElementById("t-" + _titles[i]).setAttribute("style", "background-color: #00A"); 
    }


  }
  
  for(let title of titles) {
    let id = title["isfdb_id"];
    let card = document.getElementById("t-" + id);

    if(title_multiplicity.has(id) && title_multiplicity.get(id) > 1) {
      let span;
      if(card.childElementCount == 1) {
        span = document.createElement("span");
        card.appendChild(span);
      } else 
        span = card.children[1];

      span.innerText = title_multiplicity.get(id);
    } else {
      if(card.childElementCount == 1)
        continue;
      
      card.removeChild(card.children[1]);
    }

  }
}

function add_pubs2selectors() {
  let I_selector = document.getElementById("I-pubs");
  let U_selector = document.getElementById("U-pubs");

  for(let pub of pubs) {
    let elmI = document.createElement("option");
    let elmU = document.createElement("option");
    elmI.setAttribute("value", pub["pub_id"]);
    elmI.innerText = pub["name"]; 
    I_selector.appendChild(elmI);
    elmU.setAttribute("value", pub["pub_id"]);
    elmU.innerText = pub["name"]; 
    U_selector.appendChild(elmU);
  }
}

function get_values(collection) {
  ret = Array(collection.length);
  for(let i = 0; i<collection.length; i++) {
    ret[i] = parseInt(collection[i].value)
  }

  return ret;
}

function optimize() {
  let unavailable = get_values(document.getElementById("U-pubs").selectedOptions);
  let initial = get_values(document.getElementById("I-pubs").selectedOptions);
  let selection = document.getElementById("ch-robots").checked ? 0 : 
    document.getElementById("ch-foundation").checked ? 1 : 2;

  console.log(unavailable);
  console.log(initial);
  console.log(selection);

  // 1. Define data arrays
  const goalData = new Int32Array(objectives[selection]);
  const initialData = new Int32Array(initial);
  const unavailableData = new Int32Array(unavailable);

  // Allocate memory on the heap for the arrays
  const goalPtr = Module._malloc(goalData.byteLength);
  const initialPtr = Module._malloc(initialData.byteLength);
  const unavailablePtr = Module._malloc(unavailableData.byteLength);

  // Copy data into the HEAP
  Module.HEAP32.set(goalData, goalPtr >> 2);
  Module.HEAP32.set(initialData, initialPtr >> 2);
  Module.HEAP32.set(unavailableData, unavailablePtr >> 2);

  // 2. Allocate memory for the buyer_t struct 
  // Assuming 32-bit architecture: 3 pointers (12 bytes) + 3 ints for lengths (12 bytes) = 24 bytes total.
  const structPtr = Module._malloc(24);

  // Write struct fields (offsets depend on your struct definition, typically pointer, len, pointer, len...)
  Module.HEAP32[structPtr >> 2] = initialPtr;
  Module.HEAP32[(structPtr + 4) >> 2] = initial.length;        // initial_len
  Module.HEAP32[(structPtr + 8) >> 2] = goalPtr;
  Module.HEAP32[(structPtr + 12) >> 2] = objectives[selection].length;      // goal_len
  Module.HEAP32[(structPtr + 16) >> 2] = unavailablePtr;
  Module.HEAP32[(structPtr + 20) >> 2] = unavailable.length;      // unavailable_len


  // Allocate space for integer pointer z1 (4 bytes)
  const z1Ptr = Module._malloc(4);

  // 3. Run the solver loop
  let N = -1;
  let z;

  do {
    // Pass N, the pointer to the struct, and the pointer to z1
    z = Module._solve(N, structPtr, z1Ptr);
    
    // Read z1 value from memory
    const z1 = Module.HEAP32[z1Ptr >> 2];
    
    console.log(`${z1}\t${z}`);
    N = z - 1;
  } while (false && Module.HEAP32[z1Ptr >> 2] > 0);

  // Clean up memory to prevent leaks
  Module._free(goalPtr);
  Module._free(initialPtr);
  Module._free(unavailablePtr);
  Module._free(structPtr);
  Module._free(z1Ptr);
}

async function make_objectives() {
  groups = await fetch_json("groups.json")
  /*objectives[0] = groups[0];
  objectives[1] = groups[1].concat(groups[0])
  objectives[1].splice(-2); // Remove Victory Unintentional and Let's Get Together
  objectives[2] = Array();*/
  for(let i = 0; i<3; i++) objectives[i] = Array();

  for (let title of titles) {
    let is_novel = title["type"] == "NOVEL";
    if(is_novel && exclude_novels)
      continue;
    let id = title["isfdb_id"];

    if(groups[0].includes(id)) {
      objectives[0].push(id);
      if(id != 44199 && id != 44200)
        objectives[1].push(id);
    }
    
    if(groups[1].includes(id))
      objectives[1].push(id);

    if(groups[2].includes(id)) 
      continue;
    objectives[2].push(id);
  }
}
