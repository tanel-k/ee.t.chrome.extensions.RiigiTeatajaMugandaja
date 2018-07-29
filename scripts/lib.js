function downloadUrl(url, cb) {
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      cb(xhr.status, xhr.statusText, xhr.responseText, xhr);
    }
  }

  xhr.open("GET", url);
  xhr.send();
}
