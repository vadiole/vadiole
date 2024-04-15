let currentURL = window.location.href;
console.log("TEST")

document.querySelectorAll("a").forEach(p => {
  console.log(p)
  console.log("TEST")
  if(currentURL.indexOf(p.getAttribute("href")) !== -1){
    p.classList.add("active");
  }
})