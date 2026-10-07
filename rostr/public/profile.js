(function () {
  var root = document.body;
  var keyName = root.getAttribute('data-user-key');
  if (!keyName) return;
  var storageKey = 'rostr.photo.' + keyName;

  function read() {
    try {
      return localStorage.getItem(storageKey) || '';
    } catch (error) {
      return '';
    }
  }

  function apply(url) {
    var ok = typeof url === 'string' && url.indexOf('data:image/') === 0;
    var nodes = document.querySelectorAll('[data-avatar]');
    for (var i = 0; i < nodes.length; i += 1) {
      var img = nodes[i].querySelector('img');
      var initials = nodes[i].querySelector('.avatar-initials');
      if (!img) continue;
      if (ok) {
        img.src = url;
        img.hidden = false;
        if (initials) initials.hidden = true;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
        if (initials) initials.hidden = false;
      }
    }
  }

  apply(read());

  var input = document.querySelector('[data-photo-input]');
  var remove = document.querySelector('[data-photo-remove]');
  var status = document.querySelector('[data-photo-status]');

  function say(text) {
    if (status) status.textContent = text;
  }

  function store(url) {
    try {
      localStorage.setItem(storageKey, url);
      apply(url);
      say('Saved in this browser. It is not sent to Rostr.');
    } catch (error) {
      say('This browser could not store the photo. Try a smaller image.');
    }
  }

  if (input) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        say('Use a PNG, JPEG, WebP, or GIF.');
        input.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { say('That file could not be read.'); };
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var max = 256;
          var scale = Math.min(1, max / Math.max(image.width, image.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          var context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          store(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.onerror = function () { say('That file could not be read as an image.'); };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  if (remove) {
    remove.addEventListener('click', function () {
      try { localStorage.removeItem(storageKey); } catch (error) { /* already gone */ }
      apply('');
      if (input) input.value = '';
      say('Photo removed from this browser.');
    });
  }
}());
