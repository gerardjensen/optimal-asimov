function construct_div(obj,depth)
{
  if(Number.isInteger(obj)) {
    let div = document.createElement("div");
    div.setAttribute("id", "t-" + obj);
    div.setAttribute("class", "card");
    return div;
  }

  let separator = document.createElement("div");
  separator.setAttribute("class", "separator");
  let title = document.createElement("h" + (depth+1));
  title.innerText = obj["name"];
  separator.appendChild(title);

  let container = document.createElement("div");
  container.setAttribute("class", "container");

  let content = obj["content"];

  for(let i = 0; i < content.length; i++) {
    container.appendChild(construct_div(content[i]));;
  }
  separator.appendChild(container);

  return separator;
}

async function mk_content() {
  try {
    const response = await fetch("relations.json");
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    const cont_div = document.getElementById("content");
    for(let i = 0; i<result.length; i++) {
      // cont_div.appendChild(construct_div(i));
      cont_div.appendChild(construct_div(result[i], 1))
    }


  } catch (error) {
    console.error(error.message);
  }

}

(async() => {
  await mk_content();
})()
