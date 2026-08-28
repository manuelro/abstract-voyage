// This function will be executed when the document is ready
function onload () {
  let button = document.getElementById('myButton')
  function onclick () {
    button.innerHTML = 'Hi!, you clicked me!'
  }

  // We attach an event listener to the button
  button.addEventListener('click', onclick)
}

// We attach an event listener to the Window object
window.onload(onload)
