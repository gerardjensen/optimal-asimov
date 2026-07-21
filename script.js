let pubs;
let titles;

function spinal_case(str) {
  return str.replace(/^[\W_]+|[\W_]+$|([\W_]+)/g, function ($0, $1) {
              return $1 ? "-" : "";
         }).replace(/([a-z])(?=[A-Z])/g, '$1-').toLowerCase();
}

function construct_div(obj,depth)
{
  if(Number.isInteger(obj)) {
    let div = document.createElement("div");
    div.setAttribute("id", "t-" + obj);
    div.setAttribute("class", "card");
    console.log(obj);
    let title = titles.find(a => a["isfdb_id"] == obj);
    let span = document.createElement("span");
    span.innerText = title["title"];
    span.setAttribute("class", "tooltiptext");
    div.appendChild(span);
    return div;
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

      sf_container.appendChild(div);
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
})()

function on_pub_select(a,b) {
  for(let i = 0; i<titles.length; i++) 
    document.getElementById("t-" + titles[i]["isfdb_id"]).removeAttribute("style");

  if(a == 0) 
    return;
  
  let _titles = pubs[a-1]["titles"];
  for(let i = 0; i<_titles.length; i++) { 
      document.getElementById("t-" + _titles[i]).setAttribute("style", "background-color: #00A");
  }
}
